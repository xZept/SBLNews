"use server";

import { createClient } from "@/lib/supabase/server";
import {
  RecordStudyShareSchema,
  type RecordStudyShareInput,
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
