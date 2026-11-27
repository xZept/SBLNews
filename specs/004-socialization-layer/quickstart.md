# Quickstart & Validation Guide: Lightweight Socialization, Aura Leaderboard & Study Sharing

**Branch**: `004-socialization-layer` | **Date**: 2026-11-28 | **Spec**: [spec.md](./spec.md)

This guide outlines the database setup, automated verification gates, and end-to-end validation scenarios for verifying external study sharing + Open Graph metadata, deterministic **Aura** scoring + the `/` **Top Users** rail, opt-in profile activity visibility + capped recently viewed studies, and the global header **Friends & 1:1 Study Chat** drawer.

---

## 1. Prerequisites

- **Node.js**: v20.x+ and `npm`
- **Python**: v3.12+ (for the `/pipeline` regression test suite)
- **Supabase Project (or Local Supabase CLI)**: PostgreSQL 15+ with migrations `0001`–`0008` applied and Google/GitHub OAuth enabled

---

## 2. Database Migration Setup

1. **Apply Migration `0009_socialization_aura_friends_chat.sql`**:
   Push the sequential SQL migration in `/supabase/migrations/` to provision the domain enums (`activity_visibility_type`, `friendship_status_type`, `share_channel_type`), non-exposed `private` RLS/Aura functions, extended `public.profiles` and `public.comments` columns, new tables (`comment_endorsements`, `study_shares`, `recent_study_views`, `friendships`, `direct_messages`), composite/FK indexes, and least-privilege grants (see [data-model.md](./data-model.md)):
   ```bash
   npx supabase db push
   ```
2. **Environment Configuration (`/web/.env.local`)**:
   Confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set. Optional: set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` locally (production automatically falls back to `VERCEL_PROJECT_PRODUCTION_URL` when unset; zero paid services or extra API keys are required).

---

## 3. Automated Verification Gates (Constitution Principle VI)

### 3.1 Frontend Typecheck, Lint, Unit Tests & Route/ISR Build (`/web`)

Run all static, unit, and build checks from `/web`:

```bash
cd web
npm run typecheck
npm run lint
npm test
npm run build
```

**Expected Outcomes**:
- `tsc --noEmit` exits `0` under `strict: true`.
- `next lint` reports zero errors or warnings.
- `vitest run` passes all existing suites plus socialization unit tests covering:
  - Deterministic Aura formula weights, UTC daily caps (`25`/`20`/`10`/`10`), and deletion/removal recalculation semantics.
  - External share URL builders and SBL News citation formatting.
  - Runtime Zod schemas (`social.ts` & `profile.ts`) including `1,000`-char chat limit, `240`-char study-note limit, and visibility enums.
  - Egress-safe projection constants (`TOP_AURA_USER_COLUMNS`, `STUDY_SHARE_CARD_COLUMNS`, `PROFILE_RECENT_VIEW_COLUMNS`, `DIRECT_MESSAGE_COLUMNS`) excluding `abstract_text` and `embedding`, plus route-count verification confirming strictly 8 app routes (`SC-006`).
- `next build` succeeds and verifies `/` and `/guidelines` remain ISR (`revalidate = 3600`), `/methodology` remains static (`○`), and zero unapproved routes exist.

### 3.2 Pipeline Regression Check (`/pipeline`)

Verify zero regressions in the Python ingestion workspace:

```bash
cd pipeline
pytest -v
```

---

## 4. End-to-End Validation Scenarios

Start the local web application (`cd web && npm run dev`) and validate each user story against [contracts/socialization-routes-and-actions.md](./contracts/socialization-routes-and-actions.md):

### 4.1 User Story 1 — External Study Sharing & Rich Preview Metadata (`SC-001`)
1. **Two-Click External Share (Signed Out & Signed In)**: Open `/` in an incognito window and click **Share / Send** on any study card. Verify **Copy Link + Citation**, **X / Twitter**, **Reddit**, **WhatsApp**, and **Discord** are immediately active alongside a sign-in prompt in the **Send to Friend** section.
2. **Citation Attribution**: Click **Copy Link + Citation** and paste from clipboard. Confirm the copied text contains the study title, journal/year, evidence design summary, `"via SBL News"`, and canonical `/study/[id]` URL, with inline `"Copied"` feedback.
3. **Open Graph & Twitter Unfurl Metadata**: Inspect `<head>` on `/study/[id]` (`curl -s http://localhost:3000/study/<uuid> | grep -E "og:|twitter:"`). Verify `og:title`, `og:description` (containing journal/year, study design badge, inspection depth, concise takeaway, and SBL News attribution), `og:url`, and `twitter:card` render accurately with zero private user fields.

