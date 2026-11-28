import type { Metadata } from "next";
import { AvatarUploadControl } from "@/components/profile/avatar-upload-control";
import { ProfileActivityLists } from "@/components/profile/profile-activity-lists";
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";
import { ProfileSignInGate } from "@/components/profile/profile-sign-in-gate";
import { AuraBadge } from "@/components/social/aura-badge";
import { Card } from "@/components/ui/card";
import {
  getMyAccountProfile,
  getMyUpvotedStudies,
  getRecentStudyViews,
  getUserCommentHistory,
} from "@/lib/queries/profile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profile Settings & Activity — SBL News",
  description:
    "Manage your SBL News community profile, avatar, theme preference, and personal study activity.",
};

export default async function ProfilePage() {
  const account = await getMyAccountProfile();

  if (!account) {
    return <ProfileSignInGate />;
  }

  const [initialUpvotes, initialRecentViews, initialComments] = await Promise.all([
    getMyUpvotedStudies(account.profile.id),
    getRecentStudyViews(account.profile.id),
    getUserCommentHistory(account.profile.id),
  ]);

  return (
    <div className="space-y-8">
      <header className="space-y-1.5 border-b-2 border-border pb-4">
        <p className="font-pixel text-[11px] font-bold uppercase tracking-wider text-muted">
          CHARACTER SHEET • PROFILE
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Profile Settings &amp; Activity
          </h1>
          <AuraBadge score={account.profile.aura_score} />
        </div>
        <p className="max-w-[70ch] text-sm text-muted">
          Customize how you appear in study discussions, manage your theme
          preference, and review your upvoted studies and comments.
        </p>
      </header>

      <Card className="p-5">
        <AvatarUploadControl
          userId={account.profile.id}
          displayName={account.profile.display_name}
          avatarUrl={account.profile.avatar_url}
        />
      </Card>

      <ProfileSettingsForm
        initialProfile={account.profile}
        email={account.email}
      />

      <ProfileActivityLists
        userId={account.profile.id}
        mode="private"
        initialComments={initialComments}
        initialUpvotes={initialUpvotes}
        initialRecentViews={initialRecentViews}
        viewedStudiesVisibility={account.profile.viewed_studies_visibility}
      />
    </div>
  );
}
