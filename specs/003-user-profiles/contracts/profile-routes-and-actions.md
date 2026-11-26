# Web Routes, Actions, Storage & Theme Contracts (`/web`)

**Branch**: `003-user-profiles` | **Date**: 2026-11-27 | **Spec**: [spec.md](../spec.md)

## 1. Approved 8-Route Surface & Rendering Contracts

Per Constitution Principle V (v1.1.0), `/web` adds `/profile` and `/profile/[id]` to complete the 8 approved routes while updating `TopNav` globally and `/study/[id]` comment attribution:

| Surface / Route | Rendering Strategy | Auth & Privacy Contract | Primary Data Contract |
|-----------------|--------------------|-------------------------|-----------------------|
| Global `TopNav` (`AccountBubble`) | Client Component hydrated across all routes | Signed-out: Google/GitHub sign-in buttons (`Light` theme). Signed-in: 2-letter initials or photo button opening `AccountBubble` | `supabase.rpc("get_my_account_profile")` + `supabase.auth.getUser()` (`email`), shared via `AccountProfileProvider` |
| `/profile` | Dynamic (`force-dynamic`) | **Authenticated only** — unauthenticated visitors receive an inline Neo-Brutalist sign-in gate (zero private data queried or rendered) with Google/GitHub OAuth buttons returning to `/profile` via `/auth/callback` | `getMyAccountProfile()` + initial 20 `getMyUpvotedStudies()` + initial 20 `getUserCommentHistory(user.id)` |
| `/profile/[id]` | Dynamic (`force-dynamic`) | **Public (`createPublicClient()`)** — strictly excludes `email`, `theme_preference`, `role`, `created_at`, and `votes` (`FR-008`, `SC-005`) | `getPublicProfileById(id)` + initial 20 `getUserCommentHistory(id)` (renders Neo-Brutalist `"Profile not found"` state on invalid/missing UUID) |
| `/study/[id]` (Updated Discussion) | Dynamic (`force-dynamic`) | Public read; authenticated write | `getStudyComments(id)` updated to project `author:profiles!comments_author_id_fkey(id, display_name, avatar_url, affiliation_role)` and link non-deleted authors to `/profile/[author.id]` |

*(Existing ISR caching `revalidate = 3600` on `/` and `/guidelines` and `force-static` on `/methodology` remain 100% intact; `RootLayout` MUST NOT call `cookies()`.)*

---

## 2. Egress-Safe Column Projections & TypeScript Interfaces (`/web/src/lib/queries/projections.ts`)

No query in `/profile`, `/profile/[id]`, `TopNav`, or `/study/[id]` may execute `SELECT *` or select `abstract_text` / `embedding`:

```typescript
export type CommunityRoleType =
  | "Lifter"
  | "Strength Coach"
  | "Exercise Researcher"
  | "Clinician"
  | "Student";

export type ThemePreferenceType = "light" | "dark";

export const PUBLIC_PROFILE_COLUMNS = `
  id,
  display_name,
  avatar_url,
  affiliation_role,
  bio
` as const;

export const PROFILE_COMMENT_HISTORY_COLUMNS = `
  id,
  study_id,
  body,
  created_at,
  study:studies!comments_study_id_fkey (
    id,
    title,
    journal,
    publication_year
  )
` as const;

export const PROFILE_UPVOTED_STUDY_COLUMNS = `
  study_id,
  created_at,
  study:studies!votes_study_id_fkey (
    id,
    title,
    journal,
    publication_year,
    study_design,
    quality_score
  )
` as const;

export interface PublicProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  affiliation_role: CommunityRoleType | null;
  bio: string | null;
}

export interface AccountProfile extends PublicProfile {
  theme_preference: ThemePreferenceType;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpvotedStudyItem {
  study_id: string;
  voted_at: string;
  study: {
    id: string;
    title: string;
    journal: string;
    publication_year: number;
    study_design: StudyDesignType;
    quality_score: number;
  };
}

export interface ProfileCommentHistoryItem {
  id: string;
  study_id: string;
  body_excerpt: string; // Trimmed & truncated to <= 220 chars
  created_at: string;
  study: {
    id: string;
    title: string;
    journal: string;
    publication_year: number;
  };
}

export interface CursorPage<T, C> {
  items: T[];
  nextCursor: C | null;
  hasMore: boolean;
}
```

`StudyComment["author"]` is extended to `Pick<PublicProfile, "id" | "display_name" | "avatar_url" | "affiliation_role">`.

---

## 3. Runtime Zod Validation Schemas (`/web/src/lib/validations/profile.ts`)

All Server Actions and query helpers validate inputs at runtime using Zod (`FR-011`, Principle IV):

