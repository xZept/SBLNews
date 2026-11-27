import { z } from "zod";

export const ShareChannelEnum = z.enum([
  "copy_citation",
  "x",
  "reddit",
  "whatsapp",
  "discord",
  "web_share",
  "friend_chat",
]);

export const RecordStudyShareSchema = z.object({
  studyId: z.string().uuid("Invalid study ID."),
  channel: ShareChannelEnum,
});

export const ToggleCommentEndorsementSchema = z.object({
  commentId: z.string().uuid("Invalid comment ID."),
});

export const SearchUsersByDisplayNameSchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, "Search query must be at least 2 characters.")
    .max(50, "Search query must be 50 characters or fewer."),
});

export const FriendTargetSchema = z.object({
  targetUserId: z.string().uuid("Invalid user ID."),
});

export const RespondFriendRequestSchema = z.object({
  friendshipId: z.string().uuid("Invalid friendship ID."),
  decision: z.enum(["accept", "decline", "cancel"]),
});

export const SendDirectMessageSchema = z.object({
  recipientId: z.string().uuid("Invalid recipient ID."),
  body: z
    .string()
    .trim()
    .min(1, "Message cannot be empty.")
    .max(1000, "Message must be 1,000 characters or fewer."),
});

export const SendStudyToFriendSchema = z.object({
  recipientId: z.string().uuid("Invalid recipient ID."),
  studyId: z.string().uuid("Invalid study ID."),
  note: z
    .string()
    .trim()
    .max(240, "Note must be 240 characters or fewer.")
    .optional()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

export const DirectMessageThreadCursorSchema = z.object({
  friendId: z.string().uuid("Invalid friend ID."),
  cursorCreatedAt: z.string().datetime({ offset: true }).optional(),
  cursorMessageId: z.string().uuid().optional(),
});

export const PublicUpvotesCursorSchema = z.object({
  userId: z.string().uuid("Invalid user ID."),
  cursorVotedAt: z.string().datetime({ offset: true }),
  cursorStudyId: z.string().uuid("Invalid study ID."),
});

export type ShareChannelInput = z.infer<typeof ShareChannelEnum>;
export type RecordStudyShareInput = z.infer<typeof RecordStudyShareSchema>;
export type ToggleCommentEndorsementInput = z.infer<
  typeof ToggleCommentEndorsementSchema
>;
export type SearchUsersByDisplayNameInput = z.infer<
  typeof SearchUsersByDisplayNameSchema
>;
export type FriendTargetInput = z.infer<typeof FriendTargetSchema>;
export type RespondFriendRequestInput = z.infer<
  typeof RespondFriendRequestSchema
>;
export type SendDirectMessageInput = z.infer<typeof SendDirectMessageSchema>;
export type SendStudyToFriendInput = z.infer<typeof SendStudyToFriendSchema>;
export type DirectMessageThreadCursor = z.infer<
  typeof DirectMessageThreadCursorSchema
>;
export type PublicUpvotesCursor = z.infer<typeof PublicUpvotesCursorSchema>;
