# Phase 1 Data Model: Brand Logo and Favicon Integration (`002-brand-logo-favicon`)

**Date**: 2026-11-26  
**Branch**: `002-brand-logo-favicon`  
**Spec**: [spec.md](./spec.md)

## Database Schema Impact

**No PostgreSQL schema changes or migrations are required.**

This feature is strictly a frontend static asset, component, and metadata integration inside `/web`. All existing Supabase PostgreSQL tables (`studies`, `living_guidelines`, `consensus_drift_alerts`, `profiles`, `votes`, `comments`, `secondary_commentaries`), RLS policies, and `STUDY_SUMMARY_COLUMNS` egress projections remain unchanged.

---

## Static Asset & Component Model (`/web`)

### 1. Static Brand Assets (`web/public/`)

| Asset Path (Repo) | Public URL | Dimensions | Format | Purpose |
|-------------------|------------|------------|--------|---------|
| `web/public/img/logo.png` | `/img/logo.png` | `512x512` (nearest-neighbor optimized from `1536x1536`) | PNG | Canonical brand emblem for sticky top bar, page headers, empty-state callouts, modern `<link rel="icon" type="image/png">`, and OpenGraph/Twitter card metadata |
| `web/public/favicon.ico` | `/favicon.ico` | `16x16`, `32x32` multi-resolution | ICO | Legacy/default browser favicon fallback (`/favicon.ico`) |
| `web/public/apple-touch-icon.png` | `/apple-touch-icon.png` | `180x180` | PNG | iOS/Android home-screen & bookmark touch icon |

**Validation Rules**:
- Every static asset MUST be derived from `web/public/img/logo.png` using nearest-neighbor resampling so pixel edges remain crisp without anti-aliased blur.
- Each served asset MUST be `< 100 KB` (target `< 50 KB`) to safeguard page load speed and bandwidth under `images: { unoptimized: true }`.

---

### 2. `BrandLogo` UI Component Model (`web/src/components/layout/brand-logo.tsx`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "md" \| "lg"` | `"sm"` | `"sm"` (`32x32` / `h-8 w-8`) for sticky top bar; `"md"` (`40x40` / `h-10 w-10`) for section headers & empty-state callouts; `"lg"` (`48x48` / `h-12 w-12`) for hero documentation headers (`/methodology`) |
| `alt` | `string` | `""` | Accessible alt text. MUST default to `""` (with `aria-hidden="true"`) when paired with adjacent `"SBL News"` text inside a link or heading to prevent duplicate screen-reader announcements |
| `className` | `string \| undefined` | `undefined` | Optional Tailwind utility overrides merged via `cn()` |

**Visual Invariants (Constitution Principle III)**:
- Container frame: `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm border-2 border-ink bg-surface shadow-[2px_2px_0px_#0F172A]`
- Image rendering: `h-full w-full object-contain [image-rendering:pixelated]`
- Zero purple/violet/indigo hues, gradients, or blurred drop shadows.
