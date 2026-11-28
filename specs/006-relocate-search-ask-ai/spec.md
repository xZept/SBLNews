# Feature Specification: Relocate Search Trigger and Ask AI Bar

**Feature Branch**: `006-relocate-search-ask-ai`  
**Created**: 2026-11-28  
**Status**: Draft  
**Input**: User description: "Relocate the Search trigger and Ask AI button into a dedicated split-width row inside the main feed filter card container. Requirements: Remove the 'Search' link from the top navigation bar (between 'Guidelines' and 'Methodology'). Remove the existing 'Ask AI' button from the inline filter controls row (next to 'Trained Lifters Only'). Inside the main feed container card (alongside the Daily/Weekly/Top tabs, 'Trained Lifters Only' filter, and study count), add a full-width horizontal row containing two buttons: 1. Search trigger button on the left taking up 3/4 (75%) of the container width, preserving the magnifying glass icon and existing search behavior. 2. Ask AI button on the right taking up 1/4 (25%) of the container width, preserving its sparkle icon and existing AI trigger behavior. Match the existing Neo-Brutalist Sky Blue UI styling (`2px solid #0F172A` borders, hard `4px 4px 0px #0F172A` offset shadows, `#FFFFFF` / `#38BDF8` surfaces, and monospace typography) and stack cleanly on mobile viewports."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prominent Feed Search & Ask AI Action Row (Priority: P1)

As a visitor or signed-in member browsing the main research feed, I want a dedicated full-width Search and Ask AI action row inside the feed filter card so that searching the literature and launching AI synthesis are immediately discoverable together alongside the feed filters.

**Why this priority**: Consolidating Search and Ask AI into a primary 75%/25% split row inside the main feed filter card is the core goal of this change, making literature search more prominent than a small top-bar link while pairing it directly with AI synthesis.

**Independent Test**: Load the main feed on a desktop viewport, verify the full-width split row appears inside the feed filter card with the Search trigger at 75% width on the left and the Ask AI button at 25% width on the right, and verify clicking each triggers its respective search navigation and Ask AI behavior.

**Acceptance Scenarios**:

1. **Given** a visitor is on the main research feed on a desktop viewport, **When** they view the feed filter card container, **Then** they see a full-width horizontal row inside the card containing a Search trigger button on the left occupying 75% (3/4) of the row width with a magnifying glass icon, and an Ask AI button on the right occupying 25% (1/4) of the row width with a sparkle icon.
2. **Given** a visitor clicks the Search trigger button in the feed filter card, **When** the action completes, **Then** they are taken to the dedicated Search experience, preserving existing search navigation behavior.
3. **Given** an unauthenticated visitor clicks the Ask AI button in the feed filter card, **When** the panel toggles open, **Then** they see the inline sign-in prompt below the filter controls, preserving existing logged-out Ask AI behavior.
4. **Given** an authenticated member clicks the Ask AI button in the feed filter card, **When** the panel toggles open and they submit a valid query, **Then** they are routed to the AI literature synthesis view with their query and active feed filters preserved.

---

### User Story 2 - Streamlined Top Navigation and Filter Controls Row (Priority: P2)

As a user navigating the application, I want the top navigation bar and the inline filter controls row decluttered so that navigation links focus on primary sections and the filter row focuses solely on feed sorting and population/study-design filtering.

**Why this priority**: Removing the redundant top-bar Search link and the old inline Ask AI button eliminates duplicate entry points and keeps both the top bar and the filter controls row clean and focused.

**Independent Test**: Inspect the top navigation bar across desktop and mobile viewports to confirm "Search" no longer appears between "Guidelines" and "Methodology", and inspect the feed filter controls row next to "Trained Lifters Only" to confirm "Ask AI" is no longer placed inline there.

**Acceptance Scenarios**:

1. **Given** a user views the top navigation bar on desktop or mobile, **When** they inspect the navigation links, **Then** "Feed", "Guidelines", and "Methodology" are present, and the "Search" link between "Guidelines" and "Methodology" is removed.
2. **Given** a user views the inline filter controls row inside the feed filter card, **When** they inspect the controls alongside the Daily/Weekly/Top tabs, "Trained Lifters Only" toggle, and study count, **Then** the "Ask AI" button is no longer present in that inline controls row.

---

### User Story 3 - Responsive Mobile Stacking & Neo-Brutalist Visual Consistency (Priority: P3)

As a mobile or desktop user (in either Light or Dark theme), I want the relocated Search and Ask AI row to match the Neo-Brutalist Sky Blue design system and stack cleanly on narrow screens so that controls remain legible, well-proportioned, and easy to tap.

**Why this priority**: Ensuring responsive layout integrity and strict design-system compliance prevents cramped buttons on mobile viewports and preserves visual consistency across themes.

