"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ExternalLink, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { moderateStudyAction } from "@/lib/actions/moderation";
import type { PendingStudyItem } from "@/lib/queries/admin";
import {
  formatStudyDesign,
  getStudyDesignBadgeVariant,
} from "@/lib/queries/study-badges";

interface PendingStudiesTableProps {
  studies: PendingStudyItem[];
}

export function PendingStudiesTable({ studies }: PendingStudiesTableProps) {
  const [items, setItems] = useState(studies);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDecision(studyId: string, decision: "published" | "rejected") {
    setFeedback(null);
    setErrorMsg(null);
    setPendingId(studyId);

    startTransition(async () => {
      const result = await moderateStudyAction({ studyId, decision });
      setPendingId(null);

      if (!result.ok) {
        setErrorMsg(result.message);
        return;
      }

      setItems((prev) => prev.filter((s) => s.id !== studyId));
      setFeedback(result.message);
    });
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          role="status"
          className="rounded-md border-2 border-accent-ink bg-badge-fulltext px-4 py-2 font-mono text-xs font-semibold text-accent-ink shadow-control"
        >
          {feedback}
        </div>
      )}
      {errorMsg && (
        <div
          role="alert"
          className="rounded-md border-2 border-accent-ink bg-badge-abstract px-4 py-2 font-mono text-xs font-semibold text-accent-ink shadow-control"
        >
          {errorMsg}
        </div>
      )}

      {items.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="font-mono text-sm font-semibold text-ink">
            No pending studies in the moderation queue.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((study) => {
            const busy = isPending && pendingId === study.id;
            return (
              <Card key={study.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
                      <span className="font-semibold text-ink">
                        {study.journal}
                      </span>
                      <span aria-hidden="true">•</span>
                      <span>{study.publication_year}</span>
                      <span aria-hidden="true">•</span>
                      <span>Score {study.quality_score}</span>
                    </div>

                    <h3 className="font-display text-base font-bold leading-snug text-ink sm:text-lg">
                      <Link
                        href={`/study/${study.id}`}
                        className="hover:underline"
                      >
                        {study.title}
                      </Link>
                    </h3>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={getStudyDesignBadgeVariant(study.study_design)}
                      >
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
                        <Badge variant="trained">Trained Lifters</Badge>
                      )}
                      {study.is_acute_emg_only && (
                        <Badge variant="abstract">Acute EMG Only</Badge>
                      )}
                      {!study.is_human && (
                        <Badge variant="muted">Non-Human</Badge>
                      )}
                    </div>

                    <p className="max-w-[72ch] text-sm leading-relaxed text-ink">
                      {study.summary_takeaway}
                    </p>

                    <div className="pt-1 font-mono text-xs">
                      <a
                        href={study.primary_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-ink hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Primary Source</span>
                      </a>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={busy}
                      onClick={() => handleDecision(study.id, "published")}
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve</span>
                    </Button>
                    <Button
                      type="button"
                      variant="warning"
                      size="sm"
                      disabled={busy}
                      onClick={() => handleDecision(study.id, "rejected")}
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
