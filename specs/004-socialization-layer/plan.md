# Implementation Plan: Lightweight Socialization, Aura Leaderboard & Study Sharing

**Branch**: `004-socialization-layer` | **Date**: 2026-11-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-socialization-layer/spec.md`

## Summary

Add Option B's lightweight socialization layer across `/web` and `/supabase/migrations` while staying 100% within the $0/month free-tier ceiling, ISR feed architecture, and 8-route Constitution v1.1.0 boundary:

1. **Database, Deterministic Aura Engine & Friendship/Visibility RLS (`/supabase/migrations/0009_socialization_aura_friends_chat.sql`)**: Extend `public.profiles` with public `aura_score` (`NOT NULL DEFAULT 0`, non-client-updatable) and three-state activity visibility columns (`upvoted_studies_visibility`, `viewed_studies_visibility`, both defaulting to `'private'`); add `helpful_count` on `public.comments` plus `public.comment_endorsements` and deduplicated `public.study_shares`; compute `aura_score` deterministically via trigger-invoked `private.recompute_user_aura` with fixed weights and UTC daily anti-gaming caps; create `public.recent_study_views` with an atomic `<= 20`-row pruning RPC (`record_study_view`); and provision canonical-pair `public.friendships` and mutual-friend-gated `public.direct_messages` protected by `private.*` RLS initPlan helpers and narrow column grants.
2. **External Study Sharing, Left-Side Aura Rail, Opt-In Profile Activity & Global Header Drawer (`/web`)**: Add `<StudyShareMenu />` (2-click Copy Link + Citation attributing SBL News, X/Twitter, Reddit, WhatsApp, Discord, native Web Share, and friend study sends) to `StudyCard` and `MetadataBreakdown`, paired with dynamic `generateMetadata` Open Graph/Twitter cards on `/study/[id]`; render the sticky desktop left-side `<TopUsersRail />` (collapsing cleanly on mobile) on `/` alongside ISR-cached `getFeedStudies()`; surface `<AuraBadge />` and comment `Helpful` endorsements on `/study/[id]`, `/profile`, and `/profile/[id]`; add `Private` / `Friends Only` / `Public` controls and `Recently Viewed Studies` (`<= 20` items + Clear History) on `/profile` and `/profile/[id]`; and mount an on-demand `<FriendsChatDrawer />` beside `<AccountBubble />` in `TopNav` across all 8 routes with zero new URL routes and zero persistent WebSockets.

## Technical Context

**Language/Version**: TypeScript 5.8 (`strict: true`, Node.js 20+) in `/web`; SQL (PostgreSQL 15+) in `/supabase/migrations` (`/pipeline` Python 3.12+ unchanged, verified via `pytest` regression suite)

**Primary Dependencies**:
- `/web`: Next.js 15.2 (App Router), React 19, Tailwind CSS v4, overridden `shadcn/ui` primitives (`@radix-ui/react-slot`, `@radix-ui/react-tabs`, `class-variance-authority`), `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `lucide-react`, `vitest` (**zero** new third-party runtime packages introduced)

**Storage**:
- Supabase Free PostgreSQL (`public.profiles`, `public.comments`, `public.comment_endorsements`, `public.votes`, `public.study_shares`, `public.recent_study_views`, `public.friendships`, `public.direct_messages`) with Row-Level Security (RLS), `private` helper schema, and column-level privileges
- Existing Supabase Free Storage `avatars` bucket (`0008_user_profiles_and_storage.sql`, unchanged)

**Testing**:
- `/web`: `tsc --noEmit` (`strict: true`), `next lint`, `vitest run` (unit tests for deterministic Aura scoring & daily caps, external share citation/URL builders, Zod social/visibility/message schemas, egress-safe projection guards, and 8-route ceiling checks), and `next build` (ISR & static route verification)
- `/pipeline`: `pytest` regression suite

**Target Platform**: Vercel Hobby ($0/month) for `/web`; Supabase Free ($0/month) for PostgreSQL, Auth (Google/GitHub OAuth), and Storage

**Project Type**: Monorepo web application (`/web`) + sequential Git-first SQL migrations (`/supabase/migrations`) + scheduled ingestion worker (`/pipeline`)

