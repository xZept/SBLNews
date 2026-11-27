# Feature Specification: Lightweight Socialization, Aura Leaderboard & Study Sharing

**Feature Branch**: `004-socialization-layer`  
**Created**: 2026-11-28  
**Status**: Draft  
**Input**: User description: "Add the lightweight socialization layer (Option B): deterministic Aura scoring and left-side Top Users rail on /, external study sharing with SBL News Open Graph previews, opt-in interacted/viewed study visibility on /profile and /profile/[id], and an in-header Friends & 1:1 Study Chat drawer within the 8-route Constitution boundary. Use the handoff summary in .specify/assessments/socialization-feature/decision.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - External Study Sharing & Rich Preview Cards (Priority: P1)

Readers browsing the main research feed (`/`) or reading a study breakdown (`/study/[id]`) want to share specific peer-reviewed studies with training partners, clients, or external communities (such as X/Twitter, Reddit, WhatsApp, Discord, or via clipboard/native share). Every study card and study detail page provides a **Share / Send** menu that offers one-click external sharing options (including copying a formatted link and citation attributing SBL News) and generates rich, study-specific link previews when pasted into external platforms.

**Why this priority**: External sharing drives organic discovery and brings new readers back to SBL News with high-credibility, study-specific previews while requiring no account creation from recipients.

**Independent Test**: Open `/` or `/study/[id]` as any visitor, trigger **Share / Send**, copy the study link + citation, and verify the clipboard text includes the study title, SBL News attribution, and canonical `/study/[id]` URL; inspect the `/study/[id]` link preview metadata to confirm it renders the study title, journal, evidence badge summary, takeaway, and SBL News branding.

**Acceptance Scenarios**:

1. **Given** any visitor (signed in or signed out) on `/` or `/study/[id]`, **When** they activate the **Share / Send** action on a study, **Then** an accessible menu opens displaying external sharing options: **Copy Link + Citation**, **X / Twitter**, **Reddit**, **WhatsApp**, **Discord** (copy-ready formatted share), and native **Share** (when supported by the device).
2. **Given** a visitor selects **Copy Link + Citation**, **When** the action completes, **Then** the study's canonical `/study/[id]` URL and a concise citation referencing SBL News are copied to the clipboard with clear inline confirmation feedback.
3. **Given** an external platform or social network fetches a `/study/[id]` URL to render a link preview, **When** the page metadata is read, **Then** it provides study-specific preview metadata containing the study title, journal/year, evidence classification, concise takeaway, and SBL News attribution (without leaking private user data).
4. **Given** a signed-out visitor opens the **Share / Send** menu, **When** viewing the internal **Send to Friend** section, **Then** they see a clear prompt to sign in to send studies directly to friends on SBL News, while all external share options remain immediately usable.

---

### User Story 2 - Deterministic Aura Scoring & Left-Side Top Users Rail (Priority: P1)

Readers visiting the main research feed (`/`) see a left-side **Top Users** rail highlighting the community's most active, helpful contributors ranked by **Aura**—a deterministic reputation score earned from verifiable community contributions. Each contributor's **Aura** badge also appears on their `/profile`, `/profile/[id]`, and study discussion headers. Clicking any user in the **Top Users** rail navigates directly to their public profile at `/profile/[id]`.

**Why this priority**: Showcases knowledgeable lifters, coaches, and researchers directly on `/` without altering the primary peer-reviewed literature feed, motivating thoughtful discussion and study sharing.

**Independent Test**: Record qualifying community actions (posting non-deleted study comments, receiving helpful/upvote endorsements on comments, upvoting studies, and sharing studies) for test users; verify their **Aura** scores update deterministically with anti-gaming daily caps, appear in ranked order in the left-side **Top Users** rail on `/` (collapsing cleanly on mobile viewports), display on `/profile`, `/profile/[id]`, and discussion headers, and link to `/profile/[id]`.

**Acceptance Scenarios**:

1. **Given** a visitor opens `/` on a desktop viewport, **When** the feed renders, **Then** a Neo-Brutalist **Top Users** panel appears on the left side of the feed listing top contributors ranked by **Aura** (showing avatar or 2-letter initials, display name, optional role tag, and `Aura` score badge), while preserving the primary study feed's readable line measure and zero marketing hero banner.
2. **Given** a visitor opens `/` on a mobile or narrow viewport, **When** the feed renders, **Then** the **Top Users** rail collapses cleanly into a compact, expandable or horizontal strip above/beside the feed without crowding study cards or causing horizontal overflow.
3. **Given** a user performs qualifying community contributions (non-deleted comments, receiving helpful endorsements on comments, study upvotes, or study shares), **When** their **Aura** is computed, **Then** the score is calculated deterministically using fixed weights and daily per-action caps so automated or repetitive actions cannot infinitely farm Aura.
4. **Given** a visitor clicks any contributor in the **Top Users** rail, **When** navigation completes, **Then** they land on that user's `/profile/[id]` page displaying their public profile and **Aura** score.
5. **Given** a user's comment is deleted or an endorsement/upvote is removed, **When** **Aura** is recalculated, **Then** the corresponding Aura points are removed deterministically so Aura always reflects current valid contributions.

