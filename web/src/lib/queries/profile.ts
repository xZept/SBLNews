import { z } from "zod";
import { createClient, createPublicClient } from "@/lib/supabase/server";
import {
  PROFILE_COMMENT_HISTORY_COLUMNS,
  PROFILE_RECENT_VIEW_COLUMNS,
  PROFILE_UPVOTED_STUDY_COLUMNS,
  PUBLIC_PROFILE_COLUMNS,
  type AccountProfile,
  type CursorPage,
  type ProfileCommentHistoryItem,
  type ProfileFriendshipState,
  type ProfileRecentViewItem,
  type ProfileSocialContext,
  type ProfileUpvotedStudyItem,
  type PublicProfile,
  type StudyDesignType,
} from "@/lib/queries/projections";
import {
  PROFILE_PAGE_SIZE,
  type UpvotedStudiesCursor,
} from "@/lib/validations/profile";

const UuidSchema = z.string().uuid();

export interface CommentHistoryPageCursor {
  cursorCreatedAt: string;
  cursorCommentId: string;
}

export interface MyAccountProfileResult {
  profile: AccountProfile;
  email: string | null;
}

function toBodyExcerpt(body: string, maxLength = 220): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function unwrapSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

/**
 * Loads the signed-in user's full account profile (including private settings & role)
 * via the `get_my_account_profile()` SECURITY DEFINER RPC, plus email from `auth.getUser()`.
 */
export async function getMyAccountProfile(): Promise<MyAccountProfileResult | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data, error } = await supabase.rpc("get_my_account_profile");

  if (error) {
    console.error("Error fetching account profile:", error.message);
    return null;
  }

  const profile = unwrapSingle(
    data as AccountProfile[] | AccountProfile | null
  );
  if (!profile) {
    return null;
  }

  return {
    profile,
    email: user.email ?? null,
  };
}

/**
 * Loads a public commenter profile by UUID using the cookie-free public client.
 * Strictly projects `PUBLIC_PROFILE_COLUMNS` (never email, theme, or role).
 */
