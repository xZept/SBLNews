import Link from "next/link";
import { AlertTriangle, Search, RotateCcw } from "lucide-react";
import { StudyCard } from "@/components/feed/study-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { searchStudiesHybrid } from "@/lib/queries/studies";
import { createClient } from "@/lib/supabase/server";
import {
  HybridSearchSchema,
  StudyDesignEnum,
} from "@/lib/validations/search";
import { formatStudyDesign } from "@/lib/queries/study-badges";

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
  if (
    results.length > 0 &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
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

      <Card className="p-4 sm:p-5">
        <form action="/search" method="GET" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <label htmlFor="search-q" className="sr-only">
                Search literature
              </label>
              <Input
                id="search-q"
                name="q"
                type="search"
                defaultValue={params.q}
                maxLength={200}
                placeholder='e.g., "lengthened partials hypertrophy" or "weekly volume trained lifters"'
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" className="gap-1.5">
                <Search className="h-4 w-4" />
                <span>Search</span>
              </Button>
              {hasActiveFilters && (
                <Button asChild variant="secondary">
                  <Link href="/search" className="gap-1.5">
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-3 border-t border-ink/15 pt-3 sm:grid-cols-3">
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
                defaultValue={params.study_design ?? ""}
                className="flex h-10 w-full rounded-md border-2 border-ink bg-surface px-3 py-2 font-sans text-sm text-ink shadow-[2px_2px_0px_#0F172A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
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
                defaultValue={
                  params.min_duration_weeks !== undefined
                    ? String(params.min_duration_weeks)
                    : ""
                }
                placeholder="e.g., 8"
              />
            </div>

            <div className="flex items-end pb-1">
              <label
                htmlFor="filter-trained-only"
                className="flex cursor-pointer items-center gap-2.5 rounded-md border-2 border-ink bg-canvas px-3 py-2 font-mono text-xs font-semibold text-ink shadow-[2px_2px_0px_#0F172A]"
              >
                <input
                  id="filter-trained-only"
                  name="trained_only"
                  type="checkbox"
                  value="true"
                  defaultChecked={Boolean(params.trained_only)}
                  className="h-4 w-4 accent-ink"
                />
                <span>Trained lifters only</span>
              </label>
            </div>
          </div>
        </form>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink pb-2">
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
          className="border-2 border-ink bg-badge-abstract p-6 text-ink"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
                <h2 className="font-display text-lg font-bold text-ink">
                  Invalid search parameters
                </h2>
              </div>
              <p className="max-w-[65ch] text-sm text-ink">
                Your search could not be executed because one or more query or
                filter values are invalid. Reset filters or adjust your inputs
                and try again.
              </p>
              <ul className="list-disc space-y-1 pl-5 font-mono text-xs text-ink">
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