```typescript
import { z } from "zod";

export const PROFILE_PAGE_SIZE = 20 as const;

export const CommunityRoleEnum = z.enum([
  "Lifter",
  "Strength Coach",
  "Exercise Researcher",
  "Clinician",
  "Student",
]);

export const ThemePreferenceEnum = z.enum(["light", "dark"]);

export const UpdateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters.")
    .max(50, "Display name must be 50 characters or fewer."),
  affiliationRole: CommunityRoleEnum.nullable(),
  bio: z
    .string()
    .trim()
    .max(160, "Short bio must be 160 characters or fewer.")
    .transform((val) => (val.length === 0 ? null : val))
    .nullable(),
  themePreference: ThemePreferenceEnum,
});

export const UpdateThemePreferenceSchema = z.object({
  themePreference: ThemePreferenceEnum,
});

export const UpdateAvatarUrlSchema = z.object({
  avatarUrl: z
    .string()
    .url("Invalid avatar URL.")
    .max(500, "Avatar URL exceeds maximum length.")
    .nullable(),
});

export const UpvotedStudiesCursorSchema = z.object({
  cursorVotedAt: z.string().datetime({ offset: true }),
  cursorStudyId: z.string().uuid(),
});

export const CommentHistoryCursorSchema = z.object({
  userId: z.string().uuid(),
  cursorCreatedAt: z.string().datetime({ offset: true }),
  cursorCommentId: z.string().uuid(),
});
```

---

## 4. Server Actions & Client Upload Contracts

### 4.1 Server Actions (`/web/src/lib/actions/profile.ts`)

| Action | Input Schema | Auth Requirement | Behavior & Cache Revalidation |
|--------|--------------|------------------|-------------------------------|
| `updateProfileAction` | `UpdateProfileSchema` | Authenticated (`auth.getUser()`) | Updates `display_name`, `affiliation_role`, `bio`, and `theme_preference` where `id = user.id`. Revalidates `/profile`, `/profile/${user.id}`, and `/study/[id]` layout paths. Returns updated `AccountProfile`. |
| `updateThemePreferenceAction` | `UpdateThemePreferenceSchema` | Authenticated (`auth.getUser()`) | Updates `theme_preference` where `id = user.id`. Called asynchronously when signed-in user flips theme in `AccountBubble` or `/profile`. |
| `updateAvatarUrlAction` | `UpdateAvatarUrlSchema` | Authenticated (`auth.getUser()`) | Verifies non-null `avatarUrl` points strictly to `<NEXT_PUBLIC_SUPABASE_URL>/storage/v1/object/public/avatars/${user.id}/`, updates `profiles.avatar_url`, and revalidates `/profile` and `/profile/${user.id}`. |
| `loadMoreUpvotedStudiesAction` | `UpvotedStudiesCursorSchema` | Authenticated (`auth.getUser()`) | Queries `public.votes` for `user_id = user.id` using keyset cursor `(created_at, study_id) < (cursorVotedAt, cursorStudyId)`, `LIMIT 21`, returning `CursorPage<ProfileUpvotedStudyItem, UpvotedStudiesCursor>` (`20` items + `hasMore`). |
| `loadMoreCommentHistoryAction` | `CommentHistoryCursorSchema` | Public (`createPublicClient()`) | Queries `public.comments` for `author_id = userId AND is_deleted = false` using keyset cursor `(created_at, id) < (cursorCreatedAt, cursorCommentId)`, `LIMIT 21`, returning `CursorPage<ProfileCommentHistoryItem, CommentHistoryCursor>` (`20` items + `hasMore`). |

### 4.2 Client-Side Avatar Compression & Upload Contract (`/web/src/lib/avatar-upload.ts`)

1. **Pre-Decode Validation**: Accept only `File` inputs matching `type` in `["image/jpeg", "image/png", "image/webp"]` and raw file size `<= 15 MB` (prevents browser tab OOM before downscaling; non-raster files such as `.svg`, `.pdf`, `.gif`, or corrupted binaries reject immediately with a clear error message and leave the current avatar untouched).
2. **Center-Crop & Downscale**:
   - Decode image dimensions `(w, h)`.
   - Compute square crop box: `side = Math.min(w, h)`, `sx = Math.floor((w - side) / 2)`, `sy = Math.floor((h - side) / 2)`.
   - Target dimension: `targetSize = Math.min(256, side)` (`<= 256x256` px).
   - Draw onto `<canvas width={targetSize} height={targetSize}>` and encode via `canvas.toBlob("image/webp", 0.82)` (falling back to `"image/jpeg"` if browser returns PNG/null, and stepping quality `0.82 → 0.70 → 0.55` if blob exceeds `200 * 1024` bytes). Reject if final blob `> 204800` bytes (`200 KB`).
