# Tasks: Lightweight Socialization, Aura Leaderboard & Study Sharing

**Input**: Design documents from `/specs/004-socialization-layer/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/socialization-routes-and-actions.md](./contracts/socialization-routes-and-actions.md), [quickstart.md](./quickstart.md)

**Tests**: Unit tests for deterministic Aura scoring, external share formatters, Zod social/visibility schemas, egress-safe column projections, and the 8-route Constitution boundary are included per Constitution Principle VI and `quickstart.md`.

**Organization**: Tasks are grouped by user story (`US1`–`US4`) in priority order (`P1` → `P2`) so each increment can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Exact file paths are included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configure canonical site URL metadata base and confirm clean baseline before schema and social feature work

- [X] T001 Configure `metadataBase` in `web/src/app/layout.tsx` (resolving `NEXT_PUBLIC_SITE_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, or `http://localhost:3000`) and verify existing baseline checks (`npm run typecheck`, `npm run lint`, `npm test` in `web/`, and `pytest -v` in `pipeline/`)

---

## Phase 2: Foundational (Blocking Database Migration, Projections & Validation)

**Purpose**: Core PostgreSQL schema, deterministic Aura triggers, RLS policies, egress-safe projections, and Zod validation schemas required before any user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Author sequential SQL migration `supabase/migrations/0009_socialization_aura_friends_chat.sql` implementing: (a) enums `public.activity_visibility_type ('private', 'friends', 'public')`, `public.friendship_status_type ('pending', 'accepted', 'blocked')`, and `public.share_channel_type ('copy_citation', 'x', 'reddit', 'whatsapp', 'discord', 'web_share', 'friend_chat')`; (b) non-exposed `private` schema (`REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;`) with `private.are_accepted_friends`, `private.is_blocked_pair`, `private.can_view_user_upvotes`, `private.can_view_user_recent_views`, and `private.recompute_user_aura`; (c) `public.profiles` columns (`aura_score int NOT NULL DEFAULT 0 CHECK (aura_score >= 0)`, `aura_updated_at timestamptz NOT NULL DEFAULT now()`, `upvoted_studies_visibility public.activity_visibility_type NOT NULL DEFAULT 'private'`, `viewed_studies_visibility public.activity_visibility_type NOT NULL DEFAULT 'private'`), `idx_profiles_aura_leaderboard`, `idx_profiles_display_name_lower`, updated column-level `SELECT`/`UPDATE` grants, and updated `public.get_my_account_profile()`; (d) `public.comments.helpful_count int NOT NULL DEFAULT 0 CHECK (helpful_count >= 0)`, `public.comment_endorsements (comment_id, user_id)` with self/deleted validation trigger, and `public.study_shares (user_id, study_id, shared_on)` with Aura recompute triggers across `comments`, `comment_endorsements`, `votes`, and `study_shares`; (e) `public.recent_study_views (user_id, study_id)` with `votes_select_by_visibility` RLS, `GRANT SELECT`/`DELETE` grants, `public.record_study_view(uuid)` atomic `<= 20`-row pruning RPC, and `public.get_profile_social_context(uuid)`; (f) canonical-pair `public.friendships` (`user_low_id`, `user_high_id`, `requester_id <> addressee_id`, `blocked_by_id` consistency check, `GRANT SELECT`, plus `SECURITY DEFINER` RPCs `public.search_profiles_for_social`, `public.send_friend_request`, `public.respond_friend_request`, `public.remove_or_unblock_friendship`, and `public.block_user`) and `public.direct_messages` (`body` `1..1000` chars or `<= 240` chars when `has_study_attachment = true`, `study_id ON DELETE SET NULL`, `GRANT SELECT, INSERT`, mutual-friend `INSERT` RLS, and `public.mark_thread_messages_read(uuid)` RPC)
- [X] T003 [P] Extend egress-safe column projections and TypeScript interfaces in `web/src/lib/queries/projections.ts` (`ActivityVisibilityType`, `FriendshipStatusType`, `ProfileFriendshipState`, `ShareChannelType`, `PUBLIC_PROFILE_COLUMNS` with `aura_score`, `TOP_AURA_USER_COLUMNS`, `STUDY_SHARE_CARD_COLUMNS`, `PROFILE_RECENT_VIEW_COLUMNS`, `DIRECT_MESSAGE_COLUMNS`, `TopAuraUser`, `ProfileRecentViewItem`, `ProfileSocialContext`, `FriendConnectionItem`, `DirectMessageItem`, and updated `AccountProfile`/`StudyComment`)
- [X] T004 [P] Create runtime Zod validation schemas in `web/src/lib/validations/social.ts` (`RecordStudyShareSchema`, `ToggleCommentEndorsementSchema`, `SearchUsersByDisplayNameSchema`, `FriendTargetSchema`, `RespondFriendRequestSchema`, `SendDirectMessageSchema` with `1..1000`-char body, `SendStudyToFriendSchema` with optional `<= 240`-char note, `DirectMessageThreadCursorSchema`, `PublicUpvotesCursorSchema`) and extend `web/src/lib/validations/profile.ts` with `ActivityVisibilityEnum` and `UpdateActivityVisibilitySchema`
- [X] T005 [P] Update `web/src/components/layout/account-profile-provider.tsx` to hydrate and expose `aura_score`, `upvoted_studies_visibility`, and `viewed_studies_visibility` from `get_my_account_profile()`

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel or priority order

