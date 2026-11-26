import Link from "next/link";
import { ArrowUpRight, BookOpen, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EvidenceGradeType } from "@/lib/queries/projections";
import type { GuidelineWithAnchors } from "@/lib/queries/guidelines";
import { orderChangelogEntries } from "@/lib/queries/changelog";

function gradeBadgeVariant(grade: EvidenceGradeType) {
  switch (grade) {
    case "A":
      return "meta" as const;
    case "B":
      return "rct" as const;
    case "C":
      return "trained" as const;
    case "D":
      return "abstract" as const;
  }
}

function formatIsoDate(isoString: string): string {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return isoString;
  }
  return parsed.toISOString().slice(0, 10);
}

interface VariableDirectoryProps {
  guidelines: GuidelineWithAnchors[];
}

export function VariableDirectory({ guidelines }: VariableDirectoryProps) {
  return (
    <section aria-labelledby="variable-directory-heading" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="variable-directory-heading"
          className="font-display text-xl font-bold tracking-tight text-ink"
        >
          Indexed Training Variables
        </h2>
        <span className="font-mono text-xs text-muted">
          {guidelines.length} ACTIVE VARIABLES · ANCHORED TO META-ANALYSES
        </span>
      </div>

      {guidelines.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="font-display text-base font-bold text-ink">
              No training guidelines published yet.
            </p>
            <p className="mx-auto mt-1 max-w-[65ch] text-sm text-muted">
              Run the initial Supabase guideline seed migration to populate the
              Living Evidence Matrix.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {guidelines.map((guideline) => {
            const orderedChangelog = orderChangelogEntries(guideline.changelog);
            const latestChange = orderedChangelog[0] ?? null;
            const earlierChanges = orderedChangelog.slice(1);

            return (
              <Card
                key={guideline.id}
                id={`var-${guideline.slug}`}
                className="flex scroll-mt-20 flex-col justify-between"
              >
                <div>
                  <CardHeader className="space-y-2 pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <Badge variant="muted" className="text-[11px]">
                        {guideline.hub}
                      </Badge>
                      <Badge variant={gradeBadgeVariant(guideline.evidence_grade)}>
                        Grade {guideline.evidence_grade}
                      </Badge>
                    </div>
                    <CardTitle className="text-base leading-snug">
                      {guideline.variable_name}
                    </CardTitle>
                    <div className="rounded-sm border-[1.5px] border-ink bg-accent px-2.5 py-1.5 font-mono text-xs font-semibold text-ink">
                      {guideline.practical_prescription}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pb-4">
                    <p className="max-w-[65ch] text-sm leading-relaxed text-ink">
                      {guideline.consensus_summary}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted">
                        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Anchor Citations ({guideline.anchorStudies.length})</span>
                      </div>

                      {guideline.anchorStudies.length === 0 ? (
                        <p className="rounded-sm border-[1.5px] border-ink bg-canvas px-2.5 py-2 font-mono text-[11px] text-muted">
                          Baseline consensus seeded — awaiting linked anchor
                          meta-analysis.
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {guideline.anchorStudies.map((study) => (
                            <li key={study.id}>
                              <Link
                                href={`/study/${study.id}`}
                                className="group flex items-start justify-between gap-2 rounded-sm border-[1.5px] border-ink bg-canvas px-2.5 py-1.5 text-xs hover:bg-accent"
                              >
                                <span className="line-clamp-2 font-medium text-ink">
                                  {study.title}
                                  <span className="ml-1 font-mono text-[11px] text-muted group-hover:text-ink">
                                    ({study.publication_year})
                                  </span>
                                </span>
                                <ArrowUpRight
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink"
                                  aria-hidden="true"
                                />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </CardContent>
                </div>

                <CardFooter className="flex-col items-start gap-2 border-t-2 border-ink bg-canvas px-5 py-3">
                  <div className="flex w-full items-center justify-between gap-2 font-mono text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1 font-semibold text-ink">
                      <History className="h-3 w-3" aria-hidden="true" />
                      Changelog
                    </span>
                    <span>Updated {formatIsoDate(guideline.updated_at)}</span>
                  </div>

                  {latestChange ? (
                    <div className="w-full space-y-1 text-xs text-muted">
                      <p className="leading-snug text-ink">
                        <span className="mr-1.5 font-mono text-[11px] font-semibold text-muted">
                          [{formatIsoDate(latestChange.updated_at)}]
                        </span>
                        {latestChange.summary}
                      </p>
                      {latestChange.study_id && (
                        <Link
                          href={`/study/${latestChange.study_id}`}
                          className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-ink underline underline-offset-2 hover:bg-accent"
                        >
                          View trigger study
                          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  ) : (
                    <p className="font-mono text-[11px] text-muted">
                      No changelog entries recorded.
                    </p>
                  )}

                  {earlierChanges.length > 0 && (
                    <details className="w-full pt-1">
                      <summary className="cursor-pointer font-mono text-[11px] font-semibold text-ink hover:underline">
                        View {earlierChanges.length} earlier{" "}
                        {earlierChanges.length === 1 ? "entry" : "entries"}
                      </summary>
                      <ul className="mt-2 space-y-1.5 border-l-2 border-ink pl-2.5">
                        {earlierChanges.map((entry, idx) => (
                          <li
                            key={`${entry.updated_at}-${idx}`}
                            className="text-[11px] leading-snug text-muted"
                          >
                            <span className="mr-1 font-mono font-semibold text-ink">
                              [{formatIsoDate(entry.updated_at)}]
                            </span>
                            {entry.summary}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