### 4.2 User Story 2 — Deterministic Aura Scoring & Left-Side Top Users Rail (`SC-002`, `SC-003`)
1. **Aura Earning, Daily Caps & Removal**:
   - Sign in as User A: post a study comment (`+5`), upvote a study (`+1`), and share a study (`+2`). Sign in as User B and click **Helpful** on User A's comment (`+2` to User A). Confirm User A's **Aura** equals `10 AURA` across `/profile`, `/profile/[id]`, and `/study/[id]` comment headers.
   - Verify daily caps prevent infinite farming (e.g., >5 comments in a UTC day cap comment points at `+25` for that day; repeated shares of the same study on the same day count once).
   - Delete User A's comment or remove User B's endorsement and verify User A's **Aura** deterministically subtracts the corresponding points.
2. **Desktop Left Rail & Mobile Collapse on `/`**:
   - At `1280px` desktop width, verify the **Top Users** rail sits cleanly on the left side of `/` without a hero banner, study takeaways maintain `65ch–75ch` readability, and clicking any ranked contributor opens `/profile/[id]`.
   - At `375px` mobile width, verify the **Top Users** rail collapses into a compact expandable bar above the feed with zero horizontal overflow.

### 4.3 User Story 3 — Opt-In Profile Activity Visibility & 20-Study View Cap (`SC-004`)
1. **Default Private Guarantee**: For a user with default settings (`Private`), upvote a study and browse `/study/[id]`. Visit their `/profile/[id]` as an incognito visitor, a non-friend (User B), and an accepted friend (User C). Verify **0** upvoted or viewed studies appear in the UI or network/PostgREST responses.
2. **`Friends Only` vs. `Public` Gating**: On `/profile`, set **Upvoted Studies** and **Recently Viewed Studies** to `Friends Only` and open 25 distinct `/study/[id]` pages (opening one study twice). Confirm:
   - Repeated views deduplicate and stored history on `/profile` caps strictly at the **20** most recent distinct studies.
   - User C (accepted friend) sees both sections on `/profile/[id]`, while User B (non-friend) and incognito visitors see neither section nor underlying data.
   - Switching to `Public` exposes both sections to any visitor; switching back to `Private` immediately hides them on `/profile/[id]`, and clicking **Clear History** empties saved recent views.

### 4.4 User Story 4 — Friends & 1:1 Study Chat Header Drawer (`SC-005`, `SC-006`)
1. **Friend Lifecycle & Mutual-Friend Gating**:
   - Sign in as User A, click the **Friends & Chat** icon beside `AccountBubble` in `TopNav` (confirming the URL route does not change), search User C by display name, and click **Add Friend**.
   - Confirm neither user can send a 1:1 message or study card while the request is still `pending`.
   - Sign in as User C, observe the unread header badge, accept the request in the drawer (or on `/profile/[id]`), and confirm both users now appear as accepted friends.
2. **Send Study Card & 1:1 Messaging**:
   - As User A on `/`, click **Share / Send -> Send to Friend**, choose User C, add a short note (`<= 240` chars), and send (`<= 3` clicks).
   - As User C, verify the header unread badge increments, open the **Chat** thread in the drawer, confirm the embedded study card renders (linking to `/study/[id]`) and marks the thread read, and send a plain-text reply (`<= 1,000` chars; verify empty or `> 1,000`-char inputs are rejected).
3. **Block / Unfriend Enforcement & Dark Theme Parity**:
   - Block User A from the drawer or `/profile/[id]` and confirm neither user can send messages, study cards, or friend requests until User C unblocks.
   - Toggle **Dark** mode in `AccountBubble` and verify `<TopUsersRail />`, `<AuraBadge />`, `<StudyShareMenu />`, and `<FriendsChatDrawer />` use crisp Neo-Brutalist Dark tokens (`#0B1120` / `#1E293B` / `#E2E8F0` / `#38BDF8`) with zero `backdrop-blur` and zero purple/violet/indigo hues.
