# Web Routes, Social Actions, Sharing & UI Contracts (`/web`)

**Branch**: `004-socialization-layer` | **Date**: 2026-11-28 | **Spec**: [spec.md](../spec.md)

## 1. Approved 8-Route Surface & Rendering Contracts

Per Constitution Principle V (v1.1.0), all socialization capabilities live strictly inside the existing 8 approved routes plus the global `TopNav` header—introducing **zero** new page routes:

| Surface / Route | Rendering Strategy | Auth & Privacy Contract | Socialization Data & UI Contract |
|-----------------|--------------------|-------------------------|----------------------------------|
| Global `TopNav` (`FriendsChatDrawer`) | Client Component hydrated across all 8 routes | Signed-out: hidden (zero fetches). Signed-in: compact icon trigger + unread count badge beside `AccountBubble` | `getUnreadSocialCountsAction()` on session load; opens slide-over drawer (`Friends` & `Chat` tabs) fetching lists/threads strictly on demand |
| `/` (Main Research Feed) | **ISR (`revalidate = 3600`)** | Public cookie-free `createPublicClient()` | Desktop left-side `<TopUsersRail />` (`260px`) + mobile collapsible strip (`getTopAuraUsers(10)`); `<StudyShareMenu />` on every `StudyCard` |
| `/study/[id]` (Study Detail & Discussion) | Dynamic (`force-dynamic`) + `generateMetadata` | Public read (`createPublicClient()` for OG metadata); authenticated write | Per-study Open Graph & Twitter metadata (`FR-005`); `<StudyShareMenu />` in header/actions; `<AuraBadge />` + `Helpful` endorsement button on comments; opt-in `<StudyViewTracker />` |
| `/profile` (Authenticated Settings & Activity) | Dynamic (`force-dynamic`) | **Authenticated owner only** (`getMyAccountProfile()`) | Displays user's `<AuraBadge />`; three-state visibility selectors (`Private` \| `Friends Only` \| `Public`) for **Upvoted Studies** and **Recently Viewed Studies**; **Recently Viewed** tab (`<= 20` items) + **Clear History** button |
| `/profile/[id]` (Public Profile View) | Dynamic (`force-dynamic`) | Public base profile; friendship- & visibility-scoped activity (`FR-008`, `SC-004`) | Displays `<AuraBadge />`, friend action controls (**Add Friend** / **Accept · Decline** / **Friends · Message · Unfriend** / **Block · Unblock**), public comments, and conditionally rendered **Upvoted Studies** + **Recently Viewed Studies** strictly when `get_profile_social_context` & RLS permit |
| `/search` (Hybrid Search) | Dynamic (`force-dynamic`) | Public read | `StudyCard` inherits `<StudyShareMenu />` automatically |
| `/guidelines` (Living Evidence Matrix) | **ISR (`revalidate = 3600`)** | Public read | Unchanged ISR; global `TopNav` drawer available |
| `/methodology` (Transparency Hub) | **Static (`force-static`)** | Public static | Adds static Pillar 5 documenting the deterministic **Aura** rubric and daily anti-gaming caps |
| `/admin/review` (Moderation Queue) | Dynamic (`force-dynamic`) | Server-side Admin RBAC + RLS | Unchanged RBAC; global `TopNav` drawer available |

---

## 2. Egress-Safe Column Projections & TypeScript Interfaces (`/web/src/lib/queries/projections.ts`)

Every query MUST project explicit narrow columns and MUST NEVER execute `SELECT *` or select `abstract_text` / `embedding` (Principle IV):

```typescript
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
```

- `PublicProfile` gains `aura_score: number`.
- `AccountProfile` inherits `aura_score: number` and gains `upvoted_studies_visibility: ActivityVisibilityType` and `viewed_studies_visibility: ActivityVisibilityType`.
- `StudyComment` gains `helpful_count: number`, `viewer_has_endorsed?: boolean`, and `author` gains `aura_score: number`.

---

## 3. Runtime Zod Validation Schemas (`/web/src/lib/validations/social.ts` & `profile.ts`)

All Server Actions and query inputs validate at runtime via Zod (`FR-012`, Principle IV):

- **`ActivityVisibilityEnum`**: `z.enum(["private", "friends", "public"])`
- **`UpdateActivityVisibilitySchema`**:
  `z.object({ upvotedStudiesVisibility: ActivityVisibilityEnum, viewedStudiesVisibility: ActivityVisibilityEnum })`
  *(Also accepted as optional/merged fields in `UpdateProfileSchema`.)*
- **`RecordStudyShareSchema`**:
  `z.object({ studyId: z.string().uuid(), channel: z.enum(["copy_citation", "x", "reddit", "whatsapp", "discord", "web_share", "friend_chat"]) })`
- **`ToggleCommentEndorsementSchema`**:
  `z.object({ commentId: z.string().uuid() })`
- **`RecordStudyViewSchema`**:
  `z.object({ studyId: z.string().uuid() })`
