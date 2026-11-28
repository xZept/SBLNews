"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useAccountProfile } from "@/components/layout/account-profile-provider";
import {
  AskAiOAuthPrompt,
  buildAskAiReturnPath,
} from "@/components/search/ask-ai-oauth-prompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { StudyDesignType } from "@/lib/queries/projections";
import { cn } from "@/lib/utils";
import {
  AI_QUERY_MAX_LENGTH,
  AI_QUERY_MIN_LENGTH,
} from "@/lib/validations/ai-search";
import type { FeedTab } from "@/lib/validations/search";

const STUDY_FILTER_PILLS: { value: StudyDesignType | "all"; label: string }[] = [
  { value: "all", label: "All Designs" },
  { value: "meta_analysis", label: "Meta-Analysis" },
  { value: "systematic_review", label: "Systematic Review" },
  { value: "rct", label: "RCT" },
  { value: "controlled_trial", label: "Controlled Trial" },
  { value: "cohort_observational", label: "Cohort / Obs." },
];

interface FilterBarProps {
  tab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
  studyDesign: StudyDesignType | "all";
  onStudyDesignChange: (design: StudyDesignType | "all") => void;
  trainedOnly: boolean;
  onTrainedOnlyChange: (trainedOnly: boolean) => void;
  totalCount: number;
}

export function FilterBar({
  tab,
  onTabChange,
  studyDesign,
  onStudyDesignChange,
  trainedOnly,
  onTrainedOnlyChange,
  totalCount,
}: FilterBarProps) {
  const router = useRouter();
  const { profile, loading: authLoading } = useAccountProfile();
  const [askAiOpen, setAskAiOpen] = React.useState(false);
  const [aiQuery, setAiQuery] = React.useState("");

  function handleAskAiSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = aiQuery.trim();
    if (trimmed.length < AI_QUERY_MIN_LENGTH) {
      return;
    }
    const targetUrl = buildAskAiReturnPath({
      query: trimmed,
      studyDesign,
      trainedOnly,
    });
    router.push(targetUrl);
  }

  return (
    <section
      aria-label="Feed filters"
      className="sticky top-[62px] z-30 mb-6 rounded-md border-2 border-border bg-surface p-3 shadow-card"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs
            value={tab}
            onValueChange={(value) => onTabChange(value as FeedTab)}
          >
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="top">Top</TabsTrigger>
            </TabsList>
          </Tabs>

          <button
            type="button"
            onClick={() => onTrainedOnlyChange(!trainedOnly)}
            aria-pressed={trainedOnly}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border-2 border-border px-3 py-1.5 font-mono text-xs font-bold shadow-control transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer",
              trainedOnly
                ? "bg-badge-trained text-accent-ink"
                : "bg-canvas text-ink hover:bg-surface"
            )}
          >
            <span>
              {trainedOnly ? "✓ Trained Lifters Only" : "Trained Lifters Only"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAskAiOpen((prev) => !prev)}
            aria-pressed={askAiOpen}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border-2 border-border px-3 py-1.5 font-mono text-xs font-bold shadow-control transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer",
              askAiOpen
                ? "bg-accent text-accent-ink"
                : "bg-canvas text-ink hover:bg-surface"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Ask AI</span>
          </button>
        </div>

        <span className="font-mono text-xs font-semibold text-muted">
          {totalCount} {totalCount === 1 ? "study" : "studies"}
        </span>
      </div>

      <div
        role="group"
        aria-label="Filter by study design"
        className="mt-3 flex flex-wrap items-center gap-1.5 border-t-2 border-border/15 pt-2.5"
      >
        {STUDY_FILTER_PILLS.map((pill) => {
          const active = studyDesign === pill.value;
          return (
            <button
              key={pill.value}
              type="button"
              onClick={() => onStudyDesignChange(pill.value)}
              aria-pressed={active}
              className={cn(
                "rounded-sm border-[1.5px] border-border px-2.5 py-1 font-mono text-xs font-semibold transition-none cursor-pointer",
                active
                  ? "bg-accent text-accent-ink shadow-control"
                  : "bg-canvas text-ink hover:bg-surface"
              )}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {askAiOpen && !authLoading && (
        <div className="mt-3 border-t-2 border-border/15 pt-3">
          {!profile ? (
            <AskAiOAuthPrompt
              studyDesign={studyDesign}
              trainedOnly={trainedOnly}
              onDismiss={() => setAskAiOpen(false)}
            />
          ) : (
            <form
              onSubmit={handleAskAiSubmit}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <label htmlFor="feed-ask-ai-q" className="sr-only">
                Ask a multi-study training question
              </label>
              <Input
                id="feed-ask-ai-q"
                type="search"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                maxLength={AI_QUERY_MAX_LENGTH}
                minLength={AI_QUERY_MIN_LENGTH}
                required
                placeholder="Ask a multi-study training question (e.g., lengthened partials vs full ROM)..."
                className="flex-1"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={aiQuery.trim().length < AI_QUERY_MIN_LENGTH}
                className="shrink-0 gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Synthesize on /search</span>
              </Button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
