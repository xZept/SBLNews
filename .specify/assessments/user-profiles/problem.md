# Problem Definition: User Identity, Profile Customization & Theme Control

- **Slug**: user-profiles
- **Created**: 2026-11-26T23:21:53+08:00
- **Inputs used**: intake.md, research.md

## Problem Statement

Signed-in SBL News readers and commenters have no way to customize how they appear in study discussions, manage their identity details, or switch away from the default light theme, and the top-right header currently exposes raw OAuth metadata beside a standalone sign-out button. This leaves privacy-conscious users tied to their Google/GitHub account names, gives commenters no visual avatar or initials identity, and forces all readers into a single light-only viewing experience.

## Affected Users & Stakeholders

- **Users**:
  - **Signed-in lifters, strength coaches, and exercise-science readers** — cannot edit their display name, set or remove a profile photo, add domain context to their discussion presence, or choose a dark reading theme.
  - **Administrators (`role = 'admin'`)** — rely on the top-right header area for quick navigation to `/admin/review` alongside their account controls.
- **Stakeholders**:
  - **Product owner / Maintainer** — decides which profile fields and account menu actions are essential while keeping the app within its $0/month free-tier quotas, 6-route MVP scope, and Neo-Brutalist Sky Blue design system.

## Goals

- Give signed-in users control over their public discussion identity (display name, optional photo with an automatic initials fallback, and relevant community context) without exposing raw OAuth metadata.
- Provide an accessible, persistent light/dark theme preference that respects the light-by-default design standard.
- Consolidate account identity, profile access, theme switching, and sign-out into a compact top-right account menu.
- Preserve $0/month Supabase Free storage/egress limits, ISR performance on public routes, and the 6-route MVP architecture.

## Non-Goals

- Public user profile pages, follower/following graphs, or user activity feeds (out of scope; would turn SBL News into a social network and violate the 6-route boundary).
- Email/password account registration or custom authentication providers beyond existing Google and GitHub OAuth.
- Dark-mode-by-default theming (light mode remains the default per Constitution Principle III).

## Success Metrics

- **Profile & theme adoption**: Percentage of signed-in users who customize their display name, avatar, or theme preference (baseline: 0% — no customization UI exists today).
- **Zero-egress & storage compliance**: Avatar storage and profile queries remain within Supabase Free's 1 GB storage and 5 GB monthly egress caps (baseline: 0 bytes used for avatars).
- **Theme consistency**: Zero flash of incorrect theme on initial load and full contrast compliance across all 6 routes in both light and dark modes (qualitative; baseline: light-only today).

## Cost of Inaction

If nothing is built, signed-in users remain stuck with whatever name and avatar Google or GitHub OAuth supplies at signup, study discussions continue to lack visual user identity, mobile header space remains crowded by an exposed "Sign out" button, and readers in low-light environments have no dark-theme option.

## Open Questions

- [NEEDS CLARIFICATION: Which additional editable profile fields should be included alongside photo, display name, and theme preference? (e.g., training/professional role tag such as Lifter / Coach / Researcher / Clinician, and a short credentials/bio line.)]
- [NEEDS CLARIFICATION: Should OAuth login leave `avatar_url` empty by default so new users always start with their name-initials badge until they explicitly upload a photo?]
- [NEEDS CLARIFICATION: Should profile editing open as a modal dialog from the top-right account bubble (preserving the 6-route architecture under Constitution Principle V), or as a dedicated `/profile` route?]
- [NEEDS CLARIFICATION: Should the theme selector offer strictly `Light` and `Dark` (with `Light` as default), or `Light`, `Dark`, and `System`?]
