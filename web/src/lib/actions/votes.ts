"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ToggleVoteSchema } from "@/lib/validations/mutations";

export type ToggleVoteResult =
  | { ok: true; voted: boolean }
  | { ok: false; error: "AUTH_REQUIRED" | "VALIDATION_ERROR" | "DB_ERROR"; message: string };

export async function toggleVoteAction(input: {
  studyId: string;
}): Promise<ToggleVoteResult> {
  const parsed = ToggleVoteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid study ID",
    };
  }

  const { studyId } = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      message: "Sign in with Google or GitHub to upvote studies.",
    };
  }

  const { data: existingVote, error: selectError } = await supabase
    .from("votes")
    .select("study_id")
    .eq("study_id", studyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (selectError) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Failed to check vote status.",
    };
  }

  if (existingVote) {
    const { error: deleteError } = await supabase
      .from("votes")
      .delete()
      .eq("study_id", studyId)
      .eq("user_id", user.id);

    if (deleteError) {
      return {
        ok: false,
        error: "DB_ERROR",
        message: "Failed to remove upvote.",
      };
    }

    revalidatePath("/");
    revalidatePath(`/study/${studyId}`);
    return { ok: true, voted: false };
  }

  const { error: insertError } = await supabase.from("votes").insert({
    study_id: studyId,
    user_id: user.id,
  });

  if (insertError) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Failed to record upvote.",
    };
  }

  revalidatePath("/");
  revalidatePath(`/study/${studyId}`);
  return { ok: true, voted: true };
}
