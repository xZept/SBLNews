# Implementation Plan: User Profiles, Account Menu Bubble & Public Commenter Views

**Branch**: `003-user-profiles` | **Date**: 2026-11-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-user-profiles/spec.md`

## Summary

Extend SBL News (`/web` + `/supabase/migrations`) with full user profile customization, a decluttered top-right Account Menu Bubble, an opt-in Neo-Brutalist Dark Theme (keeping Light Mode as the mandatory default), and public commenter attribution within the $0/month free-tier ceiling:

1. **Database, Column-Level Privacy & Storage (`/supabase/migrations/0008_user_profiles_and_storage.sql`)**: Extend `public.profiles` with `affiliation_role` (`community_role_type`), `bio` (`<= 160` chars), `theme_preference` (`theme_preference_type`, `'light'` default), `updated_at`, and `2..50`-char `display_name` checks; update `handle_new_user()` so new OAuth users default to `avatar_url = NULL` (rendering 2-letter initials); enforce PostgreSQL column-level `SELECT`/`UPDATE` privileges + authenticated `get_my_account_profile()` RPC and `votes_select_own` RLS so zero private fields (`email`, `theme_preference`, `role`, or upvote history) can ever leak to unauthenticated or cross-user requests; add keyset-pagination composite indexes (`idx_comments_author_history`, `idx_votes_user_history`); and provision the `avatars` Supabase Storage bucket (`<= 500 KB` limit, raster MIME restriction, owner-scoped folder RLS).
2. **Account Menu Bubble, Theme Lifecycle & Dedicated Profile Routes (`/web`)**: Replace raw signed-in header text and standalone buttons in `TopNav` with an accessible `AccountBubble` (`UserAvatar` 2-letter initials/photo trigger, identity summary, `Profile` link, inline `Light`/`Dark` switch, conditional `Admin Review Queue` link, and `Sign out` that reverts active browser theme to Light while preserving saved profile preference); implement zero-FOIT pre-paint `<head>` initialization in `RootLayout` without breaking ISR on `/` and `/guidelines`; build `/profile` (authenticated settings, client-side Canvas `<= 256x256` / `<= 200 KB` WebP/JPEG center-crop avatar uploader, and 20-item `"Load more"` upvoted/comment activity lists) and `/profile/[id]` (read-only public profile + 20-item `"Load more"` public comment history); and upgrade `/study/[id]` comments with clickable author avatars/initials and role badges.

## Technical Context

**Language/Version**: TypeScript 5.8 (`strict: true`, Node.js 20+) in `/web`; SQL (PostgreSQL 15+) in `/supabase/migrations` (`/pipeline` Python 3.12+ unchanged, regression-tested via `pytest`)

**Primary Dependencies**:
- `/web`: Next.js 15.2 (App Router), React 19, Tailwind CSS v4, overridden `shadcn/ui` primitives (`@radix-ui/react-slot`, `@radix-ui/react-tabs`, `class-variance-authority`), `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `lucide-react`, `vitest` (zero new third-party runtime packages introduced)

**Storage**:
- Supabase Free PostgreSQL (`public.profiles`, `public.comments`, `public.votes`) with Row-Level Security (RLS) and column-level privileges
- Supabase Free Storage public bucket `avatars` (`file_size_limit = 512000` bytes / `500 KB`, `allowed_mime_types = ['image/webp', 'image/jpeg', 'image/png']`, owner-scoped `{user_id}/*` RLS)

**Testing**:
- `/web`: `tsc --noEmit` (`strict: true`), `next lint`, `vitest run` (unit tests for `deriveInitials`, `UpdateProfileSchema`, cursor schemas, avatar MIME/size validation, and egress-safe column projection guards), and `next build` (ISR verification)
- `/pipeline`: `pytest` regression suite

**Target Platform**: Vercel Hobby ($0/month) for `/web`; Supabase Free ($0/month) for PostgreSQL, Auth (Google/GitHub OAuth), and Storage

**Project Type**: Monorepo web application (`/web`) + declarative sequential SQL migrations (`/supabase/migrations`) + batch ingestion worker (`/pipeline`)

