# Feature Specification: User Profiles, Account Menu Bubble & Public Commenter Views

**Feature Branch**: `003-user-profiles`  
**Created**: 2026-11-26  
**Status**: Draft  
**Input**: User description: "Add user profiles, top-right account menu bubble (Profile, Theme, Sign out), dedicated /profile settings & activity page, and /profile/[id] public commenter profile views (Option C). Use the handoff summary in .specify/assessments/user-profiles/decision.md"

## Clarifications

### Session 2026-11-27

- Q: How should upvoted studies and comment history lists be bounded on `/profile` and `/profile/[id]`? → A: Paginate with 20 items per page and a "Load more" button.
- Q: When a signed-in user with Dark Theme enabled clicks Sign out, what should happen to the active theme? → A: Revert to Light Theme on sign-out, while keeping Dark saved on their profile for next sign-in.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Top-Right Account Menu Bubble & Theme Toggle (Priority: P1)

Signed-in users see a compact avatar button in the top-right navigation bar showing their custom profile photo or, by default, a 2-letter initials badge derived from their display name. Activating this button opens a popover menu bubble displaying their identity summary (avatar/initials, display name, connected email, and account role badge), a **Profile** link to `/profile`, an inline **Theme** switch (`Light` / `Dark`, defaulting to `Light`), a conditional **Admin Review Queue** link for administrators, and **Sign out**.

**Why this priority**: Declutters the top navigation bar across every page, gives signed-in users immediate access to their identity, theme preference, and sign-out action, and serves as the entry point to the `/profile` route.

**Independent Test**: Sign in as a standard member and as an administrator; verify the top-right avatar button displays 2-letter initials by default, opens the popover bubble with all expected items (and hides Admin Review Queue for non-admins), toggles between Light and Dark themes immediately across pages without flash, and signs the user out cleanly.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor on any public page, **When** the page loads, **Then** the interface renders in Light Mode by default and displays the standard Sign In control without an account bubble.
2. **Given** a signed-in user with no custom profile photo, **When** viewing the top navigation bar on any route, **Then** the top-right trigger displays a 2-letter initials badge derived from their display name instead of raw text metadata and a standalone sign-out button.
3. **Given** a signed-in user activates the top-right avatar button, **When** the account menu bubble opens, **Then** it displays their avatar/initials, display name, connected email, account role badge (`Member` or `Admin`), a **Profile** link to `/profile`, an inline **Theme** switch (`Light` / `Dark`), an **Admin Review Queue** link (only if the user is an administrator), and **Sign out**.
4. **Given** a signed-in user toggles **Theme** from `Light` to `Dark` in the account bubble, **When** the toggle is activated, **Then** the entire application immediately switches to the high-contrast Dark Theme, persists the preference across page reloads and cached public routes without a flash of incorrect theme, and saves the preference to the user's profile.
5. **Given** a signed-in user with Dark Theme active clicks **Sign out** in the account bubble, **When** sign-out completes, **Then** the user session ends, the header returns to the signed-out state, and the browser reverts to Light Theme while keeping Dark Theme saved on the user's profile for their next sign-in.

---

### User Story 2 - Dedicated Profile Settings & Activity Page (`/profile`) (Priority: P1)

Signed-in users navigate to `/profile` (via the **Profile** link in the account menu bubble) to customize their public community identity, manage their theme preference, view read-only account details, and review their own upvoted studies and comment history.

**Why this priority**: Core value of the feature—empowers users to control how they appear in study discussions (photo, display name, lifting/research role tag, short bio) and provides a personal hub for their contributions and saved upvotes.

**Independent Test**: Sign in, navigate to `/profile`, update display name, select a training/professional role tag, enter a short bio, upload a photo (and later remove it), switch theme, and verify all changes persist across reloads and appear in the header bubble and study discussions. Also verify that upvoted studies and posted comments appear in the activity tabs/sections.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor navigates directly to `/profile`, **When** the page is requested, **Then** the system blocks access to private settings and redirects or prompts the visitor to sign in.
2. **Given** a signed-in user on `/profile`, **When** they edit their **Display Name** (2–50 characters), select an optional **Training / Professional Role Tag** (`Lifter`, `Strength Coach`, `Exercise Researcher`, `Clinician`, `Student`, or none), enter an optional **Short Bio / Credentials** (up to 160 characters), and save, **Then** the changes are validated, persisted, and immediately reflected in the account bubble and study discussion comments.
3. **Given** a signed-in user uploads an image file for their **Profile Photo** on `/profile`, **When** the image is selected, **Then** it is automatically center-cropped and downscaled to a compact square thumbnail (at most 256×256 pixels and <= 200 KB) before upload, stored and persisted immediately with inline status feedback (independent of the profile details Save button), and displayed in the header bubble, `/profile`, `/profile/[id]`, and study comments.
4. **Given** a signed-in user with a custom profile photo clicks **Remove Photo** on `/profile`, **When** the removal action completes, **Then** the custom photo is immediately deleted from storage and cleared from their profile (with inline status feedback) and their avatar reverts to their 2-letter name initials badge everywhere.
5. **Given** a signed-in user views the activity section on `/profile`, **When** they have upvoted studies or posted comments, **Then** `/profile` lists their upvoted studies (with links to each study) and their comment history (with study title, excerpt, date, and link to the study).
6. **Given** a signed-in user views `/profile`, **When** inspecting account metadata, **Then** their connected email and system role (`Member` or `Admin`) are displayed as read-only fields, alongside a link to preview their public profile at `/profile/[id]`.

