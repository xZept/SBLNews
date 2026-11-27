import Link from "next/link";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AURA_RULES } from "@/lib/aura";

export const dynamic = "force-static";

const SCORING_BASE_ROWS = [
  {
    design: "Meta-Analysis / Systematic Review",
    base: "85",
    notes: "Highest-tier quantitative or structured synthesis",
  },
  {
    design: "Randomized Controlled Trial (≥ 8 weeks)",
    base: "75",
    notes: "Longitudinal causal hypertrophy or strength trial",
  },
  {
    design: "Controlled Trial (≥ 8 weeks)",
    base: "65",
    notes: "Non-randomized longitudinal intervention",
  },
  {
    design: "Short RCT / Controlled Trial (< 8 weeks)",
    base: "55",
    notes: "Brief intervention; requires modifier or review",
  },
  {
    design: "Cohort / Observational",
    base: "40",
    notes: "Associational evidence; routed to moderation",
  },
  {
    design: "Acute Crossover / Narrative Review",
    base: "35",
    notes: "Single-session or non-systematic commentary",
  },
  {
    design: "Animal / In-Vitro",
    base: "10",
    notes: "Hard gate: auto-rejected from human training feed",
  },
];

const SCORING_MODIFIERS = [
  {
    condition: "Resistance-trained human population",
    delta: "+15",
    variant: "trained" as const,
  },
  {
    condition: "Sample size n ≥ 30 participants",
    delta: "+5",
    variant: "default" as const,
  },
  {
    condition: "Full-Text PMC Open Access inspection",
    delta: "+5",
    variant: "fulltext" as const,
  },
  {
    condition: "Acute single-session EMG-only outcome",
    delta: "-45",
    variant: "abstract" as const,
  },
];

