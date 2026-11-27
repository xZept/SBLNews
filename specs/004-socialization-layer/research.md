# Phase 0 Research: Lightweight Socialization, Aura Leaderboard & Study Sharing

**Branch**: `004-socialization-layer` | **Date**: 2026-11-28 | **Spec**: [spec.md](./spec.md)

## 1. Deterministic Aura Formula, Anti-Gaming Caps & ISR-Safe Leaderboard

- **Decision**:
  - Add `aura_score int NOT NULL DEFAULT 0 CHECK (aura_score >= 0)` and `aura_updated_at timestamptz NOT NULL DEFAULT now()` to `public.profiles` in sequential migration `supabase/migrations/0009_socialization_aura_friends_chat.sql`, granting `SELECT (aura_score)` to `anon, authenticated` while keeping `aura_score` non-updatable by client roles (`REVOKE UPDATE (aura_score)`).
  - Add two compact contribution tables to capture the missing Aura signals alongside existing `public.comments` and `public.votes`:
    1. `public.comment_endorsements` (`comment_id`, `user_id`, `created_at`, `PRIMARY KEY (comment_id, user_id)`) plus `helpful_count int NOT NULL DEFAULT 0` on `public.comments`, allowing signed-in readers to mark another user's non-deleted comment as helpful (self-endorsement disallowed).
    2. `public.study_shares` (`user_id`, `study_id`, `channel`, `shared_on`, `created_at`, `PRIMARY KEY (user_id, study_id, shared_on)`), deduplicating recorded shares per `(user_id, study_id, UTC day)` via `ON CONFLICT DO NOTHING`.
  - Implement a pure, deterministic PostgreSQL function `private.recompute_user_aura(p_user_id uuid) RETURNS int` invoked automatically by `AFTER INSERT OR UPDATE OR DELETE` triggers on `comments`, `comment_endorsements`, `votes`, and `study_shares`. It computes exact Aura from ground-truth rows grouped by UTC calendar day (`(created_at AT TIME ZONE 'UTC')::date`) using fixed weights and per-day caps:
    - **Non-deleted study comments posted** (`comments.is_deleted = false` on published studies): `+5` Aura each, capped at `+25` Aura/day (5 comments/day).
    - **Helpful endorsements received on non-deleted comments** (`comment_endorsements` where `endorser <> author` and `comments.is_deleted = false`): `+2` Aura each, capped at `+20` Aura/day (10 endorsements/day).
    - **Published study upvotes cast** (`votes`): `+1` Aura each, capped at `+10` Aura/day (10 upvotes/day).
    - **Distinct studies shared** (`study_shares`): `+2` Aura each, capped at `+10` Aura/day (5 study shares/day).
  - Query the **Top Users** rail on `/` via `getTopAuraUsers(limit = 10)` using the cookie-free `createPublicClient()` (`WHERE aura_score > 0 ORDER BY aura_score DESC, display_name ASC, id ASC LIMIT 10`) backed by composite index `idx_profiles_aura_leaderboard`, running in `Promise.all` alongside `getFeedStudies()` inside ISR (`revalidate = 3600`).
- **Rationale**:
  - Recomputing a user's `aura_score` from their indexed contribution rows on write (`< 1 ms` per mutation) rather than applying incremental `+N / -N` deltas guarantees 100% deterministic accuracy (`SC-003`) even when comments are soft-deleted, upvotes are toggled off, or daily caps were previously saturated (`US2` Scenario 5, Constitution Principle II).
  - Reading precomputed `profiles.aura_score` via `createPublicClient()` adds `< 1.5 KB` to `/` and preserves static ISR caching (`revalidate = 3600`, Principle I).
- **Alternatives Considered**:
  - *Incremental delta triggers (`aura_score = aura_score + 5`)*: Rejected because deleting one of 6 comments made on the same UTC day would falsely subtract 5 points when the 6th comment was previously capped, causing permanent score drift.
  - *Computing the leaderboard via a live multi-table `GROUP BY` aggregate view on every `/` request*: Rejected because precomputing `profiles.aura_score` on write makes `/`, `/profile`, `/profile/[id]`, and `/study/[id]` comment author joins instant $O(1)$ column reads.

## 2. Desktop Left Rail & Mobile Collapsible Layout Geometry on `/`

- **Decision**:
  - Keep `RootLayout`'s `max-w-6xl` (`1152px`) container untouched so all 8 routes retain consistent horizontal alignment.
  - Update `web/src/app/page.tsx` to render a balanced two-column desktop grid (`lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-6`):
    - **Desktop (`lg+`)**: Sticky left `<TopUsersRail />` (`260px` wide, `lg:sticky lg:top-20`) beside the `~820px` main feed column, preserving `max-w-[70ch]` (`65ch–75ch`) study takeaway line measure and opening directly into the sticky filter bar with zero marketing hero banner (Principle III).
    - **Mobile / Tablet (`< lg`)**: Compact collapsible Neo-Brutalist strip above `FeedClient` (collapsed by default into a single `Top Contributors • View Top Aura` toggle bar showing top 3 mini-badges, expanding cleanly in place on tap) so narrow `375px` viewports suffer zero horizontal overflow and study cards remain above the fold (`SC-002`).
