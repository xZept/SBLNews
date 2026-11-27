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

export type CommunityRoleType =
  | "Lifter"
  | "Strength Coach"
  | "Exercise Researcher"
  | "Clinician"
  | "Student";

export type ThemePreferenceType = "light" | "dark";

export type ActivityVisibilityType = "private" | "friends" | "public";

export type FriendshipStatusType = "pending" | "accepted" | "blocked";

export type ProfileFriendshipState =
  | "self"
  | "none"
  | "friends"
  | "outgoing_pending"
  | "incoming_pending"
  | "blocked_by_me"
  | "unavailable";

export type ShareChannelType =
  | "copy_citation"
  | "x"
  | "reddit"
  | "whatsapp"
  | "discord"
  | "web_share"
  | "friend_chat";

export const PUBLIC_PROFILE_COLUMNS = `
  id,
  display_name,
  avatar_url,
  affiliation_role,
  bio,
  aura_score
` as const;

export const TOP_AURA_USER_COLUMNS = `
  id,
  display_name,
  avatar_url,
  affiliation_role,
  aura_score
` as const;

export const STUDY_SHARE_CARD_COLUMNS = `
  id,
  title,
  journal,
  publication_year,
  study_design,
  quality_score
` as const;

export const PROFILE_RECENT_VIEW_COLUMNS = `
  study_id,
  viewed_at,
  study:studies!recent_study_views_study_id_fkey (
    id,
    title,
    journal,
    publication_year,
    study_design,
    quality_score
  )
` as const;

export const DIRECT_MESSAGE_COLUMNS = `
  id,
  sender_id,
  recipient_id,
  body,
  study_id,
  has_study_attachment,
  read_at,
  created_at,
  study:studies!direct_messages_study_id_fkey (
    id,
    title,
    journal,
    publication_year,
    study_design,
    quality_score
  )
` as const;

export const PROFILE_COMMENT_HISTORY_COLUMNS = `
  id,
  study_id,
  body,
  created_at,
  study:studies!comments_study_id_fkey (
    id,
    title,
    journal,
    publication_year
  )
` as const;

export const PROFILE_UPVOTED_STUDY_COLUMNS = `
  study_id,
  created_at,
  study:studies!votes_study_id_fkey (
    id,
    title,
    journal,
    publication_year,
    study_design,
    quality_score
  )
` as const;

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

export interface PublicProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  affiliation_role: CommunityRoleType | null;
  bio: string | null;
  aura_score: number;
}

export interface AccountProfile extends PublicProfile {
  theme_preference: ThemePreferenceType;
  upvoted_studies_visibility: ActivityVisibilityType;
  viewed_studies_visibility: ActivityVisibilityType;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface TopAuraUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
  affiliation_role: CommunityRoleType | null;
  aura_score: number;
}

export interface ProfileRecentViewItem {
  study_id: string;
  viewed_at: string;
  study: {
    id: string;
    title: string;
    journal: string;
    publication_year: number;
    study_design: StudyDesignType;
    quality_score: number;
  };
}

export interface ProfileSocialContext {
  canViewUpvotes: boolean;
  canViewRecentViews: boolean;
  friendshipState: ProfileFriendshipState;
  friendshipId: string | null;
}

export interface FriendConnectionItem {
  friendship_id: string;
  peer: TopAuraUser;
  status: FriendshipStatusType;
  direction: "incoming" | "outgoing" | "mutual" | "blocked_by_me";
  unread_count: number;
  last_message_at: string | null;
  updated_at: string;
}

export interface DirectMessageItem {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string | null;
  study_id: string | null;
  has_study_attachment: boolean;
  read_at: string | null;
  created_at: string;
  study: {
    id: string;
    title: string;
    journal: string;
    publication_year: number;
    study_design: StudyDesignType;
    quality_score: number;
  } | null;
}

export interface ProfileUpvotedStudyItem {
  study_id: string;
  voted_at: string;
  study: {
    id: string;
    title: string;
    journal: string;
    publication_year: number;
    study_design: StudyDesignType;
    quality_score: number;
  };
}

export interface ProfileCommentHistoryItem {
  id: string;
  study_id: string;
  body_excerpt: string;
  created_at: string;
  study: {
    id: string;
    title: string;
    journal: string;
    publication_year: number;
  };
}

export interface CursorPage<T, C> {
  items: T[];
  nextCursor: C | null;
  hasMore: boolean;
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
  helpful_count: number;
  viewer_has_endorsed?: boolean;
  created_at: string;
  updated_at: string;
  author?: Pick<
    PublicProfile,
    "id" | "display_name" | "avatar_url" | "affiliation_role" | "aura_score"
  >;
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
