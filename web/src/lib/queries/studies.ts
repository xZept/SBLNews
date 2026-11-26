import { z } from "zod";
import { createClient, createPublicClient } from "@/lib/supabase/server";
import {
  STUDY_SUMMARY_COLUMNS,
  type SecondaryCommentary,
  type StudyComment,
  type StudyDetail,
  type StudySummary,
} from "@/lib/queries/projections";
import {
  HybridSearchSchema,
  type HybridSearchInput,
} from "@/lib/validations/search";

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

export interface HybridSearchResult extends StudySummary {
  hybrid_score: number;
}

export interface HybridSearchResponse {
  results: HybridSearchResult[];
  usedSemantic: boolean;
}

/**
 * Generates a 768-dim Gemini embedding for a search query via native fetch.
 * Returns null on empty query, missing GEMINI_API_KEY, timeout, or API error
 * so hybrid search gracefully falls back to keyword-only matching.
 */
export async function generateQueryEmbedding(
  queryText: string
): Promise<number[] | null> {
  const trimmed = queryText.trim();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!trimmed || !apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${encodeURIComponent(
        apiKey
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text: trimmed }] },
          taskType: "RETRIEVAL_QUERY",
          outputDimensionality: 768,
        }),
        signal: AbortSignal.timeout(4000),
      }
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      embedding?: { values?: unknown };
    };
    const values = payload.embedding?.values;
    if (
      !Array.isArray(values) ||
      values.length !== 768 ||
      !values.every((v) => typeof v === "number" && Number.isFinite(v))
    ) {
      return null;
    }

    return values as number[];
  } catch {
    return null;
  }
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
