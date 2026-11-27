import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCanonicalStudyUrl,
  buildExternalShareUrls,
  formatDiscordShareMarkdown,
  formatStudyCitation,
  type ShareableStudy,
} from "../src/lib/share-links";
import {
  AURA_DAILY_CAPS,
  AURA_WEIGHTS,
  computeDeterministicAura,
  computeDeterministicAuraBreakdown,
} from "../src/lib/aura";
import {
  RecordStudyShareSchema,
  ToggleCommentEndorsementSchema,
} from "../src/lib/validations/social";

const mockGetPublicStudyDetail = vi.fn();

vi.mock("@/lib/queries/studies", () => ({
  getPublicStudyDetail: (...args: unknown[]) =>
    mockGetPublicStudyDetail(...args),
  getSecondaryCommentaries: vi.fn(),
  getStudyComments: vi.fn(),
  getStudyDetail: vi.fn(),
}));

import { generateMetadata } from "../src/app/study/[id]/page";

const STUDY_ID = "11111111-1111-4111-8111-111111111111";

const SAMPLE_STUDY: ShareableStudy = {
  id: STUDY_ID,
  title: "Lengthened Partials vs Full ROM for Hypertrophy & Strength",
  journal: "Sports Medicine",
  publication_year: 2025,
  study_design: "meta_analysis",
  inspection_depth: "Full-Text",
  quality_score: 91,
  summary_takeaway:
    "Training at longer muscle lengths produced modestly greater hypertrophy in trained lifters.",
};

describe("share-links helpers", () => {
  it("builds canonical study URL without trailing slash on origin", () => {
    expect(
      buildCanonicalStudyUrl(STUDY_ID, "https://sblnews.org/")
    ).toBe(`https://sblnews.org/study/${STUDY_ID}`);
  });

  it("formats SBL News citation with title, journal, year, design, depth, and canonical URL", () => {
    const citation = formatStudyCitation(SAMPLE_STUDY, "https://sblnews.org");
    expect(citation).toContain(`"${SAMPLE_STUDY.title}"`);
    expect(citation).toContain("(Sports Medicine, 2025)");
    expect(citation).toContain("[Meta-Analysis • Full-Text]");
    expect(citation).toContain("via SBL News");
    expect(citation).toContain(`https://sblnews.org/study/${STUDY_ID}`);
  });

  it("formats Discord Markdown share snippet attributing SBL News", () => {
    const markdown = formatDiscordShareMarkdown(
      SAMPLE_STUDY,
      "https://sblnews.org"
    );
    expect(markdown).toContain(`**${SAMPLE_STUDY.title}** (Sports Medicine, 2025)`);
    expect(markdown).toContain("[Meta-Analysis • Full-Text • Score 91/100] via SBL News");
    expect(markdown).toContain(`https://sblnews.org/study/${STUDY_ID}`);
  });

  it("builds properly encoded X, Reddit, and WhatsApp share URLs", () => {
    const urls = buildExternalShareUrls(SAMPLE_STUDY, "https://sblnews.org");
    const encodedCanonical = encodeURIComponent(
      `https://sblnews.org/study/${STUDY_ID}`
    );

    expect(urls.canonicalUrl).toBe(`https://sblnews.org/study/${STUDY_ID}`);
    expect(urls.xUrl).toContain("https://x.com/intent/tweet?");
    expect(urls.xUrl).toContain(encodedCanonical);
    expect(urls.xUrl).toContain(encodeURIComponent("SBL News"));

    expect(urls.redditUrl).toContain("https://www.reddit.com/submit?");
    expect(urls.redditUrl).toContain(`url=${encodedCanonical}`);

    expect(urls.whatsappUrl).toContain("https://wa.me/?text=");
    expect(urls.whatsappUrl).toContain(encodedCanonical);
  });
});

