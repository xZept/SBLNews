import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Space_Grotesk: () => ({ variable: "--font-space-grotesk" }),
  Inter: () => ({ variable: "--font-inter" }),
  JetBrains_Mono: () => ({ variable: "--font-jetbrains-mono" }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement("a", { href, ...props }, children),
}));

import { BrandLogo } from "../src/components/layout/brand-logo";
import { TopNav } from "../src/components/layout/top-nav";
import { metadata as rootMetadata } from "../src/app/layout";
import MethodologyPage from "../src/app/methodology/page";

const PUBLIC_DIR = path.resolve(__dirname, "../public");

describe("BrandLogo component & Neo-Brutalist styling (T005)", () => {
  it("renders /img/logo.png with pixel-art rendering and Neo-Brutalist border/shadow classes", () => {
    const html = renderToStaticMarkup(React.createElement(BrandLogo));

    expect(html).toContain('src="/img/logo.png"');
    expect(html).toContain("[image-rendering:pixelated]");
    expect(html).toContain("border-2");
    expect(html).toContain("border-ink");
    expect(html).toContain("bg-surface");
    expect(html).toContain("rounded-sm");
    expect(html).toContain("shadow-[2px_2px_0px_#0F172A]");
    expect(html).toContain("h-8 w-8");
  });

  it("supports sm, md, and lg size variants", () => {
    const smHtml = renderToStaticMarkup(
      React.createElement(BrandLogo, { size: "sm" })
    );
    const mdHtml = renderToStaticMarkup(
      React.createElement(BrandLogo, { size: "md" })
    );
    const lgHtml = renderToStaticMarkup(
      React.createElement(BrandLogo, { size: "lg" })
    );

    expect(smHtml).toContain("h-8 w-8");
    expect(mdHtml).toContain("h-10 w-10");
    expect(lgHtml).toContain("h-12 w-12");
  });

  it("defaults to decorative alt='' and aria-hidden='true', and omits aria-hidden when alt is provided", () => {
    const decorativeHtml = renderToStaticMarkup(React.createElement(BrandLogo));
    expect(decorativeHtml).toContain('alt=""');
    expect(decorativeHtml).toContain('aria-hidden="true"');

    const labeledHtml = renderToStaticMarkup(
      React.createElement(BrandLogo, { alt: "SBL News emblem" })
    );
    expect(labeledHtml).toContain('alt="SBL News emblem"');
    expect(labeledHtml).not.toContain('aria-hidden="true"');
  });

  it("renders BrandLogo inside TopNav home link with single-label accessibility", () => {
    const html = renderToStaticMarkup(React.createElement(TopNav));

    expect(html).toContain('href="/"');
    expect(html).toContain('src="/img/logo.png"');
    expect(html).toContain('alt=""');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("<span>SBL News</span>");
    expect(html).not.toContain(">SBL<");
  });
});

describe("Static brand assets & RootLayout icon metadata (T007)", () => {
  it("provides optimized static assets under 100 KB (target < 50 KB)", () => {
    const assets = [
      "img/logo.png",
      "favicon.ico",
      "apple-touch-icon.png",
    ] as const;

    for (const relPath of assets) {
      const fullPath = path.join(PUBLIC_DIR, relPath);
      expect(fs.existsSync(fullPath)).toBe(true);
      const bytes = fs.statSync(fullPath).size;
      expect(bytes).toBeGreaterThan(0);
      expect(bytes).toBeLessThan(100 * 1024);
      expect(bytes).toBeLessThan(50 * 1024);
    }
  });

  it("configures RootLayout metadata.icons for /img/logo.png, /favicon.ico, and /apple-touch-icon.png", () => {
    const icons = rootMetadata.icons as {
      icon: Array<{ url: string; type?: string; sizes?: string }>;
      shortcut: string[];
      apple: Array<{ url: string; type?: string; sizes?: string }>;
    };

    expect(icons.icon).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: "/img/logo.png",
          type: "image/png",
          sizes: "512x512",
        }),
        expect.objectContaining({
          url: "/favicon.ico",
          sizes: "any",
        }),
      ])
    );
    expect(icons.shortcut).toContain("/img/logo.png");
    expect(icons.apple).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: "/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
        }),
      ])
    );
  });
});

describe("Social metadata & supporting page placements (T012)", () => {
  it("configures RootLayout openGraph and twitter images to /img/logo.png", () => {
    expect(rootMetadata.openGraph).toMatchObject({
      siteName: "SBL News",
      type: "website",
      images: [
        expect.objectContaining({
          url: "/img/logo.png",
          width: 512,
          height: 512,
        }),
      ],
    });
    expect(rootMetadata.twitter).toMatchObject({
      card: "summary",
      images: ["/img/logo.png"],
    });
  });

  it("renders BrandLogo in MethodologyPage header", () => {
    const html = renderToStaticMarkup(React.createElement(MethodologyPage));
    expect(html).toContain('src="/img/logo.png"');
    expect(html).toContain("h-12 w-12");
    expect(html).toContain("Methodology &amp; Transparency Standards");
  });

  it("verifies Guidelines, FeedClient, and SearchPage integrate BrandLogo while keeping functional Lucide icons distinct", () => {
    const guidelinesSrc = fs.readFileSync(
      path.resolve(__dirname, "../src/app/guidelines/page.tsx"),
      "utf8"
    );
    const feedClientSrc = fs.readFileSync(
      path.resolve(__dirname, "../src/components/feed/feed-client.tsx"),
      "utf8"
    );
    const searchSrc = fs.readFileSync(
      path.resolve(__dirname, "../src/app/search/page.tsx"),
      "utf8"
    );

    expect(guidelinesSrc).toContain('<BrandLogo size="md" />');
    expect(feedClientSrc).toContain('<BrandLogo size="md" />');
    expect(searchSrc).toContain('<BrandLogo size="md" />');
    expect(searchSrc).toContain("AlertTriangle");
    expect(searchSrc).toContain("RotateCcw");
    expect(searchSrc).toContain("Search");
  });
});
