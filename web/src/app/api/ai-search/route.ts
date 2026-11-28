import { NextResponse } from "next/server";
import { normalizeAiQueryKey } from "@/lib/ai-search/cache-key";
import { getAiSearchConfig } from "@/lib/ai-search/config";
import { buildAiStudyContext } from "@/lib/ai-search/context-builder";
import {
  type TierStreamResult,
  synthesizeWithFailover,
} from "@/lib/ai-search/failover-client";
import {
  checkAndIncrementAiQuota,
  getCachedAiSynthesis,
  getMyAiQuotaStatus,
  putCachedAiSynthesis,
  refundAiQuota,
} from "@/lib/ai-search/quota-and-cache";
import { getAiCitationStudies } from "@/lib/queries/studies";
import { createClient } from "@/lib/supabase/server";
import { AiSearchRequestSchema } from "@/lib/validations/ai-search";

export const dynamic = "force-dynamic";

const UNAUTHORIZED_MESSAGE =
  "Sign in with Google or GitHub to use Ask AI literature synthesis.";

const NO_MATCHING_STUDIES_MESSAGE =
  "No matching peer-reviewed studies were found in SBL News for this question and filter combination. Try broadening your query or clearing study-design, duration, or trained-lifter filters.";

function formatSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      error: "UNAUTHORIZED",
      message: UNAUTHORIZED_MESSAGE,
    },
    { status: 401 }
  );
}

export async function GET() {
  if (!hasSupabaseEnv()) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorizedResponse();
  }

  const config = getAiSearchConfig();
  const quota = await getMyAiQuotaStatus(supabase, config.dailyQuotaLimit);

  return NextResponse.json({ quota });
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorizedResponse();
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Invalid JSON request body.",
      },
      { status: 400 }
    );
  }

  const parsed = AiSearchRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: issues[0]?.message ?? "Invalid AI search request parameters.",
        issues,
      },
      { status: 400 }
    );
  }

  const config = getAiSearchConfig();
  const { cacheKey, normalizedQuery, filterSignature } =
    await normalizeAiQueryKey(parsed.data);

  // 1. Pre-quota shared TTL cache lookup (cache hits deduct 0 quota)
  const cached = await getCachedAiSynthesis(supabase, cacheKey);
  if (cached) {
    const quota = await getMyAiQuotaStatus(supabase, config.dailyQuotaLimit);
    return NextResponse.json({
      mode: "cached",
      cached: true,
      tierUsed: cached.tierUsed,
      answerMarkdown: cached.answerMarkdown,
      citations: cached.citations,
      quota,
    });
  }

  // 2. Atomic daily quota check & reservation on cache miss
  const quota = await checkAndIncrementAiQuota(
    supabase,
    config.dailyQuotaLimit
  );
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: "QUOTA_EXCEEDED",
        message:
          "Daily AI synthesis quota reached. Your quota resets at UTC midnight.",
        quota,
      },
      { status: 429 }
    );
  }

  // 3. Deterministic hybrid retrieval (refund quota if 0 studies match)
  const citedStudies = await getAiCitationStudies(parsed.data, 5);
  if (citedStudies.length === 0) {
    const refundedQuota = await refundAiQuota(supabase, config.dailyQuotaLimit);
    return NextResponse.json({
      mode: "no_matching_studies",
      cached: false,
      answerMarkdown: null,
      citations: [],
      message: NO_MATCHING_STUDIES_MESSAGE,
      quota: refundedQuota,
    });
  }

  const builtContext = buildAiStudyContext(citedStudies);

  // 4. 3-tier streaming failover (refund quota & skip cache if all tiers fail)
  let tierStream: TierStreamResult;
  try {
    tierStream = await synthesizeWithFailover({
      question: parsed.data.q,
      contextText: builtContext.contextText,
      config,
    });
  } catch (err) {
    console.error("AI synthesis tier error:", err);
    const refundedQuota = await refundAiQuota(supabase, config.dailyQuotaLimit);
    return NextResponse.json(
      {
        error: "ALL_TIERS_FAILED",
        message:
          "AI synthesis providers are temporarily unavailable. Your daily quota was not deducted — please retry.",
        quota: refundedQuota,
      },
      { status: 503 }
    );
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullText = "";
      try {
        controller.enqueue(
          encoder.encode(
            formatSseEvent("meta", {
              cached: false,
              tierUsed: tierStream.tierUsed,
              citations: builtContext.includedStudies,
              quota,
              promptTokenEstimate: builtContext.estimatedTokens,
            })
          )
        );

        for await (const chunk of tierStream.stream) {
          fullText += chunk;
          controller.enqueue(
            encoder.encode(formatSseEvent("delta", { text: chunk }))
          );
        }

        const finalMarkdown = fullText.trim();
        if (finalMarkdown.length > 0 && builtContext.includedStudies.length > 0) {
          await putCachedAiSynthesis(supabase, {
            cacheKey,
            normalizedQuery,
            filterSignature,
            answerMarkdown: finalMarkdown,
            citations: builtContext.includedStudies,
            tierUsed: tierStream.tierUsed,
            ttlDays: config.cacheTtlDays,
          });
        }

        controller.enqueue(
          encoder.encode(
            formatSseEvent("done", {
              answerMarkdown: finalMarkdown,
              tierUsed: tierStream.tierUsed,
              quota,
            })
          )
        );
      } catch (err) {
        console.error("AI synthesis stream interrupted:", err);
        let refundedQuota = quota;
        try {
          refundedQuota = await refundAiQuota(supabase, config.dailyQuotaLimit);
        } catch (refundErr) {
          console.error("Failed to refund AI quota after stream error:", refundErr);
        }
        controller.enqueue(
          encoder.encode(
            formatSseEvent("error", {
              error: "STREAM_INTERRUPTED",
              message:
                "AI synthesis interrupted. Your daily quota was not deducted — please retry.",
              quota: refundedQuota,
            })
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
