import type { AiSearchRequestInput } from "@/lib/validations/ai-search";

export interface NormalizedAiQueryKey {
  cacheKey: string;
  normalizedQuery: string;
  filterSignature: string;
}

/**
 * Deterministically normalizes a user question for shared cache deduplication:
 * trims, collapses internal whitespace, lowercases, and strips leading/trailing
 * punctuation runs while preserving meaningful internal tokens (e.g. `1rm`, `full-rom`).
 */
export function normalizeAiQueryText(rawQuery: string): string {
  const collapsed = rawQuery.trim().replace(/\s+/g, " ").toLowerCase();
  const stripped = collapsed
    .replace(/^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu, "")
    .trim();

  return stripped.length >= 3 ? stripped : collapsed;
}

export function buildCanonicalFilterSignature(
  input: Pick<
    AiSearchRequestInput,
    "study_design" | "min_duration_weeks" | "trained_only"
  >
): string {
  const design = input.study_design ?? "all";
  const minWeeks =
    typeof input.min_duration_weeks === "number" &&
    Number.isFinite(input.min_duration_weeks)
      ? Math.max(0, Math.trunc(input.min_duration_weeks))
      : 0;
  const trained = input.trained_only === true ? "true" : "false";
  return `design=${design}|min_weeks=${minWeeks}|trained=${trained}`;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Produces a canonical 64-char SHA-256 hex `cache_key` from the normalized
 * question and canonical filter signature.
 */
export async function normalizeAiQueryKey(
  input: AiSearchRequestInput
): Promise<NormalizedAiQueryKey> {
  const normalizedQuery = normalizeAiQueryText(input.q);
  const filterSignature = buildCanonicalFilterSignature(input);
  const cacheKey = await sha256Hex(`${normalizedQuery}::${filterSignature}`);

  return {
    cacheKey,
    normalizedQuery,
    filterSignature,
  };
}
