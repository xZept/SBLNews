"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  AccountProfile,
  ActivityVisibilityType,
  CursorPage,
  ProfileCommentHistoryItem,
  ProfileUpvotedStudyItem,
  ThemePreferenceType,
} from "@/lib/queries/projections";
import {
  getAuthorizedUpvotedStudies,
  getMyUpvotedStudies,
  getUserCommentHistory,
  type CommentHistoryPageCursor,
} from "@/lib/queries/profile";
import {
  CommentHistoryCursorSchema,
  RecordStudyViewSchema,
  UpdateActivityVisibilitySchema,
  UpdateAvatarUrlSchema,
  UpdateProfileSchema,
  UpdateThemePreferenceSchema,
  UpvotedStudiesCursorSchema,
  type CommentHistoryCursor,
  type RecordStudyViewInput,
  type UpdateActivityVisibilityInput,
  type UpdateAvatarUrlInput,
  type UpdateProfileInput,
  type UpdateThemePreferenceInput,
  type UpvotedStudiesCursor,
} from "@/lib/validations/profile";
import {
  PublicUpvotesCursorSchema,
  type PublicUpvotesCursor,
} from "@/lib/validations/social";

export type ProfileActionErrorCode =
  | "AUTH_REQUIRED"
  | "VALIDATION_ERROR"
  | "DB_ERROR";

export type UpdateThemePreferenceResult =
  | { ok: true; themePreference: ThemePreferenceType }
  | { ok: false; error: ProfileActionErrorCode; message: string };

export type UpdateProfileResult =
  | { ok: true; profile: AccountProfile }
  | {
      ok: false;
      error: ProfileActionErrorCode;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export type UpdateAvatarUrlResult =
  | { ok: true; avatarUrl: string | null }
  | { ok: false; error: ProfileActionErrorCode; message: string };

export type LoadMoreUpvotedStudiesResult =
  | {
      ok: true;
      page: CursorPage<ProfileUpvotedStudyItem, UpvotedStudiesCursor>;
    }
  | { ok: false; error: ProfileActionErrorCode; message: string };

export type LoadMoreCommentHistoryResult =
  | {
      ok: true;
      page: CursorPage<ProfileCommentHistoryItem, CommentHistoryPageCursor>;
    }
  | { ok: false; error: ProfileActionErrorCode; message: string };

export type UpdateActivityVisibilityResult =
  | {
      ok: true;
      upvotedStudiesVisibility: ActivityVisibilityType;
      viewedStudiesVisibility: ActivityVisibilityType;
    }
  | { ok: false; error: ProfileActionErrorCode; message: string };

export type RecordStudyViewResult =
  | { ok: true; recorded: boolean }
  | { ok: false; error: ProfileActionErrorCode; message: string };

export type ClearRecentStudyViewsResult =
  | { ok: true }
  | { ok: false; error: ProfileActionErrorCode; message: string };

function unwrapProfile(
  data: AccountProfile[] | AccountProfile | null
): AccountProfile | null {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] ?? null;
  return data;
}

export async function updateThemePreferenceAction(
  input: UpdateThemePreferenceInput
): Promise<UpdateThemePreferenceResult> {
  const parsed = UpdateThemePreferenceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid theme preference.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      message: "Sign in to save your theme preference.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ theme_preference: parsed.data.themePreference })
    .eq("id", user.id);

  if (error) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Failed to save theme preference.",
    };
  }

  revalidatePath("/profile");
  return { ok: true, themePreference: parsed.data.themePreference };
}

export async function updateProfileAction(
  input: UpdateProfileInput
): Promise<UpdateProfileResult> {
  const parsed = UpdateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message:
        parsed.error.issues[0]?.message ?? "Please check your profile inputs.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      message: "Sign in to update your profile.",
    };
  }

  const {
    displayName,
    affiliationRole,
    bio,
    themePreference,
    upvotedStudiesVisibility,
    viewedStudiesVisibility,
  } = parsed.data;

  const updatePayload: Record<string, unknown> = {
    display_name: displayName,
    affiliation_role: affiliationRole,
    bio,
    theme_preference: themePreference,
  };
  if (upvotedStudiesVisibility !== undefined) {
    updatePayload.upvoted_studies_visibility = upvotedStudiesVisibility;
  }
  if (viewedStudiesVisibility !== undefined) {
    updatePayload.viewed_studies_visibility = viewedStudiesVisibility;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id);

  if (updateError) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Failed to update profile settings.",
    };
  }

  const { data: profileData, error: fetchError } = await supabase.rpc(
    "get_my_account_profile"
  );
  const updatedProfile = unwrapProfile(
    profileData as AccountProfile[] | AccountProfile | null
  );

  if (fetchError || !updatedProfile) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Profile saved, but failed to reload updated record.",
    };
  }

  revalidatePath("/profile");
  revalidatePath(`/profile/${user.id}`);
  revalidatePath("/study/[id]", "layout");

  return { ok: true, profile: updatedProfile };
}

