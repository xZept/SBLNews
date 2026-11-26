"use server";

import { revalidatePath } from "next/cache";
import { AdminAuthError, assertAdmin } from "@/lib/supabase/admin-guard";
import type { GuidelineChangelogEntry } from "@/lib/queries/projections";
import {
  AddSecondaryCommentarySchema,
  ModerateStudySchema,
  ResolveConsensusDriftSchema,
  type AddSecondaryCommentaryInput,
  type ModerateStudyInput,
  type ResolveConsensusDriftInput,
} from "@/lib/validations/moderation";

export type ModerationActionResult =
  | { ok: true; message: string }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION_ERROR" | "DB_ERROR";
      message: string;
    };

function mapAuthError(err: unknown): ModerationActionResult {
  if (err instanceof AdminAuthError) {
    return {
      ok: false,
      error: err.statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
      message: err.message,
    };
  }
  return {
    ok: false,
    error: "FORBIDDEN",
    message: "Administrator privileges required.",
  };
}

export async function moderateStudyAction(
  input: ModerateStudyInput
): Promise<ModerationActionResult> {
  let adminCtx;
  try {
    adminCtx = await assertAdmin();
  } catch (err) {
    return mapAuthError(err);
  }

  const parsed = ModerateStudySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid moderation request",
    };
  }

  const { studyId, decision } = parsed.data;
  const { error } = await adminCtx.supabase
    .from("studies")
    .update({ publication_status: decision })
    .eq("id", studyId);

  if (error) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Failed to update study publication status.",
    };
  }

  revalidatePath("/");
  revalidatePath(`/study/${studyId}`);
  revalidatePath("/admin/review");

  return {
    ok: true,
    message:
      decision === "published"
        ? "Study approved and published to feed."
        : "Study rejected.",
  };
}

export async function resolveConsensusDriftAction(
  input: ResolveConsensusDriftInput
): Promise<ModerationActionResult> {
  let adminCtx;
  try {
    adminCtx = await assertAdmin();
  } catch (err) {
    return mapAuthError(err);
  }

  const parsed = ResolveConsensusDriftSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid drift resolution",
    };
  }

  const {
    alertId,
    decision,
    reviewerNotes,
    updatedEvidenceGrade,
    updatedConsensusSummary,
    updatedPracticalPrescription,
  } = parsed.data;

  const { data: alert, error: alertFetchError } = await adminCtx.supabase
    .from("consensus_drift_alerts")
    .select("id, guideline_id, trigger_study_id, status")
    .eq("id", alertId)
    .maybeSingle();

  if (alertFetchError || !alert) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Consensus Drift alert not found.",
    };
  }

  if (alert.status !== "pending") {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: "This Consensus Drift alert has already been resolved.",
    };
  }

  const nowIso = new Date().toISOString();

  if (decision === "approved") {
    const { data: guideline, error: guidelineFetchError } =
      await adminCtx.supabase
        .from("guidelines")
        .select("id, anchor_study_ids, changelog, practical_prescription")
        .eq("id", alert.guideline_id)
        .maybeSingle();

    if (guidelineFetchError || !guideline) {
      return {
        ok: false,
        error: "DB_ERROR",
        message: "Target guideline not found.",
      };
    }

    const existingAnchors = Array.isArray(guideline.anchor_study_ids)
      ? (guideline.anchor_study_ids as string[])
      : [];
    const nextAnchorIds = Array.from(
      new Set([...existingAnchors, alert.trigger_study_id as string])
    );

    const existingChangelog = Array.isArray(guideline.changelog)
      ? (guideline.changelog as GuidelineChangelogEntry[])
      : [];
    const nextChangelog: GuidelineChangelogEntry[] = [
      {
        updated_at: nowIso,
        summary: reviewerNotes,
        study_id: alert.trigger_study_id as string,
      },
      ...existingChangelog,
    ];

    const { error: guidelineUpdateError } = await adminCtx.supabase
      .from("guidelines")
      .update({
        evidence_grade: updatedEvidenceGrade,
        consensus_summary: updatedConsensusSummary,
        practical_prescription:
          updatedPracticalPrescription ?? guideline.practical_prescription,
        anchor_study_ids: nextAnchorIds,
        changelog: nextChangelog,
        updated_at: nowIso,
      })
      .eq("id", alert.guideline_id);

    if (guidelineUpdateError) {
      return {
        ok: false,
        error: "DB_ERROR",
        message: "Failed to update Living Evidence Matrix guideline.",
      };
    }
  }

  const { error: alertUpdateError } = await adminCtx.supabase
    .from("consensus_drift_alerts")
    .update({
      status: decision,
      reviewer_id: adminCtx.user.id,
      reviewer_notes: reviewerNotes,
      resolved_at: nowIso,
    })
    .eq("id", alertId);

  if (alertUpdateError) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Failed to update Consensus Drift alert status.",
    };
  }

  revalidatePath("/");
  revalidatePath("/guidelines");
  revalidatePath(`/study/${alert.trigger_study_id}`);
  revalidatePath("/admin/review");

  return {
    ok: true,
    message:
      decision === "approved"
        ? "Consensus Drift approved and Living Evidence Matrix updated."
        : "Consensus Drift alert dismissed.",
  };
}

export async function addSecondaryCommentaryAction(
  input: AddSecondaryCommentaryInput
): Promise<ModerationActionResult> {
  let adminCtx;
  try {
    adminCtx = await assertAdmin();
  } catch (err) {
    return mapAuthError(err);
  }

  const parsed = AddSecondaryCommentarySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message:
        parsed.error.issues[0]?.message ?? "Invalid secondary commentary input",
    };
  }

  const { studyId, platform, creatorName, title, url } = parsed.data;

  const { error } = await adminCtx.supabase
    .from("secondary_commentaries")
    .insert({
      study_id: studyId,
      platform,
      creator_name: creatorName,
      title,
      url,
    });

  if (error) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Failed to attach secondary commentary.",
    };
  }

  revalidatePath("/");
  revalidatePath("/guidelines");
  revalidatePath(`/study/${studyId}`);
  revalidatePath("/admin/review");

  return {
    ok: true,
    message: "Secondary commentary attached to study thread.",
  };
}
