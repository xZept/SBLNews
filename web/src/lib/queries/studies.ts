import { cache } from "react";
import { z } from "zod";
import { createClient, createPublicClient } from "@/lib/supabase/server";
import {
  AI_CITATION_STUDY_COLUMNS,
  STUDY_SUMMARY_COLUMNS,
  type AiCitationLabel,
  type AiCitationStudy,
  type SecondaryCommentary,
  type StudyComment,
  type StudyDetail,
  type StudySummary,
} from "@/lib/queries/projections";
import {
  HybridSearchSchema,
  type HybridSearchInput,
} from "@/lib/validations/search";
import {
  GEMINI_EMBEDDING_MODEL,
  generateQueryEmbedding,
} from "@/lib/queries/embeddings";

export { GEMINI_EMBEDDING_MODEL, generateQueryEmbedding };

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
 * Fetches full structured metadata for a published study (/study/[id]) using
 * the cookie-free public Supabase client, memoized per request via React.cache.
 * Explicitly excludes `embedding` and unpublished records.
 */
export const getPublicStudyDetail = cache(
  async (id: string): Promise<StudyDetail | null> => {
    if (
      !UuidSchema.safeParse(id).success ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return null;
    }

    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("studies")
      .select(STUDY_DETAIL_COLUMNS)
      .eq("id", id)
      .eq("publication_status", "published")
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as StudyDetail;
  }
);

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
  const [
    { data, error },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from("comments")
      .select(
        `
        id,
        study_id,
        author_id,
        parent_comment_id,
        body,
        is_deleted,
        helpful_count,
        created_at,
        updated_at,
        author:profiles!comments_author_id_fkey (
          id,
          display_name,
          avatar_url,
          affiliation_role,
          aura_score
        )
      `
      )
      .eq("study_id", studyId)
      .order("created_at", { ascending: true }),
    supabase.auth.getUser(),
  ]);

  if (error || !data) {
    return [];
  }

  const commentIds = (data as Array<{ id: string }>).map((row) => row.id);
  const endorsedIds = new Set<string>();

  if (user && commentIds.length > 0) {
    const { data: endorsements } = await supabase
      .from("comment_endorsements")
      .select("comment_id")
      .eq("user_id", user.id)
      .in("comment_id", commentIds);

    if (endorsements) {
      for (const row of endorsements as Array<{ comment_id: string }>) {
        endorsedIds.add(row.comment_id);
      }
    }
  }

  return (data as unknown[]).map((row) => {
    const r = row as Record<string, unknown>;
    const authorRaw = Array.isArray(r.author) ? r.author[0] : r.author;
    const commentId = String(r.id ?? "");
    return {
      ...(r as unknown as Omit<StudyComment, "author" | "viewer_has_endorsed">),
      helpful_count:
        typeof r.helpful_count === "number" ? r.helpful_count : 0,
      viewer_has_endorsed: endorsedIds.has(commentId),
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

export interface HybridSearchResult extends StudySummary {
  hybrid_score: number;
}

export interface HybridSearchResponse {
  results: HybridSearchResult[];
  usedSemantic: boolean;
}

/**
 * Executes hybrid keyword (tsvector) + semantic (pgvector) search via
 * the `search_studies_hybrid` PostgreSQL RPC, projecting summary columns only.
 */
export async function searchStudiesHybrid(
  rawParams: Partial<HybridSearchInput>
): Promise<HybridSearchResponse> {
  const parsed = HybridSearchSchema.safeParse(rawParams);
  if (!parsed.success) {
    return { results: [], usedSemantic: false };
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { results: [], usedSemantic: false };
  }

  const params = parsed.data;
  const embedding = params.q ? await generateQueryEmbedding(params.q) : null;
  const supabase = createPublicClient();

  const { data, error } = await supabase.rpc("search_studies_hybrid", {
    query_text: params.q,
    query_embedding: embedding ? `[${embedding.join(",")}]` : null,
    filter_study_design: params.study_design ?? null,
    filter_min_duration_weeks: params.min_duration_weeks ?? null,
    filter_trained_only: params.trained_only ?? null,
    match_limit: params.limit,
  });

  if (error || !data) {
    if (error) {
      console.error("Error running search_studies_hybrid:", error.message);
    }
    return { results: [], usedSemantic: false };
  }

  return {
    results: data as HybridSearchResult[],
    usedSemantic: embedding !== null,
  };
}

const CITATION_LABELS: readonly AiCitationLabel[] = [
  "S1",
  "S2",
  "S3",
  "S4",
  "S5",
];

/**
 * Retrieves the top 3-5 deterministically ranked published studies for AI
 * synthesis using `search_studies_hybrid` and enriches them with `limitations`
 * via `AI_CITATION_STUDY_COLUMNS` (strictly excluding `abstract_text` and `embedding`).
 */
export async function getAiCitationStudies(
  rawParams: Partial<HybridSearchInput>,
  limit = 5
): Promise<AiCitationStudy[]> {
  const clampedLimit = Math.max(3, Math.min(5, Math.floor(limit)));
  const { results } = await searchStudiesHybrid({
    ...rawParams,
    limit: clampedLimit,
  });

  if (results.length === 0) {
    return [];
  }

  const topResults = results.slice(0, clampedLimit);
  const studyIds = topResults.map((study) => study.id);

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("studies")
    .select(AI_CITATION_STUDY_COLUMNS)
    .eq("publication_status", "published")
    .in("id", studyIds);

  if (error || !data) {
    if (error) {
      console.error("Error fetching AI citation study details:", error.message);
    }
    return topResults.map((study, index) => ({
      citation_label: CITATION_LABELS[index] ?? "S5",
      id: study.id,
      title: study.title,
      journal: study.journal,
      publication_year: study.publication_year,
      primary_url: study.primary_url,
      study_design: study.study_design,
      population: study.population,
      is_trained_population: study.is_trained_population,
      sample_size_n: study.sample_size_n,
      duration_weeks: study.duration_weeks,
      primary_outcome: study.primary_outcome,
      summary_takeaway: study.summary_takeaway,
      limitations: [],
      inspection_depth: study.inspection_depth,
      quality_score: study.quality_score,
    }));
  }

  const byId = new Map<string, Record<string, unknown>>();
  for (const row of data as unknown as Array<Record<string, unknown>>) {
    if (typeof row.id === "string") {
      byId.set(row.id, row);
    }
  }

  return topResults.map((fallback, index) => {
    const row = byId.get(fallback.id);
    const rawLimitations = row?.limitations;
    const limitations = Array.isArray(rawLimitations)
      ? rawLimitations.filter((item): item is string => typeof item === "string")
      : [];

    return {
      citation_label: CITATION_LABELS[index] ?? "S5",
      id: fallback.id,
      title: typeof row?.title === "string" ? row.title : fallback.title,
      journal: typeof row?.journal === "string" ? row.journal : fallback.journal,
      publication_year:
        typeof row?.publication_year === "number"
          ? row.publication_year
          : fallback.publication_year,
      primary_url:
        typeof row?.primary_url === "string"
          ? row.primary_url
          : fallback.primary_url,
      study_design: fallback.study_design,
      population:
        typeof row?.population === "string"
          ? row.population
          : fallback.population,
      is_trained_population:
        typeof row?.is_trained_population === "boolean"
          ? row.is_trained_population
          : fallback.is_trained_population,
      sample_size_n:
        typeof row?.sample_size_n === "number" || row?.sample_size_n === null
          ? (row.sample_size_n as number | null)
          : fallback.sample_size_n,
      duration_weeks:
        typeof row?.duration_weeks === "number" || row?.duration_weeks === null
          ? (row.duration_weeks as number | null)
          : fallback.duration_weeks,
      primary_outcome:
        typeof row?.primary_outcome === "string"
          ? row.primary_outcome
          : fallback.primary_outcome,
      summary_takeaway:
        typeof row?.summary_takeaway === "string"
          ? row.summary_takeaway
          : fallback.summary_takeaway,
      limitations,
      inspection_depth: fallback.inspection_depth,
      quality_score: fallback.quality_score,
    };
  });
}
