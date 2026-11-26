/**
 * Derive a deterministic 2-letter uppercase initials badge from a display name.
 *
 * - Multi-word names: first letter of the first token + first letter of the last token
 *   (e.g. "Eric Helms" -> "EH", "Dr. Mike Israetel" -> "DI").
 * - Single-word names: first 1-2 characters of the token (e.g. "Alex" -> "AL", "J" -> "J").
 * - Fallback when no alphanumeric/letter tokens exist: "SL".
 */
export function deriveInitials(displayName: string): string {
  const tokens = displayName.trim().match(/[\p{L}\p{N}]+/gu) ?? [];

  if (tokens.length === 0) {
    return "SL";
  }

  const firstToken = tokens[0];
  if (!firstToken) {
    return "SL";
  }

  if (tokens.length === 1) {
    const chars = Array.from(firstToken);
    return chars.slice(0, 2).join("").toUpperCase();
  }

  const lastToken = tokens[tokens.length - 1] ?? firstToken;
  const firstChar = Array.from(firstToken)[0] ?? "";
  const lastChar = Array.from(lastToken)[0] ?? "";
  const combined = `${firstChar}${lastChar}`.toUpperCase();

  return combined.length > 0 ? combined : "SL";
}
