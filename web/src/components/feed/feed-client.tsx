"use client";

import * as React from "react";
import { FilterBar } from "@/components/feed/filter-bar";
import { StudyCard } from "@/components/feed/study-card";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { StudyDesignType, StudySummary } from "@/lib/queries/projections";
import type { FeedTab } from "@/lib/validations/search";

interface FeedClientProps {
  initialStudies: StudySummary[];
}

export function FeedClient({ initialStudies }: FeedClientProps) {
  const [tab, setTab] = React.useState<FeedTab>("daily");
  const [studyDesign, setStudyDesign] = React.useState<StudyDesignType | "all">(
    "all"
  );
  const [trainedOnly, setTrainedOnly] = React.useState(false);
  const [votedStudyIds, setVotedStudyIds] = React.useState<Set<string>>(
    () => new Set()
  );

  React.useEffect(() => {
    let mounted = true;
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(async ({ data }) => {
        if (!mounted || !data.user) return;
        const { data: votes } = await supabase
          .from("votes")
          .select("study_id")
          .eq("user_id", data.user.id);
        if (mounted && votes) {
          setVotedStudyIds(new Set(votes.map((v) => v.study_id)));
        }
      });
    } catch {
      // Env vars may be absent in local static preview
    }
    return () => {
      mounted = false;
    };
  }, []);

  const filteredAndSorted = React.useMemo(() => {
    const nowMs = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    let items = initialStudies.filter((study) => {
      if (studyDesign !== "all" && study.study_design !== studyDesign) {
        return false;
      }
      if (trainedOnly && !study.is_trained_population) {
        return false;
      }
      if (tab === "weekly") {
        const publishedMs = Date.parse(study.published_at);
        if (!Number.isNaN(publishedMs) && nowMs - publishedMs > sevenDaysMs) {
          return false;
        }
      }
      return true;
    });

    items = [...items].sort((a, b) => {
      if (tab === "daily") {
        if (a.published_at !== b.published_at) {
          return b.published_at.localeCompare(a.published_at);
        }
        return b.quality_score - a.quality_score;
      }
      if (tab === "weekly") {
        if (a.quality_score !== b.quality_score) {
          return b.quality_score - a.quality_score;
        }
        return b.upvote_count - a.upvote_count;
      }
      // "top"
      if (a.upvote_count !== b.upvote_count) {
        return b.upvote_count - a.upvote_count;
      }
      return b.quality_score - a.quality_score;
    });

    return items;
  }, [initialStudies, tab, studyDesign, trainedOnly]);

  function handleResetFilters() {
    setTab("daily");
    setStudyDesign("all");
    setTrainedOnly(false);
  }

  return (
    <div>
      <FilterBar
        tab={tab}
        onTabChange={setTab}
        studyDesign={studyDesign}
        onStudyDesignChange={setStudyDesign}
        trainedOnly={trainedOnly}
        onTrainedOnlyChange={setTrainedOnly}
        totalCount={filteredAndSorted.length}
      />

      {filteredAndSorted.length === 0 ? (
        <div className="rpg-dialog-frame rounded-sm border-2 border-border bg-surface p-8 text-center">
          <div className="mb-3 flex justify-center">
            <BrandLogo size="md" />
          </div>
          <p className="font-pixel text-[11px] font-bold uppercase tracking-wider text-muted">
            QUEST LOG EMPTY
          </p>
          <h2 className="mt-1 font-display text-lg font-bold text-ink">
            No matching studies found
          </h2>
          <p className="mx-auto mt-2 max-w-[65ch] text-sm text-muted">
            No published studies matched your current tab and filter combination.
          </p>
          <Button
            type="button"
            variant="primary"
            className="mt-4"
            onClick={handleResetFilters}
          >
            Reset filters
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSorted.map((study) => (
            <StudyCard
              key={study.id}
              study={study}
              initialVoted={votedStudyIds.has(study.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
