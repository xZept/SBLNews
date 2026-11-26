# Tasks: User Profiles, Account Menu Bubble & Public Commenter Views

**Input**: Design documents from `/specs/003-user-profiles/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/profile-routes-and-actions.md`, `quickstart.md`

**Organization**: Tasks are grouped by phase and user story (`US1`, `US2`, `US3`) so each story can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (`[US1]`, `[US2]`, `[US3]`) for story phases only
- Every task includes exact file paths and concrete constraints from `data-model.md` and `contracts/profile-routes-and-actions.md`.

---

## Phase 1: Setup & Database Schema Migration

**Purpose**: Establish the database schema, storage bucket, column-level privacy grants, TypeScript projections, and core helper utilities.

- [X] T001 Author sequential SQL migration in `supabase/migrations/0008_user_profiles_and_storage.sql` creating `public.community_role_type` (`'Lifter'`, `'Strength Coach'`, `'Exercise Researcher'`, `'Clinician'`, `'Student'`) and `public.theme_preference_type` (`'light'`, `'dark'`); extending `public.profiles` with `affiliation_role`, `bio` (`CHECK (bio IS NULL OR char_length(bio) <= 160)`), `theme_preference` (`NOT NULL DEFAULT 'light'`), `updated_at`, normalized `display_name` (`CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 50)`), and `avatar_url` length check (`<= 500`); adding `set_profiles_updated_at()` trigger; updating `handle_new_user()` to leave `avatar_url = NULL` and use `ON CONFLICT (id) DO NOTHING`; enforcing column-level `GRANT SELECT (id, display_name, avatar_url, affiliation_role, bio)` and `GRANT UPDATE (display_name, avatar_url, affiliation_role, bio, theme_preference, updated_at)` on `public.profiles`; creating `public.get_my_account_profile()` (`SECURITY DEFINER`, `WHERE p.id = (select auth.uid())`, `REVOKE EXECUTE FROM PUBLIC, anon; GRANT EXECUTE TO authenticated, service_role`); hardening `public.votes` RLS (`votes_select_own` + `REVOKE SELECT ON TABLE public.votes FROM anon`); adding `idx_votes_user_history` and `idx_comments_author_history`; and provisioning the public `avatars` bucket (`file_size_limit = 512000`, `allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png']`) with owner-scoped `storage.objects` RLS policies (`SELECT`, `INSERT`, `UPDATE`, `DELETE` on `{user_id}/*`).
- [X] T002 [P] Extend `web/src/lib/queries/projections.ts` with `CommunityRoleType`, `ThemePreferenceType`, `PUBLIC_PROFILE_COLUMNS`, `PROFILE_COMMENT_HISTORY_COLUMNS`, `PROFILE_UPVOTED_STUDY_COLUMNS`, `PublicProfile`, `AccountProfile`, `ProfileUpvotedStudyItem`, `ProfileCommentHistoryItem`, and `CursorPage<T, C>`, and update `StudyComment["author"]` to include `affiliation_role`.
- [X] T003 [P] Create `web/src/lib/initials.ts` (`deriveInitials(displayName: string): string` returning 2 uppercase letters: first+last word initials for multi-word names, first 2 alphanumeric chars for single-word names, `"SL"` fallback) and `web/src/lib/theme.ts` (`THEME_STORAGE_KEY = "sbl_theme"`, `applyThemeToDocument(theme)`, `clearStoredThemeAndResetToLight()`).

---

## Phase 2: Foundational Infrastructure (Blocking Prerequisites)

**Purpose**: Core styling tokens, UI primitives, Zod schemas, server queries, `UserAvatar`, and session/theme provider required before any user story UI is wired.

**⚠️ CRITICAL**: No user story phase (`US1`, `US2`, `US3`) can begin until this phase is complete.

