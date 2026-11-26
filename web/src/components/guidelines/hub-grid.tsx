import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  EvidenceGradeType,
  GuidelineHubType,
} from "@/lib/queries/projections";
import type { GuidelineWithAnchors } from "@/lib/queries/guidelines";

const HUB_DEFINITIONS: Array<{
  hub: GuidelineHubType;
  tagline: string;
}> = [
  {
    hub: "Hypertrophy",
    tagline:
      "Dose-response set volume and proximity-to-failure thresholds for skeletal muscle growth.",
  },
  {
    hub: "Maximal Strength",
    tagline:
      "Weekly lift frequency and inter-set recovery strategies supporting neural and 1RM adaptations.",
  },
  {
    hub: "Recovery & Nutrition",
    tagline:
      "Daily protein targets and nutritional recovery baselines for resistance-trained lifters.",
  },
];

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

interface HubGridProps {
  guidelines: GuidelineWithAnchors[];
}

export function HubGrid({ guidelines }: HubGridProps) {
  return (
    <section aria-labelledby="core-hubs-heading" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="core-hubs-heading"
          className="font-display text-xl font-bold tracking-tight text-ink"
        >
          Core Evidence Hubs
        </h2>
        <span className="font-mono text-xs text-muted">
          3 DOMAINS · HUMAN-VERIFIED CONSENSUS
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {HUB_DEFINITIONS.map(({ hub, tagline }) => {
          const hubGuidelines = guidelines.filter((g) => g.hub === hub);

          return (
            <Card key={hub} className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{hub}</CardTitle>
                  <Badge variant="accent">
                    {hubGuidelines.length}{" "}
                    {hubGuidelines.length === 1 ? "VAR" : "VARS"}
                  </Badge>
                </div>
                <CardDescription className="text-sm leading-relaxed">
                  {tagline}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2 pt-0">
                {hubGuidelines.length === 0 ? (
                  <p className="font-mono text-xs text-muted">
                    No active variables seeded yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {hubGuidelines.map((item) => (
                      <li key={item.id}>
                        <a
                          href={`#var-${item.slug}`}
                          className="group flex items-center justify-between gap-2 rounded-sm border-[1.5px] border-ink bg-canvas px-3 py-2 shadow-[2px_2px_0px_#0F172A] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:bg-accent"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-display text-sm font-bold text-ink">
                              {item.variable_name}
                            </div>
                            <div className="truncate font-mono text-[11px] text-muted group-hover:text-ink">
                              {item.practical_prescription}
                            </div>
                          </div>
                          <Badge
                            variant={gradeBadgeVariant(item.evidence_grade)}
                            className="shrink-0"
                          >
                            Grade {item.evidence_grade}
                          </Badge>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
