# Phase 0 Research: Brand Logo and Favicon Integration (`002-brand-logo-favicon`)

**Date**: 2026-11-26  
**Branch**: `002-brand-logo-favicon`  
**Spec**: [spec.md](./spec.md)

## 1. Canonical Brand Asset Analysis & Bandwidth Optimization

- **Decision**: Keep `web/public/img/logo.png` as the canonical public path (`/img/logo.png`), optimize its dimensions/encoding with nearest-neighbor scaling (`512x512` PNG) so it stays well under 100 KB, and generate standard nearest-neighbor icon derivatives (`web/public/favicon.ico` containing `16x16` + `32x32` frames and `web/public/apple-touch-icon.png` at `180x180`).
- **Rationale**:
  - Inspection of `web/public/img/logo.png` shows a `1536x1536` pixel-art emblem weighing `3,621,789` bytes (~3.45 MB).
  - Because `web/next.config.ts` sets `images: { unoptimized: true }` for static/Vercel Hobby portability, serving a raw 3.45 MB PNG in the sticky top bar on every page load and tab favicon fetch would consume unnecessary bandwidth and slow initial rendering.
  - Resizing `web/public/img/logo.png` with nearest-neighbor interpolation (`Image.Resampling.NEAREST`) to `512x512` (and deriving `180x180` Apple touch icon + `16x16`/`32x32` `.ico`) preserves 100% of the pixel-art grid sharpness while cutting payload size by >97% (to `< 50 KB`).
- **Alternatives considered**:
  - *Enable Next.js runtime image optimization (`/_next/image`)*: Rejected because `unoptimized: true` is intentionally configured for zero-cost static/Hobby predictability, and Next.js runtime resizers use bilinear/bicubic smoothing that blurs pixel art.
  - *Serve the 3.45 MB file unmodified*: Rejected because loading a 3.45 MB favicon and sticky header icon violates Principle IV performance and bandwidth discipline.

## 2. Crisp Pixel-Art Rendering in Neo-Brutalist Containers

- **Decision**: Render the brand emblem through a reusable `<BrandLogo />` component (`web/src/components/layout/brand-logo.tsx`) styled with `[image-rendering:pixelated]`, `2px solid #0F172A` borders (`border-2 border-ink`), `rounded-sm` (`4px` max badge radius) or `rounded-md` (`6px` max container radius), `#FFFFFF` surface fill (`bg-surface`), and a hard offset shadow (`shadow-[2px_2px_0px_#0F172A]`).
- **Rationale**:
  - Browsers default to smooth bilinear scaling when downscaling images (e.g., from `512x512` to `32x32` CSS pixels), which causes anti-aliased muddiness on pixel art (Edge Case 1, FR-006).
  - Applying CSS `image-rendering: pixelated` (`[image-rendering:pixelated]`) forces crisp nearest-neighbor downscaling across desktop and mobile DPI ratios.
  - Framing the emblem inside a `border-2 border-ink bg-surface shadow-[2px_2px_0px_#0F172A]` container integrates the white background of `logo.png` seamlessly into the Neo-Brutalist Sky Blue design system (Constitution Principle III).
- **Alternatives considered**:
  - *Unframed transparent float*: `logo.png` has a solid `#FFFFFF` background corners around its pixel circle; framing it in a `border-2 border-ink bg-surface rounded-sm shadow-[2px_2px_0px_#0F172A]` box matches the existing monogram geometry and turns the white canvas into an intentional Neo-Brutalist surface tile.

## 3. Next.js App Router Favicon, Touch Icon & Social Metadata Configuration

- **Decision**: Configure `metadata.icons`, `metadata.openGraph`, and `metadata.twitter` centrally in `web/src/app/layout.tsx` referencing `/img/logo.png`, `/favicon.ico`, and `/apple-touch-icon.png`.
- **Rationale**:
  - Every page across all 6 MVP routes (`/`, `/study/[id]`, `/guidelines`, `/search`, `/methodology`, `/admin/review`) is wrapped by `RootLayout` in `web/src/app/layout.tsx`.
  - Declaring `icons` (`icon`, `shortcut`, `apple`), `openGraph.images`, and `twitter.images` in `RootLayout` ensures child pages that override `title` and `description` (such as `/guidelines`) automatically inherit the site's favicon, Apple touch icon, and brand preview image unless explicitly overridden.
- **Alternatives considered**:
  - *Per-page `<Head>` tags*: Rejected because Next.js 15 App Router uses the static/dynamic `Metadata` API in `layout.tsx`, which automatically emits deduplicated `<link rel="icon">`, `<link rel="apple-touch-icon">`, and `<meta property="og:image">` tags.

## 4. Accessibility & Screen-Reader De-duplication in Sticky Top Bar

- **Decision**: In `TopNav` (`web/src/components/layout/top-nav.tsx`), render the logo inside the `<Link href="/">` alongside `<span>SBL News</span>` with `alt=""` and `aria-hidden="true"` on the decorative image element.
- **Rationale**:
  - W3C WAI-ARIA best practices and SC-003 state that when an image and text are combined inside a single link pointing to the same destination (`/`), the image MUST have an empty `alt=""` (and `aria-hidden="true"`) so assistive technologies announce the link as `"SBL News, link"` rather than `"SBL News logo SBL News, link"`.
- **Alternatives considered**:
  - *Setting `alt="SBL News"` on the image inside the link*: Rejected because screen readers concatenate the image alt text and the span text inside the anchor, failing SC-003 and Edge Case 3.

## 5. Supporting Webpage Sections vs. Functional Action Icons

- **Decision**: Integrate `<BrandLogo />` into site-level editorial headers and empty-state brand callouts (`/methodology` page header, `/guidelines` page header, and empty-state cards on `/` and `/search`), while leaving all functional UI icons (`Search`, `ShieldCheck`, `LogOut`, `ArrowBigUp`, `ArrowLeft`, `RotateCcw`, `AlertTriangle`, `ExternalLink`) as Lucide vector icons.
- **Rationale**:
  - Fulfils User Story 3, FR-004, and FR-005 by visually anchoring secondary documentation/guideline hubs and empty states with the official brand emblem while keeping functional controls unambiguous.
- **Alternatives considered**:
  - *Replacing functional badge or button icons with the brand logo*: Explicitly prohibited by FR-005.
