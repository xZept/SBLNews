/**
 * Deterministic Aura scoring constants and pure TypeScript mirror of
 * `private.recompute_user_aura` (migration 0009).
 *
 * Used for unit testing and transparent documentation in `/methodology`
 * (Pillar 5). Database triggers remain the authoritative source of truth
 * for persisted `profiles.aura_score`.
 */

export interface AuraRuleSpec {
  key: "comments" | "endorsements" | "upvotes" | "shares";
  label: string;
  pointsPerAction: number;
  dailyCap: number;
  maxActionsPerDay: number;
  ruleSummary: string;
}

export const AURA_WEIGHTS = {
  comment: 5,
  endorsementReceived: 2,
  upvote: 1,
  share: 2,
} as const;

export const AURA_DAILY_CAPS = {
  comment: 25,
  endorsementReceived: 20,
  upvote: 10,
  share: 10,
} as const;

export const AURA_RULES: readonly AuraRuleSpec[] = [
  {
    key: "comments",
    label: "Discussion Comment Posted",
    pointsPerAction: AURA_WEIGHTS.comment,
    dailyCap: AURA_DAILY_CAPS.comment,
    maxActionsPerDay: AURA_DAILY_CAPS.comment / AURA_WEIGHTS.comment,
    ruleSummary:
      "Non-deleted comments on published studies. Deleting a comment removes its points.",
  },
  {
    key: "endorsements",
    label: "Helpful Endorsement Received",
    pointsPerAction: AURA_WEIGHTS.endorsementReceived,
    dailyCap: AURA_DAILY_CAPS.endorsementReceived,
    maxActionsPerDay:
      AURA_DAILY_CAPS.endorsementReceived / AURA_WEIGHTS.endorsementReceived,
    ruleSummary:
      "Endorsements from other users on your non-deleted comments. Removing an endorsement deducts points.",
  },
  {
    key: "upvotes",
    label: "Study Upvote",
    pointsPerAction: AURA_WEIGHTS.upvote,
    dailyCap: AURA_DAILY_CAPS.upvote,
    maxActionsPerDay: AURA_DAILY_CAPS.upvote / AURA_WEIGHTS.upvote,
    ruleSummary:
      "Upvotes cast on published studies. Un-upvoting removes the point.",
  },
  {
    key: "shares",
    label: "Study Share",
    pointsPerAction: AURA_WEIGHTS.share,
    dailyCap: AURA_DAILY_CAPS.share,
    maxActionsPerDay: AURA_DAILY_CAPS.share / AURA_WEIGHTS.share,
    ruleSummary:
      "Distinct published studies shared per UTC day (copy citation, social, or friend send).",
  },
] as const;

export interface AuraCommentEvent {
  createdAt: string;
  isDeleted?: boolean;
  isPublished?: boolean;
}

export interface AuraEndorsementEvent {
  createdAt: string;
  isSelf?: boolean;
  isCommentDeleted?: boolean;
  isPublished?: boolean;
}

export interface AuraUpvoteEvent {
  createdAt: string;
  isPublished?: boolean;
}

export interface AuraShareEvent {
  studyId: string;
  sharedOnUtc?: string;
  createdAt?: string;
  isPublished?: boolean;
}

export interface AuraContributionInput {
  comments?: readonly AuraCommentEvent[];
  endorsementsReceived?: readonly AuraEndorsementEvent[];
  upvotes?: readonly AuraUpvoteEvent[];
  shares?: readonly AuraShareEvent[];
}

export interface AuraBreakdown {
  total: number;
  comments: number;
  endorsements: number;
  upvotes: number;
  shares: number;
}

function toUtcDateBucket(isoOrDate: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)) {
    return isoOrDate;
  }
  const parsed = new Date(isoOrDate);
  if (Number.isNaN(parsed.getTime())) {
    return isoOrDate.slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

function sumCappedDailyCounts(
  dayCounts: Map<string, number>,
  weight: number,
  dailyCap: number
): number {
  let subtotal = 0;
  for (const count of dayCounts.values()) {
    subtotal += Math.min(count * weight, dailyCap);
  }
  return subtotal;
}

/**
 * Computes deterministic Aura score and per-category breakdown from
 * underlying contribution events, mirroring `private.recompute_user_aura`.
 */
export function computeDeterministicAuraBreakdown(
  input: AuraContributionInput
): AuraBreakdown {
  const commentDays = new Map<string, number>();
  for (const comment of input.comments ?? []) {
    if (comment.isDeleted || comment.isPublished === false) continue;
    const day = toUtcDateBucket(comment.createdAt);
    commentDays.set(day, (commentDays.get(day) ?? 0) + 1);
  }

  const endorsementDays = new Map<string, number>();
  for (const endorsement of input.endorsementsReceived ?? []) {
    if (
      endorsement.isSelf ||
      endorsement.isCommentDeleted ||
      endorsement.isPublished === false
    ) {
      continue;
    }
    const day = toUtcDateBucket(endorsement.createdAt);
    endorsementDays.set(day, (endorsementDays.get(day) ?? 0) + 1);
  }

  const upvoteDays = new Map<string, number>();
  for (const upvote of input.upvotes ?? []) {
    if (upvote.isPublished === false) continue;
    const day = toUtcDateBucket(upvote.createdAt);
    upvoteDays.set(day, (upvoteDays.get(day) ?? 0) + 1);
  }

  const shareDays = new Map<string, Set<string>>();
  for (const share of input.shares ?? []) {
    if (share.isPublished === false) continue;
    const rawDate = share.sharedOnUtc ?? share.createdAt;
    if (!rawDate) continue;
    const day = toUtcDateBucket(rawDate);
    let seenStudies = shareDays.get(day);
    if (!seenStudies) {
      seenStudies = new Set<string>();
      shareDays.set(day, seenStudies);
    }
    seenStudies.add(share.studyId);
  }

  const shareCounts = new Map<string, number>();
  for (const [day, studies] of shareDays.entries()) {
    shareCounts.set(day, studies.size);
  }

  const comments = sumCappedDailyCounts(
    commentDays,
    AURA_WEIGHTS.comment,
    AURA_DAILY_CAPS.comment
  );
  const endorsements = sumCappedDailyCounts(
    endorsementDays,
    AURA_WEIGHTS.endorsementReceived,
    AURA_DAILY_CAPS.endorsementReceived
  );
  const upvotes = sumCappedDailyCounts(
    upvoteDays,
    AURA_WEIGHTS.upvote,
    AURA_DAILY_CAPS.upvote
  );
  const shares = sumCappedDailyCounts(
    shareCounts,
    AURA_WEIGHTS.share,
    AURA_DAILY_CAPS.share
  );

  return {
    total: comments + endorsements + upvotes + shares,
    comments,
    endorsements,
    upvotes,
    shares,
  };
}

/**
 * Returns the total deterministic Aura score for the given contributions.
 */
export function computeDeterministicAura(
  input: AuraContributionInput
): number {
  return computeDeterministicAuraBreakdown(input).total;
}