**Performance Goals**:
- Zero Flash of Incorrect Theme (FOIT) on ISR-cached `/` and `/guidelines` (`SC-004`) while preserving `revalidate = 3600` static generation
- 100% of uploaded avatar thumbnails compressed client-side to `<= 256x256` px and `<= 200 KB` (`~15–35 KB` typical WebP) before network upload (`SC-003`)
- $O(1)$ indexed keyset pagination (`20` items/page, `< 10 KB` payload per page) for profile upvoted studies and comment history (`FR-005`, `FR-007`)

**Constraints**:
- Strict $0/month free-tier ceiling (Supabase 1 GB Storage cap and 5 GB monthly egress cap; Vercel Hobby serverless execution limits; zero ORMs or extra UI libraries)
- Neo-Brutalist Sky Blue token lock across both default Light Theme (`#F8FAFC` / `#FFFFFF` / `#0F172A` / `#38BDF8`) and opt-in Dark Theme (`#0B1120` / `#1E293B` / `#F8FAFC` / `#E2E8F0` border / `#020617` shadow offset / `#0F172A` accent & badge ink), zero purple/violet/indigo hues, zero blur shadows
- Strict 8-route ceiling per Constitution Principle V (`/`, `/study/[id]`, `/guidelines`, `/search`, `/methodology`, `/admin/review`, `/profile`, `/profile/[id]`)

