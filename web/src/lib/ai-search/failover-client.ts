import {
  type AiSearchConfig,
  getAiSearchConfig,
} from "@/lib/ai-search/config";
import { AI_SYNTHESIS_SYSTEM_PROMPT } from "@/lib/ai-search/context-builder";
import type { AiTierName } from "@/lib/queries/projections";

export interface TierStreamResult {
  tierUsed: AiTierName;
  stream: AsyncGenerator<string>;
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

/**
 * Awaits the first non-empty text token before committing to a provider tier.
 * If the provider fails, times out, or closes without emitting any token,
 * the caller can still fail over cleanly to the next tier.
 */
async function commitOnFirstToken(
  rawStream: AsyncGenerator<string>,
  tierLabel: string
): Promise<AsyncGenerator<string>> {
  const first = await rawStream.next();
  if (first.done || !first.value) {
    await rawStream.return(undefined);
    throw new Error(`${tierLabel} closed without emitting tokens`);
  }

  const firstChunk = first.value;
  return (async function* () {
    yield firstChunk;
    for await (const chunk of rawStream) {
      yield chunk;
    }
  })();
}

async function openOpenAiCompatibleStream(params: {
  url: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  systemPrompt: string;
  userPrompt: string;
  tierLabel: string;
  extraHeaders?: Record<string, string>;
}): Promise<AsyncGenerator<string>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs);

  let response: Response;
  try {
    response = await fetch(params.url, {
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
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }

  if (!response.ok || !response.body) {
    clearTimeout(timer);
    throw new Error(`${params.tierLabel} HTTP ${response.status}`);
  }

  const body = response.body;
  const rawStream = (async function* () {
    try {
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
    } finally {
      clearTimeout(timer);
    }
  })();

  try {
    const committed = await commitOnFirstToken(rawStream, params.tierLabel);
    clearTimeout(timer);
    return committed;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
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
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }

  if (!response.ok || !response.body) {
    clearTimeout(timer);
    throw new Error(`Gemini HTTP ${response.status}`);
  }

  const body = response.body;
  const rawStream = (async function* () {
    try {
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
    } finally {
      clearTimeout(timer);
    }
  })();

  try {
    const committed = await commitOnFirstToken(rawStream, "Gemini");
    clearTimeout(timer);
    return committed;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Dependency-free native `fetch` 3-tier streaming failover client:
 * Tier 1: Groq (`openai/gpt-oss-20b`)
 * Tier 2: OpenRouter `:free` (primary + alt model)
 * Tier 3: Google Gemini Free Tier (`gemini-3.5-flash-lite`)
 *
 * Fails over on HTTP `429`, `5xx`, network error, timeout, or empty pre-stream
 * response before the first token is committed.
 */
export async function synthesizeWithFailover(params: {
  question: string;
  contextText: string;
  config?: AiSearchConfig;
}): Promise<TierStreamResult> {
  const config = params.config ?? getAiSearchConfig();
  const userPrompt = `User question: ${params.question}\n\n${params.contextText}`;
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
        tierLabel: "Groq",
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
          tierLabel: `OpenRouter(${model})`,
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
