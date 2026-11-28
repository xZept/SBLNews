import { z } from "zod";

export const StudyDesignEnum = z.enum([
  "meta_analysis",
  "systematic_review",
  "rct",
  "controlled_trial",
  "cohort_observational",
  "acute_crossover",
  "review_commentary",
]);

export const FeedTabEnum = z.enum(["daily", "weekly", "top"]);

export const FeedFilterSchema = z.object({
  tab: FeedTabEnum.default("daily"),
  study_design: StudyDesignEnum.optional(),
  trained_only: z.coerce.boolean().default(false),
});

export type FeedTab = z.infer<typeof FeedTabEnum>;
export type FeedFilterInput = z.infer<typeof FeedFilterSchema>;

export const SEARCH_QUERY_MAX_LENGTH = 300;

export const HybridSearchSchema = z.object({
  q: z
    .string()
    .trim()
    .max(
      SEARCH_QUERY_MAX_LENGTH,
      `Query must be ${SEARCH_QUERY_MAX_LENGTH} characters or fewer`
    )
    .default(""),
  study_design: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    StudyDesignEnum.optional()
  ),
  min_duration_weeks: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce.number().int().min(0).max(520).optional()
  ),
  trained_only: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      if (val === true || val === "true" || val === "on" || val === "1") return true;
      if (val === false || val === "false" || val === "0") return false;
      return val;
    },
    z.boolean().optional()
  ),
  limit: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce.number().int().min(1).max(50).default(20)
  ),
});

export type HybridSearchInput = z.infer<typeof HybridSearchSchema>;
