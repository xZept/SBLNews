# Feature Specification: Brand Logo and Favicon Integration

**Feature Branch**: `002-brand-logo-favicon`  
**Created**: 2026-11-26  
**Status**: Draft  
**Input**: User description: "use the @[web/public/img/logo.png] as favicon, logo for sticky top bar, or any other webpages/section that need an icon."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sticky Top Bar Brand Logo (Priority: P1)

Visitors browsing any page of SBL News see the official pixel-art brand emblem (`web/public/img/logo.png`) in the sticky top navigation bar next to the "SBL News" brand wordmark instead of a placeholder text monogram. Clicking the logo or wordmark returns the visitor to the main research feed.

**Why this priority**: The sticky top navigation bar appears on every page of the site and is the primary visual anchor for brand recognition and home navigation.

**Independent Test**: Open any public or moderation page, inspect the sticky top bar, verify the brand emblem image renders crisply alongside the "SBL News" title, and confirm clicking it navigates to the home feed.

**Acceptance Scenarios**:

1. **Given** a visitor loads the main research feed or any secondary page (`/guidelines`, `/search`, `/methodology`, `/study/[id]`, `/admin/review`), **When** the sticky top bar renders, **Then** the official brand emblem (`web/public/img/logo.png`) is displayed clearly beside the "SBL News" wordmark at both desktop and mobile viewport sizes.
2. **Given** a visitor is viewing a secondary page such as `/guidelines` or `/study/[id]`, **When** they click or tap the brand emblem in the sticky top bar, **Then** they are navigated back to the main research feed (`/`).
3. **Given** a visitor views the sticky top bar on a high-contrast Neo-Brutalist surface, **When** the emblem is displayed, **Then** it maintains crisp pixel-art edges without blurry scaling, purple hues, or clashing soft shadows.

---

### User Story 2 - Browser Tab Favicon & App Icons (Priority: P2)

Visitors opening SBL News in a web browser, saving a bookmark, or adding the site to a mobile home screen see the official brand emblem (`web/public/img/logo.png`) as the site's favicon and app icon.

**Why this priority**: Browser tab favicons and bookmark/home-screen icons allow users with multiple open tabs or saved links to immediately identify SBL News.

**Independent Test**: Open any SBL News page in a browser, inspect the browser tab icon and page icon metadata, and verify the brand emblem is served and displayed without broken image requests.

**Acceptance Scenarios**:

1. **Given** a visitor opens any SBL News page in a desktop or mobile browser, **When** the page finishes loading, **Then** the browser tab and bookmark entry display the brand emblem derived from `web/public/img/logo.png`.
2. **Given** a visitor saves SBL News to a mobile home screen or pinned shortcut, **When** the device requests the touch/app icon, **Then** a properly sized icon derived from `web/public/img/logo.png` is provided.

---

### User Story 3 - Supporting Page & Section Brand Icons (Priority: P3)

Wherever other SBL News pages or sections display a site-level brand icon—such as the Transparency Hub (`/methodology`) header/overview, social link-preview cards, or empty/error brand callouts—they consistently use the official brand emblem (`web/public/img/logo.png`) rather than generic placeholders or mismatched icons.

**Why this priority**: Consistent use of the brand emblem across secondary sections and shareable link previews reinforces trust and visual cohesion across the entire 6-route MVP.

**Independent Test**: Visit `/methodology`, `/search`, and `/guidelines`, and inspect social/link-preview metadata and section headers to confirm brand-level icons use `web/public/img/logo.png` while functional action icons (search, upvote, external links) remain distinct and unobstructed.

**Acceptance Scenarios**:

1. **Given** a visitor navigates to `/methodology` or any section that features a site-level brand badge or emblem, **When** the page renders, **Then** the section displays the official brand emblem (`web/public/img/logo.png`) in alignment with the Neo-Brutalist Sky Blue design system.
2. **Given** a user shares a link to SBL News on a platform that reads page preview metadata, **When** the platform fetches the site icon or preview image, **Then** it resolves the official brand emblem without broken links.

---

### Edge Cases

- What happens if `web/public/img/logo.png` is rendered at very small sizes (such as 16x16 or 32x32 browser favicons)? The emblem must remain recognizable and crisp without anti-aliased muddiness or clipped edges.
- What happens on narrow mobile viewports in the sticky top bar? The brand emblem and wordmark must fit cleanly alongside navigation and sign-in controls without wrapping awkwardly or overflowing horizontally.
- What happens if an assistive technology (screen reader) encounters the logo in the top bar or page sections? The logo must have appropriate accessible text or decorative handling so it does not announce redundant "SBL News SBL News" labels.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display the official brand emblem (`web/public/img/logo.png`) in the sticky top navigation bar across all application pages, replacing the temporary text monogram.
- **FR-002**: The sticky top bar logo MUST remain visible, properly proportioned, and clickable as a link to the main feed (`/`) across desktop and mobile screen widths.
- **FR-003**: The system MUST configure `web/public/img/logo.png` (and any standard-sized icon variants generated from it if needed) as the site's browser favicon and mobile/bookmark touch icon across all pages.
- **FR-004**: Any other webpage header, brand callout, or shareable link-preview metadata that requires a site-level brand icon MUST use the official brand emblem (`web/public/img/logo.png`) rather than placeholder text or generic icons.
- **FR-005**: Functional UI icons (such as search, upvote arrows, sign-out, and admin shield indicators) MUST remain distinct from the brand logo and MUST NOT be replaced by the brand emblem.
- **FR-006**: All placements of the brand emblem MUST adhere to the Neo-Brutalist Sky Blue visual rules—preserving crisp pixel-art rendering, high-contrast `#0F172A` borders where framed, and zero purple hues, gradients, or blurry shadows.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the 6 core MVP routes (`/`, `/study/[id]`, `/guidelines`, `/search`, `/methodology`, `/admin/review`) display the official brand emblem in the sticky top bar and serve a valid favicon with zero broken icon requests.
- **SC-002**: Visual inspection confirms crisp rendering of the brand emblem at both navigation bar size and browser tab favicon size without clipping, distortion, or horizontal overflow on mobile (375px) and desktop (1280px+) viewports.
- **SC-003**: Screen reader and accessibility checks confirm the top bar home link announces a single clear destination label ("SBL News") without duplicate image-alt repetition.

## Assumptions

- `web/public/img/logo.png` is the canonical source asset for the SBL News brand emblem and will remain in `web/public/img/logo.png` (additional standard icon sizes may be derived from it if needed for browser compatibility).
- "Any other webpages/section that need an icon" refers to site-level brand emblems (such as page headers, brand badges, and social/link-preview icons), not functional action icons like search, upvote, or navigation arrows.
- No new routes are introduced; all changes remain within the existing 6-route MVP boundary defined in the project constitution.