**Independent Test**: View the main feed at mobile (< 640px) and desktop (>= 768px) widths in both Light and Dark themes; verify clean vertical stacking on mobile, 75%/25% split on desktop, crisp borders, hard offset shadows, monospace typography, and zero purple/gradient styling.

**Acceptance Scenarios**:

1. **Given** a visitor views the main feed on a mobile viewport, **When** the feed filter card renders, **Then** the Search trigger button and Ask AI button stack cleanly vertically at full container width without horizontal overflow, clipped labels, or cramped tap targets.
2. **Given** a visitor views the feed filter card in Default Light Theme or Opt-In Dark Theme, **When** they inspect or press the Search trigger and Ask AI buttons, **Then** both buttons display `2px solid` high-contrast borders, hard zero-blur offset shadows (`4px 4px 0px`), monospace typography, `#FFFFFF` / `#38BDF8` surface/accent styling (with dark-theme token equivalents when Dark Theme is active), and tactile press feedback without any purple, violet, or gradient styling.

---

### Edge Cases

- What happens when a user is on a non-feed page (such as Guidelines, Methodology, or a Study Detail page) and wants to search? The user can return to the Feed via the top navigation bar's "Feed" link (or brand logo) to use the Search trigger button, or navigate directly to `/search`; the top navigation bar itself no longer displays a "Search" link.
- What happens when the Ask AI button is toggled active while the inline Ask AI panel is open? The button reflects its active/pressed state using the Sky Blue (`#38BDF8`) accent surface with dark ink (`#0F172A`), and clicking it again collapses the inline panel.
- What happens on intermediate tablet/narrow desktop widths? The 75%/25% horizontal split activates cleanly once sufficient horizontal space is available, while narrow mobile viewports stack the two buttons vertically so neither button's label or icon wraps awkwardly.
- What happens when active feed filters ("Trained Lifters Only" or a specific study design) are selected before clicking Ask AI? Submitting an Ask AI query continues to carry those active filter selections into the AI synthesis experience.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST remove the "Search" navigation link (previously positioned between "Guidelines" and "Methodology") from both the desktop and mobile top navigation bar.
- **FR-002**: System MUST remove the "Ask AI" button from the inline filter controls row inside the feed filter card (previously positioned next to the "Trained Lifters Only" toggle).
- **FR-003**: System MUST render a dedicated, full-width horizontal action row inside the main feed filter card container alongside the existing Daily/Weekly/Top tabs, "Trained Lifters Only" filter, study-design filter pills, and study count.
- **FR-004**: System MUST place a Search trigger button on the left side of the dedicated row occupying 3/4 (75%) of the container width on desktop/wider viewports, preserving the magnifying glass icon and existing navigation behavior to the Search experience.
- **FR-005**: System MUST place the Ask AI button on the right side of the dedicated row occupying 1/4 (25%) of the container width on desktop/wider viewports, preserving the sparkle icon, pressed-state indicator, and existing inline Ask AI trigger behavior (OAuth sign-in prompt for unauthenticated visitors; query submission form for authenticated users).
- **FR-006**: System MUST stack the Search trigger button and Ask AI button cleanly on mobile viewports so both remain full-width, legible, and free of horizontal overflow.
- **FR-007**: System MUST style both relocated buttons in accordance with the Neo-Brutalist Sky Blue design system: `2px solid #0F172A` borders, hard `4px 4px 0px #0F172A` offset shadows, `#FFFFFF` / `#38BDF8` surfaces (adapting cleanly to Opt-In Dark Theme tokens when active), monospace typography, tactile active-press feedback, and zero purple/violet hues or gradients.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of navigation bar renders across desktop and mobile viewports omit the "Search" link while retaining "Feed", "Guidelines", and "Methodology".
- **SC-002**: On desktop viewports, the relocated Search trigger and Ask AI buttons render in a single full-width row inside the feed filter card with a 3:1 (75% / 25%) width split and zero horizontal overflow.
- **SC-003**: On mobile viewports (e.g., 375px width), the Search trigger and Ask AI buttons stack cleanly vertically with 100% label visibility and minimum 44px touch-target height.
- **SC-004**: 100% of existing Search navigation and Ask AI trigger behaviors (logged-out OAuth prompt, authenticated query submission with preserved filters) continue to function without regression.
- **SC-005**: Visual inspection in both Default Light Theme and Opt-In Dark Theme confirms 100% compliance with Neo-Brutalist Sky Blue border, shadow, surface, and monospace typography rules.

## Assumptions

- The dedicated `/search` page route remains unchanged and accessible via the relocated Search trigger button in the feed filter card (as well as direct URL navigation).
- The Ask AI trigger continues to operate as a client-side interactive control inside the sticky feed filter card so public feed pages preserve their static/cached rendering characteristics.
- Placing the dedicated Search + Ask AI row inside the feed filter card (above or below the tabs/study-design controls) keeps all feed discovery controls unified within a single Neo-Brutalist card container.
