import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GEMINI_EMBEDDING_MODEL,
  generateQueryEmbedding,
} from "../src/lib/queries/embeddings";
import { orderChangelogEntries } from "../src/lib/queries/changelog";
import type { GuidelineChangelogEntry } from "../src/lib/queries/projections";

describe("T059: search query embedding model alignment", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("uses gemini-embedding-001 (768-dim) matching pipeline/src/extraction/embeddings.py", async () => {
    expect(GEMINI_EMBEDDING_MODEL).toBe("gemini-embedding-001");

    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fakeVector = Array.from({ length: 768 }, (_, i) => i * 0.001);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: { values: fakeVector } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateQueryEmbedding("lengthened partials");
    expect(result).toHaveLength(768);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/models/gemini-embedding-001:embedContent");
    const parsedBody = JSON.parse(String(init.body)) as {
      model: string;
      outputDimensionality: number;
    };
    expect(parsedBody.model).toBe("models/gemini-embedding-001");
    expect(parsedBody.outputDimensionality).toBe(768);
  });
});

describe("T060: guideline changelog ordering", () => {
  it("places newly approved prepended Consensus Drift entries first and older entries in earlier history", () => {
    const seededBaseline: GuidelineChangelogEntry = {
      updated_at: "2026-11-26T00:00:00Z",
      summary: "Initial MVP consensus baseline.",
      study_id: null,
    };
    const approvedDrift: GuidelineChangelogEntry = {
      updated_at: "2026-12-01T12:00:00Z",
      summary: "Approved Consensus Drift from 2026 meta-analysis.",
      study_id: "11111111-1111-4111-8111-111111111111",
    };

    const ordered = orderChangelogEntries([approvedDrift, seededBaseline]);
    expect(ordered[0]).toEqual(approvedDrift);
    expect(ordered.slice(1)).toEqual([seededBaseline]);
  });

  it("sorts chronologically newest-first even if entries were appended", () => {
    const oldest: GuidelineChangelogEntry = {
      updated_at: "2026-11-01T00:00:00Z",
      summary: "Oldest entry",
      study_id: null,
    };
    const middle: GuidelineChangelogEntry = {
      updated_at: "2026-11-15T00:00:00Z",
      summary: "Middle entry",
      study_id: null,
    };
    const newest: GuidelineChangelogEntry = {
      updated_at: "2026-11-26T00:00:00Z",
      summary: "Newest entry",
      study_id: null,
    };

    const ordered = orderChangelogEntries([oldest, middle, newest]);
    expect(ordered).toEqual([newest, middle, oldest]);
  });
});