- [X] T004 Update `web/src/app/globals.css` to define Light Theme defaults on `:root` (`color-scheme: light`, `--color-border: #0F172A`, `--color-accent-ink: #0F172A`, `--shadow-card: 4px 4px 0px #0F172A`, `--shadow-control: 2px 2px 0px #0F172A`) and Opt-In Dark Theme overrides on `:root[data-theme="dark"]` (`color-scheme: dark`, `--color-canvas: #0B1120`, `--color-surface: #1E293B`, `--color-ink: #F8FAFC`, `--color-muted: #94A3B8`, `--color-border: #E2E8F0`, `--color-accent-ink: #0F172A`, `--shadow-card: 4px 4px 0px #020617`, `--shadow-control: 2px 2px 0px #020617`), registering `--color-border` and `--color-accent-ink` in `@theme`.
- [X] T005 [P] Update Neo-Brutalist primitives in `web/src/components/ui/card.tsx`, `web/src/components/ui/button.tsx`, `web/src/components/ui/badge.tsx`, `web/src/components/ui/input.tsx`, and `web/src/components/ui/tabs.tsx` to use tokenized `border-border`, `shadow-card`, `shadow-control`, and `text-accent-ink` (on Sky Blue `#38BDF8` accents and semantic pastel badges) instead of hardcoded `#0F172A` literals.
- [X] T006 [P] Update feed and existing route components (`web/src/components/feed/filter-bar.tsx`, `web/src/components/feed/study-card.tsx`, `web/src/components/feed/upvote-button.tsx`, `web/src/components/study/metadata-breakdown.tsx`, `web/src/components/study/secondary-commentary-list.tsx`, and existing pages `web/src/app/guidelines/page.tsx`, `web/src/app/search/page.tsx`, `web/src/app/methodology/page.tsx`, `web/src/app/admin/review/page.tsx`) to audit and replace hardcoded `#0F172A` / `border-ink` / light-only shadow classes with tokenized `border-border`, `shadow-card`, `shadow-control`, and `text-accent-ink` classes for full-app Dark Theme compatibility.
- [X] T007 [P] Create runtime Zod validation schemas in `web/src/lib/validations/profile.ts` (`PROFILE_PAGE_SIZE = 20`, `CommunityRoleEnum`, `ThemePreferenceEnum`, `UpdateProfileSchema` with `2–50` trimmed `displayName` and `<= 160` `bio`, `UpdateThemePreferenceSchema`, `UpdateAvatarUrlSchema`, `UpvotedStudiesCursorSchema`, `CommentHistoryCursorSchema`).
- [X] T008 [P] Create egress-safe server query helpers in `web/src/lib/queries/profile.ts` (`getMyAccountProfile()` via `get_my_account_profile` RPC + `auth.getUser()` email, `getPublicProfileById(id)` using `createPublicClient()` + `PUBLIC_PROFILE_COLUMNS`, `getMyUpvotedStudies(userId, cursor?)` with `LIMIT 21`, and `getUserCommentHistory(userId, cursor?)` with `LIMIT 21` and `220`-char body excerpt).
- [X] T009 [P] Update `assertAdmin()` in `web/src/lib/supabase/admin-guard.ts` to read `role` via `supabase.rpc("get_my_account_profile")` instead of querying `profiles.role` directly (preserving compatibility with column-level `GRANT SELECT`).
- [X] T010 [P] Create reusable `UserAvatar` component in `web/src/components/profile/user-avatar.tsx` rendering either a square `rounded-md` `<img>` thumbnail or a `JetBrains Mono` 2-letter initials badge (`deriveInitials(displayName)`) with `2px solid var(--color-border)` and `var(--shadow-control)` in `sm` / `md` / `lg` sizes.
- [X] T011 Create `AccountProfileProvider` and `useAccountProfile()` hook in `web/src/components/layout/account-profile-provider.tsx` to load the signed-in user's `AccountProfile` + `email`, synchronize `profile.theme_preference` to `document.documentElement.dataset.theme` + `localStorage["sbl_theme"]` on sign-in, expose `setThemeLocalAndPersist()` and `refreshAccountProfile()`, listen to `window` `storage` events, and execute `clearStoredThemeAndResetToLight()` on sign-out without mutating `profiles.theme_preference`.
- [X] T012 Update `web/src/app/layout.tsx` to add `<meta name="color-scheme" content="light" />`, inject the synchronous pre-paint inline `<script>` reading `localStorage.getItem("sbl_theme")` inside `try/catch` (setting `data-theme="dark"` and `<meta content="dark">` before first paint for zero FOIT while preserving ISR), and wrap `<TopNav />` + `<main>` in `<AccountProfileProvider>`.

