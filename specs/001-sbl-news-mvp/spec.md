# Feature Specification: SBL News MVP

**Feature Branch**: `001-sbl-news-mvp`  
**Created**: 2026-11-26  
**Status**: Draft  
**Input**: User description: "Build the SBL News MVP encompassing the monorepo foundation (/web and /pipeline), PostgreSQL + pgvector schema with RLS, automated daily literature ingestion and deterministic evidence scoring pipeline, and the 6 core routes: Main Research Feed (/), Study Detail & Discussion (/study/[id]), Living Evidence Matrix (/guidelines), Hybrid Search (/search), Transparency Hub (/methodology), and RBAC-protected Moderation & Consensus Drift Queue (/admin/review)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse & Filter Daily Resistance-Training Research Feed (Priority: P1)

A lifter, coach, or exercise-science reader opens SBL News (`/`) to quickly scan newly published, peer-reviewed resistance-training research without wading through marketing banners, social media hype, or low-quality animal/acute-EMG studies. They immediately see a sticky filter and search bar (`Daily`, `Weekly`, `Top` tabs plus deterministic study-type filter pills) above a dense, high-contrast list of study cards. Each card displays an upvote count, title, journal and publication year, monospace metadata badges (study design, duration, sample size, trained status, and `Full-Text` vs. `Abstract-Only` inspection depth), a concise two-sentence takeaway, and direct links to the discussion thread and primary source (`PubMed/DOI`).

**Why this priority**: The daily research feed is the primary entry point and core value proposition of SBL News—delivering curated, evidence-ranked lifting science immediately on load.

**Independent Test**: Can be fully tested by loading `/` as an unauthenticated visitor, switching between `Daily`, `Weekly`, and `Top` views, applying study-type filter pills, and verifying that only published, deterministically ranked studies appear with accurate metadata badges and external primary-source links.

**Acceptance Scenarios**:

1. **Given** published studies exist in the system, **When** a visitor opens `/`, **Then** the page renders immediately without a marketing hero banner, displaying the sticky filter bar (`Daily | Weekly | Top` and study-type filter pills) and study cards sorted by the active tab's ranking rules (`Daily`: latest `published_at DESC, quality_score DESC`; `Weekly`: last 7 days by `quality_score DESC, upvote_count DESC`; `Top`: all-time by `upvote_count DESC, quality_score DESC`).
2. **Given** the main feed is displayed, **When** a visitor inspects any study card, **Then** the card shows the upvote control, title, journal/year, monospace evidence and inspection-depth badges (`Full-Text` or `Abstract-Only`), a two-sentence takeaway, and actions for `Discussion` and `PubMed/DOI`.
3. **Given** a visitor selects a study-type filter pill (e.g., Meta-Analysis/Systematic Review or >=8-Week Human RCT), **When** the filter is applied, **Then** the feed displays only matching published studies, while animal-only and acute EMG-only studies remain excluded or downranked per the scoring rules.
4. **Given** an authenticated user views the feed, **When** they click the upvote button on a study card, **Then** their vote is recorded once per user and the card's upvote count and active state update; an unauthenticated visitor clicking upvote is prompted to sign in via social login.

---

### User Story 2 - Inspect Study Details, Transparency Badges & Community Discussion (Priority: P1)

A reader clicks into a study (`/study/[id]`) to evaluate its methodology, sample characteristics, limitations, and community interpretation before applying its findings. They see the full structured breakdown (study design, population, sample size, duration in weeks, primary outcome, summary takeaway, and limitations), a prominent inspection transparency badge (`Full-Text` vs. `Abstract-Only`), the primary `PubMed/DOI` citation link, optional secondary creator video/social commentary links clearly separated from primary evidence, and a nested discussion thread where signed-in users can post comments and replies.

**Why this priority**: Providing transparent study breakdowns and peer-grounded discussion is essential for scientific credibility and prevents readers from over-interpreting abstracts or secondary commentary.

**Independent Test**: Can be fully tested by navigating to `/study/[id]` for both a `Full-Text` and an `Abstract-Only` study, verifying all structured metadata fields and secondary commentary links render accurately, and signing in to post a top-level comment and a nested reply.

**Acceptance Scenarios**:

