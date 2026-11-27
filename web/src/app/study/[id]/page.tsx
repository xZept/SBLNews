import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DiscussionThread } from "@/components/study/discussion-thread";
import { MetadataBreakdown } from "@/components/study/metadata-breakdown";
import { SecondaryCommentaryList } from "@/components/study/secondary-commentary-list";
import { StudyViewTracker } from "@/components/study/study-view-tracker";
import {
  getPublicStudyDetail,
  getSecondaryCommentaries,
  getStudyComments,
  getStudyDetail,
} from "@/lib/queries/studies";
import { formatStudyDesign } from "@/lib/queries/study-badges";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface StudyPageProps {
  params: Promise<{ id: string }>;
}

function truncateTakeaway(takeaway: string, maxLength = 180): string {
  const normalized = takeaway.trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: StudyPageProps): Promise<Metadata> {
  const { id } = await params;
  const study = await getPublicStudyDetail(id);

  if (!study || study.publication_status !== "published") {
    return {
      title: "Study Not Found — SBL News",
    };
  }

  const title = `${study.title} (${study.journal}, ${study.publication_year}) — SBL News`;
  const designLabel = formatStudyDesign(study.study_design);
  const conciseTakeaway = truncateTakeaway(study.summary_takeaway);
  const description = `[${designLabel} • ${study.inspection_depth} • Score ${study.quality_score}/100] ${conciseTakeaway} — Science-Based Lifting News`;

  return {
    title,
    description,
    openGraph: {
      type: "article",
      siteName: "SBL News",
      title,
      description,
      url: `/study/${study.id}`,
      images: [
        {
          url: "/img/logo.png",
          width: 512,
          height: 512,
          alt: `${study.title} — SBL News`,
        },
      ],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: ["/img/logo.png"],
    },
  };
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
      {currentUserId && <StudyViewTracker studyId={study.id} />}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-sm border-[1.5px] border-border bg-surface px-3 py-1 font-mono text-xs font-semibold text-ink shadow-control hover:bg-accent hover:text-accent-ink"
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