- **Rationale**:
  - Inside `max-w-6xl` (`1104px` inner width after `px-6`), `260px + 24px gap` leaves `820px` for `StudyCard`—more than enough for the `52px` upvote column + `70ch` `14px` Inter body copy (`~600px`).
- **Alternatives Considered**:
  - *Widening `RootLayout` globally to `max-w-7xl`*: Rejected because widening all 8 routes unnecessarily stretches `/guidelines`, `/profile`, and `/methodology` grids.
  - *Rendering the full 10-row vertical leaderboard unfolded above the feed on mobile*: Rejected because pushing primary peer-reviewed studies below the fold on mobile degrades the Hugging Face Daily Papers feed density mandated by Principle III.

## 3. External Study Sharing & Dynamic Open Graph Metadata on `/study/[id]`

- **Decision**:
  - Create a reusable `<StudyShareMenu />` client component rendered in the footer action bar of `StudyCard` (`/`, `/search`) and the primary action bar of `MetadataBreakdown` (`/study/[id]`).
  - Provide immediate 2-click external share targets (`FR-004`, `SC-001`) usable by both signed-out and signed-in visitors:
    1. **Copy Link + Citation**: Copies `"${title}" (${journal}, ${publication_year}) — Evidence breakdown via SBL News: ${canonicalUrl}` to clipboard with inline confirmation.
    2. **X / Twitter**: Opens `https://twitter.com/intent/tweet` with study title, journal/year, evidence design tag, `"via SBL News"`, and canonical URL.
    3. **Reddit**: Opens `https://www.reddit.com/submit` prefilled with canonical URL and `[${designLabel}] ${title} (${journal}, ${publication_year}) — SBL News`.
    4. **WhatsApp**: Opens `https://wa.me/?text=...` with formatted citation + canonical URL.
    5. **Discord**: Copies Markdown-formatted card (`**Title** (*Journal*, Year) • [Design Badge]\n> Concise Takeaway\nVia SBL News: URL`) to clipboard with inline `"Copied for Discord"` feedback.
    6. **Native Share**: Conditionally rendered when `navigator.share` is available on the client device.
  - Add `metadataBase` in `web/src/app/layout.tsx` (resolving from `NEXT_PUBLIC_SITE_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, or `http://localhost:3000`) and export `generateMetadata` in `web/src/app/study/[id]/page.tsx` using a `React.cache`-deduplicated public study summary query (`createPublicClient()`, zero user session data) to emit study-specific Open Graph (`og:type="article"`, `og:title`, `og:description` containing journal/year + evidence badge + inspection depth + takeaway + SBL News attribution, `og:url`, and `/img/logo.png`) and Twitter summary metadata (`FR-005`).
- **Rationale**:
  - Using `generateMetadata` directly on `study/[id]/page.tsx` satisfies `FR-005` and `SC-001` without introducing a `study/[id]/opengraph-image.tsx` route segment (which would add an extra generated route endpoint and `next/og` serverless font/image cold-start overhead against Principles I & V).
  - Deduplicating the study lookup via `React.cache` ensures `generateMetadata` and `StudyDetailPage` execute only a single database read per request.
- **Alternatives Considered**:
  - *Dynamic `next/og` `ImageResponse` route (`opengraph-image.tsx`)*: Rejected to keep the 8-route surface strictly minimal (Principle V) and avoid Vercel Hobby serverless execution/memory overhead on crawler unfurls (Principle I).
  - *Third-party social share widget SDKs*: Rejected per Principle I stack & dependency discipline and user privacy.

## 4. Three-State Profile Activity Visibility & Bounded 20-Item Recent Views

- **Decision**:
  - Introduce enum `public.activity_visibility_type AS ENUM ('private', 'friends', 'public')` and add two columns on `public.profiles`, both defaulting to `'private'`:
    - `upvoted_studies_visibility public.activity_visibility_type NOT NULL DEFAULT 'private'`
    - `viewed_studies_visibility public.activity_visibility_type NOT NULL DEFAULT 'private'`
  - Create table `public.recent_study_views (user_id uuid, study_id uuid, viewed_at timestamptz, PRIMARY KEY (user_id, study_id))` with composite index `(user_id, viewed_at DESC, study_id DESC)`.
  - Enforce visibility at the **PostgreSQL RLS boundary** (`FR-008`, `SC-004`) via indexed `SECURITY DEFINER` helper functions in a non-exposed `private` schema (`private.are_accepted_friends`, `private.can_view_user_upvotes`, `private.can_view_user_recent_views`) wrapped in `(select ...)` initPlans:
    - `'private'` (default): Readable strictly by `auth.uid() = user_id` (`0` rows exposed to `anon` or other signed-in users, preserving 100% backward privacy with `003-user-profiles`).
    - `'friends'`: Readable strictly by `auth.uid() = user_id` OR mutual `'accepted'` friends in `public.friendships`.
    - `'public'`: Readable by `anon` and `authenticated` callers.
  - Record views via atomic RPC `public.record_study_view(p_study_id uuid)` invoked only for signed-in users whose `viewed_studies_visibility IN ('friends', 'public')` (`FR-007`): upserts `(user_id, study_id, now())` and immediately deletes any rows beyond the user's 20 most recent `(viewed_at DESC, study_id DESC)` entries in the same transaction, plus provide `clearRecentStudyViewsAction` on `/profile` (`FR-006`).
- **Rationale**:
  - Enforcing `'private' | 'friends' | 'public'` inside PostgreSQL RLS (rather than only hiding UI tabs in React) guarantees that direct PostgREST queries with the publishable anon key or another user's JWT can never read non-consented upvoted or viewed studies (`SC-004`, Principle IV).
  - Atomic in-transaction pruning caps `recent_study_views` at `<= 20` rows per opted-in user, bounding worst-case table size to a few megabytes well inside Supabase Free's `500 MB` database and `5 GB` egress limits.
- **Alternatives Considered**:
  - *Recording passive study views for all visitors or opted-out users and filtering only at display time*: Rejected because it violates `FR-007` and wastes database writes/storage on users who want default privacy.
  - *Exposing raw `upvoted_studies_visibility` / `viewed_studies_visibility` columns to `anon`*: Rejected in favor of a scoped `get_profile_social_context(p_target_user_id)` RPC returning boolean `can_view_upvotes` and `can_view_recent_views`, avoiding leaking whether a stranger's hidden list is `private` vs. `friends`.

## 5. Canonical-Pair Friendships, Mutual-Friend 1:1 Chat & On-Demand Header Drawer

- **Decision**:
  - Model `public.friendships` with `requester_id`, `addressee_id`, generated canonical pair columns `user_low_id = LEAST(requester_id, addressee_id)` and `user_high_id = GREATEST(requester_id, addressee_id)`, `UNIQUE (user_low_id, user_high_id)`, `status ('pending' | 'accepted' | 'blocked')`, and `blocked_by_id`.
  - Model `public.direct_messages` with `sender_id`, `recipient_id`, generated canonical pair columns `(pair_low_id, pair_high_id)`, `body` (`<= 1,000` chars plain text, or `<= 240` chars optional note when `has_study_attachment = true`), `study_id REFERENCES public.studies(id) ON DELETE SET NULL`, `has_study_attachment boolean`, and `read_at timestamptz NULL`.
  - Enforce **mutual-friend gating** directly in `direct_messages` `INSERT` RLS (`WITH CHECK ((select auth.uid()) = sender_id AND (select private.are_accepted_friends(sender_id, recipient_id)))`) and server actions (`FR-011`, `SC-005`). Restrict read receipts to a dedicated `public.mark_thread_messages_read(p_friend_id uuid)` RPC instead of granting broad `UPDATE` privileges on `direct_messages`.
  - Add `<FriendsChatDrawer />` + trigger button beside `<AccountBubble />` in `TopNav` (`web/src/components/layout/top-nav.tsx`), managed by `<SocialDrawerProvider>` in `RootLayout` so any route (`StudyShareMenu`, `/profile/[id]`) can open the drawer to **Friends** or **Chat** without adding any URL routes (Principle V).
  - Use **on-demand fetching** (compact unread badge count on session load; full friends list, user search, and keyset-paginated 30-message threads fetched only when the drawer opens or an action fires, plus a lightweight `15s` visibility-gated refresh only while a chat thread is actively open) with zero Supabase Realtime WebSocket channels.
- **Rationale**:
  - Generated `(LEAST, GREATEST)` unique constraints make duplicate/crossed pending requests and race conditions impossible at the database level while turning `private.are_accepted_friends(a, b)` into a single unique-index lookup.
  - Keeping `has_study_attachment = true` alongside `study_id ON DELETE SET NULL` allows the chat UI to render a graceful `"Referenced study is no longer available"` Neo-Brutalist placeholder if a study is ever unpublished or deleted (`Edge Case 4`).
  - On-demand fetching avoids exhausting Supabase Free's 200 concurrent Realtime WebSocket ceiling while keeping egress tiny via narrow column projections (`STUDY_SHARE_CARD_COLUMNS`).
- **Alternatives Considered**:
  - *Dedicated `/messages` and `/friends` App Router pages*: Rejected because Constitution Principle V strictly locks `/web` to the 8 approved routes.
  - *Supabase Realtime `postgres_changes` subscriptions in `TopNav` for every signed-in tab*: Rejected per spec Assumptions and Principle I/IV quota discipline.
