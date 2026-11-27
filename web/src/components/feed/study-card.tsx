import Link from "next/link";
import { ExternalLink, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { UpvoteButton } from "@/components/feed/upvote-button";
import { StudyShareMenu } from "@/components/social/study-share-menu";
import type { StudySummary } from "@/lib/queries/projections";
import {
  formatStudyDesign,
  getStudyDesignBadgeVariant,
} from "@/lib/queries/study-badges";

interface StudyCardProps {
  study: StudySummary;
  initialVoted?: boolean;
}

export function StudyCard({ study, initialVoted = false }: StudyCardProps) {
  const designVariant = getStudyDesignBadgeVariant(study.study_design);
  const depthVariant =
    study.inspection_depth === "Full-Text" ? "fulltext" : "abstract";

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <div className="shrink-0 pt-0.5">
          <UpvoteButton
            studyId={study.id}
            initialCount={study.upvote_count}
            initialVoted={initialVoted}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
            <span className="font-semibold text-ink">{study.journal}</span>
            <span aria-hidden="true">•</span>
            <span>{study.publication_year}</span>
            <span aria-hidden="true">•</span>
            <span>{study.published_at}</span>
          </div>

          <h2 className="mt-1 font-display text-lg font-bold leading-snug tracking-tight text-ink sm:text-xl">
            <Link
              href={`/study/${study.id}`}
              className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border"
            >
              {study.title}
            </Link>
          </h2>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <Badge variant={designVariant}>
              {formatStudyDesign(study.study_design)}
            </Badge>
            <Badge variant={depthVariant}>{study.inspection_depth}</Badge>
            {study.is_trained_population && (
              <Badge variant="trained">Trained Lifters</Badge>
            )}
            {study.duration_weeks !== null && (
              <Badge variant="default">{study.duration_weeks}w</Badge>
            )}
            {study.sample_size_n !== null && (
              <Badge variant="default">n={study.sample_size_n}</Badge>
            )}
            <Badge variant="muted">Score {study.quality_score}</Badge>
          </div>

          <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-ink">
            {study.summary_takeaway}
          </p>

          <div className="mt-3.5 flex flex-wrap items-center gap-4 border-t border-border/15 pt-2.5 font-mono text-xs font-semibold">
            <Link
              href={`/study/${study.id}#discussion`}
              className="inline-flex items-center gap-1.5 text-ink hover:underline"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Discussion ({study.comment_count})</span>
            </Link>

            <a
              href={study.primary_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-ink hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>PubMed / DOI</span>
            </a>

            <StudyShareMenu study={study} variant="card" />
          </div>
        </div>
      </div>
    </Card>
  );
}
