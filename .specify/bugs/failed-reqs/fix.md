# Bug Fix: Externalize @supabase Packages and Rebuild .next

- **Slug**: failed-reqs
- **Fixed**: 2026-11-26T22:04:00+08:00
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Configured `serverExternalPackages` in `web/next.config.ts` to externalize `@supabase/supabase-js` and `@supabase/ssr` on the server, cleared the stale `web/.next` build/cache directory, and added a Vitest regression test.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `web/next.config.ts` | modified | Added `serverExternalPackages: ["@supabase/supabase-js", "@supabase/ssr"]` |
| `web/tests/next-config.test.ts` | added test | Verifies `@supabase/supabase-js` and `@supabase/ssr` are in `nextConfig.serverExternalPackages` |

## Diff Highlights

```ts
const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["@supabase/supabase-js", "@supabase/ssr"],
};
```

## Tests Added or Updated

- `web/tests/next-config.test.ts::externalizes @supabase/supabase-js and @supabase/ssr on the server` — pins `serverExternalPackages` configuration in `web/next.config.ts`.

## Local Verification

- Commands run:
  - `Remove-Item -Recurse -Force web/.next` → cleared stale build/cache directory
  - `npm test` (in `web/`) → 5 test files passed, 24 tests passed
  - `npm run typecheck` (in `web/`) → passed with exit code 0
  - `npm run build` (in `web/`) → compiled and generated all routes including `/study/[id]`
  - `Select-String -Pattern "vendor-chunks/@supabase"` on `web/.next/server` → 0 matches

## Deviations from Assessment

None.

## Follow-ups

- Run `/speckit-bug-test slug=failed-reqs` to verify `/study/[id]` at runtime in the server.
