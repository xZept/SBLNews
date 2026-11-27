# Decision: Lightweight Socialization, Aura Leaderboard & Study Sharing

- **Slug**: socialization-feature
- **Decided**: 2026-11-27T17:32:10+08:00
- **Verdict**: go
- **Artifacts reviewed**: intake.md, research.md, problem.md, concept.md

## Scorecard

| Criterion | Rating | Justification |
|-----------|--------|---------------|
| Problem validity | strong | Codebase inspection confirms zero external share actions or per-study Open Graph previews on `StudyCard` and `/study/[id]`, no main-feed visibility for active contributors, and no peer-to-peer study sharing or connection mechanism beyond isolated study threads. |
| Evidence strength | adequate | High-confidence repository evidence (`study-card.tsx`, `study/[id]/page.tsx`, `layout.tsx`, `003-user-profiles`, `constitution.md`) grounds every architectural and privacy constraint, though pre-launch user demand split between chat and sharing rests on stated owner intent rather than production telemetry. |
| Value vs. inaction | strong | Delivers viral site-attributed external sharing, showcases knowledgeable domain contributors via a memorable **Aura** score on `/`, and lets training partners and coaches exchange studies directly without leaving SBL News. |
| Feasibility / appetite | adequate | Option B fits a bounded `medium` (weeks) appetite by extending `003-user-profiles` (`public.profiles`, `/profile`, `/profile/[id]`) and housing friends, study sends, and 1:1 chat in a global header drawer with on-demand queries. |
| Strategic fit | strong | Stays 100% within `constitution.md` Principles I–VI: $0/month free-tier & `/` ISR preserved, primary literature untouched on `/`, deterministic **Aura** calculation, Neo-Brutalist Sky Blue Light/Dark parity, opt-in RLS privacy + strict column projections, and zero routes added beyond the 8 approved routes. |
| Risk posture | strong | Major risks (Supabase Free egress/storage bloat from view tracking, `003-user-profiles` upvote privacy conflict, cold-DM spam, and feed layout crowding) are mitigated via opt-in profile visibility toggles, capped/deduplicated recent study views, mutual-friend gating on 1:1 chat/study-sends, and responsive desktop-left / mobile-collapsible layout geometry. |

## Verdict & Rationale

**Verdict: `go`**. Problem validity (`strong`), strategic fit (`strong`), value vs. inaction (`strong`), and risk posture (`strong`) are backed by `adequate`+ evidence strength and a clearly bounded `medium`-appetite concept (**Option B**, explicitly confirmed by the project owner). Framing community reputation as **Aura**, gating 1:1 chat and internal study sends behind mutual friendship inside a header drawer, and making profile interaction/view history opt-in achieves recognizable, standout socialization without competing with Reddit or breaching any guardrail in `constitution.md`.

## If needs-clarification

- N/A (Verdict is `go`; remaining detail choices are carried forward to `/speckit-specify` and `/speckit-clarify` with concrete defaults.)

## If go — Handoff to `/speckit-specify`