**Performance Goals**:
- Preserve `revalidate = 3600` ISR static caching on `/` (`getFeedStudies()` + `getTopAuraUsers(10)` via cookie-free `createPublicClient()`, `< 2 KB` extra payload) and `/guidelines`, plus `force-static` on `/methodology` (`FR-002`, `SC-002`)
- `< 1 ms` indexed deterministic `aura_score` recomputation on user contribution mutations (`SC-003`)
- On-demand social drawer & keyset-paginated 1:1 thread queries (`30` messages/page, `< 8 KB` payload, zero idle WebSocket connections) (`FR-011`, `SC-005`)

**Constraints**:
- Strict $0/month free-tier ceiling (Supabase 500 MB DB / 1 GB Storage / 5 GB monthly egress / 200 concurrent connection caps; zero paid messaging/analytics SDKs, ORMs, or extra UI libraries)
- Neo-Brutalist Sky Blue token compliance across mandatory default Light Mode and opt-in Dark Mode (`2px solid` borders, zero-blur hard shadows, max `6px`/`4px` radii, `65ch–75ch` feed takeaway measure alongside `260px` desktop rail, zero `backdrop-blur`, and zero purple/violet/indigo hues)
- Strict 8-route ceiling per Constitution Principle V (`/`, `/study/[id]`, `/guidelines`, `/search`, `/methodology`, `/admin/review`, `/profile`, `/profile/[id]`)

**Scale/Scope**: 1 sequential SQL migration (`0009_socialization_aura_friends_chat.sql` adding 5 compact tables + 3 enums + `private` Aura/RLS functions), 0 new Next.js routes (enhancing `/`, `/study/[id]`, `/profile`, `/profile/[id]`, `/methodology`, and global `TopNav`), 7 focused social/share UI components, and dedicated query/action/validation modules in `/web/src/lib/`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Constitution Principle | Pre-Research Gate | Post-Design Evaluation (Phase 1) | Status |
|------------------------|-------------------|----------------------------------|--------|
| **I. Architecture & $0/Month Free-Tier First** | Uses existing `/web` Next.js App Router + Supabase Free PostgreSQL/Auth; preserves ISR on `/` and `/guidelines`; Git-first SQL migration in `/supabase/migrations`; on-demand drawer fetches with zero persistent Realtime WebSocket servers, zero ORMs, and zero new npm dependencies. | Verified in [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/socialization-routes-and-actions.md](./contracts/socialization-routes-and-actions.md). `/` fetches `getTopAuraUsers(10)` via `createPublicClient()` inside `revalidate = 3600`; `/study/[id]` uses `generateMetadata` without extra `next/og` serverless image routes. | ✅ PASS |
| **II. Scientific Integrity & Deterministic AI Pipeline** | Primary feed (`/`) remains 100% peer-reviewed primary literature (no user-submitted feed posts); **Aura** is 100% deterministic in SQL/code with fixed weights and daily caps (never LLM-judged); `/guidelines` HITL governance untouched. | Verified in [data-model.md](./data-model.md) Section 3: `private.recompute_user_aura` computes exact repeatable scores from non-deleted comments, comment endorsements, study upvotes, and deduplicated shares; documented transparently in `/methodology`. | ✅ PASS |
| **III. Neo-Brutalist Sky Blue Design System** | Light Mode mandatory default + opt-in Dark Theme parity; `2px solid var(--color-border)`, hard zero-blur shadows, `rounded-md`/`rounded-sm` max radii, `Space Grotesk` / `Inter` (`65ch–75ch`) / `JetBrains Mono` (`AURA` & unread badges), zero `backdrop-blur`, zero purple/violet/indigo hues. | Verified in [contracts/socialization-routes-and-actions.md](./contracts/socialization-routes-and-actions.md) Section 5.2: `260px` desktop `<TopUsersRail />` inside `max-w-6xl` leaves `~820px` for `StudyCard` (`70ch` preserved) and collapses cleanly on mobile; drawer overlay uses flat `bg-ink/40` with zero blur. | ✅ PASS |
| **IV. Performance, Egress & Security Guardrails** | Zero `SELECT *` and zero `abstract_text` / `embedding` projections in rail, share cards, recent views, or chat threads; `recent_study_views` opt-in & capped at `<= 20` rows/user; RLS + mutual-friend checks + Zod schemas on all boundaries. | Verified in [data-model.md](./data-model.md) and [contracts/socialization-routes-and-actions.md](./contracts/socialization-routes-and-actions.md). `private.can_view_user_*` and `private.are_accepted_friends` enforce `'private'` default and mutual-friend chat gating directly inside PostgreSQL RLS (`SC-004`, `SC-005`). | ✅ PASS |
| **V. Scoped Route Discipline** | Confines all UI to the 8 approved routes by housing Friends & 1:1 Study Chat inside a global `TopNav` slide-over drawer and extending `/`, `/study/[id]`, `/profile`, `/profile/[id]`, and `/methodology`. | Verified in Project Structure below: **0** new `page.tsx` or `route.ts` endpoints added anywhere under `web/src/app/` (`SC-006`). | ✅ PASS |
| **VI. Verification & Deterministic Code Quality** | Testable acceptance criteria (`SC-001`–`SC-006`); `tsc --noEmit`, `next lint`, `vitest run`, and `next build` gates in `/web` plus `pytest` regression check in `/pipeline`. | Verified in [quickstart.md](./quickstart.md) and `/web/tests/social.test.ts` + updated `projections.test.ts` & `top-nav.test.ts`. | ✅ PASS |

