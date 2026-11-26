import { createPublicClient } from "@/lib/supabase/server";
import {
  STUDY_SUMMARY_COLUMNS,
  type Guideline,
  type GuidelineChangelogEntry,
  type StudySummary,
} from "@/lib/queries/projections";

const GUIDELINE_COLUMNS = `
  id,
  slug,
  hub,
  variable_name,
  display_order,
  evidence_grade,
  consensus_summary,
  practical_prescription,
  anchor_study_ids,
  changelog,
  updated_at
` as const;

export interface GuidelineWithAnchors extends Guideline {
  anchorStudies: StudySummary[];
}

function normalizeChangelog(raw: unknown): GuidelineChangelogEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (entry): entry is GuidelineChangelogEntry =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as GuidelineChangelogEntry).updated_at === "string" &&
      typeof (entry as GuidelineChangelogEntry).summary === "string"
  );
}

/**
 * Fetches all Living Evidence Matrix guidelines ordered by `display_order`
 * together with egress-safe summary projections (`STUDY_SUMMARY_COLUMNS`) for
 * any linked anchor studies.
 *
 * Uses the cookie-free public Supabase client so `/guidelines` ISR remains active.
 */
export async function getLivingGuidelines(): Promise<GuidelineWithAnchors[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }

  const supabase = createPublicClient();
  const { data: guidelinesData, error: guidelinesError } = await supabase
    .from("guidelines")
    .select(GUIDELINE_COLUMNS)
    .order("display_order", { ascending: true });

  if (guidelinesError) {
    console.error("Error fetching living guidelines:", guidelinesError.message);
    return [];
  }

  const rows = (guidelinesData ?? []) as Guideline[];
  if (rows.length === 0) {
    return [];
  }

  const uniqueStudyIds = Array.from(
    new Set(
      rows.flatMap((row) =>
        Array.isArray(row.anchor_study_ids) ? row.anchor_study_ids : []
      )
    )
  );

  const studiesById = new Map<string, StudySummary>();

  if (uniqueStudyIds.length > 0) {
    const { data: studiesData, error: studiesError } = await supabase
      .from("studies")
      .select(STUDY_SUMMARY_COLUMNS)
      .eq("publication_status", "published")
      .in("id", uniqueStudyIds);

    if (studiesError) {
      console.error(
        "Error fetching guideline anchor studies:",
        studiesError.message
      );
    } else {
      for (const study of (studiesData ?? []) as StudySummary[]) {
        studiesById.set(study.id, study);
      }
    }
  }

  return rows.map((row) => {
    const anchorIds = Array.isArray(row.anchor_study_ids)
      ? row.anchor_study_ids
      : [];
    const anchorStudies = anchorIds
      .map((id) => studiesById.get(id))
      .filter((study): study is StudySummary => Boolean(study));

    return {
      ...row,
      anchor_study_ids: anchorIds,
      changelog: normalizeChangelog(row.changelog),
      anchorStudies,
    };
  });
}
