/**
 * Egress-safe summary column projection for feed (/), search (/search),
 * and related-study list queries.
 *
 * Explicitly EXCLUDES `abstract_text` and `embedding` (vector(768)) to protect
 * Supabase Free's 5 GB monthly egress quota.
 */
export const STUDY_SUMMARY_COLUMNS = `
  id,
  doi,
  pubmed_id,
  title,
  journal,
  publication_year,
  published_at,
  primary_url,
  study_design,
  population,
  is_trained_population,
  sample_size_n,
  duration_weeks,
  primary_outcome,
  summary_takeaway,
  inspection_depth,
  quality_score,
  upvote_count,
  comment_count
` as const;

export type UserRole = "member" | "admin";

export type StudyDesignType =
  | "meta_analysis"
  | "systematic_review"
  | "rct"
  | "controlled_trial"
  | "cohort_observational"
  | "acute_crossover"
  | "animal_in_vitro"
  | "review_commentary";

export type InspectionDepthType = "Full-Text" | "Abstract-Only";

export type PublicationStatusType = "pending" | "published" | "rejected";

export type GuidelineHubType =
  | "Hypertrophy"
  | "Maximal Strength"
  | "Recovery & Nutrition";

export type EvidenceGradeType = "A" | "B" | "C" | "D";

export type DriftAlertStatusType = "pending" | "approved" | "dismissed";

export type CommentaryPlatformType =
  | "YouTube"
  | "Podcast"
  | "Article"
  | "Social";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
}

export interface StudySummary {
  id: string;
  doi: string | null;
  pubmed_id: string | null;
  title: string;
  journal: string;
  publication_year: number;
  published_at: string;
  primary_url: string;
  study_design: StudyDesignType;
  population: string;
  is_trained_population: boolean;
  sample_size_n: number | null;
  duration_weeks: number | null;
  primary_outcome: string;
  summary_takeaway: string;
  inspection_depth: InspectionDepthType;
  quality_score: number;
  upvote_count: number;
  comment_count: number;
}

export interface StudyDetail extends StudySummary {
  openalex_id: string | null;
  is_human: boolean;
  is_acute_emg_only: boolean;
  limitations: string[];
  publication_status: PublicationStatusType;
  abstract_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface SecondaryCommentary {
  id: string;
  study_id: string;
  platform: CommentaryPlatformType;
  creator_name: string;
  title: string;
  url: string;
  created_at: string;
}

export interface StudyComment {
  id: string;
  study_id: string;
  author_id: string;
  parent_comment_id: string | null;
  body: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  author?: Pick<Profile, "id" | "display_name" | "avatar_url">;
}

export interface GuidelineChangelogEntry {
  updated_at: string;
  summary: string;
  study_id: string | null;
}

export interface Guideline {
  id: string;
  slug: string;
  hub: GuidelineHubType;
  variable_name: string;
  display_order: number;
  evidence_grade: EvidenceGradeType;
  consensus_summary: string;
  practical_prescription: string;
  anchor_study_ids: string[];
  changelog: GuidelineChangelogEntry[];
  updated_at: string;
}

export interface ConsensusDriftAlert {
  id: string;
  guideline_id: string;
  trigger_study_id: string;
  drift_rationale: string;
  status: DriftAlertStatusType;
  reviewer_id: string | null;
  reviewer_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}