export async function updateAvatarUrlAction(
  input: UpdateAvatarUrlInput
): Promise<UpdateAvatarUrlResult> {
  const parsed = UpdateAvatarUrlSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid avatar URL.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      message: "Sign in to update your profile photo.",
    };
  }

  const { avatarUrl } = parsed.data;
  if (avatarUrl !== null) {
    const baseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
      /\/+$/,
      ""
    );
    const expectedPrefix = `${baseUrl}/storage/v1/object/public/avatars/${user.id}/`;
    if (!baseUrl || !avatarUrl.startsWith(expectedPrefix)) {
      return {
        ok: false,
        error: "VALIDATION_ERROR",
        message: "Avatar URL must belong to your own storage folder.",
      };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (error) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Failed to update profile photo.",
    };
  }

  revalidatePath("/profile");
  revalidatePath(`/profile/${user.id}`);
  revalidatePath("/study/[id]", "layout");

  return { ok: true, avatarUrl };
}

export async function loadMoreUpvotedStudiesAction(
  input: UpvotedStudiesCursor
): Promise<LoadMoreUpvotedStudiesResult> {
  const parsed = UpvotedStudiesCursorSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid pagination cursor.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      message: "Sign in to view your upvoted studies.",
    };
  }

  const page = await getMyUpvotedStudies(user.id, parsed.data);
  return { ok: true, page };
}

export async function loadMoreCommentHistoryAction(
  input: CommentHistoryCursor
): Promise<LoadMoreCommentHistoryResult> {
  const parsed = CommentHistoryCursorSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid pagination cursor.",
    };
  }

  const page = await getUserCommentHistory(parsed.data.userId, {
    cursorCreatedAt: parsed.data.cursorCreatedAt,
    cursorCommentId: parsed.data.cursorCommentId,
  });

  return { ok: true, page };
}

export async function updateActivityVisibilityAction(
  input: UpdateActivityVisibilityInput
): Promise<UpdateActivityVisibilityResult> {
  const parsed = UpdateActivityVisibilitySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message:
        parsed.error.issues[0]?.message ?? "Invalid visibility selection.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      message: "Sign in to update your activity privacy settings.",
    };
  }

  const { upvotedStudiesVisibility, viewedStudiesVisibility } = parsed.data;

  const { error } = await supabase
    .from("profiles")
    .update({
      upvoted_studies_visibility: upvotedStudiesVisibility,
      viewed_studies_visibility: viewedStudiesVisibility,
    })
    .eq("id", user.id);

  if (error) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Failed to save activity visibility settings.",
    };
  }

  revalidatePath("/profile");
  revalidatePath(`/profile/${user.id}`);

  return {
    ok: true,
    upvotedStudiesVisibility,
    viewedStudiesVisibility,
  };
}

export async function recordStudyViewAction(
  input: RecordStudyViewInput
): Promise<RecordStudyViewResult> {
  const parsed = RecordStudyViewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid study ID.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: true, recorded: false };
  }

  const { data, error } = await supabase.rpc("record_study_view", {
    p_study_id: parsed.data.studyId,
  });

  if (error) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Failed to record study view.",
    };
  }

  return { ok: true, recorded: Boolean(data) };
}

export async function clearRecentStudyViewsAction(): Promise<ClearRecentStudyViewsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      message: "Sign in to clear your recently viewed studies.",
    };
  }

  const { error } = await supabase
    .from("recent_study_views")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    return {
      ok: false,
      error: "DB_ERROR",
      message: "Failed to clear recently viewed studies.",
    };
  }

  revalidatePath("/profile");
  revalidatePath(`/profile/${user.id}`);

  return { ok: true };
}

export async function loadMorePublicUpvotesAction(
  input: PublicUpvotesCursor
): Promise<LoadMoreUpvotedStudiesResult> {
  const parsed = PublicUpvotesCursorSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid pagination cursor.",
    };
  }

  const page = await getAuthorizedUpvotedStudies(parsed.data.userId, {
    cursorVotedAt: parsed.data.cursorVotedAt,
    cursorStudyId: parsed.data.cursorStudyId,
  });

  return { ok: true, page };
}
