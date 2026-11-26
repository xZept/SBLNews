import { z } from "zod";
import { createClient, createPublicClient } from "@/lib/supabase/server";
import {
  STUDY_SUMMARY_COLUMNS,
  type SecondaryCommentary,
  type StudyComment,
  type StudyDetail,
  type StudySummary,
} from "@/lib/queries/projections";

const STUDY_DETAIL_COLUMNS = `
  ${STUDY_SUMMARY_COLUMNS},
  openalex_id,
  is_human,
  is_acute_emg_only,
  limitations,
  publication_status,
  abstract_text,
  created_at,
  updated_at
` as const;

const UuidSchema = z.string().uuid();

/**
 * Fetches published study summaries for the ISR-cached main feed (/).
 * Uses the cookie-free public Supabase client and strictly projects
 * STUDY_SUMMARY_COLUMNS (excluding abstract_text and embedding).
 */
export async function getFeedStudies(limit = 100): Promise<StudySummary[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("studies")
    .select(STUDY_SUMMARY_COLUMNS)
    .eq("publication_status", "published")
    .order("published_at", { ascending: false })
    .order("quality_score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching feed studies:", error.message);
    return [];
  }

  return (data ?? []) as StudySummary[];
}

/**
 * Fetches full structured metadata for a single study (/study/[id]).
 * Explicitly excludes `embedding`.
 */
export async function getStudyDetail(id: string): Promise<StudyDetail | null> {
  if (
    !UuidSchema.safeParse(id).success ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("studies")
    .select(STUDY_DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as StudyDetail;
}

/**
 * Fetches nested discussion comments for a study, ordered chronologically.
 */
export async function getStudyComments(
  studyId: string
): Promise<StudyComment[]> {
  if (
    !UuidSchema.safeParse(studyId).success ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select(
      `
      id,
      study_id,
      author_id,
      parent_comment_id,
      body,
      is_deleted,
      created_at,
      updated_at,
      author:profiles!comments_author_id_fkey (
        id,
        display_name,
        avatar_url
      )
    `
    )
    .eq("study_id", studyId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return (data as unknown[]).map((row) => {
    const r = row as Record<string, unknown>;
    const authorRaw = Array.isArray(r.author) ? r.author[0] : r.author;
    return {
      ...(r as unknown as Omit<StudyComment, "author">),
      author: authorRaw as StudyComment["author"],
    };
  });
}

/**
 * Fetches optional secondary creator commentary links attached to a study.
 */
export async function getSecondaryCommentaries(
  studyId: string
): Promise<SecondaryCommentary[]> {
  if (
    !UuidSchema.safeParse(studyId).success ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("secondary_commentaries")
    .select("id, study_id, platform, creator_name, title, url, created_at")
    .eq("study_id", studyId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as SecondaryCommentary[];
}
