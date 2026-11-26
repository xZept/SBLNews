import { describe, expect, it } from "vitest";
import {
  AddSecondaryCommentarySchema,
  ModerateStudySchema,
  ResolveConsensusDriftSchema,
} from "../src/lib/validations/moderation";
import {
  CreateCommentSchema,
  ToggleVoteSchema,
} from "../src/lib/validations/mutations";
import { HybridSearchSchema } from "../src/lib/validations/search";

const VALID_UUID = "11111111-1111-4111-8111-111111111111";

describe("HybridSearchSchema", () => {
  it("applies defaults and strips empty form strings", () => {
    const parsed = HybridSearchSchema.parse({
      q: "  lengthened partials  ",
      study_design: "",
      min_duration_weeks: "",
      trained_only: "",
    });
    expect(parsed.q).toBe("lengthened partials");
    expect(parsed.study_design).toBeUndefined();
    expect(parsed.min_duration_weeks).toBeUndefined();
    expect(parsed.trained_only).toBeUndefined();
    expect(parsed.limit).toBe(20);
  });

  it("rejects queries exceeding 200 characters", () => {
    const result = HybridSearchSchema.safeParse({ q: "a".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("enforces min_duration_weeks (0-520) and limit (1-50) bounds", () => {
    expect(
      HybridSearchSchema.safeParse({ min_duration_weeks: -1 }).success
    ).toBe(false);
    expect(
      HybridSearchSchema.safeParse({ min_duration_weeks: 521 }).success
    ).toBe(false);
    expect(HybridSearchSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(HybridSearchSchema.safeParse({ limit: 51 }).success).toBe(false);
    expect(
      HybridSearchSchema.safeParse({
        q: "volume",
        study_design: "meta_analysis",
        min_duration_weeks: "8",
        trained_only: "true",
        limit: "10",
      }).success
    ).toBe(true);
  });
});

describe("Moderation schemas", () => {
  it("validates ModerateStudySchema", () => {
    expect(
      ModerateStudySchema.safeParse({
        studyId: VALID_UUID,
        decision: "published",
      }).success
    ).toBe(true);
    expect(
      ModerateStudySchema.safeParse({
        studyId: "not-a-uuid",
        decision: "published",
      }).success
    ).toBe(false);
  });

  it("requires summary and grade when approving Consensus Drift", () => {
    const missingFields = ResolveConsensusDriftSchema.safeParse({
      alertId: VALID_UUID,
      decision: "approved",
      reviewerNotes: "Updated after 2026 meta-analysis.",
    });
    expect(missingFields.success).toBe(false);

    const validApproval = ResolveConsensusDriftSchema.safeParse({
      alertId: VALID_UUID,
      decision: "approved",
      reviewerNotes: "Updated after 2026 meta-analysis.",
      updatedEvidenceGrade: "A",
      updatedConsensusSummary:
        "10-20 hard sets per muscle group per week maximizes hypertrophy.",
    });
    expect(validApproval.success).toBe(true);

    const validDismissal = ResolveConsensusDriftSchema.safeParse({
      alertId: VALID_UUID,
      decision: "dismissed",
      reviewerNotes: "Duplicate scope of existing anchor meta-analysis.",
    });
    expect(validDismissal.success).toBe(true);
  });

  it("validates AddSecondaryCommentarySchema URLs", () => {
    expect(
      AddSecondaryCommentarySchema.safeParse({
        studyId: VALID_UUID,
        platform: "YouTube",
        creatorName: "Stronger By Science",
        title: "Volume Meta-Analysis Breakdown",
        url: "not-a-url",
      }).success
    ).toBe(false);

    expect(
      AddSecondaryCommentarySchema.safeParse({
        studyId: VALID_UUID,
        platform: "YouTube",
        creatorName: "Stronger By Science",
        title: "Volume Meta-Analysis Breakdown",
        url: "https://youtube.com/watch?v=abc123",
      }).success
    ).toBe(true);
  });
});

describe("Mutation schemas", () => {
  it("rejects empty or oversized comments and invalid UUIDs", () => {
    expect(
      ToggleVoteSchema.safeParse({ studyId: "invalid-uuid" }).success
    ).toBe(false);
    expect(
      CreateCommentSchema.safeParse({ studyId: VALID_UUID, body: "   " })
        .success
    ).toBe(false);
    expect(
      CreateCommentSchema.safeParse({
        studyId: VALID_UUID,
        body: "x".repeat(4001),
      }).success
    ).toBe(false);
  });
});
