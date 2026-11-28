"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import { useAccountProfile } from "@/components/layout/account-profile-provider";
import {
  AskAiOAuthPrompt,
  buildAskAiReturnPath,
  buildStandardSearchPath,
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
  const [searchQuery, setSearchQuery] = React.useState("");
  const [oauthPromptOpen, setOauthPromptOpen] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(
    null
  );
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  function handleStandardSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setValidationError(null);
    setOauthPromptOpen(false);
    const targetUrl = buildStandardSearchPath({
      query: searchQuery,
      studyDesign,
      trainedOnly,
    });
    router.push(targetUrl);
  }

  function handleAskAiClick() {
    if (authLoading) {
      return;
    }
    if (!profile) {
      setValidationError(null);
      setOauthPromptOpen((prev) => !prev);
      return;
    }
    const trimmed = searchQuery.trim();
    if (trimmed.length < AI_QUERY_MIN_LENGTH) {
      setOauthPromptOpen(false);
      setValidationError(
        `Enter at least ${AI_QUERY_MIN_LENGTH} characters to ask AI.`
      );
      searchInputRef.current?.focus();
      return;
    }
    setValidationError(null);
    setOauthPromptOpen(false);
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

      <form
        onSubmit={handleStandardSearchSubmit}
        className="mt-3 grid grid-cols-1 gap-3 border-t-2 border-border/15 pt-3 sm:grid-cols-4"
      >
        <div className="sm:col-span-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="feed-search-q" className="sr-only">
            Search literature or ask a research question
          </label>
          <Input
            ref={searchInputRef}
            id="feed-search-q"
            name="q"
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (validationError) {
                setValidationError(null);
              }
            }}
            maxLength={AI_QUERY_MAX_LENGTH}
            placeholder="Search literature or ask a research question..."
            aria-invalid={validationError ? true : undefined}
            aria-describedby={
              validationError ? "feed-search-validation" : undefined
            }
            className="min-h-[44px] flex-1"
          />
          <Button
            type="submit"
            variant="primary"
            className="min-h-[44px] shrink-0 gap-1.5 font-mono text-xs font-bold"
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Search</span>
          </Button>
        </div>
        <button
          type="button"
          onClick={handleAskAiClick}
          className="sm:col-span-1 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-md border-2 border-border bg-accent px-3.5 py-2 font-mono text-xs font-bold text-accent-ink shadow-card transition-transform hover:bg-accent/90 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
        >
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Ask AI</span>
        </button>
      </form>

      {validationError && (
        <p
          id="feed-search-validation"
          role="alert"
          className="mt-2 rounded-sm border-2 border-border bg-badge-abstract px-3 py-1.5 font-mono text-xs font-bold text-accent-ink"
        >
          {validationError}
        </p>
      )}

      {oauthPromptOpen && !authLoading && !profile && (
        <div className="mt-3 border-t-2 border-border/15 pt-3">
          <AskAiOAuthPrompt
            query={searchQuery}
            studyDesign={studyDesign}
            trainedOnly={trainedOnly}
            onDismiss={() => setOauthPromptOpen(false)}
          />
        </div>
      )}
    </section>
  );
}
