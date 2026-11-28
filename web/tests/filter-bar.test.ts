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
import {
  buildAskAiReturnPath,
  buildStandardSearchPath,
} from "../src/components/search/ask-ai-oauth-prompt";

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

  it("renders an inline search input and direct Search and Ask AI controls instead of a /search Link", () => {
    const html = renderFilterBar();

    expect(html).not.toContain('href="/search"');
    expect(html).toContain("<form");
    expect(html).toContain('id="feed-search-q"');
    expect(html).toContain('type="search"');
    expect(html).toContain('maxLength="300"');
    expect(html).toContain(
      'placeholder="Search literature or ask a research question..."'
    );
    expect(html).toContain('type="submit"');
    expect(html).toContain("lucide-search");
    expect(html).toContain("<span>Search</span>");

    const askAiMatches = html.match(/Ask AI/g) ?? [];
    expect(askAiMatches).toHaveLength(1);
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

  it("serializes standard search vs Ask AI return paths with studyDesign and trainedOnly", () => {
    expect(
      buildStandardSearchPath({
        query: "  ",
        studyDesign: "all",
        trainedOnly: false,
      })
    ).toBe("/search");

    const standardUrl = buildStandardSearchPath({
      query: "  lengthened partials hypertrophy  ",
      studyDesign: "rct",
      trainedOnly: true,
    });
    expect(standardUrl).toContain("/search?");
    expect(standardUrl).not.toContain("ai=1");
    expect(standardUrl).toContain("q=lengthened+partials+hypertrophy");
    expect(standardUrl).toContain("study_design=rct");
    expect(standardUrl).toContain("trained_only=true");

    const askAiUrl = buildAskAiReturnPath({
      query: "lengthened partials hypertrophy",
      studyDesign: "rct",
      trainedOnly: true,
    });

    expect(askAiUrl).toContain("/search?");
    expect(askAiUrl).toContain("ai=1");
    expect(askAiUrl).toContain("q=lengthened+partials+hypertrophy");
    expect(askAiUrl).toContain("study_design=rct");
    expect(askAiUrl).toContain("trained_only=true");
  });

  it("wires direct Search submit and Ask AI click handling in source", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../src/components/feed/filter-bar.tsx"),
      "utf8"
    );
    expect(src).toContain("onSubmit={handleStandardSearchSubmit}");
    expect(src).toContain("onClick={handleAskAiClick}");
    expect(src).toContain("buildStandardSearchPath");
    expect(src).toContain("buildAskAiReturnPath");
    expect(src).toContain("AskAiOAuthPrompt");
    expect(src).toContain("characters to ask AI.");
    expect(src).not.toContain("askAiOpen");
    expect(src).not.toContain("Synthesize on /search");
  });
});

describe("FilterBar mobile stacking & Neo-Brutalist Sky Blue tokens", () => {
  it("applies mobile stacking, >= 44px touch targets, and Neo-Brutalist token classes to the input, Search, and Ask AI controls", () => {
    const html = renderFilterBar();

    const searchInputMatch = html.match(/<input[^>]*id="feed-search-q"[^>]*>/);
    const searchBtnMatch = html.match(
      /<button[^>]*type="submit"[^>]*>[^]*?Search<\/span><\/button>/
    );
    const askAiBtnMatch = html.match(
      /<button[^>]*type="button"[^>]*>[^]*?Ask AI<\/span><\/button>/
    );

    expect(searchInputMatch).not.toBeNull();
    expect(searchBtnMatch).not.toBeNull();
    expect(askAiBtnMatch).not.toBeNull();

    for (const snippet of [
      searchInputMatch![0],
      searchBtnMatch![0],
      askAiBtnMatch![0],
    ]) {
      expect(snippet).toContain("min-h-[44px]");
      expect(snippet).toContain("rounded-md");
      expect(snippet).toContain("border-2");
      expect(snippet).toContain("border-border");
    }

    for (const btnSnippet of [searchBtnMatch![0], askAiBtnMatch![0]]) {
      expect(btnSnippet).toContain("font-mono");
      expect(btnSnippet).toContain("bg-accent");
      expect(btnSnippet).toContain("text-accent-ink");
      expect(btnSnippet).toContain("active:translate-x-[2px]");
      expect(btnSnippet).toContain("active:translate-y-[2px]");
      expect(btnSnippet).toContain("active:shadow-none");
    }
  });

  it("contains zero purple, violet, red, or gradient utility classes and uses Neo-Brutalist validation tokens", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../src/components/feed/filter-bar.tsx"),
      "utf8"
    );

    expect(src).not.toMatch(/\b(bg|text|border)-(purple|violet|red)-/);
    expect(src).not.toMatch(/\bbg-gradient-/);
    expect(src).toContain(
      "mt-2 rounded-sm border-2 border-border bg-badge-abstract px-3 py-1.5 font-mono text-xs font-bold text-accent-ink"
    );
  });
});
