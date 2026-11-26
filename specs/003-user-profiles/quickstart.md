# Quickstart & Validation Guide: User Profiles, Account Menu Bubble & Public Commenter Views

**Branch**: `003-user-profiles` | **Date**: 2026-11-27 | **Spec**: [spec.md](./spec.md)

This guide defines the setup steps, automated verification gates, and end-to-end acceptance checks for validating the user profile routes (`/profile`, `/profile/[id]`), top-right Account Menu Bubble, Supabase Storage `avatars` bucket, and opt-in Neo-Brutalist Dark Theme.

---

## 1. Prerequisites

- **Node.js**: v20.x+ and `npm`
- **Python**: v3.12+ (for existing `/pipeline` regression suite)
- **Supabase Project (or Local Supabase CLI)**: PostgreSQL 15+ with migrations `0001`–`0007` applied, Supabase Storage enabled, and Google/GitHub OAuth configured

---

## 2. Database & Storage Migration Setup

1. **Apply Migration `0008_user_profiles_and_storage.sql`**:
   Push the sequential migration in `/supabase/migrations/` to create `community_role_type` and `theme_preference_type`, extend `public.profiles`, apply column-level privileges + `public.get_my_account_profile()`, harden `public.votes` RLS, add keyset pagination indexes, and provision the `avatars` Storage bucket and policies (see [data-model.md](./data-model.md)):
   ```bash
   npx supabase db push
   ```
2. **Verify `/web/.env.local`**:
   Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured (no new environment variables or paid third-party services are required).

---

## 3. Automated Verification Gates (Constitution Principle VI)

### 3.1 Frontend Typecheck, Lint, Unit Tests & ISR Build (`/web`)

Run all static and unit verification checks (covering `deriveInitials`, Zod profile/cursor schemas, egress-safe projection guards, and route compilation):

```bash
cd web
npm run typecheck
npm run lint
npm test
npm run build
```

**Expected Outcome**:
- `tsc --noEmit` exits `0` under `strict: true`.
- `next lint` reports zero warnings or errors.
- `vitest run` passes all existing and new unit tests (`deriveInitials`, `UpdateProfileSchema`, `PUBLIC_PROFILE_COLUMNS` / activity projection guards, avatar MIME/size validation helpers).
- `next build` succeeds and confirms `/` and `/guidelines` remain ISR (`○` / revalidate `3600s`), `/methodology` remains static (`○`), and `/profile` + `/profile/[id]` build as dynamic server-rendered routes (`ƒ`).

### 3.2 Pipeline Regression Check (`/pipeline`)

Confirm zero regression in the Python workspace:

```bash
cd pipeline
pytest -v
```

---

## 4. End-to-End Acceptance Scenarios

Start the local dev server (`cd web && npm run dev`) and validate each user story against [contracts/profile-routes-and-actions.md](./contracts/profile-routes-and-actions.md):

### 4.1 User Story 1 — Account Menu Bubble, Theme Toggle & Sign-Out Revert
1. **Unauthenticated Default**: Open `/` in an incognito window (even with OS dark mode enabled). Verify Light Mode (`#F8FAFC` canvas, `#FFFFFF` cards) renders by default and the top-right header shows `Sign in with Google` / `GitHub` with no account bubble.
2. **Initials Trigger & Bubble Contents**: Sign in via OAuth as a `member` user with no custom photo. Verify the top-right header displays a single `36x36` 2-letter initials avatar button (replacing raw text + standalone Sign out). Click it (or press `Enter`/`Space`) and verify the popover shows avatar/initials, display name, email, `Member` badge, `Profile` link, `Light` / `Dark` switch, and `Sign out` (with `Admin Review Queue` hidden for non-admins and visible for `admin` users).
3. **Dark Theme & Zero FOIT (`SC-004`)**: Toggle `Dark` inside the bubble. Verify the canvas immediately switches to `#0B1120` with `#1E293B` cards, crisp `#E2E8F0` `2px` borders, `#020617` zero-blur hard shadows, and `#0F172A` dark ink on `#38BDF8` Sky Blue buttons and pastel evidence badges (zero purple/violet/indigo hues). Hard-reload `/` and `/guidelines` and confirm zero white flash occurs.
4. **Sign-Out Theme Revert (`FR-010`)**: While in `Dark` theme, click `Sign out` in the bubble. Verify the session ends, the active browser theme immediately reverts to `Light`, and signing back into the same account restores `Dark` automatically.

### 4.2 User Story 2 — Dedicated `/profile` Settings, Photo Compression & Activity Pagination
1. **Unauthenticated Guard**: Visit `/profile` while signed out and confirm access is blocked/redirected cleanly without rendering private settings.
2. **Profile Customization (`SC-002`)**: Sign in, open `/profile` via the Account Bubble, update **Display Name** (`2–50` chars), select a **Training / Professional Role Tag** (e.g., `Exercise Researcher`), enter a **Short Bio** (`<= 160` chars), and save. Verify invalid inputs (e.g., whitespace-only name or `>160`-char bio) show inline validation errors, and valid saves immediately update the `TopNav` bubble.
3. **Avatar Upload & Removal (`SC-003`)**:
   - Attempt uploading a non-raster file (e.g., `.svg` or `.pdf`) and verify immediate client rejection.
   - Upload a large rectangular `.jpg` or `.png` photo (e.g., `3000x2000`, `3 MB`). Verify in DevTools Network that the uploaded payload to `avatars/{user_id}/avatar.webp` is center-cropped to `<= 256x256` pixels and `<= 200 KB`, and renders in the header, `/profile`, `/profile/[id]`, and `/study/[id]` comments.
   - Click **Remove Photo** and verify the custom image is cleared and the 2-letter initials badge returns everywhere.
4. **Read-Only Metadata & Paginated Activity (`FR-004`, `FR-005`)**: Verify connected `email`, system role (`Member`/`Admin`), and the `"View public profile"` link appear on `/profile`, and verify **Upvoted Studies** and **Comment History** display up to `20` items initially with a working `"Load more"` button when `> 20` items exist.

### 4.3 User Story 3 — Public `/profile/[id]` Privacy & Discussion Attribution
1. **Discussion Attribution (`FR-009`)**: Post a comment on `/study/[id]` and verify the comment header displays the author's avatar (or initials badge), display name, and optional role tag, with avatar/name linking to `/profile/[id]`.
2. **Public View & Zero Private Data Leakage (`SC-005`)**: Open `/profile/[id]` in an incognito window (and as a second signed-in user). Verify only public fields (avatar/initials, display name, role tag, bio, and public comment history paginated at 20 items) are rendered and that inspecting HTML/RSC payloads and direct PostgREST queries (`SELECT role, theme_preference FROM profiles` or `SELECT * FROM votes`) exposes **0** private fields (`email`, `theme_preference`, `role`, or upvoted studies).
3. **Not Found State**: Visit `/profile/00000000-0000-0000-0000-000000000000` (and `/profile/not-a-uuid`) and verify a clean Neo-Brutalist `"Profile not found"` state with a link back to `/`.
