# Data Model: Direct Search & Ask AI Flow and Structured AI Output

**Feature**: `007-search-improvement`
**Date**: 2026-11-28

## Overview

`007-search-improvement` is a pure `/web` frontend interaction, prompt-format, and structured rendering update. It introduces **zero** PostgreSQL database schema changes, migrations, or new backend tables—preserving `public.studies`, `public.ai_search_cache`, `public.user_ai_daily_quotas`, and all existing RPC functions from `0011_ai_search_cache_and_quota.sql`.

Below are the client-side state models, URL serialization contracts, and structured synthesis AST models governing the feature.

---

## 1. Search & Ask AI Intent State (`/` and `/search`)

### 1.1 Homepage Filter Bar State (`web/src/components/feed/filter-bar.tsx`)

| Field | Type | Default | Validation / Constraint | Description |
|-------|------|---------|-------------------------|-------------|
| `tab` | `FeedTab` (`"daily" \| "weekly" \| "top"`) | `"daily"` | Controlled by `FeedClient` | Active feed ranking tab on `/`. |
| `studyDesign` | `StudyDesignType \| "all"` | `"all"` | Controlled by `FeedClient` | Active study-design filter pill on `/`. |
| `trainedOnly` | `boolean` | `false` | Controlled by `FeedClient` | Active trained-lifters-only toggle on `/`. |
| `searchQuery` | `string` | `""` | `maxLength = 300` (`AI_QUERY_MAX_LENGTH`) | Inline search input text typed directly in the homepage filter card. |
| `validationError` | `string \| null` | `null` | Set when authenticated user clicks **`Ask AI`** with `searchQuery.trim().length < 3`; cleared on input change or valid submit | Inline Neo-Brutalist validation feedback (`"Enter at least 3 characters to ask AI."`). |
| `showOAuthPrompt` | `boolean` | `false` | Set when unauthenticated visitor clicks **`Ask AI`** | Controls inline visibility of `<AskAiOAuthPrompt />` below the filter row. |

### 1.2 Search Page Workspace State (`web/src/components/search/ai-search-workspace.tsx`)

| Field | Type | Default | Validation / Constraint | Description |
|-------|------|---------|-------------------------|-------------|
| `query` | `string` | `initialQuery` | `maxLength = 300`; **`Ask AI`** requires `query.trim().length >= 3` (`AI_QUERY_MIN_LENGTH`) | Current query input on `/search`. |
| `studyDesign` | `string` | `initialStudyDesign` | `""` or valid `StudyDesignType` | Selected study design filter on `/search`. |
| `minDurationWeeks` | `string` | `initialMinDurationWeeks` | `""` or integer `0..520` | Minimum study duration filter in weeks. |
| `trainedOnly` | `boolean` | `initialTrainedOnly` | `boolean` | Trained-lifters-only filter checkbox. |
| `quota` | `AiQuotaStatus \| null` | `initialQuota` | Server-hydrated in `search/page.tsx` for signed-in users; client fallback via `GET /api/ai-search` | Persistent daily quota badge state (`ADMIN • UNLIMITED` or `${remainingToday}/${dailyLimit} LEFT TODAY`). |
| `validationError` | `string \| null` | `null` | Set when authenticated user clicks **`Ask AI`** with `query.trim().length < 3`; cleared on input change or **`Search`** submit | Inline validation feedback (`"Enter at least 3 characters to ask AI."`). |
| `showOAuthPrompt` | `boolean` | `initialAiActive && !profile` | Opened when unauthenticated visitor clicks **`Ask AI`** or lands on `/search?ai=1` | Controls `<AskAiOAuthPrompt />` visibility on `/search`. |
| `synthesisPanelOpen` | `boolean` | `initialAiActive` | Set `true` on **`Ask AI`** click or `initialAiActive`; set `false` on standard **`Search`** submit | Controls whether `<AiSynthesisPanel />` is shown above standard search results. |
| `synthesis` | `SynthesisState` | `INITIAL_SYNTHESIS_STATE` | Streaming SSE / cached / empty / error state | Holds `submittedQuery`, `answerMarkdown`, `citations`, `isStreaming`, `cached`, `tierUsed`, `emptyMessage`, `errorMessage`, `canRetry`. |

---

## 2. Structured AI Synthesis AST (`web/src/lib/ai-search/markdown-parser.ts`)

Raw `answerMarkdown` (from live SSE token chunks or `public.ai_search_cache.answer_markdown`) is deterministically parsed into a `StructuredAiSynthesis` document prior to rendering in `AiSynthesisPanel`:

```ts
export type InlineSpan =
  | {
      type: "text";
      value: string; // Guaranteed 0 literal "**" sequences
    }
  | {
      type: "citation";
      rawToken: string; // e.g. "[S1]" or "[S1, S2]"
      labels: string[]; // e.g. ["S1"] or ["S1", "S2"]
    }
  | {
      type: "strong";
      children: Array<
        | { type: "text"; value: string }
        | { type: "citation"; rawToken: string; labels: string[] }
      >;
    };

export type SynthesisBlock =
  | {
      type: "paragraph";
      spans: InlineSpan[];
    }
  | {
      type: "unordered-list";
      items: InlineSpan[][];
    }
  | {
      type: "ordered-list";
      items: InlineSpan[][];
    };

export interface SynthesisSection {
  /**
   * Normalized section title (e.g., "Consensus & Bottom Line",
   * "Evidence Breakdown", "Limitations & Gaps"), or null for legacy
   * unsectioned prose / introductory paragraphs.
   */
  title: string | null;
  blocks: SynthesisBlock[];
}

export interface StructuredAiSynthesis {
  sections: SynthesisSection[];
}
```

### 2.1 Parsing & Sanitization Rules (`FR-009`, `FR-010`, `SC-003`)

1. **Heading Detection**:
   - Lines matching `^\s*#{1,4}\s+(.+?)\s*$` or standalone bolded section title lines matching `^\s*\*\*(Consensus & Bottom Line|Evidence Breakdown|Limitations & Gaps|Bottom Line|Key Findings|Limitations)[:\s]*\*\*\s*$` (case-insensitive) start a new `SynthesisSection`.
   - Any leading/trailing `**`, `#`, or trailing `:` characters on the heading title are stripped so section titles render cleanly in `Space Grotesk`.
2. **List & Paragraph Grouping**:
   - Consecutive lines matching `^\s*[-*•]\s+(.+)$` are grouped into a single `unordered-list` block (`<ul>`).
   - Consecutive lines matching `^\s*\d+[.)]\s+(.+)$` are grouped into a single `ordered-list` block (`<ol>`).
   - Non-empty lines that are neither headings nor list items are accumulated into `paragraph` blocks (`<p>`), split on blank lines.
3. **Zero-`**` Inline Tokenizer**:
   - Matched `**content**` pairs (`/\*\*([\s\S]+?)\*\*/g` where `content` is non-empty and does not begin/end with unclosed markers) are converted into `{ type: "strong", children }`.
   - Every remaining `**` sequence (`/\*{2,}/g`, including unmatched opening `**` in mid-stream SSE chunks, trailing `**`, or empty `****`) is stripped from all text nodes before returning `InlineSpan[]`.
   - Bracketed citation tokens (`(\[(?:S[1-5])(?:\s*,\s*S[1-5])*\])`) inside both plain text and `strong` spans are extracted into `{ type: "citation", rawToken, labels }` nodes so `[S1]..[S5]` links work inside bold text, paragraphs, and list items alike.
