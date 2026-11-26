import { describe, expect, it } from "vitest";
import {
  MAX_RAW_AVATAR_BYTES,
  validateAvatarFile,
} from "../src/lib/avatar-upload";
import { deriveInitials } from "../src/lib/initials";
import {
  CommentHistoryCursorSchema,
  UpdateProfileSchema,
  UpvotedStudiesCursorSchema,
} from "../src/lib/validations/profile";

describe("deriveInitials", () => {
  it("derives first and last token initials for multi-word names", () => {
    expect(deriveInitials("Eric Helms")).toBe("EH");
    expect(deriveInitials("Dr. Mike Israetel")).toBe("DI");
    expect(deriveInitials("  Brad   Schoenfeld  ")).toBe("BS");
  });

  it("derives up to two uppercase characters for single-word names", () => {
    expect(deriveInitials("Alex")).toBe("AL");
    expect(deriveInitials("J")).toBe("J");
    expect(deriveInitials("  kAI  ")).toBe("KA");
  });

  it("falls back to SL when no alphanumeric tokens exist", () => {
    expect(deriveInitials("")).toBe("SL");
    expect(deriveInitials("   ")).toBe("SL");
    expect(deriveInitials("--- ... !!!")).toBe("SL");
  });
});

describe("UpdateProfileSchema", () => {
  const validPayload = {
    displayName: "Eric Helms",
    affiliationRole: "Exercise Researcher" as const,
    bio: "Natural bodybuilding researcher and coach.",
    themePreference: "light" as const,
  };

  it("accepts valid profile settings", () => {
    const parsed = UpdateProfileSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.displayName).toBe("Eric Helms");
      expect(parsed.data.affiliationRole).toBe("Exercise Researcher");
      expect(parsed.data.bio).toBe("Natural bodybuilding researcher and coach.");
      expect(parsed.data.themePreference).toBe("light");
    }
  });

  it("trims whitespace and rejects display names outside 2-50 chars", () => {
    expect(
      UpdateProfileSchema.safeParse({
        ...validPayload,
        displayName: "   ",
      }).success
    ).toBe(false);

    expect(
      UpdateProfileSchema.safeParse({
        ...validPayload,
        displayName: "A",
      }).success
    ).toBe(false);

    expect(
      UpdateProfileSchema.safeParse({
        ...validPayload,
        displayName: "x".repeat(51),
      }).success
    ).toBe(false);

    const trimmed = UpdateProfileSchema.safeParse({
      ...validPayload,
      displayName: "  AB  ",
    });
    expect(trimmed.success).toBe(true);
    if (trimmed.success) {
      expect(trimmed.data.displayName).toBe("AB");
    }
  });

  it("enforces 160-char bio limit and normalizes empty bio to null", () => {
    const emptyBio = UpdateProfileSchema.safeParse({
      ...validPayload,
      bio: "   ",
    });
    expect(emptyBio.success).toBe(true);
    if (emptyBio.success) {
      expect(emptyBio.data.bio).toBeNull();
    }

    expect(
      UpdateProfileSchema.safeParse({
        ...validPayload,
        bio: "a".repeat(160),
      }).success
    ).toBe(true);

    expect(
      UpdateProfileSchema.safeParse({
        ...validPayload,
        bio: "a".repeat(161),
      }).success
    ).toBe(false);
  });

  it("validates community role enum and nullable role", () => {
    expect(
      UpdateProfileSchema.safeParse({
        ...validPayload,
        affiliationRole: null,
      }).success
    ).toBe(true);

    expect(
      UpdateProfileSchema.safeParse({
        ...validPayload,
        affiliationRole: "Wizard",
      }).success
    ).toBe(false);
  });
});

describe("Activity cursor schemas", () => {
  const validUuid = "11111111-1111-4111-8111-111111111111";
  const validIso = "2026-11-27T00:00:00.000Z";

  it("validates UpvotedStudiesCursorSchema", () => {
    expect(
      UpvotedStudiesCursorSchema.safeParse({
        cursorVotedAt: validIso,
        cursorStudyId: validUuid,
      }).success
    ).toBe(true);

    expect(
      UpvotedStudiesCursorSchema.safeParse({
        cursorVotedAt: "not-a-date",
        cursorStudyId: validUuid,
      }).success
    ).toBe(false);

    expect(
      UpvotedStudiesCursorSchema.safeParse({
        cursorVotedAt: validIso,
        cursorStudyId: "bad-uuid",
      }).success
    ).toBe(false);
  });

  it("validates CommentHistoryCursorSchema", () => {
    expect(
      CommentHistoryCursorSchema.safeParse({
        userId: validUuid,
        cursorCreatedAt: validIso,
        cursorCommentId: validUuid,
      }).success
    ).toBe(true);

    expect(
      CommentHistoryCursorSchema.safeParse({
        userId: "bad-uuid",
        cursorCreatedAt: validIso,
        cursorCommentId: validUuid,
      }).success
    ).toBe(false);
  });
});

describe("validateAvatarFile", () => {
  it("accepts PNG, JPEG, and WebP files within the 15 MB raw limit", () => {
    expect(validateAvatarFile({ type: "image/png", size: 1024 }).ok).toBe(true);
    expect(validateAvatarFile({ type: "image/jpeg", size: 500_000 }).ok).toBe(
      true
    );
    expect(
      validateAvatarFile({ type: "image/webp", size: MAX_RAW_AVATAR_BYTES }).ok
    ).toBe(true);
  });

  it("rejects non-raster MIME types such as SVG and PDF", () => {
    expect(validateAvatarFile({ type: "image/svg+xml", size: 1024 }).ok).toBe(
      false
    );
    expect(validateAvatarFile({ type: "application/pdf", size: 1024 }).ok).toBe(
      false
    );
    expect(validateAvatarFile({ type: "image/gif", size: 1024 }).ok).toBe(
      false
    );
  });

  it("rejects empty or oversized files", () => {
    expect(validateAvatarFile({ type: "image/png", size: 0 }).ok).toBe(false);
    expect(
      validateAvatarFile({
        type: "image/png",
        size: MAX_RAW_AVATAR_BYTES + 1,
      }).ok
    ).toBe(false);
  });
});
