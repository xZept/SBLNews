import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { StudyCard } from "@/components/feed/study-card";
import { AiSearchWorkspace } from "@/components/search/ai-search-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAiSearchConfig } from "@/lib/ai-search/config";
import { getMyAiQuotaStatus } from "@/lib/ai-search/quota-and-cache";
import type { AiQuotaStatus } from "@/lib/queries/projections";
import { searchStudiesHybrid } from "@/lib/queries/studies";
import { createClient } from "@/lib/supabase/server";
import { HybridSearchSchema } from "@/lib/validations/search";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickFirst(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const raw = await searchParams;

  const rawQ = pickFirst(raw.q) ?? "";
  const rawStudyDesign = pickFirst(raw.study_design);
  const rawMinDuration = pickFirst(raw.min_duration_weeks);
  const rawTrainedOnly = pickFirst(raw.trained_only);
  const rawLimit = pickFirst(raw.limit);
  const rawAi = pickFirst(raw.ai);
  const initialAiActive = rawAi === "1" || rawAi === "true";

  const parsed = HybridSearchSchema.safeParse({
    q: rawQ,
    study_design: rawStudyDesign,
    min_duration_weeks: rawMinDuration,
    trained_only: rawTrainedOnly,
    limit: rawLimit,
  });

  const validationErrors = parsed.success
    ? []
    : parsed.error.issues.map((issue) => {
        const field = issue.path[0];
        return field ? `${String(field)}: ${issue.message}` : issue.message;
      });

  const params = parsed.success
    ? parsed.data
    : { q: rawQ.slice(0, 200), limit: 20 };

  const { results, usedSemantic } = parsed.success
    ? await searchStudiesHybrid(params)
    : { results: [], usedSemantic: false };

  let votedStudyIds = new Set<string>();
  let initialQuota: AiQuotaStatus | null = null;
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      try {
        initialQuota = await getMyAiQuotaStatus(
          supabase,
          getAiSearchConfig().dailyQuotaLimit
        );
      } catch (err) {
        console.error("Failed to hydrate AI quota on /search:", err);
      }

      if (results.length > 0) {
        const { data: votes } = await supabase
          .from("votes")
          .select("study_id")
          .eq("user_id", user.id)
          .in(
            "study_id",
            results.map((r) => r.id)
          );
        if (votes) {
          votedStudyIds = new Set(votes.map((v) => v.study_id as string));
        }
      }
    }
  }

  const hasActiveFilters = Boolean(
    !parsed.success ||
      params.q ||
      params.study_design ||
      params.min_duration_weeks !== undefined ||
      params.trained_only
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Hybrid Literature Search
          </h1>
          <Badge variant="accent">Keyword + pgvector</Badge>
        </div>
        <p className="max-w-[72ch] text-sm text-muted">
          Search peer-reviewed resistance training studies using full-text
          keyword matching, semantic vector similarity, and deterministic study
          design filters.
        </p>
      </header>

      <AiSearchWorkspace
        initialQuery={params.q ?? rawQ}
        initialStudyDesign={params.study_design ?? ""}
        initialMinDurationWeeks={params.min_duration_weeks}
        initialTrainedOnly={Boolean(params.trained_only)}
        initialAiActive={initialAiActive}
        initialQuota={initialQuota}
        hasActiveFilters={hasActiveFilters}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border pb-2">
        <p className="font-mono text-xs font-semibold text-ink">
          {results.length} {results.length === 1 ? "study" : "studies"} found
        </p>
        <div className="flex items-center gap-2">
          {params.q && (
            <Badge variant={usedSemantic ? "meta" : "muted"}>
              {usedSemantic
                ? "Hybrid: Keyword + Semantic"
                : "Keyword Fallback"}
            </Badge>
          )}
        </div>
      </div>

      {validationErrors.length > 0 ? (
        <Card
          role="alert"
          className="border-2 border-accent-ink bg-badge-abstract p-6 text-accent-ink"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
                <h2 className="font-display text-lg font-bold text-accent-ink">
                  Invalid search parameters
                </h2>
              </div>
              <p className="max-w-[65ch] text-sm text-accent-ink">
                Your search could not be executed because one or more query or
                filter values are invalid. Reset filters or adjust your inputs
                and try again.
              </p>
              <ul className="list-disc space-y-1 pl-5 font-mono text-xs text-accent-ink">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
            <Button asChild variant="primary" className="shrink-0 gap-1.5">
              <Link href="/search">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset Filters</span>
              </Link>
            </Button>
          </div>
        </Card>
      ) : results.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="mb-3 flex justify-center">
            <BrandLogo size="md" />
          </div>
          <h2 className="font-display text-lg font-bold text-ink">
            No matching studies found
          </h2>
          <p className="mx-auto mt-1.5 max-w-[65ch] text-sm text-muted">
            Try broadening your search terms or clearing the deterministic
            study design, minimum duration, or trained-lifter filters.
          </p>
          {hasActiveFilters && (
            <div className="mt-4">
              <Button asChild variant="primary">
                <Link href="/search">Reset All Filters</Link>
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {results.map((study) => (
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
