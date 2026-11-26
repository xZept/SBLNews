# Contract: Brand Assets, Document Metadata & UI Placements (`002-brand-logo-favicon`)

**Date**: 2026-11-26  
**Branch**: `002-brand-logo-favicon`

## 1. Public Static Asset Contract

The `/web` application MUST serve the following static assets with HTTP `200 OK`:

| Public Route | Content-Type | Resolution | Source |
|--------------|--------------|------------|--------|
| `/img/logo.png` | `image/png` | `512x512` (nearest-neighbor pixel-art) | Canonical asset `web/public/img/logo.png` |
| `/favicon.ico` | `image/x-icon` | `16x16` & `32x32` | Derived from `web/public/img/logo.png` |
| `/apple-touch-icon.png` | `image/png` | `180x180` | Derived from `web/public/img/logo.png` |

---

## 2. Root Document Metadata Contract (`web/src/app/layout.tsx`)

`RootLayout` MUST export a Next.js `Metadata` object that emits the following icon and social-preview metadata across all 6 MVP routes (`/`, `/study/[id]`, `/guidelines`, `/search`, `/methodology`, `/admin/review`):

```ts
export const metadata: Metadata = {
  title: "SBL News — Science-Based Lifting Research Feed & Evidence Matrix",
  description:
    "Daily peer-reviewed resistance training, hypertrophy, and strength research with deterministic evidence scoring and living training guidelines.",
  icons: {
    icon: [
      { url: "/img/logo.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: ["/img/logo.png"],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "SBL News — Science-Based Lifting Research Feed & Evidence Matrix",
    description:
      "Daily peer-reviewed resistance training, hypertrophy, and strength research with deterministic evidence scoring and living training guidelines.",
    siteName: "SBL News",
    type: "website",
    images: [
      {
        url: "/img/logo.png",
        width: 512,
        height: 512,
        alt: "SBL News — Science-Based Lifting News emblem",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "SBL News — Science-Based Lifting Research Feed & Evidence Matrix",
    description:
      "Daily peer-reviewed resistance training, hypertrophy, and strength research with deterministic evidence scoring and living training guidelines.",
    images: ["/img/logo.png"],
  },
};
```

---

## 3. UI Component & Route Placement Contract

### 3.1 Sticky Top Navigation Bar (`web/src/components/layout/top-nav.tsx`)

- **Placement**: Left primary brand anchor `<Link href="/">` in the sticky `<header>`.
- **Replacement**: Replaces the temporary `<span ...>SBL</span>` text monogram with `<BrandLogo size="sm" />`.
- **Accessibility Contract (SC-003)**:
  - The `<Link href="/">` contains `<BrandLogo size="sm" />` (which renders `<img src="/img/logo.png" alt="" aria-hidden="true" ... />`) followed by `<span>SBL News</span>`.
  - Accessible name of the link MUST resolve strictly to `"SBL News"`.

### 3.2 Supporting Page Headers & Callouts (FR-004, FR-005)

| Route / Component | Placement | Size | Decorative (`alt=""`) | Notes |
|-------------------|-----------|------|-----------------------|-------|
| `/methodology` (`web/src/app/methodology/page.tsx`) | Left of `"Methodology & Transparency Standards"` `<h1>` in page `<header>` | `lg` (`48x48`) | Yes (`alt=""`, `aria-hidden="true"`) | Visual editorial seal for the Transparency Hub |
| `/guidelines` (`web/src/app/guidelines/page.tsx`) | Left of `"Training Guidelines"` `<h1>` in page `<header>` | `md` (`40x40`) | Yes (`alt=""`, `aria-hidden="true"`) | Visual seal for the Living Evidence Matrix |
| `/search` (`web/src/app/search/page.tsx`) & `/` (`web/src/components/feed/feed-client.tsx`) | Centered above empty-state `"No matching studies found"` heading inside empty-state `<Card>` | `md` (`40x40`) | Yes (`alt=""`, `aria-hidden="true"`) | Branded empty-state callout |

### 3.3 Non-Replacement Invariant (FR-005)

Functional action and status icons MUST NOT be replaced with `/img/logo.png`. Specifically:
- `Search`, `ShieldCheck`, `LogOut` in `top-nav.tsx`
- `ArrowBigUp` in `upvote-button.tsx`
- `ArrowLeft` in `study/[id]/page.tsx`
- `Search`, `RotateCcw`, `AlertTriangle` in `search/page.tsx`
- `ShieldCheck` in `admin/review/page.tsx`