## Project Structure

### Documentation (this feature)

```text
specs/004-socialization-layer/
├── plan.md                                      # This file (/speckit-plan command output)
├── research.md                                  # Phase 0 output (/speckit-plan command)
├── data-model.md                                # Phase 1 output (/speckit-plan command)
├── quickstart.md                                # Phase 1 output (/speckit-plan command)
├── contracts/                                   # Phase 1 output (/speckit-plan command)
│   └── socialization-routes-and-actions.md
└── tasks.md                                     # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
supabase/
├── config.toml
└── migrations/
    ├── 0001_enable_pgvector_and_enums.sql
    ├── 0002_tables_and_indexes.sql
    ├── 0003_rls_policies_and_triggers.sql
    ├── 0004_hybrid_search_rpc.sql
    ├── 0005_seed_guidelines.sql
    ├── 0006_grant_role_privileges.sql
    ├── 0007_grant_service_role_privileges.sql
    ├── 0008_user_profiles_and_storage.sql
    └── 0009_socialization_aura_friends_chat.sql # NEW: Enums, private Aura/RLS helpers, profile Aura & visibility cols, comment_endorsements, study_shares, recent_study_views (<=20 RPC), friendships & direct_messages

web/
├── package.json                                 # Unchanged dependencies (zero new packages)
├── tsconfig.json
├── next.config.ts
├── src/
│   ├── app/                                     # Strictly the 8 Constitution-approved routes (zero new routes)
│   │   ├── globals.css
│   │   ├── layout.tsx                           # UPDATED: metadataBase + SocialDrawerProvider wrapping TopNav & main
│   │   ├── page.tsx                             # Route 1 (/): ISR revalidate=3600; desktop left TopUsersRail + mobile collapsible strip alongside FeedClient
│   │   ├── study/[id]/page.tsx                  # Route 2 (/study/[id]): Adds generateMetadata (OG/Twitter preview), comment endorsement hydration & opt-in StudyViewTracker
│   │   ├── guidelines/page.tsx                  # Route 3 (/guidelines): Unchanged ISR
│   │   ├── search/page.tsx                      # Route 4 (/search): Inherits StudyShareMenu on StudyCard
│   │   ├── methodology/page.tsx                 # Route 5 (/methodology): Static Pillar 5 documenting deterministic Aura rubric & daily caps
│   │   ├── admin/review/page.tsx                # Route 6 (/admin/review): Unchanged RBAC moderation queue
│   │   ├── profile/
│   │   │   ├── page.tsx                         # Route 7 (/profile): Displays AuraBadge, activity visibility controls, Recently Viewed tab (<=20) & Clear History
│   │   │   └── [id]/
│   │   │       ├── page.tsx                     # Route 8 (/profile/[id]): Displays AuraBadge, ProfileFriendActions & visibility-gated Upvoted / Recently Viewed tabs
│   │   │       └── not-found.tsx
│   │   └── auth/callback/route.ts               # Existing OAuth PKCE callback
│   ├── components/
│   │   ├── ui/
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── tabs.tsx
│   │   ├── layout/
│   │   │   ├── account-profile-provider.tsx     # UPDATED: Carries aura_score + activity visibility fields on AccountProfile
│   │   │   ├── account-bubble.tsx               # UPDATED: Shows user's AuraBadge in identity summary
│   │   │   ├── social-drawer-provider.tsx       # NEW: Shared open/tab/active-friend state & on-demand unread badge count
│   │   │   ├── friends-chat-drawer.tsx          # NEW: Accessible Neo-Brutalist slide-over drawer (Friends search/requests/block + 1:1 Chat & study cards)
│   │   │   └── top-nav.tsx                      # UPDATED: Adds compact Friends & Chat icon button + unread badge beside AccountBubble
│   │   ├── social/
│   │   │   ├── aura-badge.tsx                   # NEW: Reusable JetBrains Mono Neo-Brutalist Aura badge (`140 AURA`)
│   │   │   ├── top-users-rail.tsx               # NEW: Desktop sticky left Top Users rail & mobile collapsible strip for `/`
│   │   │   ├── study-share-menu.tsx             # NEW: External share popover (Copy Link+Citation, X, Reddit, WhatsApp, Discord, Web Share) + Send to Friend
│   │   │   └── profile-friend-actions.tsx       # NEW: Add Friend / Accept·Decline / Friends·Message·Unfriend / Block·Unblock controls on `/profile/[id]`
│   │   ├── profile/
│   │   │   ├── profile-settings-form.tsx        # UPDATED: Adds Private / Friends Only / Public visibility controls for Upvoted & Recently Viewed studies
│   │   │   └── profile-activity-lists.tsx       # UPDATED: Supports Recently Viewed tab + Clear History on `/profile` and visibility-authorized tabs on `/profile/[id]`
│   │   ├── feed/
│   │   │   ├── feed-client.tsx
│   │   │   ├── filter-bar.tsx
│   │   │   ├── study-card.tsx                   # UPDATED: Integrates StudyShareMenu in card action bar
│   │   │   └── upvote-button.tsx
│   │   └── study/
│   │       ├── metadata-breakdown.tsx           # UPDATED: Integrates StudyShareMenu beside Primary Source CTA
│   │       ├── discussion-thread.tsx            # UPDATED: Displays commenter AuraBadge + Helpful comment endorsement button
│   │       ├── study-view-tracker.tsx           # NEW: Non-blocking client effect recording study view strictly when user opted in
│   │       └── secondary-commentary-list.tsx
│   └── lib/
│       ├── share-links.ts                       # NEW: Pure external share URL & SBL News citation/Discord formatter helpers
│       ├── aura.ts                              # NEW: Deterministic Aura constants & pure TypeScript mirror for unit testing & `/methodology` display
│       ├── queries/
│       │   ├── projections.ts                   # UPDATED: Adds TOP_AURA_USER_COLUMNS, STUDY_SHARE_CARD_COLUMNS, PROFILE_RECENT_VIEW_COLUMNS & DIRECT_MESSAGE_COLUMNS
│       │   ├── profile.ts                       # UPDATED: Adds getProfileSocialContext, getRecentStudyViews & visibility-authorized public upvotes query
│       │   ├── studies.ts                       # UPDATED: Deduplicates study fetch via React.cache for generateMetadata & includes helpful_count + author.aura_score
│       │   └── social.ts                        # NEW: getTopAuraUsers, getUnreadSocialCounts, getFriendsOverview, searchProfilesByName & getDirectMessageThread
│       ├── actions/
│       │   ├── profile.ts                       # UPDATED: Adds updateActivityVisibilityAction, recordStudyViewAction, clearRecentStudyViewsAction & loadMorePublicUpvotesAction
│       │   └── social.ts                        # NEW: Share, comment endorsement, friend request/accept/decline/unfriend/block & 1:1 message/study-send Server Actions
│       └── validations/
│           ├── profile.ts                       # UPDATED: Extends profile schemas with ActivityVisibilityEnum
│           └── social.ts                        # NEW: Runtime Zod schemas for shares, endorsements, friend mutations & 1:1 messages/study cards
└── tests/
    ├── projections.test.ts                      # UPDATED: Asserts new social/chat/recent-view projections exclude abstract_text, embedding & private fields
    ├── top-nav.test.ts                          # UPDATED: Verifies Friends & Chat trigger integration & signed-out hiding
    └── social.test.ts                           # NEW: Unit tests for deterministic Aura formula/caps, share citation builders, Zod social schemas & 8-route guard

pipeline/                                        # Unchanged workspace (verified via pytest regression gate)
```

**Structure Decision**: Extends the established `/web` + `/supabase/migrations` monorepo architecture (leaving `/pipeline` untouched) from `001-sbl-news-mvp` and `003-user-profiles`. Co-locating reusable social UI under `web/src/components/social/` and the global slide-over drawer under `web/src/components/layout/friends-chat-drawer.tsx` delivers all socialization features cleanly across the 8 Constitution-approved routes without adding a single new App Router endpoint.

## Complexity Tracking

No Constitution Check violations exist; all 6 core principles in Constitution v1.1.0 pass without exception.
