import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
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

vi.mock("../src/components/layout/account-profile-provider", () => ({
  useAccountProfile: () => ({
    profile: null,
    email: null,
    loading: false,
    theme: "light" as const,
    setThemeLocalAndPersist: async () => {},
    refreshAccountProfile: async () => {},
    signOutAndResetTheme: async () => {},
  }),
}));

import { FilterBar } from "../src/components/feed/filter-bar";
import { buildAskAiReturnPath } from "../src/components/search/ask-ai-oauth-prompt";

function renderFilterBar(overrides?: Partial<React.ComponentProps<typeof FilterBar>>) {
  return renderToStaticMarkup(
    React.createElement(FilterBar, {
      tab: "daily",
      onTabChange: () => {},
      studyDesign: "all",
      onStudyDesignChange: () => {},
      trainedOnly: false,
      onTrainedOnlyChange: () => {},
      totalCount: 12,
      ...overrides,
    })
  );
}

describe("FilterBar relocated Search & Ask AI split row", () => {
  it("renders a full-width 75%/25% split row inside the feed filters section", () => {
    const html = renderFilterBar();

    expect(html).toContain('aria-label="Feed filters"');
    expect(html).toContain("grid-cols-1");
    expect(html).toContain("sm:grid-cols-4");
    expect(html).toContain("sm:col-span-3");
    expect(html).toContain("sm:col-span-1");
  });

  it("renders the Search trigger as a /search Link with Search icon and Ask AI button with aria-pressed", () => {
    const html = renderFilterBar();

    expect(html).toContain('href="/search"');
    expect(html).toContain("Search literature...");
    expect(html).toContain("lucide-search");

    const askAiMatches = html.match(/Ask AI/g) ?? [];
    expect(askAiMatches).toHaveLength(1);
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("lucide-sparkles");
  });

  it("removes the inline Ask AI button from the Daily/Weekly/Top + Trained Lifters Only row", () => {
    const html = renderFilterBar();
    const trainedIdx = html.indexOf("Trained Lifters Only");
    const studyDesignIdx = html.indexOf('aria-label="Filter by study design"');
    const splitRowIdx = html.indexOf("sm:grid-cols-4");

    expect(trainedIdx).toBeGreaterThan(-1);
    expect(studyDesignIdx).toBeGreaterThan(trainedIdx);
    expect(splitRowIdx).toBeGreaterThan(studyDesignIdx);

    const inlineRowSlice = html.slice(trainedIdx, studyDesignIdx);
    expect(inlineRowSlice).not.toContain("Ask AI");
  });

  it("preserves studyDesign and trainedOnly in buildAskAiReturnPath for Ask AI submissions", () => {
    const url = buildAskAiReturnPath({
      query: "lengthened partials hypertrophy",
      studyDesign: "rct",
      trainedOnly: true,
    });

    expect(url).toContain("/search?");
    expect(url).toContain("ai=1");
    expect(url).toContain("q=lengthened+partials+hypertrophy");
    expect(url).toContain("study_design=rct");
    expect(url).toContain("trained_only=true");
  });

  it("wires setAskAiOpen toggle on the Ask AI button in source", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../src/components/feed/filter-bar.tsx"),
      "utf8"
    );
    expect(src).toContain("setAskAiOpen((prev) => !prev)");
  });
});

describe("FilterBar mobile stacking & Neo-Brutalist Sky Blue tokens", () => {
  it("applies mobile stacking, >= 44px touch targets, and Neo-Brutalist token classes to both buttons", () => {
    const html = renderFilterBar();

    const searchLinkMatch = html.match(/<a[^>]*href="\/search"[^>]*>/);
    const askAiBtnMatch = html.match(/<button[^>]*aria-pressed="false"[^>]*>[^]*?Ask AI/);

    expect(searchLinkMatch).not.toBeNull();
    expect(askAiBtnMatch).not.toBeNull();

    for (const snippet of [searchLinkMatch![0], askAiBtnMatch![0]]) {
      expect(snippet).toContain("min-h-[44px]");
      expect(snippet).toContain("rounded-md");
      expect(snippet).toContain("border-2");
      expect(snippet).toContain("border-border");
      expect(snippet).toContain("shadow-card");
      expect(snippet).toContain("font-mono");
      expect(snippet).toContain("active:translate-x-[2px]");
      expect(snippet).toContain("active:translate-y-[2px]");
      expect(snippet).toContain("active:shadow-none");
    }

    expect(searchLinkMatch![0]).toContain("bg-surface");
    expect(searchLinkMatch![0]).toContain("text-ink");
  });

  it("contains zero purple, violet, or gradient utility classes", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../src/components/feed/filter-bar.tsx"),
      "utf8"
    );

    expect(src).not.toMatch(/\b(bg|text|border)-(purple|violet)-/);
    expect(src).not.toMatch(/\bbg-gradient-/);
  });
});
