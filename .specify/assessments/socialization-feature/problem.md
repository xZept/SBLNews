# Problem Definition: Lightweight Community Connection & Study Sharing

- **Slug**: socialization-feature
- **Created**: 2026-11-27T17:05:58+08:00
- **Inputs used**: intake.md, research.md

## Problem Statement

Evidence-based lifters, coaches, and researchers using SBL News currently have no way to discover top community contributors from the main feed, share or discuss studies directly with peers on the platform, or share studies externally with rich site-attributed previews. As a result, community engagement remains isolated to individual study comment threads, limiting peer-to-peer knowledge exchange and organic word-of-mouth discovery.

## Affected Users & Stakeholders

- **Users**:
  - **Signed-in lifters, strength coaches, clinicians, researchers, and students (`public.community_role_type`)** — cannot connect with peers, send a study directly to another user, or converse outside public study comment threads.
  - **Active community contributors** — receive no visibility on the main feed for their participation, making it harder for readers to find knowledgeable peers to follow or inspect.
  - **Readers sharing studies externally** — lack one-click study sharing with rich, site-attributed previews when posting links to external platforms.
- **Stakeholders**:
  - **Project owner / product maintainer** — wants recognizable, lightweight social mechanics that differentiate SBL News without competing with full-scale social networks (like Reddit), violating the 8-route scope, or exceeding $0/month free-tier budgets.
  - **Privacy-conscious community members** — affected if public profile visibility expands to expose previously private activity (such as upvoted or viewed studies).

## Goals

- Enable users to discover noteworthy community contributors directly from the main research experience and inspect their public activity.
- Enable lightweight peer-to-peer connection and study exchange between users without turning SBL News into a general-purpose social network.
- Make sharing studies externally effortless while preserving clear attribution and rich context back to SBL News.
- Preserve SBL News's core identity as a fast, evidence-first research feed within $0/month free-tier operational limits and Neo-Brutalist Sky Blue design standards.

## Non-Goals

- Competing with or replicating full-scale social media platforms (e.g., Reddit-style user-generated link feeds, algorithmic social timelines, or open public group forums).
- Replacing primary peer-reviewed literature with user-generated posts on the main feed (Constitution Principle II).
- Introducing paid third-party messaging, real-time infrastructure, or high-egress tracking that breaks the $0/month hobby-tier architecture (Constitution Principles I & IV).
- [NEEDS CLARIFICATION: Whether passive study page views ("see what they view") are required, or whether showing intentional interactions (comments, upvotes, shared studies) satisfies the goal without privacy/egress risk.]

## Success Metrics

- **External study share adoption**: Share-action clicks and referral traffic back to `/study/[id]` from external platforms (baseline: 0, no share action or per-study Open Graph metadata exists today).
- **Contributor discovery engagement**: Click-through rate from the top-users display to `/profile/[id]` (baseline: 0, no top-users display exists today).
- **Peer-to-peer exchange**: Number of friend connections formed, studies sent between users, and messages exchanged per active user (baseline: 0, no social graph or messaging exists today).
- **Free-tier & performance compliance**: 0 regressions to `/` ISR caching, <= 5 GB monthly Supabase egress, and 0 unapproved privacy leaks of private user data (baseline: current `003-user-profiles` compliance).

## Cost of Inaction

- SBL News remains a largely solitary reading tool with public comment threads; users who want to discuss or share a study with a training partner or coach must leave the site and paste unformatted links with generic site-level previews.
- Active, high-signal contributors remain invisible unless a reader happens to open the same `/study/[id]` thread, reducing community stickiness and peer discovery.
- External shares fail to showcase the study's title, journal, or evidence takeaway in link previews, missing an organic growth channel.

## Open Questions

- [NEEDS CLARIFICATION: What criteria should rank "Top Users" (e.g., public comment count, comment/study engagement, or a rolling 7/30-day contribution score)?]
- [NEEDS CLARIFICATION: Should "see what they interact and view" on `/profile/[id]` expose only intentional interactions (comments, upvotes, shared studies—publicly, opt-in, or friends-only) or also passive reading/view history?]
- [NEEDS CLARIFICATION: What is the acceptable boundary for "lightweight" chat and friend requests—e.g., study-focused 1:1 messaging inside an in-app drawer vs. standalone messaging routes, and what abuse/blocking controls are needed?]
- [NEEDS CLARIFICATION: Which external platforms and share formats are highest priority (e.g., Copy link + citation snippet, X/Twitter, Reddit, WhatsApp/Discord via Web Share API + dynamic Open Graph cards)?]
- [NEEDS CLARIFICATION: What prompted the desire for socialization features now (retention, peer collaboration, or external growth)?]
