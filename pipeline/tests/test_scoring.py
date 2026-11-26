from src.models import StudyExtractionSchema
from src.scoring import compute_deterministic_score


def _make_extraction(**overrides) -> StudyExtractionSchema:
    defaults = dict(
        study_design="rct",
        population="Resistance-trained men and women",
        is_human=True,
        is_trained_population=True,
        is_acute_emg_only=False,
        sample_size_n=36,
        duration_weeks=10.0,
        primary_outcome="Rectus femoris thickness",
        summary_takeaway=(
            "Ten weeks of training produced significant hypertrophy. "
            "Trained lifters responded best to moderate-to-high weekly volume."
        ),
        limitations=["Single-site ultrasound measurement."],
        matched_guideline_slugs=[],
    )
    defaults.update(overrides)
    return StudyExtractionSchema(**defaults)


def test_human_meta_analysis_ranks_top_and_triggers_drift_alert() -> None:
    extraction = _make_extraction(
        study_design="meta_analysis",
        duration_weeks=None,
        sample_size_n=450,
        matched_guideline_slugs=["weekly-volume"],
    )
    result = compute_deterministic_score(extraction, "Full-Text")
    assert result.quality_score >= 85
    assert result.quality_score == 100
    assert result.publication_status == "published"
    assert result.should_create_drift_alert is True


def test_trained_rct_8_weeks_scores_at_least_90() -> None:
    extraction = _make_extraction(
        study_design="rct",
        is_trained_population=True,
        duration_weeks=8.0,
        sample_size_n=20,
    )
    result = compute_deterministic_score(extraction, "Abstract-Only")
    assert result.quality_score >= 90
    assert result.quality_score == 90
    assert result.publication_status == "published"
    assert result.should_create_drift_alert is False


def test_controlled_trial_8_weeks_base_score_65() -> None:
    extraction = _make_extraction(
        study_design="controlled_trial",
        is_trained_population=False,
        duration_weeks=8.0,
        sample_size_n=20,
    )
    result = compute_deterministic_score(extraction, "Abstract-Only")
    assert result.quality_score == 65
    assert result.publication_status == "published"


def test_animal_study_is_rejected_with_score_10() -> None:
    extraction = _make_extraction(
        study_design="animal_in_vitro",
        is_human=False,
        is_trained_population=False,
        matched_guideline_slugs=["protein-intake"],
    )
    result = compute_deterministic_score(extraction, "Full-Text")
    assert result.quality_score == 10
    assert result.publication_status == "rejected"
    assert result.should_create_drift_alert is False


def test_acute_emg_only_study_receives_minus_45_penalty_and_rejected() -> None:
    extraction = _make_extraction(
        study_design="acute_crossover",
        is_trained_population=True,
        is_acute_emg_only=True,
        duration_weeks=None,
        sample_size_n=15,
    )
    result = compute_deterministic_score(extraction, "Abstract-Only")
    # 35 (acute_crossover) + 15 (trained) - 45 (acute_emg_only) = 5
    assert result.quality_score == 5
    assert result.publication_status == "rejected"
    assert result.should_create_drift_alert is False


def test_borderline_observational_study_routes_to_pending() -> None:
    extraction = _make_extraction(
        study_design="cohort_observational",
        is_trained_population=False,
        duration_weeks=None,
        sample_size_n=40,
    )
    result = compute_deterministic_score(extraction, "Abstract-Only")
    # 40 + 5 (n >= 30) = 45 -> pending
    assert result.quality_score == 45
    assert result.publication_status == "pending"