1. **Given** a published study exists, **When** a visitor opens `/study/[id]`, **Then** all structured metadata fields, limitations, inspection transparency badge (`Full-Text` or `Abstract-Only`), and primary `PubMed/DOI` link are displayed.
2. **Given** a study has attached creator video or social commentary links, **When** a visitor views `/study/[id]`, **Then** those links appear strictly in a secondary commentary section clearly distinguished from the primary peer-reviewed study record.
3. **Given** an authenticated user is on `/study/[id]`, **When** they submit a valid comment or reply to an existing comment, **Then** the comment is persisted and rendered in the nested discussion thread, and the user can edit or delete only their own comments.
4. **Given** an unauthenticated visitor is on `/study/[id]`, **When** they view the discussion, **Then** they can read all published comments in read-only mode and are prompted to sign in if they attempt to post or reply.

---

### User Story 3 - Automated Daily Literature Ingestion & Deterministic Evidence Scoring (Priority: P1)

Every day on an automated schedule, the research ingestion pipeline fetches newly published resistance-training and exercise-science papers from peer-reviewed primary sources (PubMed, OpenAlex, and targeted exercise-science journals), deduplicates them against existing records, extracts objective structured metadata and inspection depth (`Full-Text` vs. `Abstract-Only`), generates semantic search representations, and computes a deterministic evidence quality score in code. Human meta-analyses/systematic reviews and >=8-week randomized controlled trials on resistance-trained lifters receive top priority, while animal studies and acute EMG-only studies are downranked or filtered out. Newly ingested systematic reviews or meta-analyses that match an active training guideline topic automatically generate a `Consensus Drift` alert for human review without modifying any published guideline.

**Why this priority**: Without reliable, automated daily ingestion and deterministic scoring, the feed and consensus-drift workflow have no fresh, trustworthy scientific content.

**Independent Test**: Can be fully tested by running the ingestion and scoring pipeline against a sample batch of primary literature records (including a human meta-analysis, an >=8-week trained RCT, an animal study, and an acute EMG-only study) and verifying deterministic score ordering, structured metadata persistence, inspection badge assignment, and `Consensus Drift` alert creation.

**Acceptance Scenarios**:

1. **Given** newly fetched records from primary literature sources, **When** the daily ingestion pipeline runs, **Then** each unique study is extracted into structured fields (`study_design`, `population`, `sample_size_n`, `duration_weeks`, `primary_outcome`, `summary_takeaway`, `limitations`) with an explicit `Full-Text` or `Abstract-Only` inspection flag.
2. **Given** extracted studies of varying designs, **When** the deterministic scoring rules execute, **Then** human meta-analyses/systematic reviews and >=8-week RCTs on resistance-trained lifters rank highest, while animal studies and acute EMG-only studies are deterministically downranked or filtered from the public feed.
3. **Given** a newly ingested systematic review or meta-analysis matches an active guideline topic, **When** ingestion completes, **Then** the system creates a `Consensus Drift` alert in the moderation queue and leaves the published guideline unchanged.
4. **Given** a study already exists (matched by DOI, PubMed ID, or canonical identifier), **When** the pipeline encounters it again, **Then** it skips or updates safely without creating duplicate feed entries.

---

### User Story 4 - Explore Living Evidence Matrix & Training Guidelines (Priority: P2)

A coach or lifter visits `/guidelines` to see practical, evidence-graded training recommendations organized cleanly by domain. At the top, they see a 3-column grid of core evidence hubs (*Hypertrophy*, *Maximal Strength*, *Recovery & Nutrition*), followed by a 4-column indexed directory of specific training variables (*Weekly Volume*, *RIR / Failure*, *Frequency*, *Rest Intervals*, *Lengthened Partials*, *Protein Intake*). Each guideline entry displays an evidence strength grade badge, practical consensus summary, anchor meta-analysis citations, and a last-updated changelog.

**Why this priority**: Translating individual papers into structured, practical training guidelines delivers high long-term retention and clarity for lifters and coaches.

**Independent Test**: Can be fully tested by navigating to `/guidelines`, verifying the 3-column hub grid and 4-column variable directory render with evidence grade badges, anchor citations, and changelogs, and confirming that clicking anchor citations navigates to the corresponding study records.

