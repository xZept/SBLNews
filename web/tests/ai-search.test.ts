import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeAiQueryKey } from "../src/lib/ai-search/cache-key";
import { type AiSearchConfig } from "../src/lib/ai-search/config";
import {
  MAX_AI_CONTEXT_TOKENS,
  buildAiStudyContext,
  estimateTokenCount,
} from "../src/lib/ai-search/context-builder";
import { synthesizeWithFailover } from "../src/lib/ai-search/failover-client";
import type {
  AiCitationStudy,
  AiQuotaStatus,
} from "../src/lib/queries/projections";
import { AiSearchRequestSchema } from "../src/lib/validations/ai-search";

const mockGetUser = vi.fn();
const mockGetAiCitationStudies = vi.fn();
const mockGetMyAiQuotaStatus = vi.fn();
const mockCheckAndIncrementAiQuota = vi.fn();
const mockRefundAiQuota = vi.fn();
const mockGetCachedAiSynthesis = vi.fn();
const mockPutCachedAiSynthesis = vi.fn();

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

vi.mock("@/lib/ai-search/quota-and-cache", () => ({
  getMyAiQuotaStatus: (...args: unknown[]) => mockGetMyAiQuotaStatus(...args),
  checkAndIncrementAiQuota: (...args: unknown[]) =>
    mockCheckAndIncrementAiQuota(...args),
  refundAiQuota: (...args: unknown[]) => mockRefundAiQuota(...args),
  getCachedAiSynthesis: (...args: unknown[]) =>
    mockGetCachedAiSynthesis(...args),
  putCachedAiSynthesis: (...args: unknown[]) =>
    mockPutCachedAiSynthesis(...args),
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

function makeQuota(overrides: Partial<AiQuotaStatus> = {}): AiQuotaStatus {
  return {
    allowed: true,
    isAdmin: false,
    dailyLimit: 10,
    usedToday: 1,
    remainingToday: 9,
    resetsAtUtc: "2026-11-29T00:00:00.000Z",
    ...overrides,
  };
}

function makeSseResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status,
    headers: { "Content-Type": "text/event-stream" },
  });
}

const TEST_CONFIG: AiSearchConfig = {
  dailyQuotaLimit: 10,
  cacheTtlDays: 7,
  tiers: {
    tier1Groq: {
      apiKey: "groq-test-key",
      model: "openai/gpt-oss-20b",
      timeoutMs: 2000,
    },
    tier2OpenRouter: {
      apiKey: "or-test-key",
      model: "nvidia/nemotron-3-ultra-550b-a55b:free",
      altModel: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
      timeoutMs: 2000,
    },
    tier3Gemini: {
      apiKey: "gemini-test-key",
      model: "gemini-3.5-flash-lite",
      timeoutMs: 2000,
    },
  },
};

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

