"use client";

import * as React from "react";
import Link from "next/link";
import { RotateCcw, Search, Sparkles } from "lucide-react";
import { useAccountProfile } from "@/components/layout/account-profile-provider";
import { AiSynthesisPanel } from "@/components/search/ai-synthesis-panel";
import { AskAiOAuthPrompt } from "@/components/search/ask-ai-oauth-prompt";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  AiCitationStudy,
  AiTierName,
} from "@/lib/queries/projections";
import { formatStudyDesign } from "@/lib/queries/study-badges";
import { cn } from "@/lib/utils";
import {
  AI_QUERY_MAX_LENGTH,
  AI_QUERY_MIN_LENGTH,
} from "@/lib/validations/ai-search";
import { StudyDesignEnum } from "@/lib/validations/search";

interface AiSearchWorkspaceProps {
  initialQuery: string;
  initialStudyDesign?: string;
  initialMinDurationWeeks?: number;
  initialTrainedOnly?: boolean;
  initialAiActive: boolean;
  hasActiveFilters: boolean;
}

interface SynthesisState {
  submittedQuery: string;
  answerMarkdown: string;
  citations: AiCitationStudy[];
  isStreaming: boolean;
  cached: boolean;
  tierUsed: AiTierName | null;
  emptyMessage: string | null;
  errorMessage: string | null;
}

const INITIAL_SYNTHESIS_STATE: SynthesisState = {
  submittedQuery: "",
  answerMarkdown: "",
  citations: [],
  isStreaming: false,
  cached: false,
  tierUsed: null,
  emptyMessage: null,
  errorMessage: null,
};

function parseSseChunk(
  rawBlock: string
): { event: string; data: Record<string, unknown> } | null {
  const lines = rawBlock.split(/\r?\n/);
  let eventName = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (dataLines.length === 0) return null;
  try {
    const parsed = JSON.parse(dataLines.join("\n")) as Record<string, unknown>;
    return { event: eventName, data: parsed };
  } catch {
    return null;
  }
}