**Acceptance Scenarios**:

1. **Given** published guidelines exist, **When** a visitor opens `/guidelines`, **Then** the page displays the 3-column core evidence hubs (*Hypertrophy*, *Maximal Strength*, *Recovery & Nutrition*) and the 4-column variable directory (*Weekly Volume*, *RIR / Failure*, *Frequency*, *Rest Intervals*, *Lengthened Partials*, *Protein Intake*).
2. **Given** a visitor inspects any guideline variable, **When** viewing its entry, **Then** they see its evidence grade badge, concise recommendation, linked anchor meta-analysis citations, and last-updated changelog entry.

---

### User Story 5 - Search Literature with Hybrid Keyword + Semantic Discovery & Filters (Priority: P2)

A user visits `/search` to answer a specific training question (e.g., "lengthened partials hypertrophy" or "weekly set volume trained lifters") using both exact keyword matching and conceptual semantic similarity, refined by deterministic filters for study type, minimum duration in weeks, and training status.

**Why this priority**: As the archive grows, users need fast, high-precision discovery across both exact terminology and conceptual questions without sacrificing evidence-quality filtering.

**Independent Test**: Can be fully tested by opening `/search`, entering a natural-language or keyword query, applying combinations of study-type, minimum-duration, and training-status filters, and verifying relevant ranked results return with summary metadata only.

**Acceptance Scenarios**:

1. **Given** indexed studies exist, **When** a user submits a search query on `/search`, **Then** results combine keyword relevance and semantic similarity and display matching study cards with summary metadata.
2. **Given** search results are displayed, **When** the user applies deterministic filters (study type, minimum duration in weeks, or training status), **Then** results narrow strictly to studies satisfying all selected filter criteria.
3. **Given** a query matches no studies under the active filters, **When** the search completes, **Then** a clear empty state is shown with an option to reset filters.

---

### User Story 6 - Review Methodology & Transparency Standards (Priority: P3)

A skeptical reader or researcher visits `/methodology` to verify how SBL News sources literature, scores evidence quality, distinguishes `Full-Text` vs. `Abstract-Only` inspections, and governs guideline updates via human review.

**Why this priority**: Radical transparency builds trust with evidence-based fitness practitioners and differentiates SBL News from opaque AI aggregators.

**Independent Test**: Can be fully tested by navigating to `/methodology` and verifying all four documented pillars (primary literature sources, deterministic scoring rubric, inspection-depth rules, and human-in-the-loop guideline governance) are clearly presented and readable.

**Acceptance Scenarios**:

1. **Given** any visitor navigates to `/methodology`, **When** the page loads, **Then** it presents clear, structured documentation of primary ingestion sources, the deterministic scoring rubric, `Full-Text` vs. `Abstract-Only` inspection rules, and human-in-the-loop guideline governance.

---

### User Story 7 - Moderate Ingested Studies & Resolve Consensus Drift Alerts (Priority: P2)

An authorized administrator signs in and opens `/admin/review` to inspect newly staged/flagged studies and `Consensus Drift` alerts generated when new systematic reviews or meta-analyses touch active guideline topics. The administrator can approve or reject pending studies for the public feed, and can review, approve (with an updated changelog note), or dismiss `Consensus Drift` alerts against affected guidelines. Non-administrators and unauthenticated visitors are strictly blocked from viewing or mutating anything in `/admin/review`.

**Why this priority**: Human-in-the-loop governance is mandatory to protect guideline integrity and prevent unverified or low-quality extractions from distorting published recommendations.

**Independent Test**: Can be fully tested by attempting to access `/admin/review` as an unauthenticated user and as a standard authenticated user (both denied), then signing in as an administrator to approve a staged study and resolve a `Consensus Drift` alert, verifying the public feed and guideline changelog reflect the approved changes.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor or non-admin user requests `/admin/review` or invokes a moderation action, **When** the request is evaluated, **Then** access is denied server-side and no moderation data or mutation capability is exposed.
2. **Given** an administrator is signed in on `/admin/review`, **When** they approve or reject a pending study, **Then** the study's publication status updates accordingly and approved studies become visible on the public feed.
3. **Given** a `Consensus Drift` alert exists for a guideline topic, **When** an administrator reviews and approves an update with a changelog note (or dismisses the alert), **Then** the alert is marked resolved and any approved guideline update plus its timestamped changelog entry is published to `/guidelines`.

