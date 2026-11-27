# Concept: Lightweight Socialization, Aura Leaderboard & Study Sharing

- **Slug**: socialization-feature
- **Created**: 2026-11-27T17:13:08+08:00
- **Recommended option**: Option B — Lightweight Social Layer Within the 8-Route Constitution Boundary (Aura Top Users Rail, External Share, Opt-In Profile Activity & In-Header Friends/Chat Drawer)

## Options

### Option A — Public Social Proof & External Sharing Only (Aura Rail + External Share + Opt-In Profile Activity)
- **Sketch**: Focuses strictly on public community discovery and external sharing without building a friend graph or private messaging. Adds a left-side **Top Users** rail on the main feed (`/`) ranked deterministically by **Aura** (a signature community reputation score earned from study discussion contributions and study interactions), linking to `/profile/[id]`. Enhances `/profile/[id]` with an opt-in privacy toggle (managed on `/profile`) so users can choose to display the studies they upvote/interact with and their recent study views alongside their public comments and **Aura** score. Adds a **Share** button on every study card and `/study/[id]` page for one-click sharing to external platforms (formatted study takeaway + SBL News attribution link + rich per-study preview cards).
- **Appetite**: small (days)
- **Trade-offs**: Wins on maximum simplicity, zero moderation/spam surface from private chat, and near-zero database storage/egress growth while fully respecting all six `constitution.md` principles. Sacrifices the user's explicit request for friend requests, user-to-user chat, and sending studies directly to friends inside the platform.
- **Rabbit holes**: Over-engineering the **Aura** formula with opaque weights instead of a transparent, deterministic formula that fits Constitution Principle II.

### Option B — Lightweight Social Layer Within the 8-Route Constitution Boundary (Aura Top Users Rail, External Share, Opt-In Profile Activity & In-Header Friends/Chat Drawer)
- **Sketch**: Delivers all five requested capabilities as a cohesive, lightweight social layer while staying 100% within the bounds of `constitution.md` (zero new routes beyond the 8 approved routes, ISR-preserved on `/`, Neo-Brutalist Sky Blue styling in Light and Dark themes, and strict free-tier egress protection):
  1. **Left-Side "Top Users" Rail Ranked by Aura**: On the left side of the main research feed (`/`), a Neo-Brutalist **Top Users** panel showcases top community members ranked deterministically by **Aura** (displayed in `JetBrains Mono`, e.g., `+140 AURA`). **Aura** is earned through constructive, verifiable research engagement (posting study comments, receiving community upvotes/reactions on comments, and sharing studies). Clicking any user opens `/profile/[id]`.
  2. **Public Profile Activity & View History (`/profile/[id]`)**: Public profiles display the user's **Aura** badge, role tag, bio, public comment history, and—governed by an explicit opt-in visibility toggle on `/profile` to respect Constitution Principle IV privacy rules—their interacted (upvoted) studies and a compact, capped list of recently viewed studies (e.g., last 10–20 unique studies viewed while signed in), plus an **Add Friend** button.
  3. **In-Header Friends & Study Chat Drawer (Preserving the 8-Route Boundary)**: Next to the top-right account bubble in the navigation bar, signed-in users get a compact Neo-Brutalist **Social / Inbox** button with an unread indicator. Clicking it opens an in-place popover/slide-over drawer (requiring no new page routes) with two tabs: **Friends** (search/add friends, accept/decline friend requests, or remove/block) and **Chat & Sent Studies** (lightweight 1:1 threads limited strictly to accepted friends, where users can exchange short messages and embedded study cards).
  4. **Send Study to Friend & Share Externally**: Every study card on `/` and study header on `/study/[id]` gains a compact **Share / Send** control offering both: (a) **Send to Friend** (picks an accepted friend and drops the study card directly into their 1:1 chat thread with an optional note) and (b) **Share Externally** (one-click Copy Citation + Link referencing SBL News, X/Twitter, Reddit, WhatsApp/Discord, and native Web Share, backed by per-study Open Graph preview cards showing the study title, journal, evidence badge, and SBL News branding).
- **Appetite**: medium (weeks)
- **Trade-offs**: Fulfills every part of the user's request—chat, friend requests, sending studies to each other, sharing studies to external platforms with SBL News attribution, and a left-side Top Users rail powered by **Aura** linking to profiles with interactions and viewed studies—while remaining strictly compliant with `constitution.md` Principles I–VI. Restricting 1:1 chat exclusively to mutual (accepted) friends keeps the chat lightweight, prevents cold-DM spam, and avoids competing with open social networks like Reddit. Sacrifices standalone full-screen messaging URLs (in favor of the header drawer to obey Principle V's 8-route cap) and open non-friend DMs.
- **Rabbit holes**:
  - Letting passive study view tracking bloat database storage or egress (must be bounded to signed-in users who opt in, deduplicated per study, and capped to a small rolling window such as the 20 most recent studies).
  - Building heavy real-time WebSocket presence/typing indicators that exhaust Supabase Free connection quotas (on-demand fetch on drawer open/action with lightweight refresh keeps egress and connections near zero).
  - Letting the left-side Top Users rail crowd the study feed on narrow screens (must collapse cleanly above or into a drawer on mobile/tablet while sitting on the left on desktop).

