import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DiscussionThread } from "@/components/study/discussion-thread";
import { MetadataBreakdown } from "@/components/study/metadata-breakdown";
import { SecondaryCommentaryList } from "@/components/study/secondary-commentary-list";
import {
  getSecondaryCommentaries,
  getStudyComments,
  getStudyDetail,
} from "@/lib/queries/studies";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface StudyPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyDetailPage({ params }: StudyPageProps) {
  const { id } = await params;
  const study = await getStudyDetail(id);

  if (!study) {
    notFound();
  }

  let currentUserId: string | null = null;
  let initialVoted = false;

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      currentUserId = user.id;
      const { data: voteRow } = await supabase
        .from("votes")
        .select("study_id")
        .eq("study_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      initialVoted = Boolean(voteRow);
    }
  }

  const [comments, commentaries] = await Promise.all([
    getStudyComments(id),
    getSecondaryCommentaries(id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-sm border-[1.5px] border-ink bg-surface px-3 py-1 font-mono text-xs font-semibold text-ink shadow-[2px_2px_0px_#0F172A] hover:bg-accent"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Research Feed</span>
        </Link>
      </div>

      <MetadataBreakdown study={study} initialVoted={initialVoted} />

      <SecondaryCommentaryList commentaries={commentaries} />

      <DiscussionThread
        studyId={study.id}
        initialComments={comments}
        currentUserId={currentUserId}
      />
    </div>
  );
}