---

### Edge Cases

- What happens when an ingested paper provides only an abstract and no open-access full text? The system persists and displays the `Abstract-Only` warning badge and still extracts available metadata without fabricating missing sample sizes or durations (leaving unknown numeric fields null/unreported).
- What happens when a user attempts to upvote or comment while signed out? The action does not mutate data and prompts the user to authenticate via Google or GitHub social login.
- What happens when a user tries to upvote the same study multiple times or edit/delete another user's comment? Clicking upvote on an already-upvoted study toggles the vote off (enforced by a unique `(study_id, user_id)` primary key), and cross-user comment mutations are rejected by access controls. Deleting a parent comment that has child replies soft-deletes it (`[deleted]`) to preserve the reply thread.
- What happens when an external primary literature source is temporarily unavailable or rate-limited during daily ingestion? The pipeline logs the source failure, continues processing available sources without corrupting existing records, and avoids partial duplicate writes.
- What happens when `/search` receives an empty query or invalid filter values (e.g., negative duration weeks)? Input validation rejects malformed parameters with a clear user-facing message, and an empty query with filters browses/filters matching studies or prompts for search terms cleanly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a clean separation between the public/interactive web application workspace (`/web`) and the scheduled literature ingestion workspace (`/pipeline`), operating within zero-cost free-tier operational limits.
- **FR-002**: System MUST expose exactly the 6 core MVP routes: Main Research Feed (`/`), Study Detail & Discussion (`/study/[id]`), Living Evidence Matrix (`/guidelines`), Hybrid Search (`/search`), Transparency Hub (`/methodology`), and Moderation & Consensus Drift Queue (`/admin/review`).
- **FR-003**: System MUST render `/` and `/guidelines` using cached static/incremental regeneration so public reads load rapidly without waiting on cold starts or live ingestion jobs.
- **FR-004**: System MUST authenticate users via Google and GitHub social login and MUST NOT rely on built-in email-password signup mailers.
- **FR-005**: System MUST enforce row-level access controls on all data tables such that unauthenticated visitors have read-only access to published studies, published guidelines, and public comments; authenticated users can create/modify only their own votes and comments; and only administrators can access `/admin/review` or approve/reject studies and guideline updates.
- **FR-006**: System MUST validate all external inputs, route handlers, mutations, and ingestion payloads at runtime using strict schema validation.
- **FR-007**: System MUST protect data transfer bandwidth by projecting only required summary columns on feed, list, and search queries—explicitly excluding raw full-text payloads, full abstracts, and search embedding vectors from list responses.
- **FR-008**: The automated daily ingestion pipeline (`/pipeline`) MUST source primary peer-reviewed literature exclusively from PubMed, OpenAlex, and targeted exercise-science journal feeds, deduplicating against existing records by canonical study identifiers (DOI, PubMed ID, or OpenAlex ID).
- **FR-009**: The ingestion pipeline MUST extract objective study metadata (`study_design`, `population`, `sample_size_n`, `duration_weeks`, `primary_outcome`, `summary_takeaway`, `limitations`) into validated structured records and persist an explicit inspection depth indicator (`Full-Text` vs. `Abstract-Only`).
- **FR-010**: The ingestion pipeline MUST compute study evidence quality scores and feed eligibility deterministically in code—prioritizing human meta-analyses/systematic reviews and >=8-week RCTs on resistance-trained lifters, while downranking or filtering out animal studies and acute EMG-only studies.
- **FR-011**: The ingestion pipeline MUST NEVER directly overwrite or publish updates to `/guidelines`; whenever a newly ingested systematic review or meta-analysis matches an active guideline topic, it MUST create a `Consensus Drift` alert in `/admin/review` for administrator verification.
- **FR-012**: System MUST support attaching optional secondary creator video or social media commentary links to existing study records on `/study/[id]`, while prohibiting social media or video sources from appearing as primary feed items.
- **FR-013**: System MUST provide hybrid keyword and semantic search on `/search` combined with deterministic filters for study type, minimum duration (weeks), and training status.
- **FR-014**: Every screen in `/web` MUST adhere strictly to the Neo-Brutalist Sky Blue design system: `#F8FAFC` page canvas, `#FFFFFF` card surfaces, `#38BDF8` Sky Blue primary accent with `#0F172A` ink, `#0F172A` structural borders (`2px solid`) and hard offset shadows (`4px 4px 0px` cards, `2px 2px 0px` controls with `2px` active press), max `6px` card / `4px` badge corner radii, `Space Grotesk` headings, `Inter` body (`65ch-75ch`), `JetBrains Mono` metrics and badges, and zero purple/violet/indigo hues, gradients, or blur shadows.

