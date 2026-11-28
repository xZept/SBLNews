"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  ExternalLink,
  Loader2,
  RotateCcw,
  Sparkles,
} from "@/components/ui/pixel-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type InlineLeafSpan,
  type InlineSpan,
  type SynthesisBlock,
  parseStructuredAiSynthesis,
} from "@/lib/ai-search/markdown-parser";
import type {
  AiCitationStudy,
  AiTierName,
} from "@/lib/queries/projections";
import {
  formatStudyDesign,
  getStudyDesignBadgeVariant,
} from "@/lib/queries/study-badges";

interface AiSynthesisPanelProps {
  query: string;
  answerMarkdown: string;
  citations: AiCitationStudy[];
  isStreaming: boolean;
  cached?: boolean;
  tierUsed?: AiTierName | null;
  emptyMessage?: string | null;
  errorMessage?: string | null;
  onRetry?: () => void;
}

function renderLeafSpan(
  span: InlineLeafSpan,
  studyByLabel: Map<string, AiCitationStudy>,
  key: React.Key
): React.ReactNode {
  if (span.type === "text") {
    return <React.Fragment key={key}>{span.value}</React.Fragment>;
  }

  const validLabels = span.labels.filter((label) => studyByLabel.has(label));
  if (validLabels.length === 0) {
    return <React.Fragment key={key}>{span.rawToken}</React.Fragment>;
  }

  return (
    <span
      key={key}
      className="mx-0.5 inline-flex flex-wrap items-center gap-1 align-baseline"
    >
      {validLabels.map((label) => {
        const study = studyByLabel.get(label)!;
        return (
          <Link
            key={label}
            href={`/study/${study.id}`}
            title={study.title}
            className="inline-flex items-center rounded-sm border border-border bg-accent/25 px-1.5 py-0.2 font-mono text-xs font-bold text-ink hover:bg-accent hover:text-accent-ink"
          >
            [{label}]
          </Link>
        );
      })}
    </span>
  );
}

function renderInlineSpans(
  spans: InlineSpan[],
  studyByLabel: Map<string, AiCitationStudy>
): React.ReactNode[] {
  return spans.map((span, idx) => {
    if (span.type === "strong") {
      return (
        <strong key={idx} className="font-bold text-ink">
          {span.children.map((child, childIdx) =>
            renderLeafSpan(child, studyByLabel, childIdx)
          )}
        </strong>
      );
    }
    return renderLeafSpan(span, studyByLabel, idx);
  });
}

function renderSynthesisBlock(
  block: SynthesisBlock,
  studyByLabel: Map<string, AiCitationStudy>,
  key: React.Key
): React.ReactNode {
  if (block.type === "paragraph") {
    return (
      <p key={key} className="leading-relaxed text-ink">
        {renderInlineSpans(block.spans, studyByLabel)}
      </p>
    );
  }

  const listItems = block.items.map((itemSpans, itemIdx) => (
    <li key={itemIdx} className="leading-relaxed">
      {renderInlineSpans(itemSpans, studyByLabel)}
    </li>
  ));

  if (block.type === "ordered-list") {
    return (
      <ol key={key} className="list-decimal space-y-1.5 pl-5 text-ink">
        {listItems}
      </ol>
    );
  }

  return (
    <ul key={key} className="list-disc space-y-1.5 pl-5 text-ink">
      {listItems}
    </ul>
  );
}

