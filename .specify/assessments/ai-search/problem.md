# Problem Definition: Evidence Synthesis Across Literature Search

- **Slug**: ai-search
- **Created**: 2026-11-28T16:27:30+08:00
- **Inputs used**: intake.md, research.md

## Problem Statement

Lifters, coaches, and researchers using SBL News who have specific, multi-study training questions (e.g., optimal weekly set volume, creatine timing, rest intervals, or lengthened partials) currently must manually scan up to 20 individual study cards on `/search` or check the 5 static training variables on `/guidelines` to piece together an answer. Meanwhile, SBL News must deliver any automated synthesis without cold-start latency, without degrading public keyword/filter search, and without exceeding strict $0/month free-tier compute, database egress, and LLM rate limits.

## Affected Users & Stakeholders

- **Users — Signed-in Readers (Lifters, Strength Coaches, Exercise Researchers, Clinicians, Students)**: Need quick, citation-grounded synthesis across multiple peer-reviewed studies to answer practical training questions without reading dozens of individual abstracts or encountering 30–60s backend cold starts.
- **Users — Unauthenticated Visitors**: Need uninterrupted, unlimited access to standard keyword and filter search, plus clear visibility that AI synthesis is available upon signing in.
- **Users — Administrators**: Need unrestricted access to test and verify AI search synthesis without hitting daily member query caps.
- **Stakeholders — Project Owner / Maintainer**: Needs a unified, low-maintenance deployment footprint with zero recurring hosting costs, resilient free-tier LLM availability, bounded per-user consumption, and strict adherence to scientific integrity (no ungrounded claims or silent guideline distortion).

## Goals

- Enable authenticated users to receive fast, citation-grounded answers synthesized from the most relevant peer-reviewed studies in SBL News without cold-start delays.
- Keep standard keyword, semantic, and deterministic filter search completely free, public, and unlimited for all visitors.
- Protect free-tier LLM token, request-per-day, and database egress budgets through per-user daily usage caps, tight context budgets, and reuse of answers for recurring training questions.
- Maintain high availability even when individual free-tier LLM providers return rate-limit (`429`) or transient errors.
- Encourage logged-out visitors on the main feed to sign in by surfacing the AI synthesis capability as an accessible teaser.

## Non-Goals

- Replacing or gating standard keyword, `pgvector` semantic, and study-design filter search behind authentication or quotas.
- Mutating, overwriting, or bypassing human-in-the-loop (HITL) governance for `/guidelines` or `/admin/review`.
- Introducing paid recurring SaaS dependencies, external rate-limiting infrastructure (e.g., Redis), or a separate always-on / cold-starting backend service.
- Allowing ungrounded, uncited AI answers or permitting LLMs to override deterministic study quality scoring.
- Building multi-turn conversational chat memory or general non-literature Q&A outside the indexed `studies` corpus.

## Success Metrics

- **Unauthenticated boundary enforcement**: 100% of unauthenticated synthesis requests are rejected with `401 Unauthorized`, while 100% of public keyword/filter searches remain unrestricted (baseline: no AI synthesis endpoint exists today).
- **Per-user daily quota compliance**: Standard authenticated users are deterministically capped at their daily allowance (e.g., 5/day), while admin accounts remain uncapped (baseline: no quota enforcement exists).
- **Context budget discipline**: Total study context passed to synthesis stays strictly under 2,000 tokens per request across 3–5 retrieved studies (baseline: N/A).
- **Cache reuse & latency**: Recurring normalized training queries served from cache return without invoking an LLM provider and without cold-start delays (baseline: 0% cached synthesis).
- **Provider resilience**: `429` rate-limit responses from the primary inference provider automatically fail over across fallback tiers without failing the user request when a fallback tier is healthy (baseline: no multi-provider failover exists).
- **Adoption / conversion signal** *(qualitative/telemetry)*: Signed-in synthesis usage rate and sign-in conversions from the logged-out teaser (baseline: unknown — no production telemetry in repository `[NEEDS CLARIFICATION: Are analytics/events desired to measure teaser-to-sign-in conversion?]`).

## Cost of Inaction

If nothing is built, SBL News readers must continue manually synthesizing answers across individual study cards on `/search` for any topic outside the 5 static `/guidelines` variables, logged-out visitors on `/` have no immediate AI search teaser motivating account creation, and any future move to a separate Render Free RAG service would introduce 30–60s cold starts and split-stack operational overhead.

## Open Questions

- [NEEDS CLARIFICATION: Should cache hits in the shared query-answer cache bypass the user's daily quota deduction, or count against the daily cap?]
- [NEEDS CLARIFICATION: Should the shared query-answer cache TTL default to 7 days or 30 days, and how should cache staleness be handled when new studies are published?]
- [NEEDS CLARIFICATION: How should the "Ask AI" entrypoint on the main feed (`/`) behave for signed-in vs. logged-out users relative to `/search`?]
- [NEEDS CLARIFICATION: Should AI synthesis responses stream incrementally to the client or return a complete response payload?]
- [NEEDS CLARIFICATION: Are provider model identifiers and daily quota limits expected to be runtime-configurable via environment variables, and are the Groq, OpenRouter ($10 credit), and Gemini API keys already provisioned?]
- [NEEDS CLARIFICATION: Does `001-sbl-news-mvp` Constitution Principle I need a MINOR amendment to replace the Render Free RAG / Gemini-only AI wording with the unified Next.js + Groq/OpenRouter/Gemini failover stack?]