---

### User Story 3 - Public Commenter Profile Views (`/profile/[id]`) & Discussion Attribution (Priority: P2)

Readers on `/study/[id]` see each commenter's avatar (or 2-letter initials badge), display name, and optional training/professional role tag beside their comment. Clicking any commenter's avatar or name navigates to `/profile/[id]`, a read-only public profile page showing their public identity, bio/credentials, and public comment history—without exposing private account details.

**Why this priority**: Gives readers domain context about who is commenting on a study (e.g., whether a commenter is a lifter, coach, or researcher) and lets anyone inspect a contributor's public discussion history while strictly protecting user privacy.

**Independent Test**: Post a comment as a user with a customized display name, avatar/initials, role tag, and bio; open `/study/[id]` as an unauthenticated visitor, verify the comment displays the author's avatar/initials, display name, and role tag, click the author to open `/profile/[id]`, and confirm only public fields and public comments are visible (no email, no theme setting, no upvoted studies list).

**Acceptance Scenarios**:

1. **Given** any visitor (signed in or signed out) reads comments on `/study/[id]`, **When** comments render, **Then** each comment displays the author's avatar (or 2-letter initials badge), display name, and optional training/professional role tag, and clicking the author's avatar or name navigates to `/profile/[id]`.
2. **Given** any visitor opens `/profile/[id]` for an existing user, **When** the page loads, **Then** it displays only public profile information (avatar or initials badge, display name, optional role tag, optional short bio/credentials, and public comment history with links to the corresponding studies).
3. **Given** any visitor (including another signed-in user) inspects `/profile/[id]`, **When** viewing the page or its network payload, **Then** private account fields (connected email address, theme preference, internal role flags, and upvoted studies list) are never exposed.
4. **Given** a visitor navigates to `/profile/[id]` with an unknown or invalid user identifier, **When** the page loads, **Then** a clear "Profile not found" state is displayed with a link back to the main feed.

---

### Edge Cases

- What happens when a user enters a display name shorter than 2 characters, longer than 50 characters, or containing only whitespace? Validation rejects the submission with a clear inline error message and preserves unsaved form input.
- What happens when a user enters a bio longer than 160 characters? Character counter indicates the limit and validation prevents saving until within 160 characters.
- What happens when a user uploads an unsupported file type (e.g., PDF, SVG, or executable) or a corrupted image? The upload control rejects non-raster-image files immediately with a clear error message and leaves the existing avatar unchanged.
- What happens when a user's display name is a single word (e.g., "Alex") or contains extra spaces/punctuation? Initials fallback gracefully derives up to 2 uppercase characters (e.g., "AL" for single-word names or first+last word initials for multi-word names).
- What happens when a signed-in user opens a cached public page (`/`, `/guidelines`) after selecting Dark Theme? The page renders in Dark Theme immediately without a visible flash of Light Theme.
- What happens when a user who has never posted comments or upvoted studies visits `/profile`, or when a visitor opens `/profile/[id]` for a user with zero comments? Empty states are rendered cleanly with helpful copy.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace the header's raw signed-in user text and standalone sign-out button with a compact top-right avatar button that renders the user's custom profile photo when set, or a 2-letter initials badge derived from their display name by default.
- **FR-002**: Activating the top-right avatar button MUST open an accessible popover account menu bubble containing: (a) identity summary (avatar/initials, display name, connected email, and `Member`/`Admin` role badge), (b) **Profile** link to `/profile`, (c) inline **Theme** toggle (`Light` / `Dark`), (d) **Admin Review Queue** link to `/admin/review` visible exclusively to administrators, and (e) **Sign out** action.
- **FR-003**: System MUST provide an authenticated `/profile` route where signed-in users can view and edit their **Display Name** (required, 2–50 characters), **Profile Photo** (upload, replace, or remove to revert to initials), **Training / Professional Role Tag** (optional: `Lifter`, `Strength Coach`, `Exercise Researcher`, `Clinician`, `Student`, or none), **Short Bio / Credentials** (optional, up to 160 characters), and **Theme Preference** (`Light` or `Dark`).
- **FR-004**: System MUST display the signed-in user's connected email and system role (`Member` / `Admin`) as read-only fields on `/profile`, along with a direct link to view their public profile at `/profile/[id]`.
- **FR-005**: System MUST display the signed-in user's personal **Upvoted Studies** and **Comment History** on `/profile`, ordered most recent first and paginated at 20 items per page with a "Load more" control, each item linking to the corresponding `/study/[id]` page.
- **FR-006**: System MUST automatically center-crop and downscale user-uploaded profile photos client-side to a compact square thumbnail (at most 256×256 pixels and <= 200 KB) before upload, and enforce storage size (<= 500 KB) and image MIME-type restrictions so only the owning user can upload, replace, or delete their own avatar files.
- **FR-007**: System MUST provide a read-only public `/profile/[id]` route displaying only public profile fields (avatar or 2-letter initials, display name, optional role tag, optional short bio/credentials) and the user's public comment history ordered most recent first and paginated at 20 items per page with a "Load more" control, linking to the respective studies.
- **FR-008**: System MUST strictly exclude private user data (connected email, theme preference, account role flags, and upvoted studies list) from `/profile/[id]` responses and views.
- **FR-009**: Study discussion threads on `/study/[id]` MUST render each commenter's avatar (or 2-letter initials badge), display name, and optional training/professional role tag, with clickable links to `/profile/[id]`.
- **FR-010**: System MUST default to Light Mode for all new and unauthenticated visitors, while supporting an opt-in high-contrast Dark Theme for users who select `Dark`, persisted both locally (to prevent flash of incorrect theme on cached pages) and in the user's profile record; signing out MUST revert the active browser theme to Light Mode while preserving the user's saved preference on their profile for subsequent sign-ins.
- **FR-011**: System MUST validate all profile inputs at system boundaries, project only required columns on profile and activity queries (never fetching full study abstracts, full texts, or embedding vectors for profile lists), and enforce ownership-scoped access control on profile updates and avatar storage.
- **FR-012**: All new UI components (account bubble, `/profile`, `/profile/[id]`, discussion author badges, and dark theme surfaces) MUST adhere to the Neo-Brutalist Sky Blue design system in both Light and Dark themes (high-contrast borders, zero-blur hard offset shadows, Sky Blue primary accent, no purple/violet/indigo hues, and compliant badge contrast).

