# Concept: User Profiles, Account Bubble & Theme Preference

- **Slug**: user-profiles
- **Created**: 2026-11-26T23:23:18+08:00
- **Recommended option**: Option B — In-Place Account Bubble & Profile Modal with Custom Photo Upload, Community Context & Theme Switch

## Options

### Option A — Lightweight Account Bubble & Text-Only Profile Modal (No Custom Photo Upload)
- **Sketch**: Replace the signed-in text and standalone "Sign out" button in the top-right header with a circular/square Neo-Brutalist avatar button showing the user's 2-letter name initials (or an optional toggle to use their existing OAuth provider picture). Clicking the icon opens a popover bubble with their display name, role badge (`Member` / `Admin`), an **Edit Profile** action, an inline **Theme** switch (`Light` / `Dark`), an **Admin Review** link (if admin), and **Sign out**. Clicking **Edit Profile** opens a modal dialog where the user can change their display name, pick a community role tag (e.g., *Lifter*, *Strength Coach*, *Exercise Researcher*, *Clinician*), and edit a short 1-line credentials/bio note — without uploading custom image files.
- **Appetite**: small (days)
- **Trade-offs**: Wins on simplicity, zero binary storage consumption, and zero image-moderation or egress risk, while still delivering the top-right initials icon, account bubble, theme switch, and name/context customization. Sacrifices the ability for users to upload a custom profile photo distinct from their initials or OAuth provider avatar.
- **Rabbit holes**: Over-complicating dark-mode color styling across existing Neo-Brutalist badges and hard offset shadows.

### Option B — In-Place Account Bubble & Profile Modal with Custom Photo Upload, Community Context & Theme Switch
- **Sketch**: Signed-in users see a top-right avatar button that defaults to their 2-letter name initials until they explicitly set a profile photo. Clicking it opens a compact Neo-Brutalist account bubble displaying: (1) Avatar/Initials + Display Name + Email + Account Role badge (`Member` / `Admin`), (2) **Profile** (opens an in-place Edit Profile modal dialog), (3) **Theme** (`Light` / `Dark` inline toggle, defaulting to `Light`), (4) **Admin Queue** (shown only for administrators), and (5) **Sign out**. Inside the **Edit Profile** modal, users can upload, replace, or remove a custom profile photo (automatically downscaled before upload to keep storage and bandwidth tiny), edit their **Display Name**, select an optional **Training / Professional Role tag** (*Lifter*, *Strength Coach*, *Exercise Researcher*, *Clinician*, *Student*), and add an optional **Short Bio / Credentials** line (up to 160 characters). Comment threads on study pages display the author's avatar (or initials badge) and role tag beside their display name.
- **Appetite**: small (days)
- **Trade-offs**: Directly fulfills every part of the user's request — custom profile photos with an initials default, display name editing, meaningful lifting/research community profile fields, and the top-right bubble with profile, theme, and sign-out — while preserving the 6-route application boundary by using a modal dialog instead of a new route. Introduces modest storage management overhead for user avatar images.
- **Rabbit holes**: Allowing unconstrained raw multi-megabyte photo uploads (must be strictly bounded to small square thumbnails); building a complex interactive image cropper instead of simple automatic center-crop/downscale; or letting dark-mode styling drift away from high-contrast Neo-Brutalist borders and hard shadows.

### Option C — Dedicated Profile Page Route & Public Commenter Profile Views
- **Sketch**: In addition to the top-right account bubble and theme toggle, clicking **Profile** navigates to a dedicated `/profile` page with full account management, upload history, and saved/upvoted study lists, and clicking any commenter's name in a discussion thread opens a public profile page showing their bio and comment history.
- **Appetite**: medium (weeks)
- **Trade-offs**: Provides a traditional social-platform profile experience, but directly conflicts with the project's 6-route MVP discipline (Constitution Principle V) and non-goals around social-network scope creep, while increasing page transitions and database queries.
- **Rabbit holes**: Turning a science-aggregation tool into a social network with public profile moderation, activity feeds, and extra routes requiring a constitutional amendment.

## Recommendation

**Option B — In-Place Account Bubble & Profile Modal with Custom Photo Upload, Community Context & Theme Switch** is recommended.

It directly satisfies the user's core vision (profile photo upload with an initial fallback to name initials, theme preference toggle between light and dark, display name editing, and a top-right popover bubble containing Profile, Theme, and Sign out) while answering the two open design decisions with domain-appropriate scope:
1. **What else a user can modify in their profile**: An optional **Training / Professional Role tag** (*Lifter*, *Strength Coach*, *Exercise Researcher*, *Clinician*, *Student*) and an optional **Short Bio / Credentials** line (max 160 chars), plus viewing their read-only connected email and account role (`Member` / `Admin`). These fields add credibility context to `/study/[id]` discussions without bloating the profile.
2. **What appears in the top-right bubble**: Identity header (Avatar/Initials, Display Name, Email, Account Role badge), **Profile** (opens the edit modal), **Theme** (`Light` / `Dark` inline toggle), **Admin Review Queue** (conditional link for admins so the header stays uncluttered), and **Sign out**.

Using an in-place modal dialog for profile editing keeps the application strictly within the 6 core routes and keeps the appetite small.

## Out of Scope (for the recommended option)

- Dedicated `/profile` or `/settings` routes, or public user profile pages (inherited from Non-Goals and Constitution Principle V).
- Complex interactive pan/zoom image cropping studios (automatic square center-crop and resize on selection is sufficient).
- Follower graphs, direct messaging, or public user activity/upvote history lists.
- Email/password credential editing or account deletion workflows beyond OAuth identity.
- Making Dark Mode the default theme for new/unauthenticated visitors (Light Mode remains the default per Constitution Principle III).

## Assumptions to Validate

- Users are comfortable with an Edit Profile modal dialog triggered from the top-right bubble rather than a separate full-page URL.
- New OAuth sign-ins should default to showing the user's 2-letter name initials until the user explicitly uploads a profile photo (rather than silently auto-displaying the OAuth provider's default image).
- The two additional editable profile fields (**Training / Professional Role tag** and **Short Bio / Credentials** up to 160 chars) match what the product owner wants users to be able to modify alongside photo, display name, and theme preference.
- A binary `Light` / `Dark` theme switch (defaulting to `Light`) is preferred over a 3-way `Light` / `Dark` / `System` selector so default visitors always see the signature Neo-Brutalist Sky Blue light canvas first.