---

## Phase 3: User Story 1 - External Study Sharing & Rich Preview Cards (Priority: P1) 🎯 MVP

**Goal**: Enable any visitor on `/` or `/study/[id]` to share studies externally in <= 2 clicks (Copy Link + Citation attributing SBL News, X/Twitter, Reddit, WhatsApp, Discord, native Web Share) backed by study-specific Open Graph and Twitter preview metadata on `/study/[id]`.

**Independent Test**: Open `/` or `/study/[id]` while signed out or signed in, trigger **Share / Send**, copy the study link + citation (verifying title, SBL News attribution, and canonical `/study/[id]` URL), and inspect `/study/[id]` `<head>` metadata for study-specific `og:*` and `twitter:*` tags without leaking private user data.

- [X] T006 [P] [US1] Create pure external share URL builders (`X`, `Reddit`, `WhatsApp`) and SBL News citation / Discord Markdown formatter helpers in `web/src/lib/share-links.ts`
- [X] T007 [P] [US1] Implement `recordStudyShareAction` in `web/src/lib/actions/social.ts` validating `RecordStudyShareSchema`, returning `{ ok: true, recorded: false }` for signed-out visitors, and inserting `(user_id, study_id, channel)` into `public.study_shares` (ignoring same-day duplicates) for signed-in users
- [X] T008 [US1] Build `<StudyShareMenu />` in `web/src/components/social/study-share-menu.tsx` with Neo-Brutalist popover UI (`2px solid var(--color-border)`, `shadow-card`, `rounded-md`), Copy Link + Citation, X / Twitter, Reddit, WhatsApp, Discord copy, conditional native `navigator.share`, inline copy confirmation, and a signed-out prompt in the **Send to Friend** section
- [X] T009 [US1] Integrate `<StudyShareMenu />` into `web/src/components/feed/study-card.tsx` (footer action bar) and `web/src/components/study/metadata-breakdown.tsx` (beside the Primary Source CTA)
- [X] T010 [US1] Wrap public study detail lookup with `React.cache` (`createPublicClient()`) in `web/src/lib/queries/studies.ts` and export `generateMetadata` in `web/src/app/study/[id]/page.tsx` generating study-specific Open Graph (`og:type="article"`, title, journal/year, evidence design, inspection depth, takeaway, SBL News attribution) and Twitter summary cards
- [X] T011 [P] [US1] Add unit tests in `web/tests/social.test.ts` covering SBL News citation formatting, external share URL encoding, Discord Markdown output, `RecordStudyShareSchema` validation, and `/study/[id]` `generateMetadata` output (published study OG/Twitter fields vs. missing/unpublished fallback)

**Checkpoint**: User Story 1 (MVP) is independently functional and verifiable

---

## Phase 4: User Story 2 - Deterministic Aura Scoring & Left-Side Top Users Rail (Priority: P1)

**Goal**: Showcase top community contributors ranked deterministically by **Aura** in a sticky left-side **Top Users** rail on `/` (collapsing cleanly on mobile), surface `<AuraBadge />` across profiles and discussion threads, and allow readers to endorse helpful comments.

