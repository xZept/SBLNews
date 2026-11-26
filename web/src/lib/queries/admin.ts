import { assertAdmin } from "@/lib/supabase/admin-guard";
import {
  STUDY_SUMMARY_COLUMNS,
  type ConsensusDriftAlert,
  type Guideline,
  type StudyDesignType,
  type StudySummary,
} from "@/lib/queries/projections";

export interface PendingStudyItem extends StudySummary {
  is_human: boolean;
  is_acute_emg_only: boolean;
  limitations: string[];
  created_at: string;
}

export interface PendingDriftAlertItem extends ConsensusDriftAlert {
  guideline: Pick<
    Guideline,
    | "id"
    | "slug"
    | "hub"
    | "variable_name"
    | "evidence_grade"
    | "consensus_summary"
    | "practical_prescription"
  > | null;
  trigger_study: {
    id: string;
    title: string;
    journal: string;
    publication_year: number;
    study_design: StudyDesignType;
    quality_score: number;
    primary_url: string;
    summary_takeaway: string;
  } | null;
}

export interface StudyOptionItem {
  id: string;
  title: string;
  journal: string;
  publication_year: number;
}

export interface PendingReviewQueue {
  pendingStudies: PendingStudyItem[];
  pendingAlerts: PendingDriftAlertItem[];
  recentPublishedStudies: StudyOptionItem[];
}

/**
 * Fetches pending studies, pending Consensus Drift alerts, and recent published
 * studies for secondary commentary attachment. Enforces server-side admin RBAC.
 */
export async function getPendingReviewQueue(): Promise<PendingReviewQueue> {
  const { supabase } = await assertAdmin();

  const [studiesRes, alertsRes, publishedRes] = await Promise.all([
    supabase
      .from("studies")
      .select(
        `${STUDY_SUMMARY_COLUMNS}, is_human, is_acute_emg_only, limitations, created_at`
      )
      .eq("publication_status", "pending")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("consensus_drift_alerts")
      .select(
        `
        id,
        guideline_id,
        trigger_study_id,
        drift_rationale,
        status,
        reviewer_id,
        reviewer_notes,
        created_at,
        resolved_at,
        guideline:guidelines!consensus_drift_alerts_guideline_id_fkey (
          id,
          slug,
          hub,
          variable_name,
          evidence_grade,
          consensus_summary,
          practical_prescription
        ),
        trigger_study:studies!consensus_drift_alerts_trigger_study_id_fkey (
          id,
          title,
          journal,
          publication_year,
          study_design,
          quality_score,
          primary_url,
          summary_takeaway
        )
      `
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("studies")
      .select("id, title, journal, publication_year")
      .eq("publication_status", "published")
      .order("published_at", { ascending: false })
      .limit(50),
  ]);

  const pendingAlerts: PendingDriftAlertItem[] = (
    (alertsRes.data ?? []) as unknown[]
  ).map((row) => {
    const r = row as Record<string, unknown>;
    const guidelineRaw = Array.isArray(r.guideline)
      ? r.guideline[0]
      : r.guideline;
    const studyRaw = Array.isArray(r.trigger_study)
      ? r.trigger_study[0]
      : r.trigger_study;
    return {
      ...(r as unknown as Omit<
        PendingDriftAlertItem,
        "guideline" | "trigger_study"
      >),
      guideline: (guidelineRaw ?? null) as PendingDriftAlertItem["guideline"],
      trigger_study: (studyRaw ??
        null) as PendingDriftAlertItem["trigger_study"],
    };
  });

  return {
    pendingStudies: (studiesRes.data ?? []) as PendingStudyItem[],
    pendingAlerts,
    recentPublishedStudies: (publishedRes.data ?? []) as StudyOptionItem[],
  };
}
