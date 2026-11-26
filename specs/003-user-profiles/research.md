# Phase 0 Research: User Profiles, Account Menu Bubble & Public Commenter Views

**Branch**: `003-user-profiles` | **Date**: 2026-11-27 | **Spec**: [spec.md](./spec.md)

## 1. Profile Schema Extension & Defense-in-Depth Column Privacy

- **Decision**:
  - Extend `public.profiles` via sequential migration `supabase/migrations/0008_user_profiles_and_storage.sql` with:
    - `affiliation_role public.community_role_type NULL` (`'Lifter' | 'Strength Coach' | 'Exercise Researcher' | 'Clinician' | 'Student'`)
    - `bio text NULL CHECK (bio IS NULL OR char_length(bio) <= 160)`
    - `theme_preference public.theme_preference_type NOT NULL DEFAULT 'light'` (`'light' | 'dark'`)
    - `updated_at timestamptz NOT NULL DEFAULT now()`
    - `display_name` length check: `CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 50)` (after safely normalizing any existing rows).
  - Enforce **column-level PostgreSQL privileges** on `public.profiles`:
    - `REVOKE SELECT, UPDATE ON TABLE public.profiles FROM anon, authenticated;`
    - `GRANT SELECT (id, display_name, avatar_url, affiliation_role, bio) ON public.profiles TO anon, authenticated;`
    - `GRANT UPDATE (display_name, avatar_url, affiliation_role, bio, theme_preference, updated_at) ON public.profiles TO authenticated;`
  - Provide an authenticated-only RPC `public.get_my_account_profile()` (`SECURITY DEFINER`, `SET search_path = public`, `REVOKE EXECUTE FROM PUBLIC, anon; GRANT EXECUTE TO authenticated;`) that filters strictly by `WHERE p.id = (select auth.uid())` to return the signed-in user's full private + public profile (`id`, `display_name`, `avatar_url`, `affiliation_role`, `bio`, `theme_preference`, `role`, `created_at`, `updated_at`), while connected `email` is read exclusively on the server/session from `supabase.auth.getUser()`.
  - Tighten `public.votes` RLS and privileges by replacing `votes_select_public` (`USING (true)`) with `votes_select_own` (`TO authenticated USING ((select auth.uid()) = user_id)`) and `REVOKE SELECT ON TABLE public.votes FROM anon;` (aggregate study counts continue to live on `public.studies.upvote_count` via trigger).
  - Update `public.handle_new_user()` so newly registered OAuth users receive a normalized `2..50` character `display_name`, `avatar_url = NULL` (ensuring 2-letter initials default per FR-001), `theme_preference = 'light'`, and `ON CONFLICT (id) DO NOTHING` so custom profile edits are never overwritten on subsequent auth events.
- **Rationale**:
  - PostgreSQL RLS restricts rows rather than columns. Combining table RLS with column-level `GRANT SELECT` guarantees at the database engine level that neither unauthenticated visitors (`anon`) nor cross-user `authenticated` callers inspecting PostgREST directly can read another user's `role`, `theme_preference`, `created_at`, or `votes` history (`FR-008`, `SC-005`, Principle IV).
  - Keeping public columns (`id`, `display_name`, `avatar_url`, `affiliation_role`, `bio`) directly selectable on `public.profiles` preserves native PostgREST foreign-key embedding (`author:profiles!comments_author_id_fkey(...)`) on `/study/[id]` without introducing a `SECURITY DEFINER` view that would trigger Supabase `security_definer_view` lint warnings.
  - Wrapping `auth.uid()` inside `(select auth.uid())` in RLS predicates lets PostgreSQL cache the initPlan once per query instead of evaluating per row.
- **Alternatives Considered**:
  - *Relying solely on Next.js Server Component `.select()` projections while leaving `GRANT SELECT ON TABLE public.profiles TO anon, authenticated`*: Rejected because any caller with the publishable Supabase anon key could query PostgREST directly for another user's `role`, `theme_preference`, or `votes` rows.
  - *Splitting into two tables (`profiles` + `user_settings`) and migrating `role`*: Rejected because keeping a single `public.profiles` table with column-level privileges avoids breaking existing `public.is_admin()` and foreign-key triggers while still enforcing strict column isolation.

