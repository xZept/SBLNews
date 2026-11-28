# Data Model: Relocate Search Trigger and Ask AI Bar

**Feature**: `006-relocate-search-ask-ai`  
**Date**: 2026-11-28

## Overview

This feature is a pure frontend UI layout and navigation refactoring within `/web`. It introduces **no** database schema changes, SQL migrations, RPCs, or API payload changes.

## Client Component State (Existing, Unchanged Contracts)

### `FilterBar` (`web/src/components/feed/filter-bar.tsx`)
- **Props** (unchanged):
  - `tab`: `FeedTab` (`"daily" | "weekly" | "top"`)
  - `onTabChange`: `(tab: FeedTab) => void`
  - `studyDesign`: `StudyDesignType | "all"`
  - `onStudyDesignChange`: `(design: StudyDesignType | "all") => void`
  - `trainedOnly`: `boolean`
  - `onTrainedOnlyChange`: `(trainedOnly: boolean) => void`
  - `totalCount`: `number`
- **Local UI State** (unchanged):
  - `askAiOpen`: `boolean` — controls visibility of the inline Ask AI panel (either `AskAiOAuthPrompt` when unauthenticated or the query submission `<form>` when authenticated).
  - `aiQuery`: `string` — controlled input value validated against `AI_QUERY_MIN_LENGTH` and `AI_QUERY_MAX_LENGTH` before routing via `buildAskAiReturnPath({ query, studyDesign, trainedOnly })`.

### `TopNav` (`web/src/components/layout/top-nav.tsx`)
- **`NAV_LINKS` Constant** (updated):
  - `[{ href: "/", label: "Feed" }, { href: "/guidelines", label: "Guidelines" }, { href: "/methodology", label: "Methodology" }]`
  - `{ href: "/search", label: "Search" }` removed.
