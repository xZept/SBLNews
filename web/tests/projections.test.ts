import { describe, expect, it } from "vitest";
import {
  PROFILE_COMMENT_HISTORY_COLUMNS,
  PROFILE_UPVOTED_STUDY_COLUMNS,
  PUBLIC_PROFILE_COLUMNS,
  STUDY_SUMMARY_COLUMNS,
} from "../src/lib/queries/projections";

function parseColumns(projection: string): string[] {
  return projection
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

describe("STUDY_SUMMARY_COLUMNS egress guard", () => {
  const columns = parseColumns(STUDY_SUMMARY_COLUMNS);

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

describe("Profile & activity projection privacy and egress guards", () => {
  it("PUBLIC_PROFILE_COLUMNS excludes private account fields and wildcards", () => {
    const columns = parseColumns(PUBLIC_PROFILE_COLUMNS);
    expect(PUBLIC_PROFILE_COLUMNS).not.toContain("*");
    expect(columns).not.toContain("email");
    expect(columns).not.toContain("theme_preference");
    expect(columns).not.toContain("role");
    expect(columns).toContain("id");
    expect(columns).toContain("display_name");
    expect(columns).toContain("avatar_url");
    expect(columns).toContain("affiliation_role");
    expect(columns).toContain("bio");
  });

  it("PROFILE_COMMENT_HISTORY_COLUMNS excludes private and heavy study fields", () => {
    expect(PROFILE_COMMENT_HISTORY_COLUMNS).not.toContain("*");
    expect(PROFILE_COMMENT_HISTORY_COLUMNS).not.toContain("email");
    expect(PROFILE_COMMENT_HISTORY_COLUMNS).not.toContain("theme_preference");
    expect(PROFILE_COMMENT_HISTORY_COLUMNS).not.toContain("role");
    expect(PROFILE_COMMENT_HISTORY_COLUMNS).not.toContain("abstract_text");
    expect(PROFILE_COMMENT_HISTORY_COLUMNS).not.toContain("embedding");
    expect(PROFILE_COMMENT_HISTORY_COLUMNS).toContain("id");
    expect(PROFILE_COMMENT_HISTORY_COLUMNS).toContain("study_id");
    expect(PROFILE_COMMENT_HISTORY_COLUMNS).toContain("body");
    expect(PROFILE_COMMENT_HISTORY_COLUMNS).toContain("created_at");
  });

  it("PROFILE_UPVOTED_STUDY_COLUMNS excludes private and heavy study fields", () => {
    expect(PROFILE_UPVOTED_STUDY_COLUMNS).not.toContain("*");
    expect(PROFILE_UPVOTED_STUDY_COLUMNS).not.toContain("email");
    expect(PROFILE_UPVOTED_STUDY_COLUMNS).not.toContain("theme_preference");
    expect(PROFILE_UPVOTED_STUDY_COLUMNS).not.toContain("role");
    expect(PROFILE_UPVOTED_STUDY_COLUMNS).not.toContain("abstract_text");
    expect(PROFILE_UPVOTED_STUDY_COLUMNS).not.toContain("embedding");
    expect(PROFILE_UPVOTED_STUDY_COLUMNS).toContain("study_id");
    expect(PROFILE_UPVOTED_STUDY_COLUMNS).toContain("created_at");
  });
});