## 2. Client-Side Avatar Thumbnail Downscaling & Supabase Storage Guardrails

- **Decision**:
  - Provision a public Supabase Storage bucket `avatars` in `0008_user_profiles_and_storage.sql` with `file_size_limit = 512000` (`500 KB` hard server ceiling) and `allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png']`.
  - Add `storage.objects` RLS policies for `bucket_id = 'avatars'`:
    - Public `SELECT` (`TO anon, authenticated`).
    - Owner-scoped `INSERT`, `UPDATE` (both `USING` and `WITH CHECK`), and `DELETE` (`TO authenticated`) restricted to `(storage.foldername(name))[1] = (select auth.uid())::text`. (Including `SELECT` + `INSERT` + `UPDATE` is mandatory for Supabase Storage `upsert: true` replacements.)
  - On file selection in `/profile`, validate raster MIME type (`image/jpeg`, `image/png`, `image/webp`) before decoding via `createImageBitmap` / `HTMLImageElement`, center-crop the shortest square dimension (`min(width, height)`), draw onto an offscreen `<= 256x256` `<canvas>`, and encode with `canvas.toBlob('image/webp', 0.82)` (falling back to `'image/jpeg'` if WebP encoding is unavailable, and stepping quality down to `0.65` if needed) to guarantee output size `<= 200 KB` (`FR-006`, `SC-003`).
  - Upload to deterministic object key `{user_id}/avatar.{ext}` with `upsert: true` and store the public URL with a cache-busting query token (`?v={Date.now()}`) in `profiles.avatar_url`. Removing a photo deletes `{user_id}/avatar.*` in Storage and sets `profiles.avatar_url = null`.
  - Derive deterministic 2-letter uppercase initials (`deriveInitials(displayName)`) for fallback rendering: first + last word initials for multi-word names (e.g., `" Brad Schoenfeld "` → `"BS"`), or the first 2 alphanumeric characters for single-word names (e.g., `"Alex"` → `"AL"`).
- **Rationale**:
  - Center-cropped `256x256` WebP thumbnails typically weigh `12–35 KB` (over 95% smaller than raw smartphone photos), keeping 1,000+ user avatars well under `50 MB` of Supabase Free's `1 GB` storage cap and `5 GB` monthly egress cap (Principles I & IV).
  - Overwriting a deterministic `{user_id}/avatar.{ext}` path prevents orphaned files from accumulating in Storage while `?v={timestamp}` busts browser caching immediately on save (`SC-002`).
- **Alternatives Considered**:
  - *Uploading raw images to a Next.js Server Action for `sharp` processing*: Rejected because adding `sharp` bloats serverless bundles, consumes Vercel Hobby function execution/payload limits, and transfers multi-megabyte uploads unnecessarily.
  - *Allowing `image/svg+xml` avatars*: Rejected due to XSS/script-embedding vectors and raster-thumbnail standardization (`FR-006` Edge Cases).
  - *Interactive pan/zoom cropper library (`react-easy-crop`)*: Explicitly out of scope per spec assumptions and Principle I dependency discipline.

## 3. Opt-In Neo-Brutalist Dark Theme, Contrast Tokens & Zero-FOIT Lifecycle

