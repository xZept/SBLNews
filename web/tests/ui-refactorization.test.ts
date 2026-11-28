import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as PixelIcons from "@/components/ui/pixel-icons";

const SRC_ROOT = path.resolve(process.cwd(), "src");

function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...collectSourceFiles(fullPath));
    } else if (fullPath.endsWith(".tsx") || fullPath.endsWith(".css")) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("16-bit retro-RPG Neo-Brutalist design system audit (008-ui-refactorization)", () => {
  it("defines Light/Dark Neo-Brutalist Sky Blue tokens, Silkscreen pixel font, and .rpg-dialog-frame in globals.css", () => {
    const css = readFileSync(path.join(SRC_ROOT, "app", "globals.css"), "utf8");

    expect(css).toContain("--color-*: initial;");
    expect(css).toContain("--color-canvas: #F8FAFC;");
    expect(css).toContain("--color-surface: #FFFFFF;");
    expect(css).toContain("--color-ink: #0F172A;");
    expect(css).toContain("--color-muted: #475569;");
    expect(css).toContain("--color-accent: #38BDF8;");
    expect(css).toContain("--color-shadow: #0F172A;");

    // Dark Mode tokens
    expect(css).toContain(':root[data-theme="dark"]');
    expect(css).toContain("--color-canvas: #0B1120;");
    expect(css).toContain("--color-surface: #1E293B;");
    expect(css).toContain("--color-ink: #F8FAFC;");
    expect(css).toContain("--color-muted: #94A3B8;");
    expect(css).toContain("--color-border: #E2E8F0;");
    expect(css).toContain("--color-shadow: #020617;");

    // 5 semantic pastel badge tokens
    expect(css).toContain("--color-badge-meta: #A7F3D0;");
    expect(css).toContain("--color-badge-rct: #BAE6FD;");
    expect(css).toContain("--color-badge-trained: #FDE68A;");
    expect(css).toContain("--color-badge-fulltext: #BBF7D0;");
    expect(css).toContain("--color-badge-abstract: #FED7AA;");

    // Pixel font & double-frame RPG dialog
    expect(css).toContain("--font-pixel: var(--font-silkscreen)");
    expect(css).toContain("--shadow-rpg-dialog:");
    expect(css).toContain(".rpg-dialog-frame");
  });

  it("loads Silkscreen via next/font/google and keeps Light Mode default in layout.tsx", () => {
    const layout = readFileSync(path.join(SRC_ROOT, "app", "layout.tsx"), "utf8");

    expect(layout).toContain("Silkscreen");
    expect(layout).toContain("--font-silkscreen");
    expect(layout).toContain("silkscreen.variable");
    expect(layout).toContain('localStorage.getItem("sbl_theme")==="dark"');
  });

  it("exports < 2 KB inline crispEdges pixel SVG icons from pixel-icons.tsx", () => {
    const iconEntries = Object.entries(PixelIcons).filter(
      ([, value]) =>
        typeof value === "object" || typeof value === "function"
    );

    expect(iconEntries.length).toBeGreaterThanOrEqual(40);

    for (const [name, IconComponent] of iconEntries) {
      const Component = IconComponent as React.ComponentType<
        React.SVGProps<SVGSVGElement>
      >;
      const html = renderToStaticMarkup(React.createElement(Component));
      expect(html, `${name} should render <svg>`).toContain("<svg");
      expect(html, `${name} should have shape-rendering="crispEdges"`).toContain(
        'shape-rendering="crispEdges"'
      );
      expect(
        Buffer.byteLength(html, "utf8"),
        `${name} SVG markup must be < 2048 bytes`
      ).toBeLessThan(2048);
    }
  });

  it("enforces zero prohibited styles and zero lucide-react imports across web/src", () => {
    const files = collectSourceFiles(SRC_ROOT);
    const prohibitedPattern =
      /purple|violet|indigo|#6366f1|#8b5cf6|#a855f7|#7c3aed|bg-gradient-|linear-gradient|radial-gradient|conic-gradient|backdrop-blur|\bblur-|\bshadow-sm\b|\bshadow-md\b|\bshadow-lg\b|\bshadow-xl\b|\bshadow-2xl\b|\bdrop-shadow|\brounded-lg\b|\brounded-xl\b|\brounded-2xl\b|\brounded-3xl\b|\brounded-full\b/i;

    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      const rel = path.relative(SRC_ROOT, file);

      if (content.includes("lucide-react")) {
        violations.push(`${rel}: imports lucide-react`);
      }

      const match = content.match(prohibitedPattern);
      if (match) {
        violations.push(`${rel}: contains prohibited style token "${match[0]}"`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("applies double-frame RPG dialog inset borders to priority containers and duration-75 press states to interactive controls", () => {
    const dialogTargets = [
      "components/search/ai-synthesis-panel.tsx",
      "components/search/ask-ai-oauth-prompt.tsx",
      "components/study/metadata-breakdown.tsx",
      "components/guidelines/hub-grid.tsx",
      "components/admin/consensus-drift-card.tsx",
    ];

    for (const rel of dialogTargets) {
      const content = readFileSync(path.join(SRC_ROOT, rel), "utf8");
      const hasDialogFrame =
        content.includes("rpg-dialog-frame") ||
        content.includes('variant="dialog"');
      expect(hasDialogFrame, `${rel} must use rpg-dialog-frame or Card variant="dialog"`).toBe(true);
    }

    const pressTargets = [
      "components/ui/button.tsx",
      "components/ui/tabs.tsx",
      "components/feed/upvote-button.tsx",
      "components/feed/filter-bar.tsx",
    ];

    for (const rel of pressTargets) {
      const content = readFileSync(path.join(SRC_ROOT, rel), "utf8");
      expect(content, `${rel} must include duration-75`).toContain("duration-75");
      expect(content, `${rel} must include active:translate-x-[2px]`).toContain(
        "active:translate-x-[2px]"
      );
      expect(content, `${rel} must include active:translate-y-[2px]`).toContain(
        "active:translate-y-[2px]"
      );
    }
  });
});