describe("RecordStudyShareSchema", () => {
  it("accepts all supported share channels with a valid study UUID", () => {
    const channels = [
      "copy_citation",
      "x",
      "reddit",
      "whatsapp",
      "discord",
      "web_share",
      "friend_chat",
    ] as const;

    for (const channel of channels) {
      const result = RecordStudyShareSchema.safeParse({
        studyId: STUDY_ID,
        channel,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid study IDs and unsupported channels", () => {
    expect(
      RecordStudyShareSchema.safeParse({
        studyId: "not-a-uuid",
        channel: "x",
      }).success
    ).toBe(false);

    expect(
      RecordStudyShareSchema.safeParse({
        studyId: STUDY_ID,
        channel: "email",
      }).success
    ).toBe(false);
  });
});

describe("/study/[id] generateMetadata", () => {
  beforeEach(() => {
    mockGetPublicStudyDetail.mockReset();
  });

  it("returns study-specific Open Graph and Twitter metadata for a published study", async () => {
    mockGetPublicStudyDetail.mockResolvedValue({
      ...SAMPLE_STUDY,
      publication_status: "published",
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: STUDY_ID }),
    });

    expect(metadata.title).toBe(
      `${SAMPLE_STUDY.title} (Sports Medicine, 2025) — SBL News`
    );
    expect(metadata.description).toContain("[Meta-Analysis • Full-Text • Score 91/100]");
    expect(metadata.description).toContain(SAMPLE_STUDY.summary_takeaway);
    expect(metadata.description).toContain("Science-Based Lifting News");

    expect(metadata.openGraph).toMatchObject({
      type: "article",
      siteName: "SBL News",
      title: metadata.title,
      description: metadata.description,
      url: `/study/${STUDY_ID}`,
    });

    expect(metadata.twitter).toMatchObject({
      card: "summary",
      title: metadata.title,
      description: metadata.description,
      images: ["/img/logo.png"],
    });
  });

  it("returns generic not-found metadata when study is missing or unpublished", async () => {
    mockGetPublicStudyDetail.mockResolvedValue(null);

    const missingMetadata = await generateMetadata({
      params: Promise.resolve({ id: STUDY_ID }),
    });
    expect(missingMetadata).toEqual({
      title: "Study Not Found — SBL News",
    });

    mockGetPublicStudyDetail.mockResolvedValue({
      ...SAMPLE_STUDY,
      publication_status: "pending_review",
    });

    const unpublishedMetadata = await generateMetadata({
      params: Promise.resolve({ id: STUDY_ID }),
    });
    expect(unpublishedMetadata).toEqual({
      title: "Study Not Found — SBL News",
    });
  });
});

describe("deterministic Aura scoring & daily caps", () => {
  it("computes exact weights (+5 comment, +2 endorsement, +1 upvote, +2 share)", () => {
    const breakdown = computeDeterministicAuraBreakdown({
      comments: [{ createdAt: "2026-11-28T10:00:00Z" }],
      endorsementsReceived: [{ createdAt: "2026-11-28T11:00:00Z" }],
      upvotes: [{ createdAt: "2026-11-28T12:00:00Z" }],
      shares: [{ studyId: STUDY_ID, sharedOnUtc: "2026-11-28" }],
    });

    expect(breakdown).toEqual({
      comments: AURA_WEIGHTS.comment,
      endorsements: AURA_WEIGHTS.endorsementReceived,
      upvotes: AURA_WEIGHTS.upvote,
      shares: AURA_WEIGHTS.share,
      total: 10,
    });
  });

  it("enforces UTC daily anti-gaming caps per category and accumulates across days", () => {
    const day1 = "2026-11-28T09:00:00Z";
    const day2 = "2026-11-29T09:00:00Z";

    // Exceed every category's daily cap on day 1
    const breakdown = computeDeterministicAuraBreakdown({
      comments: [
        ...Array.from({ length: 8 }, () => ({ createdAt: day1 })),
        { createdAt: day2 },
      ],
      endorsementsReceived: Array.from({ length: 15 }, () => ({
        createdAt: day1,
      })),
      upvotes: Array.from({ length: 14 }, () => ({ createdAt: day1 })),
      shares: [
        // 6 distinct studies on day 1 (cap 10 -> 5 studies) + duplicate study on day 1
        { studyId: "11111111-1111-4111-8111-111111111111", sharedOnUtc: "2026-11-28" },
        { studyId: "11111111-1111-4111-8111-111111111111", sharedOnUtc: "2026-11-28" },
        { studyId: "22222222-2222-4222-8222-222222222222", sharedOnUtc: "2026-11-28" },
        { studyId: "33333333-3333-4333-8333-333333333333", sharedOnUtc: "2026-11-28" },
        { studyId: "44444444-4444-4444-8444-444444444444", sharedOnUtc: "2026-11-28" },
        { studyId: "55555555-5555-4555-8555-555555555555", sharedOnUtc: "2026-11-28" },
        { studyId: "66666666-6666-4666-8666-666666666666", sharedOnUtc: "2026-11-28" },
      ],
    });

    expect(breakdown.comments).toBe(
      AURA_DAILY_CAPS.comment + AURA_WEIGHTS.comment
    );
    expect(breakdown.endorsements).toBe(AURA_DAILY_CAPS.endorsementReceived);
    expect(breakdown.upvotes).toBe(AURA_DAILY_CAPS.upvote);
    expect(breakdown.shares).toBe(AURA_DAILY_CAPS.share);
    expect(breakdown.total).toBe(
      AURA_DAILY_CAPS.comment +
        AURA_WEIGHTS.comment +
        AURA_DAILY_CAPS.endorsementReceived +
        AURA_DAILY_CAPS.upvote +
        AURA_DAILY_CAPS.share
    );
  });

  it("deducts points deterministically when comments are deleted, endorsements removed, or self-endorsed", () => {
    const initial = computeDeterministicAura({
      comments: [
        { createdAt: "2026-11-28T10:00:00Z", isDeleted: false },
        { createdAt: "2026-11-28T11:00:00Z", isDeleted: false },
      ],
      endorsementsReceived: [
        { createdAt: "2026-11-28T12:00:00Z" },
        { createdAt: "2026-11-28T13:00:00Z" },
      ],
      upvotes: [{ createdAt: "2026-11-28T14:00:00Z" }],
    });
    expect(initial).toBe(15);

    const afterRemovals = computeDeterministicAura({
      comments: [
        { createdAt: "2026-11-28T10:00:00Z", isDeleted: false },
        { createdAt: "2026-11-28T11:00:00Z", isDeleted: true },
      ],
      endorsementsReceived: [
        { createdAt: "2026-11-28T12:00:00Z", isSelf: true },
        { createdAt: "2026-11-28T13:00:00Z", isCommentDeleted: true },
      ],
      upvotes: [],
    });
    expect(afterRemovals).toBe(5);
  });

  it("validates ToggleCommentEndorsementSchema UUIDs", () => {
    expect(
      ToggleCommentEndorsementSchema.safeParse({ commentId: STUDY_ID }).success
    ).toBe(true);
    expect(
      ToggleCommentEndorsementSchema.safeParse({ commentId: "invalid" }).success
    ).toBe(false);
  });
});
