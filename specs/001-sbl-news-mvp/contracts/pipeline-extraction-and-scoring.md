# Research Ingestion & Deterministic Scoring Contract (`/pipeline`)

**Branch**: `001-sbl-news-mvp` | **Date**: 2026-11-26 | **Spec**: [spec.md](../spec.md)

## 1. CLI & GitHub Actions Entrypoint Contract

The scheduled ingestion worker runs daily via `.github/workflows/daily-ingestion.yml` (`0 6 * * *` UTC) and supports local manual/dry-run execution:

```bash
python -m src.cli ingest \
  --lookback-days 3 \
  --max-papers 25 \
  --dry-run
```

### Environment Variables Required
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Used strictly by `/pipeline` to insert/upsert `studies` and `consensus_drift_alerts`
- `GEMINI_API_KEY`: Google Gemini API key (`gemini-3.5-flash-lite` + Gemini embedding model)
- `PUBMED_EMAIL` / `OPENALEX_MAILTO`: Polite pool contact headers for E-utilities and OpenAlex

---

## 2. Normalized Raw Paper Contract (`RawLiteratureRecord`)

Before invoking Gemini 3.5 Flash Lite, all fetchers (PubMed, OpenAlex, Journal RSS) normalize papers into this Pydantic v2 model and deduplicate against existing database identifiers (`doi`, `pubmed_id`, `openalex_id`):

```python
from datetime import date
from typing import Literal
from pydantic import BaseModel, Field, HttpUrl

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
    inspection_depth: Literal["Full-Text", "Abstract-Only"]
```

**Inspection Depth Rule**:
- `inspection_depth` MUST be `"Full-Text"` if and only if `full_text_content` contains the retrieved open-access article body (e.g., PMC Open Access XML body text >= 1,500 characters). Otherwise it MUST be `"Abstract-Only"`.

---

## 3. Gemini 3.5 Flash Lite Structured Extraction Contract (`StudyExtractionSchema`)

Passed as `response_schema=StudyExtractionSchema` with `response_mime_type="application/json"` to `gemini-3.5-flash-lite`. Notice that **no quality score or ranking field exists in the LLM schema**:

```python
from typing import Literal
from pydantic import BaseModel, Field

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
```

---

## 4. Deterministic Evidence Scoring Contract (`compute_deterministic_score`)

Executed purely in Python (`/pipeline/src/scoring.py`) and verified by `pytest`:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class ScoringResult:
    quality_score: int
    publication_status: Literal["published", "pending", "rejected"]
    should_create_drift_alert: bool
```

### Normative Scoring Rules:
1. **Exclusion / Downranking Gates**:
   - If `not extraction.is_human` or `extraction.study_design == "animal_in_vitro"`:
     - `quality_score = 10`, `publication_status = "rejected"`, `should_create_drift_alert = False`.
2. **Base Score by Study Design**:
   - `meta_analysis` or `systematic_review`: `85`
   - `rct` with `(duration_weeks or 0) >= 8`: `75`
   - `controlled_trial` with `(duration_weeks or 0) >= 8`: `65`
   - `rct` or `controlled_trial` with `(duration_weeks or 0) < 8`: `55`
   - `cohort_observational`: `40`
   - `acute_crossover` or `review_commentary`: `35`
3. **Additive / Subtractive Modifiers**:
   - `is_trained_population is True`: `+15`
   - `sample_size_n is not None and sample_size_n >= 30`: `+5`
   - `inspection_depth == "Full-Text"`: `+5`
   - `is_acute_emg_only is True`: `-45`
   - Final `quality_score` clamped to `[0, 100]`.
4. **Publication Status & Consensus Drift Rule**:
   - `quality_score >= 60`: `publication_status = "published"`
   - `35 <= quality_score < 60`: `publication_status = "pending"` (routed to `/admin/review`)
   - `quality_score < 35`: `publication_status = "rejected"`
   - `should_create_drift_alert = (extraction.is_human and extraction.study_design in ("meta_analysis", "systematic_review") and len(extraction.matched_guideline_slugs) > 0)`
     - When `True`, `/pipeline` inserts one `consensus_drift_alerts` row per matched guideline slug with `status = "pending"` and **never** mutates the `guidelines` table.