describe("normalizeAiQueryKey deterministic cache keys (US3)", () => {
  it("produces identical 64-char SHA-256 keys across casing, whitespace, and edge punctuation", async () => {
    const a = await normalizeAiQueryKey({
      q: "  Lengthened   Partials vs Full ROM?! ",
      study_design: "meta_analysis",
      min_duration_weeks: 8,
      trained_only: true,
    });
    const b = await normalizeAiQueryKey({
      q: "...lengthened partials vs full rom",
      study_design: "meta_analysis",
      min_duration_weeks: 8,
      trained_only: true,
    });

    expect(a.cacheKey).toHaveLength(64);
    expect(a.cacheKey).toBe(b.cacheKey);
    expect(a.normalizedQuery).toBe("lengthened partials vs full rom");
    expect(a.filterSignature).toBe("design=meta_analysis|min_weeks=8|trained=true");
  });

  it("produces distinct keys when deterministic filters differ", async () => {
    const base = await normalizeAiQueryKey({
      q: "lengthened partials hypertrophy",
    });
    const filtered = await normalizeAiQueryKey({
      q: "lengthened partials hypertrophy",
      trained_only: true,
    });

    expect(base.cacheKey).not.toBe(filtered.cacheKey);
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

describe("/api/ai-search auth, cache, quota & failover guards (US1, US3, US4)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
    process.env.GROQ_API_KEY = "groq-test-key";
    process.env.OPENROUTER_API_KEY = "or-test-key";
    process.env.GEMINI_API_KEY = "gemini-test-key";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("GET /api/ai-search returns 401 when signed out and 200 quota when signed in", async () => {
    const { GET } = await import("../src/app/api/ai-search/route");

    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });
    const unauthRes = await GET();
    expect(unauthRes.status).toBe(401);

    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockGetMyAiQuotaStatus.mockResolvedValueOnce(
      makeQuota({ usedToday: 2, remainingToday: 8 })
    );
    const authRes = await GET();
    const authJson = (await authRes.json()) as { quota: AiQuotaStatus };
    expect(authRes.status).toBe(200);
    expect(authJson.quota.remainingToday).toBe(8);
  });

  it("POST /api/ai-search returns 401 Unauthorized when caller is not authenticated", async () => {
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
    expect(mockGetCachedAiSynthesis).not.toHaveBeenCalled();
    expect(mockCheckAndIncrementAiQuota).not.toHaveBeenCalled();
  });

  it("serves shared cache hit without deducting daily quota (US3)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-b" } },
      error: null,
    });
    mockGetCachedAiSynthesis.mockResolvedValue({
      cacheKey: "a".repeat(64),
      normalizedQuery: "lengthened partials hypertrophy",
      filterSignature: "design=all|min_weeks=0|trained=false",
      answerMarkdown: "Cached synthesis [S1].",
      citations: [makeStudy(0)],
      tierUsed: "groq",
      createdAt: "2026-11-28T10:00:00.000Z",
      expiresAt: "2026-12-05T10:00:00.000Z",
    });
    mockGetMyAiQuotaStatus.mockResolvedValue(
      makeQuota({ usedToday: 0, remainingToday: 10 })
    );

    const { POST } = await import("../src/app/api/ai-search/route");
    const req = new Request("http://localhost:3000/api/ai-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: "LENGTHENED PARTIALS HYPERTROPHY?!" }),
    });

    const res = await POST(req);
    const json = (await res.json()) as {
      mode: string;
      cached: boolean;
      quota: AiQuotaStatus;
    };

    expect(res.status).toBe(200);
    expect(json.mode).toBe("cached");
    expect(json.cached).toBe(true);
    expect(json.quota.remainingToday).toBe(10);
    expect(mockCheckAndIncrementAiQuota).not.toHaveBeenCalled();
    expect(mockGetAiCitationStudies).not.toHaveBeenCalled();
  });

  it("enforces 10/day standard member cap with 429 QUOTA_EXCEEDED and resetsAtUtc (US3)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-a" } },
      error: null,
    });
    mockGetCachedAiSynthesis.mockResolvedValue(null);
    mockCheckAndIncrementAiQuota.mockResolvedValue(
      makeQuota({
        allowed: false,
        usedToday: 10,
        remainingToday: 0,
      })
    );

    const { POST } = await import("../src/app/api/ai-search/route");
    const req = new Request("http://localhost:3000/api/ai-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: "novel uncached training question" }),
    });

    const res = await POST(req);
    const json = (await res.json()) as {
      error: string;
      quota: AiQuotaStatus;
    };

    expect(res.status).toBe(429);
    expect(json.error).toBe("QUOTA_EXCEEDED");
    expect(json.quota.remainingToday).toBe(0);
    expect(json.quota.resetsAtUtc).toBe("2026-11-29T00:00:00.000Z");
    expect(mockGetAiCitationStudies).not.toHaveBeenCalled();
  });

  it("allows admin accounts unlimited syntheses and refunds quota on 0-study matches (US3)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "admin-1" } },
      error: null,
    });
    mockGetCachedAiSynthesis.mockResolvedValue(null);
    mockCheckAndIncrementAiQuota.mockResolvedValue(
      makeQuota({
        allowed: true,
        isAdmin: true,
        usedToday: 42,
        remainingToday: 10,
      })
    );
    mockGetAiCitationStudies.mockResolvedValue([]);
    mockRefundAiQuota.mockResolvedValue(
      makeQuota({
        allowed: true,
        isAdmin: true,
        usedToday: 41,
        remainingToday: 10,
      })
    );

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
      quota: AiQuotaStatus;
    };

    expect(res.status).toBe(200);
    expect(json.mode).toBe("no_matching_studies");
    expect(json.citations).toEqual([]);
    expect(json.answerMarkdown).toBeNull();
    expect(json.quota.isAdmin).toBe(true);
    expect(mockRefundAiQuota).toHaveBeenCalledTimes(1);
  });

  it("refunds quota and skips caching with 503 ALL_TIERS_FAILED when all 3 tiers fail (US4)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockGetCachedAiSynthesis.mockResolvedValue(null);
    mockCheckAndIncrementAiQuota.mockResolvedValue(
      makeQuota({ usedToday: 3, remainingToday: 7 })
    );
    mockGetAiCitationStudies.mockResolvedValue([makeStudy(0), makeStudy(1)]);
    mockRefundAiQuota.mockResolvedValue(
      makeQuota({ usedToday: 2, remainingToday: 8 })
    );

    globalThis.fetch = vi.fn(async () => new Response("rate limited", { status: 429 }));

    const { POST } = await import("../src/app/api/ai-search/route");
    const req = new Request("http://localhost:3000/api/ai-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: "lengthened partials hypertrophy" }),
    });

    const res = await POST(req);
    const json = (await res.json()) as {
      error: string;
      quota: AiQuotaStatus;
    };

    expect(res.status).toBe(503);
    expect(json.error).toBe("ALL_TIERS_FAILED");
    expect(json.quota.remainingToday).toBe(8);
    expect(mockRefundAiQuota).toHaveBeenCalledTimes(1);
    expect(mockPutCachedAiSynthesis).not.toHaveBeenCalled();
  });
});

