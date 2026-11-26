from datetime import date
from typing import Literal
from pydantic import BaseModel, Field, HttpUrl, model_validator

StudyDesignLiteral = Literal[
    "meta_analysis",
    "systematic_review",
    "rct",
    "controlled_trial",
    "cohort_observational",
    "acute_crossover",
    "animal_in_vitro",
    "review_commentary",
]

GuidelineSlugLiteral = Literal[
    "weekly-volume",
    "rir-failure",
    "frequency",
    "rest-intervals",
    "lengthened-partials",
    "protein-intake",
]

InspectionDepthLiteral = Literal["Full-Text", "Abstract-Only"]

MIN_FULL_TEXT_CHARS = 1500


class RawLiteratureRecord(BaseModel):
    doi: str | None = None
    pubmed_id: str | None = None
    openalex_id: str | None = None
    title: str = Field(min_length=5)
    journal: str = Field(min_length=2)
    publication_year: int = Field(ge=1900, le=2100)
    published_at: date
    primary_url: HttpUrl
    abstract_text: str = Field(min_length=20)
    full_text_content: str | None = None
    inspection_depth: InspectionDepthLiteral

    @model_validator(mode="after")
    def validate_identifiers_and_depth(self) -> "RawLiteratureRecord":
        if not (self.doi or self.pubmed_id or self.openalex_id):
            raise ValueError(
                "At least one canonical identifier (doi, pubmed_id, openalex_id) is required"
            )

        has_full_text = (
            self.full_text_content is not None
            and len(self.full_text_content.strip()) >= MIN_FULL_TEXT_CHARS
        )
        if self.inspection_depth == "Full-Text" and not has_full_text:
            raise ValueError(
                f"inspection_depth='Full-Text' requires full_text_content >= {MIN_FULL_TEXT_CHARS} chars"
            )
        if self.inspection_depth == "Abstract-Only" and has_full_text:
            raise ValueError(
                "inspection_depth must be 'Full-Text' when full_text_content >= 1500 chars"
            )
        return self


class StudyExtractionSchema(BaseModel):
    study_design: StudyDesignLiteral
    population: str = Field(
        min_length=3,
        max_length=160,
        description="Concise subject cohort description, e.g., 'Resistance-trained men and women'",
    )
    is_human: bool = Field(
        description="True if subjects are humans; False for rodent, animal, or in-vitro models"
    )
    is_trained_population: bool = Field(
        description="True only if subjects have documented prior resistance-training experience"
    )
    is_acute_emg_only: bool = Field(
        description="True if the study only measures acute single-session surface EMG or transient markers without longitudinal hypertrophy/strength outcomes"
    )
    sample_size_n: int | None = Field(
        default=None,
        ge=1,
        description="Total human participant sample size (n); None if not explicitly stated in the provided text",
    )
    duration_weeks: float | None = Field(
        default=None,
        ge=0,
        description="Longitudinal training intervention duration in weeks; None if acute, cross-sectional, or not stated",
    )
    primary_outcome: str = Field(
        min_length=3,
        max_length=200,
        description="Primary measured hypertrophy, maximal strength, or recovery outcome",
    )
    summary_takeaway: str = Field(
        min_length=20,
        max_length=600,
        description="Exactly two concise, objective sentences summarizing the quantitative finding and practical takeaway",
    )
    limitations: list[str] = Field(
        min_length=1,
        max_length=5,
        description="1 to 5 specific methodological caveats or scope limitations",
    )
    matched_guideline_slugs: list[GuidelineSlugLiteral] = Field(
        default_factory=list,
        description="Active training guideline variables directly addressed by this study",
    )
