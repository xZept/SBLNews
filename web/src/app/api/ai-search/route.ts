import { NextResponse } from "next/server";
import { getAiSearchConfig } from "@/lib/ai-search/config";
import {
  AI_SYNTHESIS_SYSTEM_PROMPT,
  buildAiStudyContext,
} from "@/lib/ai-search/context-builder";
import type { AiTierName } from "@/lib/queries/projections";
import { getAiCitationStudies } from "@/lib/queries/studies";
import { createClient } from "@/lib/supabase/server";
import { AiSearchRequestSchema } from "@/lib/validations/ai-search";

export const dynamic = "force-dynamic";

const NO_MATCHING_STUDIES_MESSAGE =
  "No matching peer-reviewed studies were found in SBL News for this question and filter combination. Try broadening your query or clearing study-design, duration, or trained-lifter filters.";

function formatSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function* readSseDataLines(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload) {
          yield payload;
        }
      }
    }

    const tail = buffer.trim();
    if (tail.startsWith("data:")) {
      const payload = tail.slice(5).trim();
      if (payload) {
        yield payload;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

interface TierStreamResult {
  tierUsed: AiTierName;
  stream: AsyncGenerator<string>;
}

async function openOpenAiCompatibleStream(params: {
  url: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  systemPrompt: string;
  userPrompt: string;
  extraHeaders?: Record<string, string>;
}): Promise<AsyncGenerator<string>> {
  const response = await fetch(params.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
      ...(params.extraHeaders ?? {}),
    },
    body: JSON.stringify({
      model: params.model,
      stream: true,
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(params.timeoutMs),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Provider HTTP ${response.status}`);
  }

  const body = response.body;
  return (async function* () {
    for await (const payload of readSseDataLines(body)) {
      if (payload === "[DONE]") break;
      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length > 0) {
          yield delta;
        }
      } catch {
        // Ignore malformed SSE keep-alives
      }
    }
  })();
}

async function openGeminiStream(params: {
  apiKey: string;
  model: string;
  timeoutMs: number;
  systemPrompt: string;
  userPrompt: string;
}): Promise<AsyncGenerator<string>> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    params.model
  )}:streamGenerateContent?alt=sse`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": params.apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: params.systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: params.userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 900,
      },
    }),
    signal: AbortSignal.timeout(params.timeoutMs),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Gemini HTTP ${response.status}`);
  }

  const body = response.body;
  return (async function* () {
    for await (const payload of readSseDataLines(body)) {
      if (payload === "[DONE]") break;
      try {
        const parsed = JSON.parse(payload) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };
        const parts = parsed.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (typeof part.text === "string" && part.text.length > 0) {
            yield part.text;
          }
        }
      } catch {
        // Ignore malformed SSE keep-alives
      }
    }
  })();
}

async function openSynthesisStream(
  question: string,
  contextText: string
): Promise<TierStreamResult> {
  const config = getAiSearchConfig();
  const userPrompt = `User question: ${question}\n\n${contextText}`;
  const errors: string[] = [];

  if (config.tiers.tier1Groq.apiKey) {
    try {
      const stream = await openOpenAiCompatibleStream({
        url: "https://api.groq.com/openai/v1/chat/completions",
        apiKey: config.tiers.tier1Groq.apiKey,
        model: config.tiers.tier1Groq.model,
        timeoutMs: config.tiers.tier1Groq.timeoutMs,
        systemPrompt: AI_SYNTHESIS_SYSTEM_PROMPT,
        userPrompt,
      });
      return { tierUsed: "groq", stream };
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Groq failed");
    }
  }

  if (config.tiers.tier2OpenRouter.apiKey) {
    for (const model of [
      config.tiers.tier2OpenRouter.model,
      config.tiers.tier2OpenRouter.altModel,
    ]) {
      try {
        const stream = await openOpenAiCompatibleStream({
          url: "https://openrouter.ai/api/v1/chat/completions",
          apiKey: config.tiers.tier2OpenRouter.apiKey,
          model,
          timeoutMs: config.tiers.tier2OpenRouter.timeoutMs,
          systemPrompt: AI_SYNTHESIS_SYSTEM_PROMPT,
          userPrompt,
          extraHeaders: {
            "X-Title": "SBL News AI Literature Search",
          },
        });
        return { tierUsed: "openrouter", stream };
      } catch (err) {
        errors.push(err instanceof Error ? err.message : "OpenRouter failed");
      }
    }
  }

  if (config.tiers.tier3Gemini.apiKey) {
    try {
      const stream = await openGeminiStream({
        apiKey: config.tiers.tier3Gemini.apiKey,
        model: config.tiers.tier3Gemini.model,
        timeoutMs: config.tiers.tier3Gemini.timeoutMs,
        systemPrompt: AI_SYNTHESIS_SYSTEM_PROMPT,
        userPrompt,
      });
      return { tierUsed: "gemini", stream };
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Gemini failed");
    }
  }

  throw new Error(
    errors.length > 0
      ? `All inference tiers failed: ${errors.join("; ")}`
      : "No AI inference provider API keys configured."
  );
}

export async function POST(request: Request) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message: "Sign in with Google or GitHub to use Ask AI literature synthesis.",
      },
      { status: 401 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message: "Sign in with Google or GitHub to use Ask AI literature synthesis.",
      },
      { status: 401 }
    );
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

  const citedStudies = await getAiCitationStudies(parsed.data, 5);

  if (citedStudies.length === 0) {
    return NextResponse.json({
      mode: "no_matching_studies",
      cached: false,
      answerMarkdown: null,
      citations: [],
      message: NO_MATCHING_STUDIES_MESSAGE,
    });
  }

  const builtContext = buildAiStudyContext(citedStudies);

  let tierStream: TierStreamResult;
  try {
    tierStream = await openSynthesisStream(
      parsed.data.q,
      builtContext.contextText
    );
  } catch (err) {
    console.error("AI synthesis tier error:", err);
    return NextResponse.json(
      {
        error: "ALL_TIERS_FAILED",
        message:
          "AI synthesis providers are temporarily unavailable. Please retry in a moment.",
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

        controller.enqueue(
          encoder.encode(
            formatSseEvent("done", {
              answerMarkdown: fullText.trim(),
              tierUsed: tierStream.tierUsed,
            })
          )
        );
      } catch (err) {
        console.error("AI synthesis stream interrupted:", err);
        controller.enqueue(
          encoder.encode(
            formatSseEvent("error", {
              error: "STREAM_INTERRUPTED",
              message: "AI synthesis interrupted. Please retry.",
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