**Checkpoint**: Database migration, theme tokens, primitives, Zod schemas, profile queries, `UserAvatar`, and `AccountProfileProvider` are ready—user stories can now proceed.

---

## Phase 3: User Story 1 — Top-Right Account Menu Bubble & Theme Toggle (Priority: P1) 🎯 MVP

**Goal**: Replace raw signed-in text and standalone Sign out / Admin buttons in `TopNav` with a compact `UserAvatar` trigger opening an accessible Neo-Brutalist popover bubble (`Profile`, inline `Light`/`Dark` theme switch, conditional `Admin Review Queue`, and `Sign out`).

**Independent Test**: Sign in as a `member` and as an `admin`; verify the top-right trigger shows 2-letter initials by default, opens the popover with all expected items (hiding `Admin Review Queue` for non-admins), toggles `Light`/`Dark` immediately across ISR routes without FOIT, and signs out cleanly while reverting active browser theme to `Light`.

### Implementation for User Story 1

- [X] T013 [US1] Implement `updateThemePreferenceAction` in `web/src/lib/actions/profile.ts` validating `UpdateThemePreferenceSchema`, verifying `supabase.auth.getUser()`, and updating `profiles.theme_preference` for `id = user.id`.
- [X] T014 [US1] Create `AccountBubble` component in `web/src/components/layout/account-bubble.tsx` with `UserAvatar` trigger (`h-9 w-9`, `aria-expanded`, `aria-controls`), Neo-Brutalist popover (`border-2 border-border bg-surface shadow-card`), identity summary (`UserAvatar`, `display_name`, `email`, `Member`/`Admin` `Badge`), semantic `<hr>` dividers, `<Link href="/profile">`, inline `Light`/`Dark` segmented toggle (`aria-pressed`), conditional `<Link href="/admin/review">` (`role === "admin"` only), `Sign out` button, click-outside light dismiss, `Escape` key close with focus restoration, and route-change auto-close.
- [X] T015 [US1] Update `web/src/components/layout/top-nav.tsx` to consume `useAccountProfile()`, replace signed-in raw text, standalone `Admin` link, and standalone `Sign out` button with `<AccountBubble />`, keep Google/GitHub sign-in buttons for unauthenticated visitors, and update header border/background classes to `border-border` / `bg-surface`.

**Checkpoint**: User Story 1 is complete and independently verifiable across all routes.

---

## Phase 4: User Story 2 — Dedicated `/profile` Settings, Photo Compression & Activity Pagination (Priority: P1)

**Goal**: Provide the authenticated `/profile` route where signed-in users customize their display name, role tag, short bio, profile photo (client-side center-cropped `<= 256x256`, `<= 200 KB` WebP/JPEG with Remove Photo fallback to initials), and theme preference, view read-only email/role and public profile link, and browse 20-item `"Load more"` paginated Upvoted Studies and Comment History.

**Independent Test**: Visit `/profile` signed out (verify redirect/block); sign in, update display name (`2–50` chars), role tag, bio (`<= 160` chars), upload a large photo (verify `<= 256x256` & `<= 200 KB` upload, reject `.svg`/`.pdf`), remove photo (verify initials return), toggle theme, and verify read-only email/role and 20-item `"Load more"` upvoted/comment history lists.

### Implementation for User Story 2

