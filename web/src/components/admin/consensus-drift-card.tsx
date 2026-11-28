"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Check, ExternalLink, X } from "@/components/ui/pixel-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { resolveConsensusDriftAction } from "@/lib/actions/moderation";
import type { PendingDriftAlertItem } from "@/lib/queries/admin";
import type { EvidenceGradeType } from "@/lib/queries/projections";
import { formatStudyDesign } from "@/lib/queries/study-badges";

interface ConsensusDriftCardProps {
  alert: PendingDriftAlertItem;
  onResolved?: (alertId: string) => void;
}

export function ConsensusDriftCard({
  alert,
  onResolved,
}: ConsensusDriftCardProps) {
  const [resolved, setResolved] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [grade, setGrade] = useState<EvidenceGradeType>(
    alert.guideline?.evidence_grade ?? "A"
  );
  const [summary, setSummary] = useState(
    alert.guideline?.consensus_summary ?? ""
  );
  const [prescription, setPrescription] = useState(
    alert.guideline?.practical_prescription ?? ""
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitResolution(decision: "approved" | "dismissed") {
    setErrorMsg(null);
    setStatusMsg(null);

    startTransition(async () => {
      const result = await resolveConsensusDriftAction({
        alertId: alert.id,
        decision,
        reviewerNotes,
        updatedEvidenceGrade: decision === "approved" ? grade : undefined,
        updatedConsensusSummary:
          decision === "approved" ? summary : undefined,
        updatedPracticalPrescription:
          decision === "approved" && prescription.trim()
            ? prescription
            : undefined,
      });

      if (!result.ok) {
        setErrorMsg(result.message);
        return;
      }

      setStatusMsg(result.message);
      setResolved(true);
      onResolved?.(alert.id);
    });
  }

  if (resolved && statusMsg) {
    return (
      <Card className="border-accent-ink bg-badge-fulltext p-4">
        <p className="font-mono text-xs font-semibold text-accent-ink">{statusMsg}</p>
      </Card>
    );
  }

  return (
    <Card variant="dialog" className="p-4 sm:p-5">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/15 pb-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="trained" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                <span>Consensus Drift</span>
              </Badge>
              {alert.guideline && (
                <Badge variant="accent">
                  {alert.guideline.hub} • {alert.guideline.variable_name}
                </Badge>
              )}
              {alert.guideline && (
                <Badge variant="default">
                  Current Grade {alert.guideline.evidence_grade}
                </Badge>
              )}
            </div>
            <p className="max-w-[72ch] text-sm font-medium text-ink">
              {alert.drift_rationale}
            </p>
          </div>
        </div>

        {alert.trigger_study && (
          <div className="rounded-md border-2 border-border bg-canvas p-3">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
              <span className="font-semibold text-ink">Trigger Study:</span>
              <span>{formatStudyDesign(alert.trigger_study.study_design)}</span>
              <span aria-hidden="true">•</span>
              <span>{alert.trigger_study.journal}</span>
              <span aria-hidden="true">•</span>
              <span>{alert.trigger_study.publication_year}</span>
              <span aria-hidden="true">•</span>
              <span>Score {alert.trigger_study.quality_score}</span>
            </div>
            <h4 className="mt-1 font-display text-base font-bold text-ink">
              <Link
                href={`/study/${alert.trigger_study.id}`}
                className="hover:underline"
              >
                {alert.trigger_study.title}
              </Link>
            </h4>
            <p className="mt-1 max-w-[70ch] text-xs leading-relaxed text-muted">
              {alert.trigger_study.summary_takeaway}
            </p>
            <div className="mt-2 font-mono text-xs">
              <a
                href={alert.trigger_study.primary_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-ink hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                <span>View Primary Paper</span>
              </a>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor={`grade-${alert.id}`}
              className="block font-mono text-xs font-semibold uppercase text-muted"
            >
              Updated Evidence Grade
            </label>
            <select
              id={`grade-${alert.id}`}
              value={grade}
              onChange={(e) => setGrade(e.target.value as EvidenceGradeType)}
              className="flex h-10 w-full rounded-md border-2 border-border bg-surface px-3 py-2 font-mono text-sm font-semibold text-ink shadow-control"
            >
              <option value="A">Grade A (Strong Meta-Analytic)</option>
              <option value="B">Grade B (Moderate RCT)</option>
              <option value="C">Grade C (Emerging / Mixed)</option>
              <option value="D">Grade D (Preliminary)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor={`prescription-${alert.id}`}
              className="block font-mono text-xs font-semibold uppercase text-muted"
            >
              Practical Prescription
            </label>
            <Input
              id={`prescription-${alert.id}`}
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
              placeholder="e.g., 10–20 hard sets/muscle/week"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor={`summary-${alert.id}`}
            className="block font-mono text-xs font-semibold uppercase text-muted"
          >
            Updated Consensus Summary
          </label>
          <textarea
            id={`summary-${alert.id}`}
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full rounded-md border-2 border-border bg-surface p-3 font-sans text-sm text-ink shadow-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor={`notes-${alert.id}`}
            className="block font-mono text-xs font-semibold uppercase text-muted"
          >
            Reviewer Changelog Note / Dismissal Reason (Required)
          </label>
          <Input
            id={`notes-${alert.id}`}
            value={reviewerNotes}
            onChange={(e) => setReviewerNotes(e.target.value)}
            placeholder="Summarize why this guideline was updated or why the drift alert was dismissed..."
          />
        </div>

        {errorMsg && (
          <p
            role="alert"
            className="rounded-md border-2 border-accent-ink bg-badge-abstract px-3 py-2 font-mono text-xs font-semibold text-accent-ink"
          >
            {errorMsg}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isPending}
            onClick={() => submitResolution("approved")}
          >
            <Check className="h-3.5 w-3.5" />
            <span>Approve &amp; Update Guideline</span>
          </Button>
          <Button
            type="button"
            variant="warning"
            size="sm"
            disabled={isPending}
            onClick={() => submitResolution("dismissed")}
          >
            <X className="h-3.5 w-3.5" />
            <span>Dismiss Alert</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