describe("synthesizeWithFailover 3-tier failover (US4)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fails over from Tier 1 Groq 429 to Tier 2 OpenRouter", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("api.groq.com")) {
        return new Response("429", { status: 429 });
      }
      return makeSseResponse([
        'data: {"choices":[{"delta":{"content":"OpenRouter "}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"synthesis [S1]."}}]}\n\n',
        "data: [DONE]\n\n",
      ]);
    });

    const result = await synthesizeWithFailover({
      question: "lengthened partials?",
      contextText: "<retrieved_studies>[S1]</retrieved_studies>",
      config: TEST_CONFIG,
    });

    let text = "";
    for await (const chunk of result.stream) {
      text += chunk;
    }

    expect(result.tierUsed).toBe("openrouter");
    expect(text).toBe("OpenRouter synthesis [S1].");
  });

  it("fails over through Tier 1 timeout and Tier 2 429s to Tier 3 Gemini", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("api.groq.com")) {
        throw new DOMException("The operation timed out.", "TimeoutError");
      }
      if (url.includes("openrouter.ai")) {
        return new Response("429", { status: 429 });
      }
      return makeSseResponse([
        'data: {"candidates":[{"content":{"parts":[{"text":"Gemini "}]}}]}\n\n',
        'data: {"candidates":[{"content":{"parts":[{"text":"fallback [S1]."}]}}]}\n\n',
      ]);
    });

    const result = await synthesizeWithFailover({
      question: "lengthened partials?",
      contextText: "<retrieved_studies>[S1]</retrieved_studies>",
      config: TEST_CONFIG,
    });

    let text = "";
    for await (const chunk of result.stream) {
      text += chunk;
    }

    expect(result.tierUsed).toBe("gemini");
    expect(text).toBe("Gemini fallback [S1].");
  });
});
