"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  DIRECT_MESSAGE_COLUMNS,
  type CursorPage,
  type DirectMessageItem,
  type ProfileFriendshipState,
  type StudyDesignType,
} from "@/lib/queries/projections";
import {
  getDirectMessageThread,
  getFriendsOverview,
  getUnreadSocialCounts,
  searchProfilesByName,
  type ChatThreadCursor,
  type FriendsOverview,
  type SocialSearchResultItem,
  type UnreadSocialCounts,
} from "@/lib/queries/social";
import {
  DirectMessageThreadCursorSchema,
  FriendTargetSchema,
  RecordStudyShareSchema,
  RespondFriendRequestSchema,
  SearchUsersByDisplayNameSchema,
  SendDirectMessageSchema,
  SendStudyToFriendSchema,
  ToggleCommentEndorsementSchema,
  type DirectMessageThreadCursor,
  type FriendTargetInput,
  type RecordStudyShareInput,
  type RespondFriendRequestInput,
  type SearchUsersByDisplayNameInput,
  type SendDirectMessageInput,
  type SendStudyToFriendInput,
  type ToggleCommentEndorsementInput,
} from "@/lib/validations/social";

export type SocialActionErrorCode =
  | "AUTH_REQUIRED"
  | "VALIDATION_ERROR"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "DB_ERROR";

export type RecordStudyShareResult =
  | { ok: true; recorded: boolean }
  | { ok: false; error: SocialActionErrorCode; message: string };

export type ToggleCommentEndorsementResult =
  | { ok: true; endorsed: boolean; helpfulCount: number }
  | { ok: false; error: SocialActionErrorCode; message: string };

export type GetUnreadSocialCountsResult =
  | { ok: true; counts: UnreadSocialCounts }
  | { ok: false; error: SocialActionErrorCode; message: string };

export type GetSocialDrawerOverviewResult =
  | { ok: true; overview: FriendsOverview }
  | { ok: false; error: SocialActionErrorCode; message: string };

export type SearchUsersResult =
  | { ok: true; users: SocialSearchResultItem[] }
  | { ok: false; error: SocialActionErrorCode; message: string };

export type FriendMutationResult =
  | {
      ok: true;
      friendshipId: string | null;
      state: ProfileFriendshipState;
    }
  | { ok: false; error: SocialActionErrorCode; message: string };

export type GetChatThreadResult =
  | { ok: true; page: CursorPage<DirectMessageItem, ChatThreadCursor> }
  | { ok: false; error: SocialActionErrorCode; message: string };

export type MarkThreadReadResult =
  | { ok: true; updatedCount: number }
  | { ok: false; error: SocialActionErrorCode; message: string };

export type SendDirectMessageResult =
  | { ok: true; message: DirectMessageItem }
  | { ok: false; error: SocialActionErrorCode; message: string };

const UuidSchema = z.string().uuid();

function unwrapSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Records a study share event for signed-in users (deduplicated per UTC day).
 * Signed-out visitors succeed with `recorded: false` so external sharing
 * never requires authentication.
 */
export async function recordStudyShareAction(
  input: RecordStudyShareInput
): Promise<RecordStudyShareResult> {
  const parsed = RecordStudyShareSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid share payload.",
    };
  }

  if (!isSupabaseConfigured()) {
    return { ok: true, recorded: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: true, recorded: false };
  }

  const sharedOnUtc = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("study_shares").insert({
    user_id: user.id,
    study_id: parsed.data.studyId,
    channel: parsed.data.channel,
    shared_on: sharedOnUtc,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: true, recorded: false };
    }

    return {
      ok: false,
      error: "DB_ERROR",
      message: error.message,
    };
  }

  return { ok: true, recorded: true };
}

/**
 * Toggles a "Helpful" endorsement on a non-deleted study comment.
 * Rejects self-endorsements and updates `helpful_count` + author Aura via DB triggers.
 */
