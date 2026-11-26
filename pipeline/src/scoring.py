from dataclasses import dataclass
from typing import Literal

from src.models import InspectionDepthLiteral, StudyExtractionSchema


@dataclass(frozen=True)
class ScoringResult:
    quality_score: int
    publication_status: Literal["published", "pending", "rejected"]
    should_create_drift_alert: bool


def compute_deterministic_score(
    extraction: StudyExtractionSchema,
    inspection_depth: InspectionDepthLiteral,
) -> ScoringResult:
    # 1. Exclusion / downranking gate for animal or in-vitro studies
    if not extraction.is_human or extraction.study_design == "animal_in_vitro":
        return ScoringResult(
            quality_score=10,
            publication_status="rejected",
            should_create_drift_alert=False,
        )

    # 2. Base score by study design
    duration = extraction.duration_weeks or 0.0
    if extraction.study_design in ("meta_analysis", "systematic_review"):
        score = 85
    elif extraction.study_design == "rct" and duration >= 8:
        score = 75
    elif extraction.study_design == "controlled_trial" and duration >= 8:
        score = 65
    elif extraction.study_design in ("rct", "controlled_trial"):
        score = 55
    elif extraction.study_design == "cohort_observational":
        score = 40
    else:
        # acute_crossover or review_commentary
        score = 35

    # 3. Additive / subtractive modifiers
    if extraction.is_trained_population:
        score += 15
    if extraction.sample_size_n is not None and extraction.sample_size_n >= 30:
        score += 5
    if inspection_depth == "Full-Text":
        score += 5
    if extraction.is_acute_emg_only:
        score -= 45

    quality_score = max(0, min(100, score))

    # 4. Publication status & Consensus Drift rule
    if quality_score >= 60:
        publication_status: Literal["published", "pending", "rejected"] = "published"
    elif quality_score >= 35:
        publication_status = "pending"
    else:
        publication_status = "rejected"

    should_create_drift_alert = (
        extraction.is_human
        and extraction.study_design in ("meta_analysis", "systematic_review")
        and len(extraction.matched_guideline_slugs) > 0
    )

    return ScoringResult(
        quality_score=quality_score,
        publication_status=publication_status,
        should_create_drift_alert=should_create_drift_alert,
    )
