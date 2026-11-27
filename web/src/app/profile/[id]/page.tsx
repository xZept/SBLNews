import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ProfileActivityLists } from "@/components/profile/profile-activity-lists";
import { UserAvatar } from "@/components/profile/user-avatar";
import { AuraBadge } from "@/components/social/aura-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getPublicProfileById,
  getUserCommentHistory,
} from "@/lib/queries/profile";

export const dynamic = "force-dynamic";

const UuidSchema = z.string().uuid();

interface PublicProfilePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PublicProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  if (!UuidSchema.safeParse(id).success) {
    return { title: "Profile Not Found — SBL News" };
  }

  const profile = await getPublicProfileById(id);
  if (!profile) {
    return { title: "Profile Not Found — SBL News" };
  }

  return {
    title: `${profile.display_name} — SBL News`,
    description:
      profile.bio ??
      `Public community profile and study discussion comments for ${profile.display_name} on SBL News.`,
  };
}

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { id } = await params;
  if (!UuidSchema.safeParse(id).success) {
    notFound();
  }

  const [profile, initialComments] = await Promise.all([
    getPublicProfileById(id),
    getUserCommentHistory(id),
  ]);

  if (!profile) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <UserAvatar
            displayName={profile.display_name}
            avatarUrl={profile.avatar_url}
            size="lg"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {profile.display_name}
              </h1>
              {profile.affiliation_role && (
                <Badge variant="accent">{profile.affiliation_role}</Badge>
              )}
              <AuraBadge score={profile.aura_score} />
            </div>
            {profile.bio && (
              <p className="max-w-[70ch] whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {profile.bio}
              </p>
            )}
          </div>
        </div>
      </Card>

      <ProfileActivityLists
        userId={profile.id}
        mode="public"
        initialComments={initialComments}
      />
    </div>
  );
}
