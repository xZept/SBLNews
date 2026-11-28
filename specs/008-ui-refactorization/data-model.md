# Data Model: 16-Bit Retro-RPG Neo-Brutalist UI Refactorization

**Feature**: `008-ui-refactorization`  
**Date**: 2026-11-29  

## Overview

`008-ui-refactorization` is a pure `/web` design-system, primitive-component, pixel-iconography, typography, and layout-craft refactorization. It introduces **zero** PostgreSQL database schema changes or migrations—reusing `public.profiles.theme_preference` (`'light' | 'dark'`) and all existing study, guideline, social, and AI search projections.

Below are the normative design-token data structures, component variant models, and pixel-icon contracts governing `/web`.

---

## 1. Design Token Model (`web/src/app/globals.css`)

### 1.1 Surface, Ink, Border & Shadow Tokens

| CSS Custom Property | Tailwind Utility | Light Mode (`:root` Default) | Opt-In Dark Mode (`:root[data-theme="dark"]`) | Role |
|---------------------|------------------|------------------------------|-----------------------------------------------|------|
| `--color-canvas` | `bg-canvas` / `text-canvas` | `#F8FAFC` | `#0B1120` | Primary page background canvas |
| `--color-surface` | `bg-surface` / `text-surface` | `#FFFFFF` | `#1E293B` | Card, HUD bar, input, and dialog surface |
| `--color-ink` | `text-ink` / `bg-ink` / `border-ink` | `#0F172A` | `#F8FAFC` | Primary high-contrast reading text |
| `--color-muted` | `text-muted` | `#475569` | `#94A3B8` | Secondary metadata and muted captions |
| `--color-accent` | `bg-accent` / `text-accent` / `border-accent` | `#38BDF8` | `#38BDF8` | Primary Sky Blue interactive accent |
| `--color-accent-ink` | `text-accent-ink` / `border-accent-ink` | `#0F172A` | `#0F172A` | Dark ink text/border paired with Sky Blue `#38BDF8` and pastel badges |
| `--color-border` | `border-border` / `outline-border` | `#0F172A` | `#E2E8F0` | Structural `2px solid` frames |
| `--color-shadow` | *(internal shadow color variable)* | `#0F172A` | `#020617` | Zero-blur hard shadow offset fill |
| `--shadow-card` | `shadow-card` | `4px 4px 0px #0F172A` | `4px 4px 0px #020617` | Primary card & dialog offset shadow |
| `--shadow-control` | `shadow-control` | `2px 2px 0px #0F172A` | `2px 2px 0px #020617` | Button, input, avatar, and pill offset shadow |
| `--shadow-rpg-dialog` | `.rpg-dialog-frame` | `inset 0 0 0 2px var(--color-surface), inset 0 0 0 4px var(--color-border), 4px 4px 0px var(--color-shadow)` | Same (resolves `#1E293B` inset gap, `#E2E8F0` inner border, `#020617` drop shadow) | Double-frame 16-bit RPG dialog inset border for priority containers |

### 1.2 Semantic Evidence & Transparency Badge Tokens (Identical in Light & Dark Mode)

All 5 semantic badges enforce `border-[1.5px] border-accent-ink` (`1.5px solid #0F172A`), `text-accent-ink` (`#0F172A`), and `font-mono` (`JetBrains Mono`) in both themes:

| CSS Custom Property | `Badge` Variant | Hex Fill | Meaning |
|---------------------|-----------------|----------|---------|
| `--color-badge-meta` | `variant="meta"` | `#A7F3D0` | Meta-Analysis / Systematic Review (`Grade A`) |
| `--color-badge-rct` | `variant="rct"` | `#BAE6FD` | Randomized Controlled Trial (`>= 8w`, Human, `Grade B`) |
| `--color-badge-trained` | `variant="trained"` | `#FDE68A` | Resistance-Trained Lifters Population (`Grade C`, Drift Alert) |
| `--color-badge-fulltext` | `variant="fulltext"` | `#BBF7D0` | Open-Access Full-Text Inspection |
| `--color-badge-abstract` | `variant="abstract"` | `#FED7AA` | Abstract-Only Inspection Warning / Limitations Callout (`Grade D`) |