---

### User Story 3 - Opt-In Interacted & Recently Viewed Studies on Profiles (Priority: P2)

Signed-in users on `/profile` can control whether their **Interacted (Upvoted) Studies** and **Recently Viewed Studies** are visible to others on their public `/profile/[id]` page, choosing between `Private` (default, preserving backward privacy), `Friends Only`, or `Public`. Users can also see their own **Recently Viewed Studies** (capped to the 20 most recent distinct studies viewed while opted in) on `/profile` alongside their upvoted studies and comment history.

**Why this priority**: Lets engaged readers showcase the research they endorse or read to friends and the wider community without violating the strict default-private upvote guarantees established in `003-user-profiles`.

**Independent Test**: Sign in as User A with default settings (`Private`), upvote a study and view `/study/[id]`; verify User B (non-friend) and User C (accepted friend) cannot see User A's upvoted or recently viewed studies on `/profile/[id]`. Switch User A's visibility to `Friends Only` and verify only User C sees them; switch to `Public` and verify any visitor sees them.

**Acceptance Scenarios**:

1. **Given** a newly registered or existing user who has not opted in, **When** anyone else visits their `/profile/[id]`, **Then** their **Upvoted Studies** and **Recently Viewed Studies** remain strictly hidden (`Private` by default).
2. **Given** a signed-in user on `/profile`, **When** they configure visibility toggles for **Interacted (Upvoted) Studies** and **Recently Viewed Studies** (`Private`, `Friends Only`, or `Public`) and save, **Then** the preferences persist and immediately govern what visitors see on `/profile/[id]`.
3. **Given** a signed-in user has opted in to displaying **Recently Viewed Studies** (`Friends Only` or `Public`), **When** they open `/study/[id]` multiple times for the same study and across more than 20 studies, **Then** the list deduplicates repeated views of the same study (updating its last-viewed timestamp) and retains only the 20 most recent distinct studies.
4. **Given** an unauthenticated visitor browses `/study/[id]`, **When** they view studies, **Then** no view history is recorded for unauthenticated visitors.
5. **Given** User A has set **Interacted Studies** or **Recently Viewed Studies** to `Friends Only`, **When** User B (not an accepted friend) requests `/profile/[id]`, **Then** those sections and their underlying data are completely omitted from both the rendered page and data payload; when User C (an accepted friend) visits `/profile/[id]`, those sections are displayed.

---

### User Story 4 - Friend Connections & In-Header Friends / 1:1 Study Chat Drawer (Priority: P2)

Signed-in users can connect with peers by searching display names in an in-header **Friends & Chat** slide-over drawer (accessible from a compact icon button beside the top-right account bubble on any of the 8 existing routes) or via the **Add Friend** control on `/profile/[id]`. Once two users are mutual accepted friends, they can exchange 1:1 plain-text messages and send embedded study cards directly from any study's **Share / Send** menu—all inside the drawer without adding any new URL routes.

**Why this priority**: Enables training partners, coaches, and lifters to discuss studies 1:1 directly on SBL News while blocking cold-DM spam via mutual-friend gating and respecting the 8-route Constitution boundary.

