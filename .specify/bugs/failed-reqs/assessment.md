# Bug Assessment: /study/[id] 500 Error Due to Missing @supabase Vendor Chunk

- **Slug**: failed-reqs
- **Created**: 2026-11-26T22:02:00+08:00
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

> Requests to /study/[id] fail with a 500 error (Cannot find module './vendor-chunks/@supabase.js') due to a corrupted .next webpack server cache or missing @supabase external package configuration in web/next.config.ts.

## Symptom

Requests to `/study/[id]` fail at runtime with an HTTP 500 error: `Cannot find module './vendor-chunks/@supabase.js'`. The expected behavior is that `/study/[id]` renders the study detail page (`StudyDetailPage`) with study metadata, secondary commentaries, and the discussion thread.

## Reproduction

1. Run the Next.js app in `web/` (`npm run dev` or `npm run build && npm run start`).
2. Inspect `web/.next/server/vendor-chunks/` and `web/.next/server/app/study/[id]/page.js`.
   - Observed in current workspace: `web/.next/server/app/study/[id]/page.js:588` (as well as `app/page.js:544`, `app/guidelines/page.js:445`, `app/methodology/page.js:379`, and `app/search/page.js:555`) references `vendor-chunks/@supabase.js`, while `web/.next/server/vendor-chunks/` only contains `@radix-ui.js`, `@swc.js`, `lucide-react.js`, and `next.js` (`@supabase.js` is absent).
3. Request `/study/[id]` (or other server-rendered routes importing `@supabase/*`); Next.js server rendering throws `Cannot find module './vendor-chunks/@supabase.js'` and returns 500.

## Suspected Code Paths

- `web/next.config.ts:3-7` — `nextConfig` only sets `images: { unoptimized: true }` and does not configure `serverExternalPackages` for `@supabase/supabase-js` or `@supabase/ssr`.
- `web/src/lib/supabase/server.ts:1-2` — Server-side Supabase helpers import `@supabase/ssr` and `@supabase/supabase-js` into Server Components and server query modules.
- `web/src/app/study/[id]/page.tsx:12,22,35` — `StudyDetailPage` (`force-dynamic`) calls `getStudyDetail(id)` and `createClient()`, pulling `@supabase/*` into the `/study/[id]` server bundle.
- `web/src/lib/queries/studies.ts:2` — Imports `createClient` and `createPublicClient` from `@/lib/supabase/server`.
- `web/.next/server/app/study/[id]/page.js:588` & `web/.next/server/vendor-chunks/` — Compiled server bundle references `./vendor-chunks/@supabase.js`, which is missing from `web/.next/server/vendor-chunks/`.

## Root Cause Hypothesis

In Next.js 15 (`next: ^15.2.4`), webpack's server-side `splitChunks` configuration extracts `@supabase/ssr` and `@supabase/supabase-js` into a shared `./vendor-chunks/@supabase.js` chunk by default when they are not marked as external. When `web/.next` becomes stale or partially overwritten (e.g., mismatched timestamps between `web/.next/cache`, `web/.next/server`, and `BUILD_ID`, or switching/interrupting `next dev` / `next build`), route bundles such as `web/.next/server/app/study/[id]/page.js` still require `./vendor-chunks/@supabase.js`, but the chunk file is missing from `web/.next/server/vendor-chunks/`, causing a 500 `MODULE_NOT_FOUND` error across `/study/[id]` and other SSR routes. Confidence: high.

## Proposed Remediation

**Preferred**:
1. Add `serverExternalPackages: ["@supabase/supabase-js", "@supabase/ssr"]` to `nextConfig` in `web/next.config.ts` so Next.js resolves `@supabase/*` natively from `node_modules` on the server instead of emitting and requiring `./vendor-chunks/@supabase.js`.
2. Clean `web/.next` (delete the corrupted `.next` build/cache directory) and rebuild/restart the Next.js server so no stale references to `./vendor-chunks/@supabase.js` remain.

**Alternatives**:
- Clean `web/.next` only (without editing `web/next.config.ts`) — *Trade-off*: resolves the immediate corrupted cache, but leaves `@supabase/*` bundled into `vendor-chunks/@supabase.js` and vulnerable to recurring cache/chunk-splitting desyncs in `next dev`.

**Files likely to change**:
- `web/next.config.ts`
- `web/tests/` (new or updated config/regression test)

**Tests to add or update**:
- Add a Vitest unit/config test verifying `nextConfig.serverExternalPackages` includes `@supabase/supabase-js` and `@supabase/ssr`.
- Run `npm run build` (after clearing `web/.next`) and verify `web/.next/server/app/study/[id]/page.js` does not reference `vendor-chunks/@supabase.js` and `/study/[id]` responds without `MODULE_NOT_FOUND`.

## Risks & Considerations

- **Runtime compatibility**: `@supabase/supabase-js` and `@supabase/ssr` are standard Node-compatible packages in `web/package.json` (`^2.49.1` and `^0.6.1`), so externalizing them on the server is supported by Next.js 15 `serverExternalPackages` without affecting client bundles.
- **Blast radius**: This issue also affects `/`, `/guidelines`, `/methodology`, and `/search` in the current `web/.next/server/app/` output because they also reference `vendor-chunks/@supabase.js`.
- **Clean rebuild required**: Existing `web/.next` artifacts must be removed so stale server chunks are not served.

## Open Questions

- None.