### 1.3 Typography Role Tokens

| CSS Custom Property | Tailwind Utility | Font Family (`next/font/google`) | Allowed Scope (`FR-007`) |
|---------------------|------------------|----------------------------------|--------------------------|
| `--font-pixel` | `font-pixel` | `Silkscreen` (fallback `JetBrains Mono`, `monospace`) | Strictly `SBL NEWS` brand wordmark, page/hub banners, and uppercase arcade HUD labels |
| `--font-display` | `font-display` | `Space Grotesk` (`700`/`800`, `-0.025em` tracking) | Study titles, card headings, and section headers |
| `--font-sans` | `font-sans` | `Inter` (`65ch–75ch` max measure) | Body copy, 2-sentence study takeaways, AI synthesis prose, comments |
| `--font-mono` | `font-mono` | `JetBrains Mono` (`400`/`600`/`700`) | Badges, study metrics (`n=48`, `10w`, `Score 88`), upvote counts, avatar initials, timestamps, quota counters |

---

## 2. Primitive Component & Variant Models (`web/src/components/ui/*`)

### 2.1 `Card` Component (`web/src/components/ui/card.tsx`)

```ts
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * "default": Standard 2px border + 4px hard offset shadow (character sheet / study card).
   * "dialog": Double-frame RPG dialog inset border (--shadow-rpg-dialog) for priority containers
   *           (Ask AI panel, Study Detail header, Guidelines Core Hubs, Consensus Drift alerts).
   */
  variant?: "default" | "dialog";
}
```

### 2.2 `Button` Component (`web/src/components/ui/button.tsx`)

- **Base Geometry & Press Physics**:
  - `border-2 border-border shadow-control transition-transform duration-75 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`
  - Corner radius: `rounded-sm` (`2px–4px`) by default, never exceeding `rounded-md` (`6px`).
- **Variants**:
  - `primary`: `bg-accent text-accent-ink hover:bg-accent/90`
  - `secondary`: `bg-surface text-ink hover:bg-canvas`
  - `ghost`: `border-transparent shadow-none hover:border-border hover:bg-surface active:translate-x-0 active:translate-y-0`
  - `warning`: `bg-badge-abstract text-accent-ink hover:bg-badge-abstract/90`

### 2.3 Inline Pixel SVG Icon Contract (`web/src/components/ui/pixel-icons.tsx`)

```ts
export interface PixelIconProps extends React.SVGProps<SVGSVGElement> {
  /** Optional pixel dimension override (defaults to 16x16 viewBox, sized via Tailwind h-* w-* classes). */
  size?: number | string;
}
```

- **Invariants (`FR-009`, `SC-003`)**:
  - Every icon renders an inline `<svg viewBox="0 0 16 16" shapeRendering="crispEdges" fill="currentColor" ...>` (or `24x24` grid) composed exclusively of rectilinear pixel-grid `<path>` / `<rect>` coordinates.
  - Serialized SVG markup for every icon MUST be `< 2,048` bytes (`< 2 KB`).
  - Zero runtime imports from `lucide-react` in application components.

---

## 3. Theme Preference State Lifecycle (`web/src/lib/theme.ts` & `AccountProfileProvider`)

| Visitor State | Initial Render Theme | Storage / DB Persistence | Sign-Out Behavior |
|---------------|----------------------|--------------------------|-------------------|
| New / Unauthenticated Visitor | `light` (`#F8FAFC` canvas) regardless of OS `prefers-color-scheme` | None (`localStorage["sbl_theme"]` cleared on unauthenticated load) | N/A |
| Authenticated Member (`theme_preference = 'light'`) | `light` | `localStorage["sbl_theme"] = "light"` + `public.profiles.theme_preference = 'light'` | Resets DOM to `light` and removes `localStorage["sbl_theme"]` |
| Authenticated Member (`theme_preference = 'dark'`) | `dark` (`:root[data-theme="dark"]`, `#0B1120` canvas) | `localStorage["sbl_theme"] = "dark"` + `public.profiles.theme_preference = 'dark'` | Immediately resets DOM to `light` and removes `localStorage["sbl_theme"]` without mutating DB preference |