3. **Storage Upload / Removal**:
   - Upload via browser Supabase client: `supabase.storage.from("avatars").upload(`${userId}/avatar.${ext}`, blob, { contentType, upsert: true, cacheControl: "3600" })`.
   - Remove any stale alternate extension (`const altExt = ext === "webp" ? "jpg" : "webp"; await supabase.storage.from("avatars").remove([`${userId}/avatar.${altExt}`])`) so orphaned thumbnails do not accumulate in `avatars/{user_id}/`.
   - Persist `<publicUrl>?v=${Date.now()}` immediately via `updateAvatarUrlAction`, then refresh `AccountProfileProvider` state so the header `AccountBubble` updates immediately.
   - On **Remove Photo**: call `supabase.storage.from("avatars").remove([`${userId}/avatar.webp`, `${userId}/avatar.jpg`, `${userId}/avatar.png`])` followed immediately by `updateAvatarUrlAction({ avatarUrl: null })` and `refreshAccountProfile()`.

---

## 5. UI, Initials & Theme Contracts

### 5.1 Deterministic 2-Letter Initials Helper (`deriveInitials(displayName: string): string`)
- Trim whitespace and collapse internal runs of whitespace/punctuation into word tokens matching `/[\p{L}\p{N}]+/gu`.
- **Multi-word (`tokens.length >= 2`)**: Uppercase first character of first token + first character of last token (e.g., `"Eric Helms"` → `"EH"`, `"Dr. Mike Israetel"` → `"DI"`).
- **Single-word (`tokens.length === 1`)**: Uppercase first 1–2 characters of the token (e.g., `"Alex"` → `"AL"`, `"J"` → `"J"`).
- **Fallback (`tokens.length === 0`)**: `"SL"`.

### 5.2 Account Menu Bubble Contract (`AccountBubble`)
- **Trigger**: Top-right `36x36` (`h-9 w-9`) button (`aria-label="Account menu"`, `aria-expanded`, `aria-controls`), showing `UserAvatar` (`avatar_url` image or `JetBrains Mono` 2-letter initials).
- **Popover Panel** (`rounded-md border-2 border-border bg-surface shadow-card`):
  1. **Identity Summary**: `UserAvatar` (`md`), `display_name` (`Space Grotesk` bold), `email` (`JetBrains Mono` muted), and system role `Badge` (`Member` or `Admin`).
  2. `<hr>` separator.
  3. **Profile** (`<Link href="/profile">`).
  4. **Theme** inline binary segmented control (`Light` | `Dark`, `aria-pressed` on active button).
  5. **Admin Review Queue** (`<Link href="/admin/review">`, rendered strictly when `profile.role === "admin"`).
  6. `<hr>` separator.
  7. **Sign out** (`<button type="button">` — signs out of Supabase Auth, clears `localStorage["sbl_theme"]`, resets DOM theme to `"light"`, and updates header to signed-out state).

### 5.3 Neo-Brutalist Light & Opt-In Dark Theme Token Contract (`globals.css` + `layout.tsx`)

| CSS Custom Property | Default Light (`:root`) | Opt-In Dark (`:root[data-theme="dark"]`) | Usage |
|---------------------|-------------------------|------------------------------------------|-------|
| `color-scheme` | `light` | `dark` | Viewport canvas, scrollbars & native form controls |
| `--color-canvas` | `#F8FAFC` | `#0B1120` | Page background & inset panels |
| `--color-surface` | `#FFFFFF` | `#1E293B` | Card, header, input & popover surfaces |
| `--color-ink` | `#0F172A` | `#F8FAFC` | Primary headings & body copy |
| `--color-muted` | `#475569` | `#94A3B8` | Secondary labels, timestamps & metadata |
| `--color-border` | `#0F172A` | `#E2E8F0` | `2px solid` structural borders |
| `--color-accent` | `#38BDF8` | `#38BDF8` | Sky Blue primary CTAs, active tabs & active upvotes |
| `--color-accent-ink` | `#0F172A` | `#0F172A` | Always-dark ink on `#38BDF8` accents & pastel badges |
| `--shadow-card` | `4px 4px 0px #0F172A` | `4px 4px 0px #020617` | Hard zero-blur card & popover offset shadow |
| `--shadow-control` | `2px 2px 0px #0F172A` | `2px 2px 0px #020617` | Hard zero-blur button, avatar & pill offset shadow |

**Pre-Paint Inline `<head>` Script (`RootLayout`)**:
- `<meta name="color-scheme" content="light" />` followed immediately by a synchronous inline `<script>` reading `localStorage.getItem("sbl_theme")` inside `try/catch`; when `"dark"`, sets `document.documentElement.dataset.theme = "dark"` and updates `<meta name="color-scheme" content="dark">` prior to first paint (`SC-004`).