export function AiSearchWorkspace({
  initialQuery,
  initialStudyDesign = "",
  initialMinDurationWeeks,
  initialTrainedOnly = false,
  initialAiActive,
  hasActiveFilters,
}: AiSearchWorkspaceProps) {
  const { profile, loading: authLoading } = useAccountProfile();

  const [query, setQuery] = React.useState(initialQuery);
  const [studyDesign, setStudyDesign] = React.useState(initialStudyDesign);
  const [minDurationWeeks, setMinDurationWeeks] = React.useState(
    initialMinDurationWeeks !== undefined ? String(initialMinDurationWeeks) : ""
  );
  const [trainedOnly, setTrainedOnly] = React.useState(initialTrainedOnly);
  const [aiActive, setAiActive] = React.useState(initialAiActive);
  const [synthesis, setSynthesis] = React.useState<SynthesisState>(
    INITIAL_SYNTHESIS_STATE
  );

  const autoTriggeredRef = React.useRef(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const runAiSynthesis = React.useCallback(
    async (targetQuery: string) => {
      const trimmed = targetQuery.trim();
      if (trimmed.length < AI_QUERY_MIN_LENGTH) {
        setSynthesis({
          ...INITIAL_SYNTHESIS_STATE,
          submittedQuery: trimmed,
          errorMessage: `Please enter at least ${AI_QUERY_MIN_LENGTH} characters to synthesize literature with Ask AI.`,
        });
        return;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setSynthesis({
        ...INITIAL_SYNTHESIS_STATE,
        submittedQuery: trimmed,
        isStreaming: true,
      });

      try {
        const response = await fetch("/api/ai-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            q: trimmed,
            study_design: studyDesign || undefined,
            min_duration_weeks: minDurationWeeks
              ? Number.parseInt(minDurationWeeks, 10)
              : undefined,
            trained_only: trainedOnly ? true : undefined,
          }),
        });

        const contentType = response.headers.get("content-type") ?? "";

        if (!response.ok || contentType.includes("application/json")) {
          const payload = (await response.json()) as {
            mode?: string;
            cached?: boolean;
            tierUsed?: AiTierName | null;
            answerMarkdown?: string | null;
            citations?: AiCitationStudy[];
            message?: string;
            error?: string;
          };

          if (payload.mode === "no_matching_studies") {
            setSynthesis({
              submittedQuery: trimmed,
              answerMarkdown: "",
              citations: [],
              isStreaming: false,
              cached: false,
              tierUsed: null,
              emptyMessage:
                payload.message ??
                "No matching peer-reviewed studies were found for this question.",
              errorMessage: null,
            });
            return;
          }

          if (payload.mode === "cached" && payload.answerMarkdown) {
            setSynthesis({
              submittedQuery: trimmed,
              answerMarkdown: payload.answerMarkdown,
              citations: payload.citations ?? [],
              isStreaming: false,
              cached: true,
              tierUsed: payload.tierUsed ?? null,
              emptyMessage: null,
              errorMessage: null,
            });
            return;
          }

          setSynthesis({
            ...INITIAL_SYNTHESIS_STATE,
            submittedQuery: trimmed,
            errorMessage:
              payload.message ??
              "Unable to synthesize literature right now. Please try again.",
          });
          return;
        }

        if (!response.body) {
          throw new Error("Empty synthesis stream");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split(/\r?\n\r?\n/);
          buffer = blocks.pop() ?? "";

          for (const block of blocks) {
            const parsed = parseSseChunk(block);
            if (!parsed) continue;

            if (parsed.event === "meta") {
              const citations = Array.isArray(parsed.data.citations)
                ? (parsed.data.citations as AiCitationStudy[])
                : [];
              const tierUsed =
                typeof parsed.data.tierUsed === "string"
                  ? (parsed.data.tierUsed as AiTierName)
                  : null;
              setSynthesis((prev) => ({
                ...prev,
                citations,
                tierUsed,
              }));
            } else if (parsed.event === "delta") {
              const text =
                typeof parsed.data.text === "string" ? parsed.data.text : "";
              if (text) {
                setSynthesis((prev) => ({
                  ...prev,
                  answerMarkdown: prev.answerMarkdown + text,
                }));
              }
            } else if (parsed.event === "done") {
              const answerMarkdown =
                typeof parsed.data.answerMarkdown === "string"
                  ? parsed.data.answerMarkdown
                  : "";
              const tierUsed =
                typeof parsed.data.tierUsed === "string"
                  ? (parsed.data.tierUsed as AiTierName)
                  : null;
              setSynthesis((prev) => ({
                ...prev,
                answerMarkdown: answerMarkdown || prev.answerMarkdown,
                tierUsed: tierUsed ?? prev.tierUsed,
                isStreaming: false,
              }));
            } else if (parsed.event === "error") {
              const message =
                typeof parsed.data.message === "string"
                  ? parsed.data.message
                  : "AI synthesis interrupted. Please retry.";
              setSynthesis((prev) => ({
                ...prev,
                isStreaming: false,
                errorMessage: message,
              }));
            }
          }
        }

        setSynthesis((prev) => ({ ...prev, isStreaming: false }));
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setSynthesis((prev) => ({
          ...prev,
          isStreaming: false,
          errorMessage:
            "AI synthesis failed to connect. Standard study results remain available below.",
        }));
      }
    },
    [minDurationWeeks, studyDesign, trainedOnly]
  );

  React.useEffect(() => {
    if (
      initialAiActive &&
      !authLoading &&
      profile &&
      initialQuery.trim().length >= AI_QUERY_MIN_LENGTH &&
      !autoTriggeredRef.current
    ) {
      autoTriggeredRef.current = true;
      void runAiSynthesis(initialQuery);
    }
  }, [authLoading, initialAiActive, initialQuery, profile, runAiSynthesis]);

  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!aiActive) {
      // Allow native GET /search submission for 100% public standard search
      return;
    }

    e.preventDefault();
    if (!profile) {
      return;
    }
    void runAiSynthesis(query);
  }

  const showSynthesisPanel =
    aiActive &&
    Boolean(profile) &&
    (synthesis.isStreaming ||
      Boolean(synthesis.answerMarkdown) ||
      Boolean(synthesis.emptyMessage) ||
      Boolean(synthesis.errorMessage));

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <form
          action="/search"
          method="GET"
          onSubmit={handleFormSubmit}
          className="space-y-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <label htmlFor="search-q" className="sr-only">
                Search literature
              </label>
              <Input
                id="search-q"
                name="q"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={aiActive ? AI_QUERY_MAX_LENGTH : 200}
                placeholder={
                  aiActive
                    ? 'Ask a multi-study question (e.g., "Do lengthened partials build more muscle than full ROM?")'
                    : 'e.g., "lengthened partials hypertrophy" or "weekly volume trained lifters"'
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                variant={aiActive ? "secondary" : "primary"}
                className="gap-1.5"
              >
                {aiActive ? (
                  <>
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    <span>Synthesize</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" aria-hidden="true" />
                    <span>Search</span>
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => setAiActive((prev) => !prev)}
                aria-pressed={aiActive}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-md border-2 border-border px-3.5 font-mono text-xs font-bold shadow-control transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer",
                  aiActive
                    ? "bg-accent text-accent-ink"
                    : "bg-canvas text-ink hover:bg-surface"
                )}
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Ask AI</span>
              </button>

              {hasActiveFilters && (
                <Button asChild variant="secondary">
                  <Link href="/search" className="gap-1.5">
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Reset</span>
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-3 border-t border-border/15 pt-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label
                htmlFor="filter-study-design"
                className="block font-mono text-xs font-semibold uppercase tracking-wide text-muted"
              >
                Study Design
              </label>
              <select
                id="filter-study-design"
                name="study_design"
                value={studyDesign}
                onChange={(e) => setStudyDesign(e.target.value)}
                className="flex h-10 w-full rounded-md border-2 border-border bg-surface px-3 py-2 font-sans text-sm text-ink shadow-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border"
              >
                <option value="">All Designs</option>
                {StudyDesignEnum.options.map((design) => (
                  <option key={design} value={design}>
                    {formatStudyDesign(design)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="filter-min-duration"
                className="block font-mono text-xs font-semibold uppercase tracking-wide text-muted"
              >
                Min Duration (Weeks)
              </label>
              <Input
                id="filter-min-duration"
                name="min_duration_weeks"
                type="number"
                min={0}
                max={520}
                value={minDurationWeeks}
                onChange={(e) => setMinDurationWeeks(e.target.value)}
                placeholder="e.g., 8"
              />
            </div>

            <div className="flex items-end pb-1">
              <label
                htmlFor="filter-trained-only"
                className="flex cursor-pointer items-center gap-2.5 rounded-md border-2 border-border bg-canvas px-3 py-2 font-mono text-xs font-semibold text-ink shadow-control"
              >
                <input
                  id="filter-trained-only"
                  name="trained_only"
                  type="checkbox"
                  value="true"
                  checked={trainedOnly}
                  onChange={(e) => setTrainedOnly(e.target.checked)}
                  className="h-4 w-4 accent-ink"
                />
                <span>Trained lifters only</span>
              </label>
            </div>
          </div>
        </form>
      </Card>

      {aiActive && !authLoading && !profile && (
        <AskAiOAuthPrompt
          query={query}
          studyDesign={studyDesign}
          trainedOnly={trainedOnly}
          onDismiss={() => setAiActive(false)}
        />
      )}

      {showSynthesisPanel && (
        <AiSynthesisPanel
          query={synthesis.submittedQuery}
          answerMarkdown={synthesis.answerMarkdown}
          citations={synthesis.citations}
          isStreaming={synthesis.isStreaming}
          cached={synthesis.cached}
          tierUsed={synthesis.tierUsed}
          emptyMessage={synthesis.emptyMessage}
          errorMessage={synthesis.errorMessage}
        />
      )}
    </div>
  );
}
