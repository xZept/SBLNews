import { ExternalLink, FileCheck2, FileWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { UpvoteButton } from "@/components/feed/upvote-button";
import type { StudyDetail } from "@/lib/queries/projections";
import {
  formatStudyDesign,
  getStudyDesignBadgeVariant,
} from "@/lib/queries/study-badges";

interface MetadataBreakdownProps {
  study: StudyDetail;
  initialVoted: boolean;
}

export function MetadataBreakdown({
  study,
  initialVoted,
}: MetadataBreakdownProps) {
  const designVariant = getStudyDesignBadgeVariant(study.study_design);
  const isFullText = study.inspection_depth === "Full-Text";

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
            <span className="font-semibold text-ink">{study.journal}</span>
            <span aria-hidden="true">•</span>
            <span>{study.publication_year}</span>
            <span aria-hidden="true">•</span>
            <span>Published {study.published_at}</span>
            {study.doi && (
              <>
                <span aria-hidden="true">•</span>
                <span>DOI: {study.doi}</span>
              </>
            )}
            {study.pubmed_id && (
              <>
                <span aria-hidden="true">•</span>
                <span>PMID: {study.pubmed_id}</span>
              </>
            )}
          </div>

          <h1 className="mt-2 font-display text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl">
            {study.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant={designVariant}>
              {formatStudyDesign(study.study_design)}
            </Badge>
            <Badge variant={isFullText ? "fulltext" : "abstract"}>
              {isFullText ? (
                <FileCheck2 className="h-3.5 w-3.5" />
              ) : (
                <FileWarning className="h-3.5 w-3.5" />
              )}
              <span>{study.inspection_depth}</span>
            </Badge>
            {study.is_trained_population && (
              <Badge variant="trained">Trained Lifters</Badge>
            )}
            <Badge variant="default">Score {study.quality_score}/100</Badge>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start">
          <UpvoteButton
            studyId={study.id}
            initialCount={study.upvote_count}
            initialVoted={initialVoted}
          />
        </div>
      </div>

      {/* Transparency banner */}
      <div
        className={`mt-4 rounded-sm border-[1.5px] border-ink px-3.5 py-2.5 text-xs ${
          isFullText ? "bg-badge-fulltext/50" : "bg-badge-abstract/60"
        }`}
      >
        <span className="font-mono font-bold uppercase">
          {study.inspection_depth} Inspection:
        </span>{" "}
        {isFullText
          ? "Metadata and limitations were extracted from the open-access full-text article."
          : "Only the indexed abstract was available for extraction. Unreported sample sizes or durations remain null rather than inferred."}
      </div>

      {/* Summary Takeaway */}
      <div className="mt-5">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted">
          Evidence Takeaway
        </h2>
        <p className="mt-1.5 max-w-[70ch] text-base leading-relaxed text-ink">
          {study.summary_takeaway}
        </p>
      </div>

      {/* Structured Metadata Grid */}
      <dl className="mt-6 grid grid-cols-1 gap-3 border-t-2 border-ink/15 pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-sm border-[1.5px] border-ink bg-canvas p-3">
          <dt className="font-mono text-[11px] font-semibold uppercase text-muted">
            Population
          </dt>
          <dd className="mt-1 text-sm font-semibold text-ink">
            {study.population}
          </dd>
        </div>

        <div className="rounded-sm border-[1.5px] border-ink bg-canvas p-3">
          <dt className="font-mono text-[11px] font-semibold uppercase text-muted">
            Sample Size (n)
          </dt>
          <dd className="mt-1 font-mono text-sm font-bold text-ink">
            {study.sample_size_n !== null ? study.sample_size_n : "Unreported"}
          </dd>
        </div>

        <div className="rounded-sm border-[1.5px] border-ink bg-canvas p-3">
          <dt className="font-mono text-[11px] font-semibold uppercase text-muted">
            Duration
          </dt>
          <dd className="mt-1 font-mono text-sm font-bold text-ink">
            {study.duration_weeks !== null
              ? `${study.duration_weeks} weeks`
              : "Unreported / N/A"}
          </dd>
        </div>

        <div className="rounded-sm border-[1.5px] border-ink bg-canvas p-3">
          <dt className="font-mono text-[11px] font-semibold uppercase text-muted">
            Primary Outcome
          </dt>
          <dd className="mt-1 text-sm font-semibold text-ink">
            {study.primary_outcome}
          </dd>
        </div>
      </dl>

      {/* Limitations */}
      {study.limitations && study.limitations.length > 0 && (
        <div className="mt-5 border-t-2 border-ink/15 pt-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted">
            Methodological Limitations
          </h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink max-w-[70ch]">
            {study.limitations.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Primary Source Action */}
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t-2 border-ink/15 pt-4">
        <a
          href={study.primary_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md border-2 border-ink bg-accent px-4 py-2 font-display text-sm font-bold text-ink shadow-[2px_2px_0px_#0F172A] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <ExternalLink className="h-4 w-4" />
          <span>Read Primary Source (PubMed / DOI)</span>
        </a>
      </div>
    </Card>
  );
}