- [X] T016 [P] [US2] Create client-side avatar processor and Storage uploader in `web/src/lib/avatar-upload.ts` validating raster MIME types (`image/jpeg`, `image/png`, `image/webp`) and max raw size (`<= 15 MB`), center-cropping the shortest square side onto an offscreen `<canvas>` (`<= 256x256` px), encoding to `image/webp` (with `image/jpeg` fallback and quality step-down `0.82 -> 0.70 -> 0.55` to guarantee `<= 200 KB`), uploading with `upsert: true` to `avatars/{user_id}/avatar.{ext}`, removing any stale alternate extension (`avatar.jpg` / `avatar.webp`), and implementing `removeAvatarFromStorage(userId)`.
- [X] T017 [US2] Add `updateProfileAction`, `updateAvatarUrlAction` (verifying URL prefix matches `<SUPABASE_URL>/storage/v1/object/public/avatars/${user.id}/`), `loadMoreUpvotedStudiesAction`, and `loadMoreCommentHistoryAction` to `web/src/lib/actions/profile.ts` with Zod validation and `revalidatePath` for `/profile` and `/profile/${user.id}`.
- [X] T018 [P] [US2] Create `AvatarUploadControl` component in `web/src/components/profile/avatar-upload-control.tsx` integrating `UserAvatar` preview, file picker (`accept="image/png,image/jpeg,image/webp"`), immediate persistence via `updateAvatarUrlAction` (independent of `ProfileSettingsForm` Save) with inline status/error feedback, loading state, `Remove Photo` action, and `useAccountProfile().refreshAccountProfile()` after upload/removal so the header `AccountBubble` updates immediately (`SC-002`).
- [X] T019 [P] [US2] Create `ProfileSettingsForm` component in `web/src/components/profile/profile-settings-form.tsx` with `Display Name` input (`2–50` chars), `Training / Professional Role` selector (`Lifter`, `Strength Coach`, `Exercise Researcher`, `Clinician`, `Student`, or None), `Short Bio / Credentials` textarea with live `0/160` character counter, `Light`/`Dark` theme selector wired to `useAccountProfile().setThemeLocalAndPersist()`, inline Zod error messages preserving unsaved input, `useAccountProfile().refreshAccountProfile()` on successful save so the header `AccountBubble` updates immediately (`SC-002`), read-only `Connected Email` and `Account Role` (`Member`/`Admin`) display, and `"View public profile"` link to `/profile/[id]`.
- [X] T020 [P] [US2] Create `ProfileActivityLists` component in `web/src/components/profile/profile-activity-lists.tsx` rendering tabbed/sectioned `Upvoted Studies` and `Comment History` lists (`20` items per page, `"Load more"` button invoking `loadMoreUpvotedStudiesAction` / `loadMoreCommentHistoryAction`, links to `/study/[id]`, and clean empty states).
- [X] T021 [US2] Create authenticated route `web/src/app/profile/page.tsx` (`force-dynamic`) checking `supabase.auth.getUser()`: when unauthenticated, render a Neo-Brutalist inline sign-in gate (zero private data queried or rendered) with Google/GitHub OAuth buttons returning to `/profile` via `/auth/callback`; when authenticated, load `getMyAccountProfile()`, initial 20 `getMyUpvotedStudies()`, and initial 20 `getUserCommentHistory()`, and compose `AvatarUploadControl`, `ProfileSettingsForm`, and `ProfileActivityLists`.

**Checkpoint**: User Stories 1 and 2 are both complete and independently testable.

---

## Phase 5: User Story 3 — Public Commenter Profile Views (`/profile/[id]`) & Discussion Attribution (Priority: P2)

**Goal**: Display each commenter's avatar (or 2-letter initials badge), display name, and optional role tag on `/study/[id]` with links to `/profile/[id]`, and serve read-only public profiles at `/profile/[id]` exposing only public identity fields and 20-item `"Load more"` public comment history.

**Independent Test**: Open `/study/[id]` signed out, verify comments show author avatar/initials, display name, and role badge linking to `/profile/[id]`; open `/profile/[id]` and verify public bio + paginated comment history render with zero private fields (`email`, `theme_preference`, `role`, or upvoted studies); visit an unknown/invalid ID and verify the `"Profile not found"` state.

### Implementation for User Story 3

- [ ] T022 [P] [US3] Update `getStudyComments()` in `web/src/lib/queries/studies.ts` to include `affiliation_role` in the `author:profiles!comments_author_id_fkey(id, display_name, avatar_url, affiliation_role)` projection.
- [ ] T023 [US3] Update `CommentItem` in `web/src/components/study/discussion-thread.tsx` to render `<UserAvatar size="sm" />`, display name, and optional `affiliation_role` `Badge` for non-deleted comments, wrapped in `<Link href={`/profile/${node.author_id}`}>` (and update `border-ink` / `shadow` tokens on discussion containers).
- [ ] T024 [P] [US3] Create `web/src/app/profile/[id]/not-found.tsx` rendering a Neo-Brutalist `"Profile not found"` card with a link back to `/` (`Main Research Feed`).
- [ ] T025 [US3] Create public route `web/src/app/profile/[id]/page.tsx` (`force-dynamic`) validating `id` UUID format (calling `notFound()` when invalid or missing), fetching `getPublicProfileById(id)` and initial 20 `getUserCommentHistory(id)` via `createPublicClient()`, and rendering public `UserAvatar`, `display_name`, optional `affiliation_role` `Badge`, optional `bio`, and `ProfileActivityLists` in public comment-only mode (strictly omitting `email`, `theme_preference`, `role`, and upvoted studies).