- **`SearchUsersByDisplayNameSchema`**:
  `z.object({ query: z.string().trim().min(2).max(50) })`
- **`FriendTargetSchema`**:
  `z.object({ targetUserId: z.string().uuid() })`
- **`RespondFriendRequestSchema`**:
  `z.object({ friendshipId: z.string().uuid(), decision: z.enum(["accept", "decline", "cancel"]) })`
- **`SendDirectMessageSchema`**:
  `z.object({ recipientId: z.string().uuid(), body: z.string().trim().min(1, "Message cannot be empty.").max(1000, "Message must be 1,000 characters or fewer.") })`
- **`SendStudyToFriendSchema`**:
  `z.object({ recipientId: z.string().uuid(), studyId: z.string().uuid(), note: z.string().trim().max(240, "Note must be 240 characters or fewer.").optional().transform((v) => (v && v.length > 0 ? v : null)) })`
- **`DirectMessageThreadCursorSchema`**:
  `z.object({ friendId: z.string().uuid(), cursorCreatedAt: z.string().datetime({ offset: true }).optional(), cursorMessageId: z.string().uuid().optional() })`

---

## 4. Server Actions & RPC Contracts

| Module / Action | Input Schema | Auth & Access Rule | Behavior & Cache Revalidation |
|-----------------|--------------|--------------------|-------------------------------|
| `social.ts` → `recordStudyShareAction` | `RecordStudyShareSchema` | Optional auth (no-op returning `{ ok: true, recorded: false }` if signed out) | Inserts `(user.id, studyId, channel, utcToday)` into `public.study_shares` (`ON CONFLICT DO NOTHING`); trigger recomputes `aura_score`. |
| `social.ts` → `toggleCommentEndorsementAction` | `ToggleCommentEndorsementSchema` | Authenticated (`user.id !== comment.author_id`) | Inserts or deletes `(commentId, user.id)` in `public.comment_endorsements`; trigger updates `helpful_count` & comment author's `aura_score`; revalidates `/study/${studyId}`. |
| `profile.ts` → `updateActivityVisibilityAction` | `UpdateActivityVisibilitySchema` | Authenticated owner (`user.id`) | Updates `upvoted_studies_visibility` and `viewed_studies_visibility` on `public.profiles`; revalidates `/profile` and `/profile/${user.id}`. |
| `profile.ts` → `recordStudyViewAction` | `RecordStudyViewSchema` | Authenticated (`viewed_studies_visibility !== "private"`) | Calls `supabase.rpc("record_study_view", { p_study_id: studyId })` (deduplicates & prunes to `<= 20` rows). |
| `profile.ts` → `clearRecentStudyViewsAction` | None | Authenticated owner (`user.id`) | Deletes all `public.recent_study_views` rows where `user_id = user.id`; revalidates `/profile` and `/profile/${user.id}`. |
| `profile.ts` → `loadMorePublicUpvotesAction` | `PublicUpvotesCursorSchema` | Public/Authenticated via RLS `private.can_view_user_upvotes` | Keyset-paginated (`LIMIT 21`) upvoted studies for `/profile/[id]` when owner opted into `'friends'` or `'public'`. |
| `social.ts` → `searchUsersAction` | `SearchUsersByDisplayNameSchema` | Authenticated | Calls `supabase.rpc("search_profiles_for_social", { p_query: query, p_limit: 15 })` (`lower(display_name) LIKE lower(query) || '%'`, backed by `idx_profiles_display_name_lower`), projecting `TOP_AURA_USER_COLUMNS` + caller's friendship state while hiding `user.id` and blocked pairs server-side. |
| `social.ts` → `sendFriendRequestAction` | `FriendTargetSchema` | Authenticated (`targetUserId !== user.id`) | Calls `supabase.rpc("send_friend_request", { p_target_user_id: targetUserId })`; rejects self or blocked pairs; surfaces `{ ok: true, state: "incoming_pending" }` on crossed pending requests (`Edge Case 1`); otherwise inserts `'pending'` row. |
| `social.ts` → `respondFriendRequestAction` | `RespondFriendRequestSchema` | Authenticated (`addressee_id` for `accept`/`decline`, `requester_id` for `cancel`) | Calls `supabase.rpc("respond_friend_request", { p_friendship_id: friendshipId, p_decision: decision })`; transitions `'pending'` → `'accepted'` or deletes declined/cancelled row; revalidates `/profile/${peerId}`. |
| `social.ts` → `unfriendAction` | `FriendTargetSchema` | Authenticated participant | Calls `supabase.rpc("remove_or_unblock_friendship", { p_target_user_id: targetUserId })`; deletes `'accepted'` row and immediately revokes `'friends'` activity visibility and chat send rights. |
| `social.ts` → `blockUserAction` / `unblockUserAction` | `FriendTargetSchema` | Authenticated (`unblock` restricted to `blocked_by_id = user.id`) | Calls `supabase.rpc("block_user", ...)` (upserts `'blocked'` state and marks unread incoming messages read) or `supabase.rpc("remove_or_unblock_friendship", ...)` (deletes `'blocked'` row). |
| `social.ts` → `sendDirectMessageAction` | `SendDirectMessageSchema` | Authenticated **mutual `'accepted'` friends only** (`FR-011`, `SC-005`) | Inserts plain-text message (`<= 1,000` chars) into `public.direct_messages`; rejects non-friends/blocked users with `FORBIDDEN`. |
| `social.ts` → `sendStudyToFriendAction` | `SendStudyToFriendSchema` | Authenticated **mutual `'accepted'` friends only** | Inserts `direct_messages` row (`study_id`, `has_study_attachment = true`, optional `body <= 240` chars) AND records `study_shares` (`channel = 'friend_chat'`). |
| `social.ts` → `getChatThreadAction` & `markThreadReadAction` | `DirectMessageThreadCursorSchema` | Authenticated thread participant (non-blocked) | Fetches `LIMIT 31` keyset-paginated messages (`DIRECT_MESSAGE_COLUMNS`, returning up to 30 messages + `hasMore`) and invokes `mark_thread_messages_read(friendId)`. |
| `social.ts` → `getSocialDrawerOverviewAction` & `getUnreadSocialCountsAction` | None | Authenticated | Returns accepted friends (with per-friend unread counts), incoming/outgoing pending requests, and blocked users on drawer open; `getUnreadSocialCountsAction` returns `{ pendingRequests, unreadMessages, totalBadge }`. |