- **Decision**:
  - Keep **Light Mode** as the mandatory default for all new and unauthenticated visitors (`FR-010`, Principle III).
  - Update `/web/src/app/globals.css` so `:root` sets default Light Theme tokens (`color-scheme: light`, `--color-canvas: #F8FAFC`, `--color-surface: #FFFFFF`, `--color-ink: #0F172A`, `--color-muted: #475569`, `--color-border: #0F172A`, `--shadow-card: 4px 4px 0px #0F172A`, `--shadow-control: 2px 2px 0px #0F172A`) and `:root[data-theme="dark"]` overrides them with Constitution v1.1.0 Dark Theme tokens (`color-scheme: dark`, `--color-canvas: #0B1120`, `--color-surface: #1E293B`, `--color-ink: #F8FAFC`, `--color-muted: #94A3B8`, `--color-border: #E2E8F0`, `--shadow-card: 4px 4px 0px #020617`, `--shadow-control: 2px 2px 0px #020617`).
  - Introduce `--color-accent-ink: #0F172A` in `@theme` (fixed `#0F172A` in both themes) and replace hardcoded `border-ink`, `shadow-[4px_4px_0px_#0F172A]`, and `shadow-[2px_2px_0px_#0F172A]` across UI primitives (`Card`, `Button`, `Badge`, `Input`, `Tabs`, `TopNav`, `UpvoteButton`, `DiscussionThread`) with token-backed classes (`border-border`, `shadow-card`, `shadow-control`, and `text-accent-ink` on Sky Blue `#38BDF8` accents and semantic pastel badges `#A7F3D0` / `#BAE6FD` / `#FDE68A` / `#BBF7D0` / `#FED7AA`).
  - Inject a minimal synchronous inline `<script>` inside `<head>` in `/web/src/app/layout.tsx` (immediately after `<meta name="color-scheme" content="light">`) that reads `localStorage.getItem("sbl_theme")` inside `try/catch` and, when `"dark"`, sets `document.documentElement.dataset.theme = "dark"` and updates `<meta name="color-scheme" content="dark">` before first paint (`SC-004`), plus synchronizes across tabs via the `storage` event.
  - Manage session theme lifecycle in a lightweight `ThemeProvider` / auth sync hook:
    1. **On Sign-In / Hydration**: Hydrate `profile.theme_preference` from `get_my_account_profile()`, apply to `document.documentElement.dataset.theme` + `<meta name="color-scheme">`, and write `localStorage.setItem("sbl_theme", pref)`.
    2. **On Toggle (Account Bubble or `/profile`)**: Apply immediately to DOM + `localStorage`, and persist `theme_preference` to `public.profiles` asynchronously.
    3. **On Sign-Out (Clarification Q2)**: Remove `localStorage.removeItem("sbl_theme")` and reset DOM + `<meta name="color-scheme">` to `"light"` immediately **without** updating `public.profiles.theme_preference`, so the browser returns to Light Mode while preserving `dark` on the user's profile for their next sign-in.
- **Rationale**:
  - ISR-cached pages (`/`, `/guidelines`) serve static HTML shared by all visitors; reading cookies in `RootLayout` would opt the entire app out of ISR and violate Principle I. A synchronous pre-paint `<head>` script reading `localStorage` guarantees zero Flash of Incorrect Theme (`SC-004`) while keeping `/` and `/guidelines` 100% statically cached.
  - Separating `--color-border` (`#E2E8F0` in dark) and `--color-accent-ink` (`#0F172A` in both themes) from `--color-ink` (`#F8FAFC` in dark) prevents dark-on-dark invisible card borders and prevents unreadable white-on-pastel text on Sky Blue buttons and evidence badges.
- **Alternatives Considered**:
  - *Reading theme from a cookie in `RootLayout` via `cookies()`*: Rejected because calling `cookies()` in the root layout forces dynamic rendering across `/` and `/guidelines`, breaking Constitution Principle I ISR requirements.
  - *Adding `next-themes` dependency*: Rejected because a 20-line typed `ThemeProvider` + inline `<head>` script implements the exact sign-in hydration and sign-out-revert-to-light semantics required by `FR-010` with zero extra dependencies.

## 4. Accessible Account Menu Bubble & Header Decluttering

