import { z } from "zod";

export const ModerateStudySchema = z.object({
  studyId: z.string().uuid("Invalid study ID"),
  decision: z.enum(["published", "rejected"]),
});

export const ResolveConsensusDriftSchema = z
  .object({
    alertId: z.string().uuid("Invalid alert ID"),
    decision: z.enum(["approved", "dismissed"]),
    reviewerNotes: z
      .string()
      .trim()
      .min(5, "Reviewer notes must be at least 5 characters")
      .max(1000, "Reviewer notes cannot exceed 1000 characters"),
    updatedEvidenceGrade: z.enum(["A", "B", "C", "D"]).optional(),
    updatedConsensusSummary: z
      .string()
      .trim()
      .min(10, "Consensus summary must be at least 10 characters")
      .max(2000, "Consensus summary cannot exceed 2000 characters")
      .optional(),
    updatedPracticalPrescription: z
      .string()
      .trim()
      .min(3, "Practical prescription must be at least 3 characters")
      .max(500, "Practical prescription cannot exceed 500 characters")
      .optional(),
  })
  .refine(
    (data) =>
      data.decision === "dismissed" ||
      (Boolean(data.updatedConsensusSummary) && Boolean(data.updatedEvidenceGrade)),
    {
      message:
        "Approving a Consensus Drift alert requires an updated consensus summary and evidence grade.",
    }
  );

export const AddSecondaryCommentarySchema = z.object({
  studyId: z.string().uuid("Invalid study ID"),
  platform: z.enum(["YouTube", "Podcast", "Article", "Social"]),
  creatorName: z
    .string()
    .trim()
    .min(2, "Creator name must be at least 2 characters")
    .max(120, "Creator name cannot exceed 120 characters"),
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters"),
  url: z.string().url("Must be a valid URL"),
});

export type ModerateStudyInput = z.infer<typeof ModerateStudySchema>;
export type ResolveConsensusDriftInput = z.infer<
  typeof ResolveConsensusDriftSchema
>;
export type AddSecondaryCommentaryInput = z.infer<
  typeof AddSecondaryCommentarySchema
>;
