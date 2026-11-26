# Bug Fix: Gate TopNav Admin Link on `profiles.role === "admin"`

- **Slug**: rbac-issue
- **Fixed**: 2026-11-26T22:10:59+08:00
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Updated `TopNav` to query the signed-in user's `profiles.role` from Supabase and gate the `/admin/review` navigation link on `isAdmin`, so newly created `member` accounts no longer see the `Admin` button in the navbar.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `web/src/components/layout/top-nav.tsx` | modified | Added `fetchIsAdmin()` helper, `isAdmin` state synced on session load/auth changes/sign-out, and `{isAdmin && (<Link href="/admin/review">...)}` guard |
| `web/tests/top-nav.test.ts` | added test | Added 5 unit tests covering `fetchIsAdmin()` (`member`, `admin`, error/null) and `TopNav` `/admin/review` gating |

## Diff Highlights (optional)

```tsx
export async function fetchIsAdmin(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single<{ role: string }>();

  if (error || !data) {
    return false;
  }

  return data.role === "admin";
}
```

```tsx
{isAdmin && (
  <Link
    href="/admin/review"
    ...
  >
    <ShieldCheck className="h-3.5 w-3.5" />
    <span>Admin</span>
  </Link>
)}
```

## Tests Added or Updated

- `web/tests/top-nav.test.ts` — Verifies `fetchIsAdmin` returns `false` for `member`, `true` for `admin`, `false` on error/null profile, and verifies `TopNav` gates `/admin/review` on `isAdmin`.

## Local Verification

- Commands run: `Push-Location web; npm test; if ($LASTEXITCODE -eq 0) { npm run typecheck }; Pop-Location` → `vitest run` passed (6 test files, 29 tests passed); `tsc --noEmit` exited with code 0.
- Manual checks: Not run against a live browser/Supabase instance in this step.

## Deviations from Assessment

None.

## Follow-ups

- Optionally run `/speckit-bug-test slug=rbac-issue` to verify against a live local/staging Supabase signup flow.