export async function toggleCommentEndorsementAction(
  input: ToggleCommentEndorsementInput
): Promise<ToggleCommentEndorsementResult> {
  const parsed = ToggleCommentEndorsementSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid comment ID.",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Supabase is not configured.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      message: "Sign in to endorse helpful comments.",
    };
  }

  const { data: comment, error: commentError } = await supabase
    .from("comments")
    .select("id, study_id, author_id, is_deleted, helpful_count")
    .eq("id", parsed.data.commentId)
    .maybeSingle();

  if (commentError) {
    return { ok: false, error: "DB_ERROR", message: commentError.message };
  }

  if (!comment || comment.is_deleted) {
    return {
      ok: false,
      error: "NOT_FOUND",
      message: "Comment not found.",
    };
  }

  if (comment.author_id === user.id) {
    return {
      ok: false,
      error: "FORBIDDEN",
      message: "You cannot endorse your own comment.",
    };
  }

  const { data: existing, error: lookupError } = await supabase
    .from("comment_endorsements")
    .select("comment_id")
    .eq("comment_id", comment.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError) {
    return { ok: false, error: "DB_ERROR", message: lookupError.message };
  }

  let endorsed = false;

  if (existing) {
    const { error: deleteError } = await supabase
      .from("comment_endorsements")
      .delete()
      .eq("comment_id", comment.id)
      .eq("user_id", user.id);

    if (deleteError) {
      return { ok: false, error: "DB_ERROR", message: deleteError.message };
    }
    endorsed = false;
  } else {
    const { error: insertError } = await supabase
      .from("comment_endorsements")
      .insert({
        comment_id: comment.id,
        user_id: user.id,
      });

    if (insertError) {
      return { ok: false, error: "DB_ERROR", message: insertError.message };
    }
    endorsed = true;
  }

  const { data: refreshed } = await supabase
    .from("comments")
    .select("helpful_count")
    .eq("id", comment.id)
    .maybeSingle();

  const helpfulCount =
    typeof refreshed?.helpful_count === "number"
      ? refreshed.helpful_count
      : Math.max(0, (comment.helpful_count ?? 0) + (endorsed ? 1 : -1));

  revalidatePath(`/study/${comment.study_id}`);
  revalidatePath("/");

  return { ok: true, endorsed, helpfulCount };
}

export async function getUnreadSocialCountsAction(): Promise<GetUnreadSocialCountsResult> {
  const counts = await getUnreadSocialCounts();
  return { ok: true, counts };
}

export async function getSocialDrawerOverviewAction(): Promise<GetSocialDrawerOverviewResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Supabase is not configured.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      message: "Sign in to view your friends and messages.",
    };
  }

  const overview = await getFriendsOverview();
  return { ok: true, overview };
}

export async function searchUsersAction(
  input: SearchUsersByDisplayNameInput
): Promise<SearchUsersResult> {
  const parsed = SearchUsersByDisplayNameSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message:
        parsed.error.issues[0]?.message ?? "Enter at least 2 characters.",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Supabase is not configured.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      message: "Sign in to search community members.",
    };
  }

  const users = await searchProfilesByName(parsed.data.query);
  return { ok: true, users };
}

export async function sendFriendRequestAction(
  input: FriendTargetInput
): Promise<FriendMutationResult> {
  const parsed = FriendTargetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid user ID.",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Supabase is not configured.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      message: "Sign in to send friend requests.",
    };
  }

  if (parsed.data.targetUserId === user.id) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: "You cannot send a friend request to yourself.",
    };
  }

  const { data, error } = await supabase.rpc("send_friend_request", {
    p_target_user_id: parsed.data.targetUserId,
  });

  if (error) {
    return {
      ok: false,
      error: error.message.includes("blocked") || error.message.includes("cannot")
        ? "FORBIDDEN"
        : "DB_ERROR",
      message: error.message,
    };
  }

  const row = unwrapSingle(
    data as { friendship_id: string; state: ProfileFriendshipState }[] | null
  );

  revalidatePath(`/profile/${parsed.data.targetUserId}`);
  return {
    ok: true,
    friendshipId: row?.friendship_id ?? null,
    state: row?.state ?? "outgoing_pending",
  };
}

export async function respondFriendRequestAction(
  input: RespondFriendRequestInput
): Promise<FriendMutationResult> {
  const parsed = RespondFriendRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message:
        parsed.error.issues[0]?.message ?? "Invalid friend request action.",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Supabase is not configured.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      message: "Sign in to respond to friend requests.",
    };
  }

  const { data, error } = await supabase.rpc("respond_friend_request", {
    p_friendship_id: parsed.data.friendshipId,
    p_decision: parsed.data.decision,
  });

  if (error) {
    return {
      ok: false,
      error: error.message.includes("not found") ? "NOT_FOUND" : "FORBIDDEN",
      message: error.message,
    };
  }

  const row = unwrapSingle(
    data as { friendship_id: string; state: ProfileFriendshipState }[] | null
  );

  revalidatePath("/profile");
  return {
    ok: true,
    friendshipId: row?.state === "friends" ? row.friendship_id : null,
    state: row?.state ?? "none",
  };
}

export async function unfriendAction(
  input: FriendTargetInput
): Promise<FriendMutationResult> {
  const parsed = FriendTargetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid user ID.",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Supabase is not configured.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      message: "Sign in to manage friends.",
    };
  }

  const { error } = await supabase.rpc("remove_or_unblock_friendship", {
    p_target_user_id: parsed.data.targetUserId,
  });

  if (error) {
    return { ok: false, error: "DB_ERROR", message: error.message };
  }

  revalidatePath(`/profile/${parsed.data.targetUserId}`);
  return { ok: true, friendshipId: null, state: "none" };
}