**Independent Test**: Record qualifying community actions (non-deleted comments, comment endorsements received, study upvotes, and study shares), confirm deterministic **Aura** scores with UTC daily caps and automatic point removal on deletion/un-endorsement, verify the left-side **Top Users** rail on `/` (desktop sticky left, mobile collapsible without horizontal overflow), and click a contributor to land on `/profile/[id]`.

- [X] T012 [P] [US2] Create deterministic Aura weight/cap constants and pure TypeScript mirror helper (`computeDeterministicAura`) in `web/src/lib/aura.ts` (`+5` comment cap `25`/day, `+2` endorsement cap `20`/day, `+1` upvote cap `10`/day, `+2` share cap `10`/day)
- [X] T013 [P] [US2] Implement `getTopAuraUsers(limit = 10)` in `web/src/lib/queries/social.ts` using cookie-free `createPublicClient()` (`TOP_AURA_USER_COLUMNS`, `WHERE aura_score > 0`) and extend `getStudyComments` in `web/src/lib/queries/studies.ts` to project `helpful_count`, `viewer_has_endorsed`, and `author.aura_score`
- [X] T014 [P] [US2] Create `<AuraBadge />` in `web/src/components/social/aura-badge.tsx` using `JetBrains Mono`, `1.5px solid var(--color-border)`, `rounded-sm`, and `${score} AURA` display across Light and Dark themes
- [X] T015 [US2] Build `<TopUsersRail />` in `web/src/components/social/top-users-rail.tsx` rendering a `260px` sticky desktop left rail and a compact collapsible mobile toggle strip linking each contributor to `/profile/[id]`
- [X] T016 [US2] Update `web/src/app/page.tsx` to fetch `getTopAuraUsers(10)` in `Promise.all` alongside `getFeedStudies()` (preserving `revalidate = 3600` ISR) and render `<TopUsersRail />` beside `<FeedClient />` in a `lg:grid-cols-[260px_minmax(0,1fr)]` layout preserving `65ch–75ch` takeaway readability
- [X] T017 [US2] Implement `toggleCommentEndorsementAction` in `web/src/lib/actions/social.ts`, add the **Helpful** endorsement control + author `<AuraBadge />` to `web/src/components/study/discussion-thread.tsx`, and render `<AuraBadge />` in `web/src/components/layout/account-bubble.tsx`, `web/src/app/profile/page.tsx`, and `web/src/app/profile/[id]/page.tsx`
- [X] T018 [P] [US2] Document the deterministic Aura rubric and UTC daily caps as Pillar 5 in `web/src/app/methodology/page.tsx` and add unit tests in `web/tests/social.test.ts` verifying Aura weights, daily cap saturation, and deterministic deduction on comment/endorsement removal

**Checkpoint**: User Stories 1 and 2 are independently functional and verifiable

---

## Phase 5: User Story 3 - Opt-In Interacted & Recently Viewed Studies on Profiles (Priority: P2)

**Goal**: Allow signed-in users on `/profile` to set three-state visibility (`Private` default | `Friends Only` | `Public`) for **Interacted (Upvoted) Studies** and **Recently Viewed Studies**, track up to 20 deduplicated recent study views only when opted in, and enforce visibility at the data-access boundary on `/profile/[id]`.

**Independent Test**: Keep a user at default `Private` and confirm zero upvoted or viewed studies appear on `/profile/[id]` to non-friends or accepted friends; switch visibility to `Friends Only` and verify only accepted friends see both sections; view > 20 studies with repeats and verify `/profile` deduplicates and caps stored history at 20 studies plus supports **Clear History**.

