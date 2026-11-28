import type { Metadata } from "next";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Badge } from "@/components/ui/badge";
import { HubGrid } from "@/components/guidelines/hub-grid";
import { VariableDirectory } from "@/components/guidelines/variable-directory";
import { getLivingGuidelines } from "@/lib/queries/guidelines";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Living Evidence Matrix & Training Guidelines | SBL News",
  description:
    "Practical resistance-training guidelines organized by core evidence hubs and indexed variables, graded and anchored to peer-reviewed meta-analyses.",
};

export default async function GuidelinesPage() {
  const guidelines = await getLivingGuidelines();

  return (
    <div className="space-y-8">
      <header className="space-y-3 border-b-2 border-border pb-5">
        <p className="font-pixel text-[11px] font-bold uppercase tracking-wider text-muted">
          TRAINING CODEX • SKILL TREE
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">LIVING EVIDENCE MATRIX</Badge>
          <Badge variant="meta">HITL VERIFIED</Badge>
        </div>
        <div className="flex items-center gap-3">
          <BrandLogo size="md" />
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Training Guidelines
          </h1>
        </div>
        <p className="max-w-[70ch] text-base leading-relaxed text-muted">
          Practical resistance-training recommendations synthesized from
          peer-reviewed meta-analyses and long-term human trials. Automated
          ingestion can flag Consensus Drift, but every published guideline
          update requires manual administrator review.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs text-ink">
          <Badge variant="meta">Grade A: Meta-Analytic Consensus</Badge>
          <Badge variant="rct">Grade B: Consistent Controlled Trials</Badge>
          <Badge variant="trained">Grade C: Emerging Evidence</Badge>
          <Badge variant="abstract">Grade D: Preliminary / Mixed</Badge>
        </div>
      </header>

      <HubGrid guidelines={guidelines} />

      <VariableDirectory guidelines={guidelines} />
    </div>
  );
}
