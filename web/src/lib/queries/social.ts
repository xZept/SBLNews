import { createClient, createPublicClient } from "@/lib/supabase/server";
import {
  DIRECT_MESSAGE_COLUMNS,
  TOP_AURA_USER_COLUMNS,
  type CursorPage,
  type DirectMessageItem,
  type FriendConnectionItem,
  type FriendshipStatusType,
  type ProfileFriendshipState,
  type StudyDesignType,
  type TopAuraUser,
} from "@/lib/queries/projections";
import {
  DirectMessageThreadCursorSchema,
  SearchUsersByDisplayNameSchema,
  type DirectMessageThreadCursor,
} from "@/lib/validations/social";

export interface UnreadSocialCounts {
  pendingRequests: number;
  unreadMessages: number;
  totalBadge: number;
}

export interface FriendsOverview {
  accepted: FriendConnectionItem[];
  incomingPending: FriendConnectionItem[];
  outgoingPending: FriendConnectionItem[];
  blocked: FriendConnectionItem[];
}

export interface SocialSearchResultItem extends TopAuraUser {
  friendship_state: ProfileFriendshipState;
  friendship_id: string | null;
}

export interface ChatThreadCursor {
  cursorCreatedAt: string;
  cursorMessageId: string;
}

const CHAT_PAGE_SIZE = 30;

function unwrapSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

/**
 * Fetches top community contributors ranked deterministically by Aura score
 * for the ISR-cached home feed left rail (`/`).
 *
 * Uses the cookie-free public Supabase client and strictly projects
 * `TOP_AURA_USER_COLUMNS`.
 */
export async function getTopAuraUsers(limit = 10): Promise<TopAuraUser[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }

  const safeLimit = Math.max(1, Math.min(25, Math.floor(limit)));
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(TOP_AURA_USER_COLUMNS)
    .gt("aura_score", 0)
    .order("aura_score", { ascending: false })
    .order("display_name", { ascending: true })
    .order("id", { ascending: true })
    .limit(safeLimit);

  if (error) {
    console.error("Error fetching top Aura users:", error.message);
    return [];
  }

  return (data ?? []) as TopAuraUser[];
}

/**
 * Returns pending incoming friend request count and unread direct message count
 * for the signed-in user's header badge.
 */
export async function getUnreadSocialCounts(): Promise<UnreadSocialCounts> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { pendingRequests: 0, unreadMessages: 0, totalBadge: 0 };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { pendingRequests: 0, unreadMessages: 0, totalBadge: 0 };
  }

  const [pendingRes, unreadRes] = await Promise.all([
    supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("addressee_id", user.id)
      .eq("status", "pending"),
    supabase
      .from("direct_messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .is("read_at", null),
  ]);

  const pendingRequests = pendingRes.count ?? 0;
  const unreadMessages = unreadRes.count ?? 0;

  return {
    pendingRequests,
    unreadMessages,
    totalBadge: pendingRequests + unreadMessages,
  };
}

interface RawFriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatusType;
  blocked_by_id: string | null;
  updated_at: string;
}

/**
 * Fetches the authenticated user's accepted friends, incoming/outgoing pending
 * requests, and blocked users, enriched with `TOP_AURA_USER_COLUMNS` and
 * per-friend unread counts.
 */