**Independent Test**: Sign in as User A and User B; User A searches for User B in the header **Friends & Chat** drawer (or visits User B's `/profile/[id]`) and sends a friend request; User B sees the unread/pending indicator on the header button, accepts the request, receives an embedded study card sent from `/` via **Share / Send -> Send to Friend**, and replies with a 1:1 message inside the drawer. Then test blocking User A and confirm messages and study sends are immediately prevented.

**Acceptance Scenarios**:

1. **Given** a signed-in user on any of the 8 approved routes, **When** they click the **Friends & Chat** icon button in the top navigation bar, **Then** an accessible slide-over drawer opens with **Friends** and **Chat** tabs without navigating away from the current page or introducing a new route.
2. **Given** a signed-in user in the **Friends** tab of the drawer (or viewing another user's `/profile/[id]`), **When** they search by display name or click **Add Friend**, **Then** a pending friend request is sent; the recipient can **Accept** or **Decline** the request from their drawer or the requester's `/profile/[id]`.
3. **Given** two users are NOT mutual accepted friends, **When** either attempts to send a direct message or send a study card to the other, **Then** the system blocks the action (preventing cold-DM spam).
4. **Given** two users ARE mutual accepted friends, **When** one clicks **Share / Send -> Send to Friend** on any study card on `/` or on `/study/[id]`, selects the friend, and optionally adds a short note, **Then** an embedded study card (title, journal, evidence badge, link to `/study/[id]`, and optional note) is posted into their 1:1 chat thread and increments the recipient's unread indicator.
5. **Given** a signed-in user has unread friend requests or unread 1:1 messages, **When** viewing the top navigation bar, **Then** the **Friends & Chat** button displays an unread badge count; opening the conversation marks those messages as read.
6. **Given** a signed-in user clicks **Unfriend** or **Block** on a friend (from the drawer or `/profile/[id]`), **When** confirmed, **Then** the friendship is removed (and if blocked, neither user can send future friend requests, messages, or study cards to the other).

---

### Edge Cases

- What happens when a user attempts to send a friend request to themselves, a user who has already sent them a pending request, or a user who has blocked them? Self-requests are disallowed; if an incoming request already exists from that user, the UI surfaces **Accept / Decline** instead of creating a duplicate; blocked relationships silently prevent new requests.
- What happens when a user submits an empty, whitespace-only, or overly long chat message or study-share note? Validation rejects empty messages and enforces strict character limits (`1,000` characters for plain-text chat messages, `240` characters for optional study-share notes) with inline feedback.
- What happens when a user opts out of **Recently Viewed Studies** (switches back to `Private`)? New study views stop being recorded, their recently viewed list is immediately hidden from `/profile/[id]`, and users can also clear their saved recent-view history from `/profile`.
- What happens when a study referenced in a chat thread or recent-view list is later unpublished or removed? The thread or list handles missing/unpublished study references gracefully with a clean placeholder rather than breaking the drawer or profile page.
- What happens when a user with Dark Theme active opens the **Friends & Chat** drawer, **Share / Send** popover, or **Top Users** rail? All surfaces, borders, hard offset shadows, badges, and text contrast render cleanly in both default Light Mode and opt-in Dark Mode without purple/violet/indigo hues or blur effects.
- What happens when an unauthenticated visitor clicks **Add Friend** on `/profile/[id]`? They are prompted to sign in before sending a friend request.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST compute a deterministic **Aura** reputation score for every registered user from verifiable community contributions (non-deleted study comments, helpful/upvote endorsements on comments, study upvotes, and recorded study shares) using fixed point weights and daily per-action anti-gaming caps.
- **FR-002**: System MUST render a left-side **Top Users** rail on `/` (desktop viewports, collapsing cleanly on mobile viewports) displaying the top contributors ranked by **Aura** (avatar or 2-letter initials, display name, optional role tag, and `Aura` badge), with each entry linking to `/profile/[id]`, cached alongside the main feed without degrading feed load speed.
- **FR-003**: System MUST display each user's **Aura** badge on `/profile`, `/profile/[id]`, and study discussion author headers on `/study/[id]`.
- **FR-004**: System MUST add a **Share / Send** action to every study card on `/` and on `/study/[id]` offering: (a) external sharing via **Copy Link + Citation** (attributing SBL News), **X / Twitter**, **Reddit**, **WhatsApp**, **Discord** (copy-formatted), and native **Web Share** when supported, and (b) **Send to Friend** for signed-in users with accepted friends.
- **FR-005**: System MUST generate per-study Open Graph and Twitter card metadata on `/study/[id]` displaying the study title, journal/year, evidence classification, concise takeaway, and SBL News attribution.
- **FR-006**: System MUST provide privacy visibility controls on `/profile` for **Interacted (Upvoted) Studies** and **Recently Viewed Studies**, each supporting `Private` (default), `Friends Only`, and `Public`, plus an action to clear saved recently viewed studies.
- **FR-007**: System MUST record **Recently Viewed Studies** only for signed-in users who have opted in (`Friends Only` or `Public`), deduplicating repeated views of the same study and capping stored history to the 20 most recent distinct studies per user.
- **FR-008**: System MUST enforce profile activity visibility on `/profile/[id]` at the data-access boundary so `Private` activity is never returned to other users and `Friends Only` activity is returned exclusively to mutual accepted friends.
- **FR-009**: System MUST add a compact **Friends & Chat** icon button with an unread indicator beside the top-right account bubble in the global header, opening an accessible slide-over drawer across any of the 8 approved routes without adding any new URL routes.
- **FR-010**: Inside the **Friends & Chat** drawer (and via **Add Friend** / **Request Pending** / **Friends** / **Unfriend** / **Block** controls on `/profile/[id]`), signed-in users MUST be able to search users by display name, send/accept/decline/cancel friend requests, unfriend, and block/unblock users.
- **FR-011**: System MUST restrict 1:1 chat messages and **Send to Friend** study cards strictly to mutual accepted friends (rejecting non-friend or blocked-user attempts), supporting plain-text messages and embedded study cards fetched on demand with explicit summary column projections (never fetching full study abstracts, full texts, or embedding vectors).
- **FR-012**: System MUST validate all social, profile-visibility, friend-request, and chat inputs at system boundaries and enforce ownership and friendship-scoped access control on all reads and mutations.
- **FR-013**: All new UI components (**Top Users** rail, **Aura** badges, **Share / Send** menu, **Friends & Chat** drawer, profile visibility controls, and friend action buttons) MUST adhere strictly to the Neo-Brutalist Sky Blue design system in both Light and Dark themes (2px structural borders, zero-blur hard offset shadows, `rounded-md`/`rounded-sm` max radii, Sky Blue primary accent, `Space Grotesk` / `Inter` / `JetBrains Mono` typography, and zero purple/violet/indigo hues).

### Key Entities

- **User Aura Score**: Deterministic reputation summary for a user derived from non-deleted comments, comment endorsements, study upvotes, and study shares subject to daily caps. Key attributes: user identifier, total Aura score, and last-computed timestamp.
- **Profile Activity Visibility**: User-configured privacy settings on User Profile controlling public/friend access to **Interacted (Upvoted) Studies** and **Recently Viewed Studies** (`private` default, `friends`, or `public`).
- **Recent Study View**: Deduplicated record of a signed-in, opted-in user viewing a study detail page, capped to the 20 most recent distinct studies per user. Key attributes: user identifier, study identifier, and last-viewed timestamp.
- **Friendship**: Symmetric or directional connection state between two users. Key attributes: requester identifier, addressee identifier, status (`pending`, `accepted`, `blocked`), and timestamps.
- **Direct Message**: A 1:1 message between two mutual accepted friends inside a conversation thread. Key attributes: sender identifier, recipient identifier, optional plain-text body, optional attached study identifier (for embedded study cards), read timestamp, and creation timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Any visitor can share a study externally (copy link + citation or launch a social share target) in 2 clicks or fewer from `/` or `/study/[id]`, and external link unfurls on `/study/[id]` display study-specific title, evidence badge, takeaway, and SBL News attribution.
- **SC-002**: Desktop visitors on `/` see the ranked **Top Users (Aura)** rail on the left without horizontal overflow or degradation to the main feed's `65ch–75ch` readability or ISR load performance (`revalidate = 3600`, `< 2 KB` extra payload, zero cold-start blocking), and clicking any ranked user opens their `/profile/[id]` in 1 click.
- **SC-003**: 100% of **Aura** score updates are deterministic and repeatable from underlying contribution records, with daily anti-gaming caps preventing single-day score inflation.
- **SC-004**: 0 private or `Friends Only` upvoted/viewed studies are exposed on `/profile/[id]` to unauthenticated visitors or non-friends, and stored recent-view history never exceeds 20 distinct studies per user.
- **SC-005**: Signed-in mutual friends can send a study card or 1:1 message inside the global header drawer from any of the 8 approved routes in 3 clicks or fewer, while 100% of non-friend or blocked-user message attempts are rejected.
- **SC-006**: The application remains strictly within the 8 approved routes, free-tier bandwidth/storage budgets, and passes all automated type, lint, and Light/Dark design-system checks.

## Assumptions

- **Aura Formula Weights & Daily Caps**: Deterministic UTC daily weights award points for verifiable contributions: `+5` per non-deleted study comment capped at `25`/day, `+2` per helpful endorsement received on a comment capped at `20`/day, `+1` per study upvote capped at `10`/day, and `+2` per recorded study share capped at `10`/day, documented transparently in `/methodology`.
- **Three-State Activity Visibility**: Offering `Private` (default), `Friends Only`, and `Public` for both **Interacted (Upvoted) Studies** and **Recently Viewed Studies** preserves `003-user-profiles` backward privacy while giving users granular control with their new friend network.
- **On-Demand Chat Fetching (No Presence WebSockets)**: Inside the **Friends & Chat** drawer, threads and unread counts are fetched on demand (on drawer open, send, or explicit refresh / lightweight polling while the drawer is open) rather than maintaining persistent background WebSocket connections, keeping free-tier connection and egress usage minimal.
- **Text & Study Card Messages Only**: 1:1 chat supports plain-text messages and embedded study cards; image/file attachments, voice notes, and group chat rooms are out of scope.
- **Desktop Rail Geometry**: On `/` desktop viewports, the left-side **Top Users** rail sits cleanly alongside the main study feed within a balanced responsive container so study card takeaways maintain their `65ch–75ch` readable line measure.
