from datetime import date
import pytest
from pydantic import ValidationError

from src.models import RawLiteratureRecord, StudyExtractionSchema


def test_study_extraction_schema_null_safety_and_no_score_field() -> None:
    assert "quality_score" not in StudyExtractionSchema.model_fields
    assert "score" not in StudyExtractionSchema.model_fields

    extraction = StudyExtractionSchema(
        study_design="rct",
        population="Untrained young adults",
        is_human=True,
        is_trained_population=False,
        is_acute_emg_only=False,
        sample_size_n=None,
        duration_weeks=None,
        primary_outcome="Quadriceps cross-sectional area",
        summary_takeaway=(
            "Eight weeks of resistance training increased muscle thickness. "
            "Sample size and exact duration were not reported in the abstract."
        ),
        limitations=["Sample size not reported in abstract."],
        matched_guideline_slugs=["weekly-volume"],
    )

    assert extraction.sample_size_n is None
    assert extraction.duration_weeks is None


def test_study_extraction_schema_rejects_invalid_bounds() -> None:
    with pytest.raises(ValidationError):
        StudyExtractionSchema(
            study_design="rct",
            population="Trained men",
            is_human=True,
            is_trained_population=True,
            is_acute_emg_only=False,
            sample_size_n=0,
            duration_weeks=8.0,
            primary_outcome="1RM Squat",
            summary_takeaway=(
                "Trained lifters improved squat strength significantly. "
                "Higher weekly volume produced slightly greater gains."
            ),
            limitations=["Small cohort."],
        )

    with pytest.raises(ValidationError):
        StudyExtractionSchema(
            study_design="rct",
            population="Trained men",
            is_human=True,
            is_trained_population=True,
            is_acute_emg_only=False,
            sample_size_n=24,
            duration_weeks=-2.0,
            primary_outcome="1RM Squat",
            summary_takeaway=(
                "Trained lifters improved squat strength significantly. "
                "Higher weekly volume produced slightly greater gains."
            ),
            limitations=["Negative duration should fail."],
        )


def test_raw_literature_record_enforces_inspection_depth_rule() -> None:
    long_body = "x" * 1600
    full_text_rec = RawLiteratureRecord(
        doi="10.1519/jsc.0000000000004812",
        title="Effects of Weekly Set Volume on Hypertrophy in Trained Lifters",
        journal="Journal of Strength and Conditioning Research",
        publication_year=2025,
        published_at=date(2025, 11, 1),
        primary_url="https://pubmed.ncbi.nlm.nih.gov/12345678/",
        abstract_text="This randomized controlled trial examined weekly set volume in trained lifters.",
        full_text_content=long_body,
        inspection_depth="Full-Text",
    )
    assert full_text_rec.inspection_depth == "Full-Text"

    with pytest.raises(ValidationError):
        RawLiteratureRecord(
            doi="10.1519/jsc.0000000000004812",
            title="Effects of Weekly Set Volume on Hypertrophy in Trained Lifters",
            journal="Journal of Strength and Conditioning Research",
            publication_year=2025,
            published_at=date(2025, 11, 1),
            primary_url="https://pubmed.ncbi.nlm.nih.gov/12345678/",
            abstract_text="This randomized controlled trial examined weekly set volume in trained lifters.",
            full_text_content="Too short",
            inspection_depth="Full-Text",
        )
