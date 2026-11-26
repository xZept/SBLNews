import { z } from "zod";

export const ToggleVoteSchema = z.object({
  studyId: z.string().uuid("Invalid study ID"),
});

export const CreateCommentSchema = z.object({
  studyId: z.string().uuid("Invalid study ID"),
  parentCommentId: z.string().uuid("Invalid parent comment ID").nullable().optional(),
  body: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(4000, "Comment exceeds 4000 characters"),
});

export const UpdateCommentSchema = z.object({
  commentId: z.string().uuid("Invalid comment ID"),
  body: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(4000, "Comment exceeds 4000 characters"),
});

export const DeleteCommentSchema = z.object({
  commentId: z.string().uuid("Invalid comment ID"),
});

export type ToggleVoteInput = z.infer<typeof ToggleVoteSchema>;
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;
export type DeleteCommentInput = z.infer<typeof DeleteCommentSchema>;
