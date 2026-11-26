import type { GuidelineChangelogEntry } from "./projections";

/**
 * Orders guideline changelog entries newest-first so entries prepended by
 * `resolveConsensusDriftAction` appear as the latest entry.
 */
export function orderChangelogEntries(
  entries: GuidelineChangelogEntry[]
): GuidelineChangelogEntry[] {
  return [...entries].sort((a, b) => {
    const timeA = Date.parse(a.updated_at);
    const timeB = Date.parse(b.updated_at);
    if (Number.isNaN(timeA) || Number.isNaN(timeB)) {
      return 0;
    }
    return timeB - timeA;
  });
}