**Checkpoint**: All 3 user stories (8 approved Constitution routes + `AccountBubble` + `/study/[id]` attribution) are complete and independently testable.

---

## Phase 6: Polish, Automated Tests & Verification Gates

**Purpose**: Verify unit tests, egress-safe projections, TypeScript strictness, linting, ISR production build, and `/pipeline` non-regression.

- [ ] T026 [P] Update `web/tests/projections.test.ts` to assert `PUBLIC_PROFILE_COLUMNS`, `PROFILE_COMMENT_HISTORY_COLUMNS`, and `PROFILE_UPVOTED_STUDY_COLUMNS` exclude `email`, `theme_preference`, `role`, `abstract_text`, and `embedding`.
- [ ] T027 [P] Create `web/tests/profile.test.ts` covering `deriveInitials` (multi-word, single-word, whitespace/punctuation, empty fallback), `UpdateProfileSchema` (`2–50` chars, whitespace rejection, `160`-char bio limit, role enum), `UpvotedStudiesCursorSchema` / `CommentHistoryCursorSchema`, and `avatar-upload.ts` MIME/size validation helpers.
- [ ] T028 Verify `/web` quality gates (`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`), `/pipeline` regression gate (`pytest -v`), and the Light + Dark Theme visual contrast, zero-FOIT (on `/` and `/guidelines`), and anti-purple / anti-vibecoding inspection checklist per `specs/003-user-profiles/quickstart.md` (`SC-004`, `SC-006`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup & Migration)**: `T001`, `T002`, `T003` can run in parallel.
- **Phase 2 (Foundational)**: Depends on Phase 1 (`T002`, `T003`). Inside Phase 2, `T005`–`T010` can run in parallel after `T004`; `T011` and `T012` wire `AccountProfileProvider` and `RootLayout`.
- **Phase 3 (US1 - Account Bubble & Theme)**: Depends on Phase 2 (`T010`, `T011`, `T012`).
- **Phase 4 (US2 - `/profile` Route)**: Depends on Phase 2 (`T007`, `T008`, `T010`, `T011`); can proceed in parallel with Phase 3 once `actions/profile.ts` is coordinated.
- **Phase 5 (US3 - `/profile/[id]` & Discussions)**: Depends on Phase 2 (`T002`, `T008`, `T010`) and reuses `ProfileActivityLists` (`T020`) or runs concurrently.
- **Phase 6 (Polish & Verification)**: Depends on Phases 3–5 completion.

### Parallel Execution Example (Phase 2)

```bash
# Run in parallel after T004 (globals.css tokens):
Task: "T005 Update Neo-Brutalist UI primitives in web/src/components/ui/*"
Task: "T006 Update feed components in web/src/components/feed/*"
Task: "T007 Create Zod schemas in web/src/lib/validations/profile.ts"
Task: "T008 Create profile queries in web/src/lib/queries/profile.ts"
Task: "T009 Update admin-guard.ts to use get_my_account_profile()"
Task: "T010 Create UserAvatar in web/src/components/profile/user-avatar.tsx"
```

### Implementation Strategy

- **MVP First (Phase 1 + Phase 2 + Phase 3 / US1)**: Delivers the top-right `AccountBubble` with 2-letter initials, `Light`/`Dark` theme toggle with zero FOIT, and clean sign-out revert across all existing routes.
- **Incremental Delivery**: Add Phase 4 (`US2` `/profile` customization + `256x256` WebP avatar upload + paginated personal activity) → Add Phase 5 (`US3` `/profile/[id]` public profiles + `/study/[id]` discussion attribution) → Run Phase 6 verification gates.