- **Problem**: SBL News readers and contributors currently have no way to discover top community members from the main feed, share or discuss studies directly with peers on the platform, or share studies externally with rich site-attributed previews, leaving engagement siloed inside individual study comment threads.
- **Chosen approach**: **Option B — Lightweight Social Layer Within the 8-Route Constitution Boundary (Aura Top Users Rail, External Share, Opt-In Profile Activity & In-Header Friends/Chat Drawer)**:
  1. **Left-Side "Top Users" Rail Ranked by Aura (`/`)**:
     - Render a Neo-Brutalist **Top Users** panel on the left side of the main research feed (`/` on desktop viewports, collapsing cleanly on mobile) ranked deterministically by **Aura** (`JetBrains Mono` badge, e.g., `140 AURA`) and cached cleanly alongside `/` ISR (`revalidate = 3600`).
     - Compute **Aura** deterministically in SQL/code (Principle II) from verifiable community contributions (e.g., non-deleted study comments posted, helpful/upvote endorsements on comments, and study curation/sharing with anti-spam caps).
     - Clicking any user in the rail navigates to `/profile/[id]`.
  2. **Profile Aura, Opt-In Interactions & Recent Study Views (`/profile` & `/profile/[id]`)**:
     - Display **Aura** on `/profile`, `/profile/[id]`, and study discussion author headers.
     - Add privacy/visibility controls on `/profile` allowing users to opt in to displaying their **Interacted (Upvoted) Studies** and **Recently Viewed Studies** (deduplicated per study and capped to a small rolling window, e.g., the 20 most recent studies viewed while opted in) on `/profile/[id]`, reconciling the new feature with `003-user-profiles` privacy rules and Constitution Principle IV.
     - Include friend-connection controls (**Add Friend** / **Request Pending** / **Friends** / **Block**) on `/profile/[id]`.
  3. **In-Header Friends & Study Chat Drawer (`TopNav`, Zero New Routes)**:
     - Add a compact Neo-Brutalist **Friends / Chat** icon button with unread badge beside the top-right `AccountBubble` in `TopNav`, opening an accessible slide-over drawer across any of the 8 existing routes (obeying Principle V).
     - **Friends tab**: Search users by display name, send/accept/decline friend requests, view accepted friends, and unfriend or block users.
     - **Chat & Sent Studies tab**: Lightweight 1:1 threads restricted strictly to accepted friends (preventing cold-DM spam), supporting plain-text messages and rich embedded study cards sent directly from feed/study pages, fetched on demand with summary column projections (no `SELECT *`, no heavy WebSocket presence).
  4. **Send Study to Friend & External Platform Sharing (`StudyCard` & `/study/[id]`)**:
     - Add a **Share / Send** action on every `StudyCard` and `/study/[id]` breakdown offering:
       - **Send to Friend**: Select an accepted friend (with optional short note) to post an embedded study card into their 1:1 chat thread.
       - **Share Externally**: One-click **Copy Link + Citation** (referencing SBL News), **X / Twitter**, **Reddit**, **WhatsApp / Discord**, and native **Web Share API**, paired with dynamic `generateMetadata` Open Graph / Twitter preview cards on `/study/[id]` showcasing the study's title, journal, evidence badge, takeaway, and SBL News attribution.
- **In scope / out of scope**:
  - *In scope*: Deterministic **Aura** scoring + badges; left-side **Top Users** rail on `/`; opt-in visibility on `/profile` & `/profile/[id]` for upvoted and capped recently viewed studies; friend requests + block/unfriend; global header Friends & 1:1 Chat drawer with embedded study sends; external study sharing menu + per-study Open Graph metadata on `/study/[id]`; full Neo-Brutalist Sky Blue Light/Dark theme compliance (`constitution.md` Principle III) and sequential Supabase SQL migrations + RLS + Zod validation (`constitution.md` Principles I, IV, VI).
  - *Out of scope*: Any new URL routes beyond the 8 Constitution-approved routes; user-submitted primary feed posts or Reddit-style general forums; non-friend cold DMs, group chat rooms, media/file uploads in chat, or typing/online-presence WebSockets; tracking views for signed-out visitors or exposing upvoted/viewed studies without user opt-in; paid third-party messaging or analytics services.
- **Success metrics**:
  - External study share clicks and rich per-study Open Graph previews rendered on `/study/[id]` links.
  - Click-through engagement from the `/` left-side **Top Users (Aura)** rail to `/profile/[id]`.
  - Friend connections accepted, studies sent to friends, and 1:1 friend messages exchanged.
  - 100% adherence to `constitution.md`: `/` ISR preserved, <= 5 GB monthly Supabase egress, 0 unapproved routes, 0 unauthorized exposures of non-opted-in profile activity, and clean `tsc --noEmit`, lint, and test gates.
- **Carried-forward open questions**:
  - Exact point weights and daily anti-gaming caps for the deterministic **Aura** formula (e.g., whether comment upvotes/helpful reactions should be added alongside posted comments, study upvotes, and study shares).
  - Whether the opt-in visibility setting on `/profile` for interacted/upvoted and recently viewed studies should offer `Private` vs. `Public` only, or `Private` / `Friends Only` / `Public` (defaulting to `Private` to preserve backward privacy compatibility with `003-user-profiles`).
  - Exact desktop grid proportions for the left-side **Top Users** rail alongside the main study feed on `/` (e.g., widening the `/` container slightly or two-column grid inside `max-w-6xl` while preserving `65ch–75ch` study card takeaway readability).
