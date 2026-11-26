export const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";

/**
 * Generates a 768-dim Gemini embedding for a search query via native fetch.
 * Returns null on empty query, missing GEMINI_API_KEY, timeout, or API error
 * so hybrid search gracefully falls back to keyword-only matching.
 */
export async function generateQueryEmbedding(
  queryText: string
): Promise<number[] | null> {
  const trimmed = queryText.trim();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!trimmed || !apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${encodeURIComponent(
        apiKey
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${GEMINI_EMBEDDING_MODEL}`,
          content: { parts: [{ text: trimmed }] },
          taskType: "RETRIEVAL_QUERY",
          outputDimensionality: 768,
        }),
        signal: AbortSignal.timeout(4000),
      }
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      embedding?: { values?: unknown };
    };
    const values = payload.embedding?.values;
    if (
      !Array.isArray(values) ||
      values.length !== 768 ||
      !values.every((v) => typeof v === "number" && Number.isFinite(v))
    ) {
      return null;
    }

    return values as number[];
  } catch {
    return null;
  }
}
