import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_AI_CONTEXT_TOKENS,
  buildAiStudyContext,
  estimateTokenCount,
} from "../src/lib/ai-search/context-builder";
import type { AiCitationStudy } from "../src/lib/queries/projections";
import { AiSearchRequestSchema } from "../src/lib/validations/ai-search";

const mockGetUser = vi.fn();
const mockGetAiCitationStudies = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
  createPublicClient: vi.fn(),
}));

vi.mock("@/lib/queries/studies", () => ({
  getAiCitationStudies: (...args: unknown[]) =>
    mockGetAiCitationStudies(...args),
}));

function makeStudy(
  index: number,
  overrides: Partial<AiCitationStudy> = {}
): AiCitationStudy {
  const labels = ["S1", "S2", "S3", "S4", "S5"] as const;
  return {
    citation_label: labels[index] ?? "S5",
    id: `11111111-1111-4111-8111-11111111111${index + 1}`,
    title: `Resistance Training Study ${index + 1}`,
    journal: "Journal of Strength and Conditioning Research",
    publication_year: 2025,
    primary_url: `https://pubmed.ncbi.nlm.nih.gov/1000000${index + 1}/`,
    study_design: "rct",
    population: "Resistance-trained adults",
    is_trained_population: true,
    sample_size_n: 48,
    duration_weeks: 10,
    primary_outcome: "Quadriceps muscle thickness via ultrasound",
    summary_takeaway:
      "Lengthened partials produced comparable or greater distal hypertrophy than full ROM.",
    limitations: [
      "Small sample size per group",
      "Short 10-week intervention window",
    ],
    inspection_depth: "Full-Text",
    quality_score: 88,
    ...overrides,
  };
}

describe("AiSearchRequestSchema validation", () => {
  it("accepts valid 3..300 char queries and preprocesses filters", () => {
    const parsed = AiSearchRequestSchema.safeParse({
      q: "  lengthened partials vs full ROM  ",
      study_design: "meta_analysis",
      min_duration_weeks: "8",
      trained_only: "true",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.q).toBe("lengthened partials vs full ROM");
      expect(parsed.data.study_design).toBe("meta_analysis");
      expect(parsed.data.min_duration_weeks).toBe(8);
      expect(parsed.data.trained_only).toBe(true);
    }
  });

  it("rejects queries shorter than 3 chars or longer than 300 chars", () => {
    expect(AiSearchRequestSchema.safeParse({ q: "hi" }).success).toBe(false);
    expect(
      AiSearchRequestSchema.safeParse({ q: "a".repeat(301) }).success
    ).toBe(false);
  });
});

describe("buildAiStudyContext <2,000-token budget", () => {
  it("keeps normal 5-study context strictly under 2,000 tokens", () => {
    const studies = Array.from({ length: 5 }, (_, i) => makeStudy(i));
    const built = buildAiStudyContext(studies);

    expect(built.includedStudies).toHaveLength(5);
    expect(built.estimatedTokens).toBeLessThanOrEqual(MAX_AI_CONTEXT_TOKENS);
    expect(estimateTokenCount(built.contextText)).toBeLessThan(2000);
    expect(built.contextText).toContain("[S1]");
    expect(built.contextText).toContain("[S5]");
  });

  it("caps oversized study text fields and drops beyond top 3 if needed to stay <2,000 tokens", () => {
    const huge = "Very long scientific outcome description. ".repeat(150);
    const studies = Array.from({ length: 5 }, (_, i) =>
      makeStudy(i, {
        title: huge,
        primary_outcome: huge,
        summary_takeaway: huge,
        limitations: [huge, huge, huge, huge],
      })
    );

    const built = buildAiStudyContext(studies);

    expect(built.estimatedTokens).toBeLessThan(2000);
    expect(built.includedStudies.length).toBeGreaterThanOrEqual(3);
    expect(built.includedStudies.length).toBeLessThanOrEqual(5);
  });
});

describe("POST /api/ai-search guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
  });

  it("returns 401 Unauthorized when caller is not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { POST } = await import("../src/app/api/ai-search/route");
    const req = new Request("http://localhost:3000/api/ai-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: "lengthened partials hypertrophy" }),
    });

    const res = await POST(req);
    const json = (await res.json()) as { error: string };

    expect(res.status).toBe(401);
    expect(json.error).toBe("UNAUTHORIZED");
    expect(mockGetAiCitationStudies).not.toHaveBeenCalled();
  });

  it("returns deterministic no_matching_studies payload when 0 studies match", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockGetAiCitationStudies.mockResolvedValue([]);

    const { POST } = await import("../src/app/api/ai-search/route");
    const req = new Request("http://localhost:3000/api/ai-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: "obscure nonexistent protocol",
        study_design: "meta_analysis",
      }),
    });

    const res = await POST(req);
    const json = (await res.json()) as {
      mode: string;
      citations: unknown[];
      answerMarkdown: string | null;
    };

    expect(res.status).toBe(200);
    expect(json.mode).toBe("no_matching_studies");
    expect(json.citations).toEqual([]);
    expect(json.answerMarkdown).toBeNull();
  });
});
