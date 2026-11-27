"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  RecordStudyShareSchema,
  ToggleCommentEndorsementSchema,
  type RecordStudyShareInput,
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

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
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
    // 23505 = unique_violation on (user_id, study_id, shared_on); same-day
    // duplicate shares are intentionally idempotent.
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

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
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