- [X] T019 [P] [US3] Add `getProfileSocialContext`, `getRecentStudyViews`, and `getAuthorizedUpvotedStudies` in `web/src/lib/queries/profile.ts` using `PROFILE_RECENT_VIEW_COLUMNS` and `PROFILE_UPVOTED_STUDY_COLUMNS` (never `SELECT *`, `abstract_text`, or `embedding`), and audit all existing `public.votes` queries across `web/src/` to ensure every viewer-upvote check filters explicitly by `.eq("user_id", user.id)` under `votes_select_by_visibility` RLS
- [X] T020 [P] [US3] Add `updateActivityVisibilityAction`, `recordStudyViewAction`, `clearRecentStudyViewsAction`, and `loadMorePublicUpvotesAction` in `web/src/lib/actions/profile.ts`
- [X] T021 [US3] Update `web/src/components/profile/profile-settings-form.tsx` with `Private` (default) / `Friends Only` / `Public` controls for **Interacted (Upvoted) Studies** and **Recently Viewed Studies**
- [X] T022 [US3] Update `web/src/components/profile/profile-activity-lists.tsx` to render the **Recently Viewed Studies** tab (`<= 20` items) + **Clear History** button in `private` mode and visibility-authorized **Upvoted Studies** / **Recently Viewed Studies** tabs in `public` mode
- [X] T023 [US3] Create `<StudyViewTracker />` in `web/src/components/study/study-view-tracker.tsx`, mount it in `web/src/app/study/[id]/page.tsx` only for signed-in users opted into `viewed_studies_visibility !== 'private'`, and wire visibility-gated queries into `web/src/app/profile/page.tsx` and `web/src/app/profile/[id]/page.tsx`

**Checkpoint**: User Story 3 is independently functional and enforces default-private & `Friends Only` RLS boundaries

---

## Phase 6: User Story 4 - Friend Connections & In-Header Friends / 1:1 Study Chat Drawer (Priority: P2)

**Goal**: Provide a global in-header **Friends & Chat** slide-over drawer beside `AccountBubble` across all 8 approved routes (zero new routes) plus `/profile/[id]` friend actions, enabling display-name search, friend requests, block/unfriend, and mutual-friend-gated 1:1 plain-text chat and embedded study card sends.

**Independent Test**: Search and send a friend request via the header drawer or `/profile/[id]`, verify pending/blocked users cannot send messages or study cards, accept the request from the recipient's unread indicator, send a study card via **Share / Send -> Send to Friend** from `/`, reply with a 1:1 message inside the drawer, and verify blocking immediately prevents further requests and messages.

- [X] T024 [P] [US4] Implement `getUnreadSocialCounts`, `getFriendsOverview`, `searchProfilesByName` (via `search_profiles_for_social` RPC), and keyset-paginated `getDirectMessageThread` (`LIMIT 31` returning up to 30 messages + `hasMore`) in `web/src/lib/queries/social.ts`
- [X] T025 [P] [US4] Implement friend & chat Server Actions in `web/src/lib/actions/social.ts` (`getUnreadSocialCountsAction`, `getSocialDrawerOverviewAction`, `searchUsersAction`, `sendFriendRequestAction`, `respondFriendRequestAction`, `unfriendAction`, `blockUserAction`, `unblockUserAction`, `getChatThreadAction`, `markThreadReadAction`, `sendDirectMessageAction`, `sendStudyToFriendAction`)
- [X] T026 [US4] Create `<SocialDrawerProvider />` in `web/src/components/layout/social-drawer-provider.tsx` managing drawer open state, active tab (`friends` | `chat`), active friend thread, pending study-send prefill, and on-demand unread badge counts, and wrap `TopNav` + `<main>` in `web/src/app/layout.tsx`
- [X] T027 [US4] Build `<FriendsChatDrawer />` in `web/src/components/layout/friends-chat-drawer.tsx` (`role="dialog"`, `aria-modal="true"`, `Escape` close + focus return, flat `bg-ink/40` overlay with zero `backdrop-blur`, **Friends** tab with display-name search & request/unfriend/block controls, **Chat** tab with 1:1 threads, embedded study cards, missing-study placeholder, and `1,000`-char validation) and add the unread-badge icon trigger beside `<AccountBubble />` in `web/src/components/layout/top-nav.tsx`
- [X] T028 [US4] Build `<ProfileFriendActions />` in `web/src/components/social/profile-friend-actions.tsx` (**Add Friend** / **Accept · Decline** / **Cancel** / **Friends · Message · Unfriend** / **Block · Unblock** + signed-out sign-in prompt) and mount it on `web/src/app/profile/[id]/page.tsx`
- [X] T029 [US4] Wire **Send to Friend** inside `web/src/components/social/study-share-menu.tsx` (selecting an accepted friend, optional `<= 240`-char note, calling `sendStudyToFriendAction`, and opening the 1:1 thread in `<FriendsChatDrawer />`)