export default function MethodologyPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2 border-b-2 border-border pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <BrandLogo size="lg" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Methodology &amp; Transparency Standards
          </h1>
          <Badge variant="accent">Static Specification</Badge>
        </div>
        <p className="max-w-[70ch] text-sm leading-relaxed text-muted">
          SBL News separates factual metadata extraction from deterministic
          evidence scoring and human-governed training guidelines. Every score,
          badge, and guideline update follows explicit, auditable rules.
        </p>
      </header>

      <div className="grid gap-6">
        <Card className="p-5 sm:p-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="meta">Pillar 1</Badge>
              <h2 className="font-display text-xl font-bold text-ink">
                Primary Peer-Reviewed Literature Sources
              </h2>
            </div>
            <p className="max-w-[70ch] text-sm leading-relaxed text-ink">
              The daily ingestion pipeline queries primary academic repositories
              only: <strong>PubMed E-utilities</strong> (with PMC Open Access
              full-text XML when available), <strong>OpenAlex</strong>, and
              targeted exercise-science journal RSS feeds. Records are
              deduplicated using canonical identifiers (<code>doi</code>,{" "}
              <code>pubmed_id</code>, <code>openalex_id</code>).
            </p>
            <p className="max-w-[70ch] text-sm leading-relaxed text-muted">
              Secondary creator videos, podcasts, and social media threads are
              never ingested as standalone feed items. They may only be attached
              by moderators as secondary commentary inside an existing primary
              study&apos;s discussion page.
            </p>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="rct">Pillar 2</Badge>
              <h2 className="font-display text-xl font-bold text-ink">
                100% Deterministic Evidence Scoring Rubric
              </h2>
            </div>
            <p className="max-w-[70ch] text-sm leading-relaxed text-ink">
              Gemini 3.5 Flash Lite is restricted to structured factual metadata
              extraction (study design, population, sample size, duration,
              outcomes, and limitations) and never assigns quality scores.
              Scores (0–100) are computed deterministically in Python:
            </p>

            <div className="overflow-x-auto rounded-md border-2 border-border">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-border bg-canvas font-mono text-xs uppercase text-ink">
                    <th className="px-3 py-2.5">Study Design Tier</th>
                    <th className="px-3 py-2.5">Base Score</th>
                    <th className="px-3 py-2.5">Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/15">
                  {SCORING_BASE_ROWS.map((row) => (
                    <tr key={row.design} className="bg-surface">
                      <td className="px-3 py-2.5 font-semibold text-ink">
                        {row.design}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold text-ink">
                        {row.base}
                      </td>
                      <td className="px-3 py-2.5 text-muted">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {SCORING_MODIFIERS.map((mod) => (
                <div
                  key={mod.condition}
                  className="flex items-center justify-between gap-3 rounded-md border-2 border-border bg-canvas px-3 py-2"
                >
                  <span className="text-xs font-medium text-ink">
                    {mod.condition}
                  </span>
                  <Badge variant={mod.variant}>{mod.delta}</Badge>
                </div>
              ))}
            </div>

            <p className="max-w-[70ch] font-mono text-xs text-muted">
              Publication Gates: Score ≥ 60 auto-publishes to{" "}
              <Link href="/" className="font-semibold text-ink underline">
                /
              </Link>
              ; 35–59 enters pending moderation; &lt; 35 is rejected.
            </p>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="fulltext">Pillar 3</Badge>
              <h2 className="font-display text-xl font-bold text-ink">
                Full-Text vs. Abstract-Only Inspection Badges
              </h2>
            </div>
            <p className="max-w-[70ch] text-sm leading-relaxed text-ink">
              Every study displays an explicit inspection-depth badge so readers
              know how much of the paper was available during extraction:
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border-2 border-border bg-canvas p-3.5">
                <Badge variant="fulltext">Full-Text</Badge>
                <p className="mt-2 text-xs leading-relaxed text-ink">
                  Methods, sample characteristics, and results were inspected
                  transiently via PMC Open Access XML. Copyrighted full text is
                  never stored in the database.
                </p>
              </div>
              <div className="rounded-md border-2 border-border bg-canvas p-3.5">
                <Badge variant="abstract">Abstract-Only</Badge>
                <p className="mt-2 text-xs leading-relaxed text-ink">
                  Paywalled or abstract-only record. Metadata reflects only the
                  publicly indexed abstract; unreported fields remain{" "}
                  <code>null</code> rather than guessed.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="trained">Pillar 4</Badge>
              <h2 className="font-display text-xl font-bold text-ink">
                Human-in-the-Loop (HITL) Guideline Governance
              </h2>
            </div>
            <p className="max-w-[70ch] text-sm leading-relaxed text-ink">
              The{" "}
              <Link
                href="/guidelines"
                className="font-semibold text-ink underline"
              >
                Living Evidence Matrix
              </Link>{" "}
              is never mutated automatically by the AI pipeline. Whenever a
              newly ingested human meta-analysis or systematic review touches an
              active training variable, the pipeline creates a{" "}
              <strong>Consensus Drift</strong> alert in{" "}
              <Link
                href="/admin/review"
                className="font-semibold text-ink underline"
              >
                /admin/review
              </Link>
              .
            </p>
            <p className="max-w-[70ch] text-sm leading-relaxed text-muted">
              An administrator must review the paper, verify effect sizes and
              population applicability, and either approve an updated consensus
              summary with a timestamped changelog note or dismiss the alert.
            </p>
          </div>
        </Card>

        <Card id="aura-rubric" className="p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">Pillar 5</Badge>
              <h2 className="font-display text-xl font-bold text-ink">
                Deterministic Community Aura &amp; Anti-Gaming Caps
              </h2>
            </div>
            <p className="max-w-[70ch] text-sm leading-relaxed text-ink">
              Contributor <strong>Aura</strong> scores on{" "}
              <Link href="/" className="font-semibold text-ink underline">
                /
              </Link>{" "}
              and profile pages are computed 100% deterministically by
              PostgreSQL triggers—never by an LLM—from verifiable community
              actions, subject to strict UTC daily caps:
            </p>

            <div className="overflow-x-auto rounded-md border-2 border-border">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-border bg-canvas font-mono text-xs uppercase text-ink">
                    <th className="px-3 py-2.5">Contribution</th>
                    <th className="px-3 py-2.5">Points</th>
                    <th className="px-3 py-2.5">UTC Daily Cap</th>
                    <th className="px-3 py-2.5">Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/15">
                  {AURA_RULES.map((rule) => (
                    <tr key={rule.key} className="bg-surface">
                      <td className="px-3 py-2.5 font-semibold text-ink">
                        {rule.label}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold text-ink">
                        +{rule.pointsPerAction}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-ink">
                        {rule.dailyCap}/day ({rule.maxActionsPerDay} max)
                      </td>
                      <td className="px-3 py-2.5 text-muted">
                        {rule.ruleSummary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="max-w-[70ch] font-mono text-xs text-muted">
              Reversibility: Deleting a comment, removing a Helpful endorsement,
              or un-upvoting a study immediately recomputes Aura and removes the
              associated points.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