export async function getPublicProfileById(
  id: string
): Promise<PublicProfile | null> {
  const parsed = UuidSchema.safeParse(id);
  if (!parsed.success) {
    return null;
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("id", parsed.data)
    .maybeSingle<PublicProfile>();

  if (error) {
    console.error("Error fetching public profile:", error.message);
    return null;
  }

  return data ?? null;
}

interface RawVoteRow {
  study_id: string;
  created_at: string;
  study:
    | {
        id: string;
        title: string;
        journal: string;
        publication_year: number;
        study_design: StudyDesignType;
        quality_score: number;
      }
    | {
        id: string;
        title: string;
        journal: string;
        publication_year: number;
        study_design: StudyDesignType;
        quality_score: number;
      }[]
    | null;
}

/**
 * Fetches keyset-paginated upvoted studies for a user (`LIMIT 21`) when authorized by RLS
 * (`votes_select_by_visibility`: owner, `'public'`, or accepted friend under `'friends'`).
 */
export async function getAuthorizedUpvotedStudies(
  userId: string,
  cursor?: UpvotedStudiesCursor
): Promise<CursorPage<ProfileUpvotedStudyItem, UpvotedStudiesCursor>> {
  const parsedId = UuidSchema.safeParse(userId);
  if (
    !parsedId.success ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  const supabase = await createClient();
  let query = supabase
    .from("votes")
    .select(PROFILE_UPVOTED_STUDY_COLUMNS)
    .eq("user_id", parsedId.data);

  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.cursorVotedAt},and(created_at.eq.${cursor.cursorVotedAt},study_id.lt.${cursor.cursorStudyId})`
    );
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("study_id", { ascending: false })
    .limit(PROFILE_PAGE_SIZE + 1);

  if (error) {
    console.error("Error fetching upvoted studies:", error.message);
    return { items: [], nextCursor: null, hasMore: false };
  }

  const rawRows = (data ?? []) as unknown as RawVoteRow[];
  const hasMore = rawRows.length > PROFILE_PAGE_SIZE;
  const pageRows = rawRows.slice(0, PROFILE_PAGE_SIZE);

  const items: ProfileUpvotedStudyItem[] = [];
  for (const row of pageRows) {
    const study = unwrapSingle(row.study);
    if (!study) continue;
    items.push({
      study_id: row.study_id,
      voted_at: row.created_at,
      study,
    });
  }

  const last = pageRows[pageRows.length - 1];
  const nextCursor: UpvotedStudiesCursor | null =
    hasMore && last
      ? {
          cursorVotedAt: last.created_at,
          cursorStudyId: last.study_id,
        }
      : null;

  return { items, nextCursor, hasMore };
}

/**
 * Fetches keyset-paginated upvoted studies for the authenticated user (`LIMIT 21`).
 */
export async function getMyUpvotedStudies(
  userId: string,
  cursor?: UpvotedStudiesCursor
): Promise<CursorPage<ProfileUpvotedStudyItem, UpvotedStudiesCursor>> {
  return getAuthorizedUpvotedStudies(userId, cursor);
}

interface RawSocialContextRow {
  can_view_upvotes: boolean;
  can_view_recent_views: boolean;
  friendship_state: ProfileFriendshipState;
  friendship_id: string | null;
}

const DEFAULT_SOCIAL_CONTEXT: ProfileSocialContext = {
  canViewUpvotes: false,
  canViewRecentViews: false,
  friendshipState: "none",
  friendshipId: null,
};

/**
 * Resolves the viewer's friendship state and visibility permissions for `targetUserId`
 * via `public.get_profile_social_context(uuid)`.
 */
export async function getProfileSocialContext(
  targetUserId: string
): Promise<ProfileSocialContext> {
  const parsedId = UuidSchema.safeParse(targetUserId);
  if (
    !parsedId.success ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return DEFAULT_SOCIAL_CONTEXT;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_profile_social_context", {
    p_target_user_id: parsedId.data,
  });

  if (error) {
    console.error("Error fetching profile social context:", error.message);
    return DEFAULT_SOCIAL_CONTEXT;
  }

  const row = unwrapSingle(
    data as RawSocialContextRow[] | RawSocialContextRow | null
  );
  if (!row) {
    return DEFAULT_SOCIAL_CONTEXT;
  }

  return {
    canViewUpvotes: Boolean(row.can_view_upvotes),
    canViewRecentViews: Boolean(row.can_view_recent_views),
    friendshipState: row.friendship_state ?? "none",
    friendshipId: row.friendship_id ?? null,
  };
}

interface RawRecentViewRow {
  study_id: string;
  viewed_at: string;
  study:
    | {
        id: string;
        title: string;
        journal: string;
        publication_year: number;
        study_design: StudyDesignType;
        quality_score: number;
      }
    | {
        id: string;
        title: string;
        journal: string;
        publication_year: number;
        study_design: StudyDesignType;
        quality_score: number;
      }[]
    | null;
}

/**
 * Fetches up to 20 deduplicated recently viewed studies for `userId` when authorized by RLS
 * (`recent_study_views_select_by_visibility`).
 */
export async function getRecentStudyViews(
  userId: string
): Promise<ProfileRecentViewItem[]> {
  const parsedId = UuidSchema.safeParse(userId);
  if (
    !parsedId.success ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recent_study_views")
    .select(PROFILE_RECENT_VIEW_COLUMNS)
    .eq("user_id", parsedId.data)
    .order("viewed_at", { ascending: false })
    .order("study_id", { ascending: false })
    .limit(PROFILE_PAGE_SIZE);

  if (error) {
    console.error("Error fetching recent study views:", error.message);
    return [];
  }

  const rawRows = (data ?? []) as unknown as RawRecentViewRow[];
  const items: ProfileRecentViewItem[] = [];
  for (const row of rawRows) {
    const study = unwrapSingle(row.study);
    if (!study) continue;
    items.push({
      study_id: row.study_id,
      viewed_at: row.viewed_at,
      study,
    });
  }

  return items;
}

interface RawCommentRow {
  id: string;
  study_id: string;
  body: string;
  created_at: string;
  study:
    | {
        id: string;
        title: string;
        journal: string;
        publication_year: number;
      }
    | {
        id: string;
        title: string;
        journal: string;
        publication_year: number;
      }[]
    | null;
}

/**
 * Fetches keyset-paginated non-deleted comment history for a user (`LIMIT 21`, 220-char excerpt).
 * Uses the cookie-free public client so it is safe on both `/profile` and `/profile/[id]`.
 */
export async function getUserCommentHistory(
  userId: string,
  cursor?: CommentHistoryPageCursor
): Promise<CursorPage<ProfileCommentHistoryItem, CommentHistoryPageCursor>> {
  const parsedId = UuidSchema.safeParse(userId);
  if (
    !parsedId.success ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  const supabase = createPublicClient();
  let query = supabase
    .from("comments")
    .select(PROFILE_COMMENT_HISTORY_COLUMNS)
    .eq("author_id", parsedId.data)
    .eq("is_deleted", false);

  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.cursorCreatedAt},and(created_at.eq.${cursor.cursorCreatedAt},id.lt.${cursor.cursorCommentId})`
    );
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PROFILE_PAGE_SIZE + 1);

  if (error) {
    console.error("Error fetching user comment history:", error.message);
    return { items: [], nextCursor: null, hasMore: false };
  }

  const rawRows = (data ?? []) as unknown as RawCommentRow[];
  const hasMore = rawRows.length > PROFILE_PAGE_SIZE;
  const pageRows = rawRows.slice(0, PROFILE_PAGE_SIZE);

  const items: ProfileCommentHistoryItem[] = [];
  for (const row of pageRows) {
    const study = unwrapSingle(row.study);
    if (!study) continue;
    items.push({
      id: row.id,
      study_id: row.study_id,
      body_excerpt: toBodyExcerpt(row.body),
      created_at: row.created_at,
      study,
    });
  }

  const last = pageRows[pageRows.length - 1];
  const nextCursor: CommentHistoryPageCursor | null =
    hasMore && last
      ? {
          cursorCreatedAt: last.created_at,
          cursorCommentId: last.id,
        }
      : null;

  return { items, nextCursor, hasMore };
}