### Key Entities

- **User Profile**: Represents a registered user's identity and preferences. Key attributes: unique user identifier, display name (2–50 chars), optional avatar thumbnail reference (null by default on signup), optional training/professional role tag (`Lifter`, `Strength Coach`, `Exercise Researcher`, `Clinician`, `Student`), optional short bio/credentials (max 160 chars), theme preference (`light` default or `dark`), system role (`member` or `admin`), and creation timestamp.
- **Public Comment Attribution**: Projection of User Profile exposed in discussion threads and `/profile/[id]`, restricted strictly to user identifier, display name, avatar reference, role tag, and bio.
- **Profile Activity Summary**: Authenticated user's personal list of upvoted studies (study ID, title, journal, publication year, vote date) and posted comments (comment ID, study ID, study title, body excerpt, creation date).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Signed-in users can open the top-right account bubble from any route and reach `/profile`, toggle `Light`/`Dark` theme, or sign out in 2 clicks or fewer.
- **SC-002**: Users can update their display name, role tag, bio, and profile photo (or revert to initials) on `/profile` and see the updated identity reflected across the header bubble, `/profile/[id]`, and `/study/[id]` discussions immediately upon save.
- **SC-003**: 100% of uploaded avatar images are downscaled to <= 256×256 pixels and <= 200 KB before storage, keeping avatar storage and delivery well within free-tier quotas.
- **SC-004**: Zero Flash of Incorrect Theme (FOIT) occurs when a user with `Dark` theme selected loads or refreshes cached public pages (`/`, `/guidelines`).
- **SC-005**: 0 private user fields (email, theme preference, system role, or upvote history) are exposed on `/profile/[id]` for any unauthenticated or cross-user request.
- **SC-006**: All automated type checks, linting, and visual contrast/design-system checks pass across both Light and Dark themes.

## Assumptions

- **New User Avatar Default**: Newly registered OAuth users start with no custom avatar image set (`avatar_url` is initially null) so every new user begins with their 2-letter name initials badge until they choose to upload a custom photo on `/profile`.
- **Role Tag Taxonomy**: The five domain role tags (`Lifter`, `Strength Coach`, `Exercise Researcher`, `Clinician`, `Student`) plus "None" provide sufficient coverage for SBL News commenters without needing free-form custom role tags.
- **Binary Theme Switch**: A binary `Light` / `Dark` switch (with `Light` as the mandatory default for new/unauthenticated visitors) is preferred over a 3-way `Light` / `Dark` / `System` selector so first-time visitors always experience the signature Neo-Brutalist Sky Blue light theme.
- **Existing Auth & Schema Foundation**: Existing OAuth authentication (Google and GitHub) and the core `profiles`, `comments`, and `votes` data structures will be extended via sequential migrations rather than introducing new authentication providers or email/password flows.
- **Avatar Cropping**: Automatic center-crop to a square thumbnail upon file selection is sufficient; an interactive pan/zoom image cropping studio is out of scope.