function renderStructuredSynthesis(
  answerMarkdown: string,
  studyByLabel: Map<string, AiCitationStudy>
): React.ReactNode {
  const { sections } = parseStructuredAiSynthesis(answerMarkdown);
  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {sections.map((section, sIdx) => {
        const blocks = section.blocks.map((block, bIdx) =>
          renderSynthesisBlock(block, studyByLabel, bIdx)
        );

        if (section.title === null) {
          return (
            <div key={sIdx} className="space-y-2.5">
              {blocks}
            </div>
          );
        }

        return (
          <section
            key={sIdx}
            className="rounded-md border-2 border-border bg-canvas p-3.5"
          >
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-ink">
              {section.title}
            </h3>
            {blocks.length > 0 && (
              <div className="mt-2 space-y-2">{blocks}</div>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function AiSynthesisPanel({
  query,
  answerMarkdown,
  citations,
  isStreaming,
  cached = false,
  tierUsed = null,
  emptyMessage = null,
  errorMessage = null,
  onRetry,
}: AiSynthesisPanelProps) {
  const studyByLabel = React.useMemo(() => {
    const map = new Map<string, AiCitationStudy>();
    for (const study of citations) {
      map.set(study.citation_label, study);
    }
    return map;
  }, [citations]);

  return (
    <section
      aria-label="AI Literature Synthesis"
      aria-live="polite"
      className="rpg-dialog-frame rounded-sm border-2 border-border bg-surface p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border/15 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-sm border-[1.5px] border-accent-ink bg-accent px-2 py-0.5 font-pixel text-[11px] font-bold text-accent-ink">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI SYNTHESIS
          </span>
          {cached && (
            <Badge variant="meta">CACHED • 0 QUOTA USED</Badge>
          )}
          {tierUsed && !cached && (
            <Badge variant="muted" className="uppercase">
              {tierUsed}
            </Badge>
          )}
        </div>

        {isStreaming && (
          <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Synthesizing top studies...
          </span>
        )}
      </div>

      {query && (
        <p className="mt-3 font-mono text-xs font-semibold text-muted">
          Question: <span className="text-ink">&ldquo;{query}&rdquo;</span>
        </p>
      )}

      {errorMessage ? (
        <div
          role="alert"
          className="mt-3 flex flex-col gap-3 rounded-md border-2 border-accent-ink bg-badge-abstract p-3 text-sm text-accent-ink sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="max-w-[70ch] font-medium">{errorMessage}</p>
          </div>
          {onRetry && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onRetry}
              className="shrink-0 gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Retry</span>
            </Button>
          )}
        </div>
      ) : emptyMessage ? (
        <div className="mt-3 rounded-md border-2 border-border bg-canvas p-4">
          <p className="max-w-[72ch] font-sans text-sm text-ink">
            {emptyMessage}
          </p>
        </div>
      ) : (
        <div className="mt-3 max-w-[72ch] space-y-3 font-sans text-sm sm:text-[15px]">
          {answerMarkdown ? (
            renderStructuredSynthesis(answerMarkdown, studyByLabel)
          ) : isStreaming ? (
            <p className="font-mono text-xs text-muted">
              Retrieving top peer-reviewed studies and generating grounded synthesis...
            </p>
          ) : null}
        </div>
      )}

      {citations.length > 0 && (
        <div className="mt-5 border-t-2 border-border/15 pt-4">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-ink" aria-hidden="true" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-ink">
              Cited Primary Literature ({citations.length}{" "}
              {citations.length === 1 ? "Study" : "Studies"})
            </h3>
          </div>

          <div className="space-y-3">
            {citations.map((study) => (
              <article
                key={study.id}
                className="rounded-md border-2 border-border bg-canvas p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center rounded-sm border-[1.5px] border-accent-ink bg-accent px-1.5 py-0.5 font-mono text-xs font-bold text-accent-ink">
                        [{study.citation_label}]
                      </span>
                      <Badge variant={getStudyDesignBadgeVariant(study.study_design)}>
                        {formatStudyDesign(study.study_design)}
                      </Badge>
                      <Badge
                        variant={
                          study.inspection_depth === "Full-Text"
                            ? "fulltext"
                            : "abstract"
                        }
                      >
                        {study.inspection_depth}
                      </Badge>
                      {study.is_trained_population && (
                        <Badge variant="trained">Trained Population</Badge>
                      )}
                      {study.sample_size_n !== null && (
                        <Badge variant="muted">n={study.sample_size_n}</Badge>
                      )}
                      {study.duration_weeks !== null && (
                        <Badge variant="muted">{study.duration_weeks}w</Badge>
                      )}
                    </div>

                    <h4 className="font-display text-sm font-bold leading-snug text-ink">
                      <Link
                        href={`/study/${study.id}`}
                        className="hover:underline"
                      >
                        {study.title}
                      </Link>
                    </h4>

                    <p className="font-mono text-xs text-muted">
                      {study.journal} ({study.publication_year}) • Score{" "}
                      {study.quality_score}/100
                    </p>
                  </div>

                  <a
                    href={study.primary_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded-sm border-[1.5px] border-border bg-surface px-2 py-1 font-mono text-xs font-semibold text-ink hover:bg-accent hover:text-accent-ink"
                  >
                    <span>PubMed / DOI</span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </div>

                {study.limitations.length > 0 && (
                  <div className="mt-2 rounded-sm border border-border/30 bg-surface px-2.5 py-1.5">
                    <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted">
                      Methodological Limitations
                    </p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-ink">
                      {study.limitations.map((limitation, idx) => (
                        <li key={idx}>{limitation}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