- **Decision**:
  - Replace the signed-in text metadata, standalone Admin button, and standalone Sign out button in `TopNav` (`/web/src/components/layout/top-nav.tsx`) with a single `AccountBubble` client component (`UserAvatar` trigger + Neo-Brutalist popover panel) while keeping unauthenticated Google/GitHub sign-in buttons unchanged (`FR-001`, `FR-002`).
  - Render the trigger as a compact `36x36` (`h-9 w-9`) square `rounded-md` Neo-Brutalist button (`2px solid var(--color-border)`, `var(--shadow-control)`, `JetBrains Mono` 2-letter initials on Sky Blue/surface or `<img>` thumbnail) with `aria-expanded` and `aria-controls`.
  - Render the popover anchored `right-0 top-full mt-2` with `2px solid var(--color-border)` and `var(--shadow-card)`, supporting click-outside light dismiss, `Escape` key close with focus restoration to the trigger, route-change auto-close, semantic `<Link>` navigation items (`Profile` → `/profile`, conditional `Admin Review Queue` → `/admin/review`), an inline accessible `Light` / `Dark` segmented toggle (`aria-pressed`), semantic `<hr>` dividers, and `Sign out`.
  - Share profile state between `TopNav` and `/profile` via a lightweight React context (`AccountProfileContext`) + `router.refresh()` so saving changes on `/profile` updates the header avatar/initials, display name, and theme immediately without a full browser reload (`SC-002`).
- **Rationale**:
  - Satisfies `SC-001` (<= 2 clicks from any route to `/profile`, theme switch, or sign-out) without adding third-party dropdown/popover packages (Principle I).
  - Right-edge relative anchoring (`right-0 top-full`) prevents horizontal viewport clipping on narrow `375px` mobile screens across all browsers without needing JS coordinate calculations.
- **Alternatives Considered**:
  - *Installing `@radix-ui/react-dropdown-menu`*: Rejected because standard ARIA menu roles (`role="menu"`) conflict with rich non-menuitem header summaries and inline segmented theme controls, and zero new dependencies are needed.

## 5. Keyset-Paginated Activity Lists & Egress-Safe Projections

- **Decision**:
  - Bound both **Upvoted Studies** (on `/profile`) and **Comment History** (on `/profile` and `/profile/[id]`) using **keyset (cursor) pagination** at `20` items per page (`LIMIT 21` to compute `hasMore` without `COUNT(*)`) with a `"Load more"` button (`FR-005`, `FR-007`, Clarification Q1).
  - Add dedicated composite indexes in `0008_user_profiles_and_storage.sql`:
    - `idx_comments_author_history ON public.comments (author_id, created_at DESC, id DESC) WHERE is_deleted = false`
    - `idx_votes_user_history ON public.votes (user_id, created_at DESC, study_id DESC)` (necessary because `votes` primary key `(study_id, user_id)` has `study_id` leading).
  - Define strict egress-safe projection constants in `/web/src/lib/queries/projections.ts`:
    - `PUBLIC_PROFILE_COLUMNS`: `id, display_name, avatar_url, affiliation_role, bio`
    - `PROFILE_UPVOTED_STUDY_COLUMNS`: joins `votes (study_id, created_at)` to `studies (id, title, journal, publication_year, study_design, quality_score)` where `publication_status = 'published'`
    - `PROFILE_COMMENT_HISTORY_COLUMNS`: joins `comments (id, study_id, body, created_at)` to `studies (id, title, journal, publication_year)` where `is_deleted = false` (truncating `body` to a `220`-char excerpt for display).
  - Expose cursor-paginated Server Actions / query helpers validated with Zod (`ProfileActivityCursorSchema`) for `"Load more"` fetches, verifying server-side session ownership before returning upvoted studies (`FR-008`, `FR-011`).
- **Rationale**:
  - Keyset pagination (`(created_at, id) < ($cursorCreatedAt, $cursorId)`) maintains $O(1)$ indexed lookup latency at any depth and avoids duplicate/skipped rows if new votes or comments arrive between pages.
  - Explicit narrow column projections keep each 20-item page payload under `~6 KB`—never touching `abstract_text` or `vector(768)` embeddings (Principle IV).
- **Alternatives Considered**:
  - *`OFFSET` pagination (`RANGE`)*: Rejected per Postgres best practices because `OFFSET` scans and discards skipped rows linearly as history grows.
  - *Unbounded `SELECT` of all user votes/comments*: Rejected during `/speckit-clarify` to protect page weight and Supabase Free egress.
