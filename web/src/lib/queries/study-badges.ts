import type { BadgeProps } from "@/components/ui/badge";
import type { StudyDesignType } from "@/lib/queries/projections";

const STUDY_DESIGN_LABELS: Record<StudyDesignType, string> = {
  meta_analysis: "Meta-Analysis",
  systematic_review: "Systematic Review",
  rct: "RCT",
  controlled_trial: "Controlled Trial",
  cohort_observational: "Cohort / Obs.",
  acute_crossover: "Acute Crossover",
  animal_in_vitro: "Animal / In-Vitro",
  review_commentary: "Review",
};

export function formatStudyDesign(design: StudyDesignType): string {
  return STUDY_DESIGN_LABELS[design] ?? design;
}

export function getStudyDesignBadgeVariant(
  design: StudyDesignType
): BadgeProps["variant"] {
  if (design === "meta_analysis" || design === "systematic_review") {
    return "meta";
  }
  if (design === "rct" || design === "controlled_trial") {
    return "rct";
  }
  return "default";
}