### Option C — Standalone Social Network Routes (`/messages`, `/friends`, `/leaderboard`) & Public Activity Feed
- **Sketch**: Builds dedicated full-page routes for direct messaging (`/messages`), friend management (`/friends`), and an expanded Aura leaderboard (`/leaderboard`), along with group chat rooms and a public social activity feed of everything users view and post.
- **Appetite**: large (months)
- **Trade-offs**: Replicates a full social media platform, but directly violates Constitution Principle V (Scoped Route Discipline — 8 Approved Routes), risks breaching Principle I & IV ($0/month Supabase Free 5 GB egress and 200 concurrent connection limits), and contradicts the user's explicit statement (*"I obviously dont want to compete with other platforms like reddit so I want something lightweight"*).
- **Rabbit holes**: Moderation queues for public social feeds and group chats, constitutional amendments for multiple new routes, and free-tier quota exhaustion.

## Recommendation

**Option B — Lightweight Social Layer Within the 8-Route Constitution Boundary** is recommended.

Why Option B best achieves the goals and metrics while staying strictly inside `constitution.md`:
1. **100% Constitution Compliance**:
   - *Principle I & IV ($0/Month Free-Tier, ISR & Egress Guardrails)*: The left-side **Top Users (by Aura)** rail on `/` uses a deterministic, summary-projected query that caches cleanly alongside the main feed's ISR (`revalidate = 3600`). Recent study views are deduplicated and capped (e.g., last 20 unique studies per opt-in user), and 1:1 friend chat uses lightweight on-demand queries with strict column projections (never `SELECT *`).
   - *Principle II (Scientific Integrity)*: The main feed (`/`) remains 100% peer-reviewed primary literature; **Aura** is computed deterministically from verifiable platform contributions rather than arbitrary LLM scoring.
   - *Principle III (Neo-Brutalist Sky Blue Design System)*: The left-side Top Users rail, `JetBrains Mono` **Aura** badges, Share popover, and Friends/Chat drawer all use `2px solid var(--color-border)`, hard offset shadows (`var(--shadow-card)` / `var(--shadow-control)`), `#38BDF8` Sky Blue accents, and full Light/Dark theme parity with zero purple hues.
   - *Principle V (Scoped Route Discipline)*: All new UI lives inside the 8 approved routes (`/` left rail, `/study/[id]` share/send actions & comment Aura/friend triggers, `/profile` privacy toggles & social lists, `/profile/[id]` public Aura + interactions/views + Add Friend button, and the global `TopNav` Friends & Chat drawer).
2. **Distinctive "Aura" Criteria for Top Users**:
   - Instead of generic "karma," **Aura** gives SBL News a memorable, community-native metric. A clean, deterministic formula for **Aura** can combine:
     - **Discussion contributions**: Posting non-deleted study analysis/comments (`+5 Aura` per comment) and receiving community helpful/upvote reactions on comments (`+10 Aura` per upvote received).
     - **Literature engagement & sharing**: Curating/upvoting studies (`+1 Aura`) and sharing studies with peers (`+2 Aura`, capped daily to prevent spam).
3. **Friend-Gated Study Chat & Sending**:
   - Requiring mutual friendship before users can chat or send studies directly inside the app makes friend requests meaningful, eliminates cold-DM abuse, and centers conversations around sharing and discussing studies.

## Out of Scope (for the recommended option)

- Any new page routes outside the 8 Constitution-approved routes (no `/messages`, `/chat`, `/friends`, or `/leaderboard` URLs).
- Competing with Reddit via user-submitted primary feed posts, public non-study forums, or algorithmic social timelines (Constitution Principle II).
- Unsolicited DMs from non-friends, group chat rooms, file/image attachments in chat, or typing/presence WebSockets that would strain Supabase Free quotas.
- Tracking passive study views for unauthenticated visitors or exposing a user's upvoted/viewed studies on `/profile/[id]` without their opt-in visibility consent.
- Paid third-party chat SDKs, push notification services, or external analytics trackers (Constitution Principle I).

## Assumptions to Validate

- **Deterministic Aura Formula**: Ranking Top Users by a deterministic **Aura** score derived from public study comments, comment endorsements/upvotes, and capped study interactions/shares matches the user's vision for "Top Users" criteria.
- **Opt-In Activity & View Visibility on `/profile/[id]`**: Allowing users to toggle whether their interacted (upvoted) studies and recent viewed studies (capped to e.g. last 20 unique studies) appear on `/profile/[id]` resolves the tension between the new request ("see what they interact and view") and `003-user-profiles` privacy rules.
- **Mutual-Friend 1:1 Chat & Study Sends**: Limiting chat and internal "Send Study" actions to accepted 1:1 friends inside a header drawer satisfies the "lightweight chat + friend requests + send studies to each other" requirement without needing heavy moderation tools.
- **Desktop Left Rail + Responsive Mobile Collapse on `/`**: Placing the **Top Users (Aura)** panel on the left side of the main feed on desktop viewports (`lg+`) and collapsing it cleanly on mobile viewports preserves the Hugging Face Daily Papers feed density required by Constitution Principle III.
