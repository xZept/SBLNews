# Decision: User Profiles, Account Bubble & Theme Preference

- **Slug**: user-profiles
- **Decided**: 2026-11-26T23:33:47+08:00
- **Verdict**: go
- **Artifacts reviewed**: intake.md, research.md, problem.md, concept.md

## Scorecard

| Criterion | Rating | Justification |
|-----------|--------|---------------|
| Problem validity | strong | Codebase verification confirms signed-in users are locked to raw OAuth metadata strings, lack visual avatars/initials in the header and `/study/[id]` discussions, and have no theme control. |
| Evidence strength | strong | High-confidence findings directly cited from the product owner's intake and repository inspection (`0002_tables_and_indexes.sql`, `0003_rls_policies_and_triggers.sql`, `top-nav.tsx`, `discussion-thread.tsx`, `globals.css`). |
| Value vs. inaction | strong | Empowers commenters to control their public identity and domain credentials, declutters the top navigation bar into a compact account bubble, and adds opt-in dark mode for low-light reading. |
| Feasibility / appetite | strong | Option B fits a `small` (days) appetite by building on the existing `public.profiles` table and `profiles_update_own` RLS policy and using an in-place modal dialog. |
| Strategic fit | strong | Preserves the 6-route MVP boundary (Constitution Principle V), keeps Light Mode as the default Neo-Brutalist Sky Blue theme (Principle III), and enforces $0/month free-tier storage/egress limits (Principles I & IV). |
| Risk posture | strong | Key risks (avatar storage/egress consumption, theme flash on ISR pages, and dark-mode Neo-Brutalist contrast) are well-understood and mitigated by client-side thumbnail downscaling, synchronous theme initialization, and CSS variable token mapping. |

## Verdict & Rationale

**Verdict: `go`**. Every scorecard dimension rates `strong`. The problem is directly confirmed in the current implementation, the database foundation (`public.profiles` and self-update/role-guard RLS triggers) is already in place, and **Option B (In-Place Account Bubble & Profile Modal with Custom Photo Upload, Community Context & Theme Switch)** delivers the complete user experience within a `small` appetite while upholding all six Constitution principles.

## If needs-clarification

- N/A (Verdict is `go`; remaining minor preference questions are carried forward to `/speckit-specify` with sensible defaults.)

## If go — Handoff to `/speckit-specify`

- **Problem**: Signed-in SBL News users lack control over their public discussion identity (display name, profile photo with initials fallback, and lifting/research background context), have no dark theme toggle, and face a cluttered top-right header displaying raw OAuth metadata beside a standalone sign-out button.
- **Chosen approach**: **Option B — In-Place Account Bubble & Profile Modal with Custom Photo Upload, Community Context & Theme Switch**:
  - **Top-Right Avatar Icon & Account Bubble**: Signed-in users see a top-right avatar button that defaults to their 2-letter name initials until a profile photo is set. Pressing it opens a Neo-Brutalist popover bubble displaying: (1) Identity header (Avatar/Initials, Display Name, Email, and Account Role badge `Member` / `Admin`), (2) **Profile** (opens the in-place Edit Profile modal dialog), (3) **Theme** (`Light` / `Dark` inline toggle, defaulting to `Light`), (4) **Admin Review Queue** link (`/admin/review`, shown only when `role === 'admin'`), and (5) **Sign out**.
  - **Editable Profile Fields (in the Edit Profile Modal)**:
    1. **Profile Photo (`avatar_url`)**: Upload, replace, or remove a custom photo (automatically center-cropped and downscaled client-side to a compact square thumbnail `<= 256x256` WebP/JPEG to protect the 1 GB storage and 5 GB egress caps), reverting to the 2-letter name initials badge when unset or removed.
    2. **Display Name (`display_name`)**: Required (2–50 chars), reflected in the top-right bubble and on the user's `/study/[id]` comments.
    3. **Training / Professional Role Tag (`affiliation_role`)**: Optional domain badge displayed alongside the author's name in study discussions (`Lifter`, `Strength Coach`, `Exercise Researcher`, `Clinician`, `Student`, or none).
    4. **Short Bio / Credentials (`bio`)**: Optional 1-line summary (up to 160 chars, e.g., *"MSc Exercise Physiology · Powerlifting Coach"*).
    5. **Theme Preference (`theme_preference`)**: `light` (default) or `dark`, persisted both locally (to prevent flash on ISR-cached `/` and `/guidelines` routes) and in `public.profiles`.
    6. **Read-Only Account Info**: Connected OAuth email and system role (`Member` / `Admin`).
- **In scope / out of scope**:
  - *In scope*: Top-right initials/photo avatar trigger, account popover bubble (`Profile`, `Theme`, conditional `Admin`, `Sign out`), Edit Profile modal dialog, avatar upload/removal with initials fallback, display name + role tag + short bio editing, high-contrast Neo-Brutalist dark theme tokens (opt-in, with light mode default), and rendering author avatar/initials + role tag on `/study/[id]` comments.
  - *Out of scope*: Dedicated `/profile` or `/settings` routes, public user profile pages, follower graphs, user activity/upvote history feeds, interactive pan/zoom photo editors, email/password authentication, or dark-mode-by-default for new visitors.
- **Success metrics**:
  - Signed-in users can customize their display name, photo (or revert to initials), community role tag, bio, and light/dark theme from any of the 6 routes without page navigation away from their current context.
  - Avatar uploads and profile reads remain strictly within Supabase Free's 1 GB storage and 5 GB monthly egress budgets.
  - Zero Flash of Incorrect Theme (FOIT) on ISR-cached pages (`/`, `/guidelines`) and 100% Neo-Brutalist contrast compliance in both `Light` and `Dark` themes.
- **Carried-forward open questions**:
  - Confirm during `/speckit-specify` or `/speckit-clarify` whether OAuth signup (`handle_new_user()`) should leave `avatar_url` null initially (so all new users start with their 2-letter name initials until they upload a photo) and whether any additional role tags beyond `Lifter`, `Strength Coach`, `Exercise Researcher`, `Clinician`, and `Student` are desired.