export async function getFriendsOverview(): Promise<FriendsOverview> {
  const empty: FriendsOverview = {
    accepted: [],
    incomingPending: [],
    outgoingPending: [],
    blocked: [],
  };

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return empty;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return empty;
  }

  const { data: rows, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status, blocked_by_id, updated_at")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .order("updated_at", { ascending: false });

  if (error || !rows || rows.length === 0) {
    if (error) {
      console.error("Error fetching friendships overview:", error.message);
    }
    return empty;
  }

  const typedRows = rows as RawFriendshipRow[];
  const peerIds = Array.from(
    new Set(
      typedRows.map((row) =>
        row.requester_id === user.id ? row.addressee_id : row.requester_id
      )
    )
  );

  const [profilesRes, unreadRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(TOP_AURA_USER_COLUMNS)
      .in("id", peerIds),
    supabase
      .from("direct_messages")
      .select("sender_id, created_at")
      .eq("recipient_id", user.id)
      .is("read_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const peerMap = new Map<string, TopAuraUser>();
  for (const p of (profilesRes.data ?? []) as TopAuraUser[]) {
    peerMap.set(p.id, p);
  }

  const unreadBySender = new Map<string, { count: number; lastAt: string }>();
  for (const msg of (unreadRes.data ?? []) as {
    sender_id: string;
    created_at: string;
  }[]) {
    const existing = unreadBySender.get(msg.sender_id);
    if (!existing) {
      unreadBySender.set(msg.sender_id, { count: 1, lastAt: msg.created_at });
    } else {
      existing.count += 1;
    }
  }

  for (const row of typedRows) {
    const peerId =
      row.requester_id === user.id ? row.addressee_id : row.requester_id;
    const peer = peerMap.get(peerId);
    if (!peer) continue;

    const unreadInfo = unreadBySender.get(peerId);

    if (row.status === "accepted") {
      empty.accepted.push({
        friendship_id: row.id,
        peer,
        status: "accepted",
        direction: "mutual",
        unread_count: unreadInfo?.count ?? 0,
        last_message_at: unreadInfo?.lastAt ?? null,
        updated_at: row.updated_at,
      });
    } else if (row.status === "pending") {
      const isIncoming = row.addressee_id === user.id;
      const item: FriendConnectionItem = {
        friendship_id: row.id,
        peer,
        status: "pending",
        direction: isIncoming ? "incoming" : "outgoing",
        unread_count: 0,
        last_message_at: null,
        updated_at: row.updated_at,
      };
      if (isIncoming) {
        empty.incomingPending.push(item);
      } else {
        empty.outgoingPending.push(item);
      }
    } else if (row.status === "blocked" && row.blocked_by_id === user.id) {
      empty.blocked.push({
        friendship_id: row.id,
        peer,
        status: "blocked",
        direction: "blocked_by_me",
        unread_count: 0,
        last_message_at: null,
        updated_at: row.updated_at,
      });
    }
  }

  return empty;
}

/**
 * Prefix-searches community profiles by display name via `search_profiles_for_social` RPC.
 */
export async function searchProfilesByName(
  query: string
): Promise<SocialSearchResultItem[]> {
  const parsed = SearchUsersByDisplayNameSchema.safeParse({ query });
  if (
    !parsed.success ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase.rpc("search_profiles_for_social", {
    p_query: parsed.data.query,
    p_limit: 15,
  });

  if (error) {
    console.error("Error searching profiles:", error.message);
    return [];
  }

  return (data ?? []) as SocialSearchResultItem[];
}

interface RawDirectMessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string | null;
  study_id: string | null;
  has_study_attachment: boolean;
  read_at: string | null;
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
 * Fetches keyset-paginated 1:1 messages (`LIMIT 31`, returning up to 30 + `hasMore`)
 * between the authenticated user and `friendId`.
 */
export async function getDirectMessageThread(
  input: DirectMessageThreadCursor
): Promise<CursorPage<DirectMessageItem, ChatThreadCursor>> {
  const parsed = DirectMessageThreadCursorSchema.safeParse(input);
  if (
    !parsed.success ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  const { friendId, cursorCreatedAt, cursorMessageId } = parsed.data;
  const pairLow = user.id < friendId ? user.id : friendId;
  const pairHigh = user.id < friendId ? friendId : user.id;

  let query = supabase
    .from("direct_messages")
    .select(DIRECT_MESSAGE_COLUMNS)
    .eq("pair_low_id", pairLow)
    .eq("pair_high_id", pairHigh);

  if (cursorCreatedAt && cursorMessageId) {
    query = query.or(
      `created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorMessageId})`
    );
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(CHAT_PAGE_SIZE + 1);

  if (error) {
    console.error("Error fetching direct message thread:", error.message);
    return { items: [], nextCursor: null, hasMore: false };
  }

  const rawRows = (data ?? []) as unknown as RawDirectMessageRow[];
  const hasMore = rawRows.length > CHAT_PAGE_SIZE;
  const pageRows = rawRows.slice(0, CHAT_PAGE_SIZE);

  const items: DirectMessageItem[] = pageRows.map((row) => ({
    id: row.id,
    sender_id: row.sender_id,
    recipient_id: row.recipient_id,
    body: row.body,
    study_id: row.study_id,
    has_study_attachment: row.has_study_attachment,
    read_at: row.read_at,
    created_at: row.created_at,
    study: unwrapSingle(row.study),
  }));

  const last = pageRows[pageRows.length - 1];
  const nextCursor: ChatThreadCursor | null =
    hasMore && last
      ? {
          cursorCreatedAt: last.created_at,
          cursorMessageId: last.id,
        }
      : null;

  return { items, nextCursor, hasMore };
}
