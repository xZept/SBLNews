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
