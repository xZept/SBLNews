import { z } from "zod";

export const PROFILE_PAGE_SIZE = 20 as const;

export const CommunityRoleEnum = z.enum([
  "Lifter",
  "Strength Coach",
  "Exercise Researcher",
  "Clinician",
  "Student",
]);

export const ThemePreferenceEnum = z.enum(["light", "dark"]);

export const UpdateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters.")
    .max(50, "Display name must be 50 characters or fewer."),
  affiliationRole: CommunityRoleEnum.nullable(),
  bio: z
    .string()
    .trim()
    .max(160, "Short bio must be 160 characters or fewer.")
    .transform((val) => (val.length === 0 ? null : val))
    .nullable(),
  themePreference: ThemePreferenceEnum,
});

export const UpdateThemePreferenceSchema = z.object({
  themePreference: ThemePreferenceEnum,
});

export const UpdateAvatarUrlSchema = z.object({
  avatarUrl: z
    .string()
    .url("Invalid avatar URL.")
    .max(500, "Avatar URL exceeds maximum length.")
    .nullable(),
});

export const UpvotedStudiesCursorSchema = z.object({
  cursorVotedAt: z.string().datetime({ offset: true }),
  cursorStudyId: z.string().uuid(),
});

export const CommentHistoryCursorSchema = z.object({
  userId: z.string().uuid(),
  cursorCreatedAt: z.string().datetime({ offset: true }),
  cursorCommentId: z.string().uuid(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type UpdateThemePreferenceInput = z.infer<typeof UpdateThemePreferenceSchema>;
export type UpdateAvatarUrlInput = z.infer<typeof UpdateAvatarUrlSchema>;
export type UpvotedStudiesCursor = z.infer<typeof UpvotedStudiesCursorSchema>;
export type CommentHistoryCursor = z.infer<typeof CommentHistoryCursorSchema>;