**Checkpoint**: All 4 user stories are independently functional inside the 8-route Constitution boundary

---

## Phase 7: Polish, Verification & Cross-Cutting Guardrails

**Purpose**: Automated projection/route/validation tests and full build, lint, typecheck, and Neo-Brutalist Light/Dark compliance verification

- [X] T030 [P] Update `web/tests/projections.test.ts` and `web/tests/top-nav.test.ts` to assert `TOP_AURA_USER_COLUMNS`, `STUDY_SHARE_CARD_COLUMNS`, `PROFILE_RECENT_VIEW_COLUMNS`, and `DIRECT_MESSAGE_COLUMNS` exclude `abstract_text`, `embedding`, and private profile fields, and verify `TopNav` drawer trigger behavior
- [X] T031 [P] Add Zod social/visibility schema tests (`1,000`-char chat limit, `240`-char study-note limit, `ActivityVisibilityEnum`), `ProfileSocialContext` visibility-gating & missing-study chat placeholder unit tests, and an 8-route Constitution Principle V guard test in `web/tests/social.test.ts`
- [X] T032 Run full verification gates (`npm run typecheck`, `npm run lint`, `npm test`, `npm run build` in `web/`, and `pytest -v` in `pipeline/`) and audit all new UI components against Light/Dark Neo-Brutalist tokens (zero `backdrop-blur`, zero purple/violet/indigo hues) per `specs/004-socialization-layer/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — starts immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS** all user stories (`T002` migration + `T003` projections + `T004` Zod schemas + `T005` provider).
- **User Story 1 (Phase 3, P1 🎯 MVP)**: Depends on Phase 2 (`T002`–`T004`).
- **User Story 2 (Phase 4, P1)**: Depends on Phase 2 (`T002`–`T005`). Can run in parallel with US1 after Phase 2.
- **User Story 3 (Phase 5, P2)**: Depends on Phase 2 (`T002`–`T005`); benefits from US2 `<AuraBadge />` on `/profile` and `/profile/[id]` (`T017`).
- **User Story 4 (Phase 6, P2)**: Depends on Phase 2 (`T002`–`T005`) and integrates with US1's `<StudyShareMenu />` (`T008` → `T029`).
- **Polish & Verification (Phase 7)**: Depends on completion of all desired user stories.

### Parallel Opportunities

- **Phase 2**: `T003`, `T004`, and `T005` can run in parallel alongside `T002`.
- **US1**: `T006`, `T007`, and `T011` can run in parallel before `T008`–`T010`.
- **US2**: `T012`, `T013`, `T014`, and `T018` can run in parallel before `T015`–`T017`.
- **US3**: `T019` and `T020` can run in parallel before `T021`–`T023`.
- **US4**: `T024` and `T025` can run in parallel before `T026`–`T029`.
- **Phase 7**: `T030` and `T031` can run in parallel before `T032`.

---

## Parallel Example: User Story 2

```bash
# Launch independent US2 modules together after Phase 2:
Task: "Create deterministic Aura constants & helper in web/src/lib/aura.ts" (T012)
Task: "Add getTopAuraUsers & comment Aura/endorsement projections in web/src/lib/queries/social.ts & studies.ts" (T013)
Task: "Create <AuraBadge /> in web/src/components/social/aura-badge.tsx" (T014)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (`T001`) and Phase 2 (`T002`–`T005`).
2. Complete Phase 3 (`T006`–`T011`) for external study sharing and `/study/[id]` Open Graph previews.
3. **STOP and VALIDATE**: Verify 2-click external sharing and `/study/[id]` OG/Twitter metadata independently.

### Incremental Delivery

1. Setup + Foundational → Database schema, Aura triggers, RLS, projections, and Zod schemas ready.
2. Add **US1** (External Sharing + OG Previews) → MVP live.
3. Add **US2** (Deterministic Aura + `/` Left-Side Top Users Rail + Comment Endorsements) → Community discovery live.
4. Add **US3** (Opt-In Profile Activity Visibility + Capped 20-Item Recently Viewed Studies) → Profile showcase live.
5. Add **US4** (Friend Connections + Global Header Friends & 1:1 Study Chat Drawer) → Peer-to-peer study sharing live.
6. Run Phase 7 (`T030`–`T032`) verification gates.