### Key Entities

- **Study**: Represents a peer-reviewed primary research paper with canonical identifiers (DOI, PubMed ID, OpenAlex ID), title, journal, publication date/year, structured extracted metadata (`study_design`, `population`, `sample_size_n`, `duration_weeks`, `primary_outcome`, `summary_takeaway`, `limitations`), inspection depth (`Full-Text` vs. `Abstract-Only`), deterministic quality score, publication status (`pending`, `published`, `rejected`), upvote count, and search representation.
- **Guideline**: Represents a practical training recommendation within one of the 3 core hubs (*Hypertrophy*, *Maximal Strength*, *Recovery & Nutrition*) and 4-column variable directory (*Weekly Volume*, *RIR / Failure*, *Frequency*, *Rest Intervals*, *Lengthened Partials*, *Protein Intake*), including evidence grade, consensus summary, anchor study references, and update changelog.
- **Consensus Drift Alert**: Represents a pending human-review item linking a newly ingested systematic review or meta-analysis to an affected Guideline topic, tracking alert status (`pending`, `approved`, `dismissed`), reviewer notes, and resolution timestamp.
- **Comment**: Represents a user-authored discussion entry on a Study, supporting nested parent-child replies, author ownership, and timestamps.
- **Vote**: Represents a unique user upvote on a Study, enforcing one active vote per user per study.
- **Secondary Commentary**: Represents an optional creator video or social media link associated with an existing Study, including platform/title/URL metadata.
- **User Profile / Role**: Represents an authenticated user identity from social login along with their authorization role (`member` or `admin`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: First-time visitors can open `/`, filter by study type, and open a study's primary `PubMed/DOI` source or discussion in under 15 seconds.
- **SC-002**: 100% of published studies displayed on `/` and `/study/[id]` display both a deterministic study-design/evidence badge and an explicit `Full-Text` or `Abstract-Only` inspection badge.
- **SC-003**: Automated deterministic scoring tests verify 100% accuracy in ranking human meta-analyses and >=8-week trained RCTs above animal and acute EMG-only studies across all test fixtures.
- **SC-004**: 100% of guideline-matching systematic reviews/meta-analyses ingested by `/pipeline` generate a `Consensus Drift` alert in `/admin/review` with zero unreviewed mutations to published `/guidelines`.
- **SC-005**: 100% of unauthorized requests to `/admin/review` or moderation actions (unauthenticated or non-admin users) are rejected server-side.
- **SC-006**: Feed and search list responses exclude raw full-text payloads, full abstracts, and embedding vectors, keeping per-request list payload size under 50 KB and within free-tier bandwidth budgets.
- **SC-007**: All 6 core routes pass visual and structural compliance checks against the Neo-Brutalist Sky Blue token rules with zero purple/violet/indigo hues, gradients, or blurred shadows.

## Assumptions

- **Default Publish Threshold**: Newly ingested studies that pass deterministic quality thresholds (human resistance-training meta-analyses, systematic reviews, or controlled trials without extraction errors) are published automatically to the feed, while low-confidence, incomplete, or borderline extractions enter `pending` status for `/admin/review`.
- **Target Audience & Language**: MVP content and UI are in English, targeting evidence-based lifters, strength coaches, and exercise-science readers.
- **Initial Seed Guidelines**: The 3 core hubs and 6 primary training variables on `/guidelines` will be seeded via initial migration/seed data so the Living Evidence Matrix is immediately populated at launch.
- **Administrator Provisioning**: Initial admin roles will be assigned directly in the database/auth metadata for project maintainers rather than via a public self-service admin signup flow.