---

## 5. External Sharing, Open Graph & Neo-Brutalist UI Contracts

### 5.1 External Share Formatting & `/study/[id]` Open Graph (`FR-004`, `FR-005`, `SC-001`)
- **Canonical Study URL**: `${siteOrigin}/study/${study.id}`
- **Copy Link + Citation Format**:
  `"${study.title}" (${study.journal}, ${study.publication_year}) — Evidence breakdown [${formatStudyDesign(study.study_design)} • ${study.inspection_depth}] via SBL News: ${canonicalUrl}`
- **`/study/[id]` `generateMetadata` Contract**:
  - `title`: `${study.title} (${study.journal}, ${study.publication_year}) — SBL News`
  - `description`: `[${formatStudyDesign(study.study_design)} • ${study.inspection_depth} • Score ${study.quality_score}/100] ${conciseTakeaway} — Science-Based Lifting News`
  - `openGraph`: `{ type: "article", siteName: "SBL News", title, description, url: `/study/${study.id}`, images: [{ url: "/img/logo.png", width: 512, height: 512, alt: `${study.title} — SBL News` }] }`
  - `twitter`: `{ card: "summary", title, description, images: ["/img/logo.png"] }`
  - If `study` is missing or not `'published'`, returns `{ title: "Study Not Found — SBL News" }` without leaking unpublished records.

### 5.2 Neo-Brutalist Visual & Accessibility Guardrails (`FR-013`, Principle III)
1. **Aura Badge (`<AuraBadge score={n} />`)**: Renders in `JetBrains Mono` (`font-mono text-xs font-bold`), `1.5px solid var(--color-border)`, `rounded-sm` (`4px`), Sky Blue (`bg-accent text-accent-ink`) or crisp surface token (`bg-canvas text-ink`), displaying `${score} AURA`.
2. **Left-Side `TopUsersRail` (`/`)**:
   - Desktop (`lg+`): `w-[260px] shrink-0 lg:sticky lg:top-20`, `Card` (`2px solid var(--color-border)`, `shadow-card`, `rounded-md`), ranked `#1`–`#10` with `UserAvatar` (`sm`), `display_name`, optional `affiliation_role`, and `<AuraBadge />` linking to `/profile/[id]`.
   - Mobile (`< lg`): Single compact `Card` toggle bar (`Top Contributors • Aura`) expanding inline with zero horizontal overflow (`SC-002`).
3. **Header `FriendsChatDrawer`**:
   - Trigger: `36x36` (`h-9 w-9`) square `rounded-md` button (`2px solid var(--color-border)`, `shadow-control`) placed immediately left of `<AccountBubble />` in `TopNav`, with a `JetBrains Mono` Sky Blue unread count badge (`bg-accent text-accent-ink border-[1.5px] border-border`) when `totalBadge > 0`.
   - Slide-over Panel: Right-docked full-height panel (`w-full max-w-md border-l-2 border-border bg-surface shadow-card`), `role="dialog"`, `aria-modal="true"`, `Escape` close + focus return, flat dimmed overlay (`bg-ink/40` — **strictly zero `backdrop-blur`**), and **zero purple/violet/indigo hues** across Light and Dark themes.
   - Missing/Unpublished Study Placeholder (`Edge Case 4`): If `msg.has_study_attachment && !msg.study`, renders a muted Neo-Brutalist card (`"Referenced study is no longer available"`).