export async function blockUserAction(
  input: FriendTargetInput
): Promise<FriendMutationResult> {
  const parsed = FriendTargetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid user ID.",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Supabase is not configured.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      message: "Sign in to block users.",
    };
  }

  const { data, error } = await supabase.rpc("block_user", {
    p_target_user_id: parsed.data.targetUserId,
  });

  if (error) {
    return { ok: false, error: "DB_ERROR", message: error.message };
  }

  revalidatePath(`/profile/${parsed.data.targetUserId}`);
  return {
    ok: true,
    friendshipId: (data as string | null) ?? null,
    state: "blocked_by_me",
  };
}

export async function unblockUserAction(
  input: FriendTargetInput
): Promise<FriendMutationResult> {
  return unfriendAction(input);
}

export async function getChatThreadAction(
  input: DirectMessageThreadCursor
): Promise<GetChatThreadResult> {
  const parsed = DirectMessageThreadCursorSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid thread parameters.",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Supabase is not configured.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      message: "Sign in to read messages.",
    };
  }

  const page = await getDirectMessageThread(parsed.data);
  return { ok: true, page };
}

export async function markThreadReadAction(input: {
  friendId: string;
}): Promise<MarkThreadReadResult> {
  const parsed = UuidSchema.safeParse(input.friendId);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: "Invalid friend ID.",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Supabase is not configured.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      message: "Sign in to update read status.",
    };
  }

  const { data, error } = await supabase.rpc("mark_thread_messages_read", {
    p_friend_id: parsed.data,
  });

  if (error) {
    return { ok: false, error: "DB_ERROR", message: error.message };
  }

  return { ok: true, updatedCount: Number(data ?? 0) };
}

interface RawInsertedDirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string | null;
  study_id: string | null;
  has_study_attachment: boolean;
  read_at: string | null;
  created_at: string;
  study:
    | {
        id: string;
        title: string;
        journal: string;
        publication_year: number;
        study_design: StudyDesignType;
        quality_score: number;
      }
    | {
        id: string;
        title: string;
        journal: string;
        publication_year: number;
        study_design: StudyDesignType;
        quality_score: number;
      }[]
    | null;
}

export async function sendDirectMessageAction(
  input: SendDirectMessageInput
): Promise<SendDirectMessageResult> {
  const parsed = SendDirectMessageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid message.",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Supabase is not configured.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      message: "Sign in to send messages.",
    };
  }

  const { data, error } = await supabase
    .from("direct_messages")
    .insert({
      sender_id: user.id,
      recipient_id: parsed.data.recipientId,
      body: parsed.data.body,
      has_study_attachment: false,
    })
    .select(DIRECT_MESSAGE_COLUMNS)
    .single();

  if (error || !data) {
    const isForbidden = error?.code === "42501";
    return {
      ok: false,
      error: isForbidden ? "FORBIDDEN" : "DB_ERROR",
      message: isForbidden
        ? "Only mutual accepted friends can exchange direct messages."
        : error?.message ?? "Failed to send message.",
    };
  }

  const row = data as unknown as RawInsertedDirectMessage;
  return {
    ok: true,
    message: {
      id: row.id,
      sender_id: row.sender_id,
      recipient_id: row.recipient_id,
      body: row.body,
      study_id: row.study_id,
      has_study_attachment: row.has_study_attachment,
      read_at: row.read_at,
      created_at: row.created_at,
      study: unwrapSingle(row.study),
    },
  };
}

export async function sendStudyToFriendAction(
  input: SendStudyToFriendInput
): Promise<SendDirectMessageResult> {
  const parsed = SendStudyToFriendSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid study send payload.",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Supabase is not configured.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      message: "Sign in to send studies to friends.",
    };
  }

  const { data, error } = await supabase
    .from("direct_messages")
    .insert({
      sender_id: user.id,
      recipient_id: parsed.data.recipientId,
      body: parsed.data.note,
      study_id: parsed.data.studyId,
      has_study_attachment: true,
    })
    .select(DIRECT_MESSAGE_COLUMNS)
    .single();

  if (error || !data) {
    const isForbidden = error?.code === "42501";
    return {
      ok: false,
      error: isForbidden ? "FORBIDDEN" : "DB_ERROR",
      message: isForbidden
        ? "Only mutual accepted friends can share studies directly."
        : error?.message ?? "Failed to send study.",
    };
  }

  // Record Aura-qualifying share event (ignore same-day duplicate conflict)
  const sharedOnUtc = new Date().toISOString().slice(0, 10);
  await supabase.from("study_shares").insert({
    user_id: user.id,
    study_id: parsed.data.studyId,
    channel: "friend_chat",
    shared_on: sharedOnUtc,
  });

  const row = data as unknown as RawInsertedDirectMessage;
  return {
    ok: true,
    message: {
      id: row.id,
      sender_id: row.sender_id,
      recipient_id: row.recipient_id,
      body: row.body,
      study_id: row.study_id,
      has_study_attachment: row.has_study_attachment,
      read_at: row.read_at,
      created_at: row.created_at,
      study: unwrapSingle(row.study),
    },
  };
}