**Scale/Scope**: 2 new Next.js App Router pages (`/profile`, `/profile/[id]`), 1 global header `AccountBubble` + `AccountProfileProvider` + `ThemeProvider` upgrade, 1 `/study/[id]` discussion attribution upgrade, 1 sequential SQL migration (`0008_user_profiles_and_storage.sql`), and 1 Storage bucket (`avatars`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Constitution Principle | Pre-Research Gate | Post-Design Evaluation (Phase 1) | Status |
|------------------------|-------------------|----------------------------------|--------|
| **I. Architecture & $0/Month Free-Tier First** | Uses existing `/web` Next.js App Router + Supabase Free PostgreSQL, Auth (Google/GitHub OAuth), and Storage (`avatars` bucket); preserves ISR on `/` and `/guidelines` (no `cookies()` in `RootLayout`); sequential SQL migration in `/supabase/migrations`; zero ORMs, paid services, or extra UI libraries. | Verified in [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/profile-routes-and-actions.md](./contracts/profile-routes-and-actions.md). Zero new npm packages added; client-side Canvas thumbnailing avoids serverless image-processing compute; `/` and `/guidelines` retain `revalidate = 3600`. | ✅ PASS |
| **II. Scientific Integrity & Deterministic AI Pipeline** | `/pipeline` ingestion, deterministic evidence scoring, `Full-Text` vs. `Abstract-Only` badges, and HITL `Consensus Drift` governance remain completely untouched; community role tags on comments provide transparent reader context without altering study rankings. | Verified in project structure below: zero modifications to `/pipeline` scoring or `/guidelines` mutation paths; study evidence badges keep identical deterministic semantics in both Light and Dark themes. | ✅ PASS |
| **III. Neo-Brutalist Sky Blue Design System** | Light Mode remains mandatory default for new/unauthenticated visitors (`FR-010`); opt-in Dark Theme uses exact Constitution v1.1.0 tokens (`#0B1120`, `#1E293B`, `#F8FAFC`, `#94A3B8`, `#E2E8F0`, `#38BDF8` with `#0F172A` ink); `2px solid` borders, zero-blur hard shadows, max `6px`/`4px` radii, and zero purple/violet/indigo hues. | Verified in [contracts/profile-routes-and-actions.md](./contracts/profile-routes-and-actions.md) Section 5.3. Introduces `--color-accent-ink: #0F172A` and replaces hardcoded `#0F172A` border/shadow literals in `Card`, `Button`, `Badge`, `TopNav`, and `UpvoteButton` with CSS custom property tokens so both themes preserve Neo-Brutalist contrast. | ✅ PASS |
| **IV. Performance, Egress & Security Guardrails** | Never executes `SELECT *` or selects `abstract_text` / `embedding` in profile or activity queries; compresses avatars client-side (`<= 256x256`, `<= 200 KB`) backed by a `<= 500 KB` MIME-restricted `avatars` bucket; enforces RLS + ownership policies and Zod validation at every boundary. | Verified in [data-model.md](./data-model.md) and [contracts/profile-routes-and-actions.md](./contracts/profile-routes-and-actions.md). Column-level PostgreSQL `GRANT SELECT` on `public.profiles` + `get_my_account_profile()` RPC + `votes_select_own` RLS guarantee 0 private fields (`email`, `theme_preference`, `role`, or upvotes) can leak on `/profile/[id]` or PostgREST (`SC-005`). | ✅ PASS |
| **V. Scoped Route Discipline** | Adds only `/profile` and `/profile/[id]`, completing the exact 8-route inventory approved in Constitution v1.1.0. | Verified in `/web/src/app/` directory tree below: routes are strictly `/`, `/study/[id]`, `/guidelines`, `/search`, `/methodology`, `/admin/review`, `/profile`, and `/profile/[id]` (plus existing `/auth/callback` OAuth handler). | ✅ PASS |
| **VI. Verification & Deterministic Code Quality** | Concrete acceptance scenarios (`SC-001`–`SC-006`); `tsc --noEmit`, ESLint, and Vitest gates in `/web` plus `pytest` regression gate in `/pipeline`. | Verified in [quickstart.md](./quickstart.md) and `/web/tests/` unit test additions (`projections.test.ts`, `profile.test.ts`). | ✅ PASS |

## Project Structure

### Documentation (this feature)

```text
specs/003-user-profiles/
├── plan.md                                  # This file (/speckit-plan command output)
├── research.md                              # Phase 0 output (/speckit-plan command)
├── data-model.md                            # Phase 1 output (/speckit-plan command)
├── quickstart.md                            # Phase 1 output (/speckit-plan command)
├── contracts/                               # Phase 1 output (/speckit-plan command)
│   └── profile-routes-and-actions.md
└── tasks.md                                 # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
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
    └── 0008_user_profiles_and_storage.sql   # NEW: Profile columns/enums, column-level grants, get_my_account_profile(), votes RLS fix, activity indexes, avatars bucket & storage RLS

web/
├── package.json
├── tsconfig.json
├── next.config.ts
├── src/
│   ├── app/
│   │   ├── globals.css                      # UPDATED: Default Light + [data-theme="dark"] tokens & --color-accent-ink
│   │   ├── layout.tsx                       # UPDATED: <meta name="color-scheme">, synchronous zero-FOIT <head> script, AccountProfileProvider
│   │   ├── page.tsx                         # Route 1: / (ISR unchanged)
│   │   ├── study/[id]/page.tsx              # Route 2: /study/[id] (unchanged route, richer comment author projection)
│   │   ├── guidelines/page.tsx              # Route 3: /guidelines (ISR unchanged; audited for Dark Theme token classes)
│   │   ├── search/page.tsx                  # Route 4: /search (audited for Dark Theme token classes)
│   │   ├── methodology/page.tsx             # Route 5: /methodology (static unchanged; audited for Dark Theme token classes)
│   │   ├── admin/review/page.tsx            # Route 6: /admin/review (audited for Dark Theme token classes)
│   │   ├── profile/
│   │   │   ├── page.tsx                     # NEW Route 7: /profile (Authenticated settings, avatar upload & personal activity)
│   │   │   └── [id]/
│   │   │       ├── page.tsx                 # NEW Route 8: /profile/[id] (Public read-only commenter profile & comment history)
│   │   │       └── not-found.tsx            # NEW: Neo-Brutalist "Profile not found" state with link to /
│   │   └── auth/callback/route.ts           # Existing OAuth PKCE callback
│   ├── components/
│   │   ├── ui/                              # UPDATED: Tokenized border-border, shadow-card, shadow-control & text-accent-ink for Dark Theme compatibility
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── tabs.tsx
│   │   ├── layout/
│   │   │   ├── account-profile-provider.tsx # NEW: Shared session profile + theme lifecycle (sign-in hydrate, toggle, sign-out revert to light)
│   │   │   ├── account-bubble.tsx           # NEW: Top-right avatar trigger & accessible Neo-Brutalist popover menu
│   │   │   └── top-nav.tsx                  # UPDATED: Replaces raw text & standalone Sign out/Admin buttons with AccountBubble
│   │   ├── profile/
│   │   │   ├── user-avatar.tsx              # NEW: Reusable Neo-Brutalist photo or 2-letter JetBrains Mono initials badge
│   │   │   ├── avatar-upload-control.tsx    # NEW: Client Canvas <=256x256 <=200KB center-crop uploader & Remove Photo action
│   │   │   ├── profile-settings-form.tsx    # NEW: Display name, role tag, 160-char bio counter, theme switch & read-only account card
│   │   │   └── profile-activity-lists.tsx   # NEW: Upvoted studies & comment history lists with 20-item "Load more" pagination
│   │   ├── feed/
│   │   │   ├── feed-client.tsx
│   │   │   ├── filter-bar.tsx               # UPDATED: Tokenized border/shadow/accent-ink classes
│   │   │   ├── study-card.tsx               # UPDATED: Tokenized border/shadow classes
│   │   │   └── upvote-button.tsx            # UPDATED: Tokenized border/shadow/accent-ink classes
│   │   └── study/
│   │       ├── discussion-thread.tsx        # UPDATED: Renders UserAvatar, role tag badge, and /profile/[id] links on comments
│   │       ├── metadata-breakdown.tsx       # UPDATED: Audited for Dark Theme token classes
│   │       └── secondary-commentary-list.tsx # UPDATED: Audited for Dark Theme token classes
│   └── lib/
│       ├── avatar-upload.ts                 # NEW: Raster MIME guard, center-crop square Canvas resizer & <=200KB WebP/JPEG encoder
│       ├── initials.ts                      # NEW: Deterministic 2-letter uppercase initials helper (deriveInitials)
│       ├── theme.ts                         # NEW: DOM data-theme + meta[name="color-scheme"] + localStorage helpers
│       ├── supabase/
│       │   ├── admin-guard.ts               # UPDATED: Uses get_my_account_profile() RPC compatible with column-level grants
│       │   ├── client.ts
│       │   └── server.ts
│       ├── queries/
│       │   ├── projections.ts               # UPDATED: Adds PUBLIC_PROFILE_COLUMNS, activity projections & profile interfaces
│       │   ├── profile.ts                   # NEW: getMyAccountProfile, getPublicProfileById, getMyUpvotedStudies, getUserCommentHistory
│       │   └── studies.ts                   # UPDATED: Extends getStudyComments author projection with affiliation_role
│       ├── actions/
│       │   └── profile.ts                   # NEW: updateProfileAction, updateThemePreferenceAction, updateAvatarUrlAction, loadMore* actions
│       └── validations/
│           └── profile.ts                   # NEW: UpdateProfileSchema, ThemePreferenceEnum, CommunityRoleEnum & cursor schemas
└── tests/
    ├── projections.test.ts                  # UPDATED: Verifies PUBLIC_PROFILE_COLUMNS & activity projections exclude private/heavy fields
    ├── validations.test.ts
    └── profile.test.ts                      # NEW: Unit tests for deriveInitials, UpdateProfileSchema, cursor validation & avatar guards

pipeline/                                    # Unchanged workspace (verified via pytest regression gate)
```

**Structure Decision**: Extends the existing monorepo layout (`/web` + `/supabase/migrations`, leaving `/pipeline` untouched) established in `001-sbl-news-mvp` and mandated by Constitution Principle I. Placing `/profile/page.tsx` and `/profile/[id]/page.tsx` under `web/src/app/profile/` cleanly implements the 7th and 8th approved routes in Constitution Principle V while co-locating profile queries, Zod schemas, and reusable `UserAvatar` / `AccountBubble` components within existing `src/lib/*` and `src/components/*` modules.

## Complexity Tracking

No Constitution Check violations exist; all 6 core principles in Constitution v1.1.0 pass without exception.
