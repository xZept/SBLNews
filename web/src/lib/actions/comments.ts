"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  CreateCommentSchema,
  DeleteCommentSchema,
  UpdateCommentSchema,
} from "@/lib/validations/mutations";

export type CommentActionResult =
  | { ok: true; commentId?: string }
  | {
      ok: false;
      error: "AUTH_REQUIRED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_ERROR" | "DB_ERROR";
      message: string;
    };

export async function createCommentAction(input: {
  studyId: string;
  parentCommentId?: string | null;
  body: string;
}): Promise<CommentActionResult> {
  const parsed = CreateCommentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid comment payload.",
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
      message: "Sign in with Google or GitHub to post a comment.",
    };
  }

  const { studyId, parentCommentId, body } = parsed.data;
  const { data, error } = await supabase
    .from("comments")
    .insert({
      study_id: studyId,
      author_id: user.id,
      parent_comment_id: parentCommentId ?? null,
      body,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Failed to post comment.",
    };
  }

  revalidatePath(`/study/${studyId}`);
  revalidatePath("/");
  return { ok: true, commentId: data.id };
}

export async function updateCommentAction(input: {
  commentId: string;
  body: string;
}): Promise<CommentActionResult> {
  const parsed = UpdateCommentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid comment update.",
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
      message: "Sign in to edit your comment.",
    };
  }

  const { commentId, body } = parsed.data;
  const { data: existing, error: fetchError } = await supabase
    .from("comments")
    .select("id, study_id, author_id, is_deleted")
    .eq("id", commentId)
    .maybeSingle();

  if (fetchError || !existing) {
    return {
      ok: false,
      error: "NOT_FOUND",
      message: "Comment not found.",
    };
  }

  if (existing.author_id !== user.id) {
    return {
      ok: false,
      error: "FORBIDDEN",
      message: "You can only edit your own comments.",
    };
  }

  if (existing.is_deleted) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: "Deleted comments cannot be edited.",
    };
  }

  const { error: updateError } = await supabase
    .from("comments")
    .update({
      body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", commentId)
    .eq("author_id", user.id);

  if (updateError) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Failed to update comment.",
    };
  }

  revalidatePath(`/study/${existing.study_id}`);
  return { ok: true, commentId };
}

export async function deleteCommentAction(input: {
  commentId: string;
}): Promise<CommentActionResult> {
  const parsed = DeleteCommentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid comment ID.",
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
      message: "Sign in to delete your comment.",
    };
  }

  const { commentId } = parsed.data;
  const { data: existing, error: fetchError } = await supabase
    .from("comments")
    .select("id, study_id, author_id")
    .eq("id", commentId)
    .maybeSingle();

  if (fetchError || !existing) {
    return {
      ok: false,
      error: "NOT_FOUND",
      message: "Comment not found.",
    };
  }

  if (existing.author_id !== user.id) {
    return {
      ok: false,
      error: "FORBIDDEN",
      message: "You can only delete your own comments.",
    };
  }

  // Check if child replies exist; soft-delete if so to preserve thread tree
  const { count: childCount, error: countError } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("parent_comment_id", commentId);

  if (countError) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Failed to check reply threads.",
    };
  }

  if ((childCount ?? 0) > 0) {
    const { error: softDeleteError } = await supabase
      .from("comments")
      .update({
        is_deleted: true,
        body: "[deleted]",
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId)
      .eq("author_id", user.id);

    if (softDeleteError) {
      return {
        ok: false,
        error: "DB_ERROR",
        message: "Failed to delete comment.",
      };
    }
  } else {
    const { error: hardDeleteError } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("author_id", user.id);

    if (hardDeleteError) {
      return {
        ok: false,
        error: "DB_ERROR",
        message: "Failed to delete comment.",
      };
    }
  }

  revalidatePath(`/study/${existing.study_id}`);
  revalidatePath("/");
  return { ok: true, commentId };
}
