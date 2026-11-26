import { describe, expect, it } from "vitest";
import { STUDY_SUMMARY_COLUMNS } from "../src/lib/queries/projections";

describe("STUDY_SUMMARY_COLUMNS egress guard", () => {
  const columns = STUDY_SUMMARY_COLUMNS.split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  it("never uses wildcard SELECT *", () => {
    expect(STUDY_SUMMARY_COLUMNS).not.toContain("*");
  });

  it("explicitly excludes abstract_text, full_text_content, and embedding", () => {
    expect(columns).not.toContain("abstract_text");
    expect(columns).not.toContain("full_text_content");
    expect(columns).not.toContain("embedding");
    expect(columns).not.toContain("search_tsv");
  });

  it("includes required feed and transparency badge columns", () => {
    expect(columns).toContain("id");
    expect(columns).toContain("title");
    expect(columns).toContain("study_design");
    expect(columns).toContain("inspection_depth");
    expect(columns).toContain("quality_score");
    expect(columns).toContain("upvote_count");
    expect(columns).toContain("comment_count");
  });
});
