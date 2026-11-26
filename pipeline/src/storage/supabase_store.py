from typing import Any
from supabase import create_client

from src.models import RawLiteratureRecord, StudyExtractionSchema
from src.scoring import ScoringResult


class SupabaseStore:
    """Storage adapter for studies and consensus_drift_alerts.

    By architecture and test contract, this class NEVER mutates `guidelines`.
    """

    def __init__(
        self,
        url: str | None = None,
        service_role_key: str | None = None,
        client: Any | None = None,
    ) -> None:
        if client is not None:
            self._client = client
        elif url and service_role_key:
            self._client = create_client(url, service_role_key)
        else:
            raise ValueError("Provide either `client` or (`url` and `service_role_key`)")

    def fetch_existing_identifiers(self) -> tuple[set[str], set[str], set[str]]:
        resp = (
            self._client.table("studies")
            .select("doi, pubmed_id, openalex_id")
            .execute()
        )
        dois: set[str] = set()
        pmids: set[str] = set()
        oa_ids: set[str] = set()
        for row in resp.data or []:
            if row.get("doi"):
                dois.add(row["doi"])
            if row.get("pubmed_id"):
                pmids.add(row["pubmed_id"])
            if row.get("openalex_id"):
                oa_ids.add(row["openalex_id"])
        return dois, pmids, oa_ids

    def upsert_study_and_alerts(
        self,
        record: RawLiteratureRecord,
        extraction: StudyExtractionSchema,
        scoring: ScoringResult,
        embedding: list[float] | None,
    ) -> tuple[str, int]:
        conflict_col = (
            "doi"
            if record.doi
            else "pubmed_id"
            if record.pubmed_id
            else "openalex_id"
        )

        payload: dict[str, Any] = {
            "doi": record.doi,
            "pubmed_id": record.pubmed_id,
            "openalex_id": record.openalex_id,
            "title": record.title,
            "journal": record.journal,
            "publication_year": record.publication_year,
            "published_at": record.published_at.isoformat(),
            "primary_url": str(record.primary_url),
            "study_design": extraction.study_design,
            "population": extraction.population,
            "is_human": extraction.is_human,
            "is_trained_population": extraction.is_trained_population,
            "is_acute_emg_only": extraction.is_acute_emg_only,
            "sample_size_n": extraction.sample_size_n,
            "duration_weeks": extraction.duration_weeks,
            "primary_outcome": extraction.primary_outcome,
            "summary_takeaway": extraction.summary_takeaway,
            "limitations": extraction.limitations,
            "inspection_depth": record.inspection_depth,
            "quality_score": scoring.quality_score,
            "publication_status": scoring.publication_status,
            "abstract_text": record.abstract_text,
            "embedding": embedding,
        }

        study_resp = (
            self._client.table("studies")
            .upsert(payload, on_conflict=conflict_col)
            .execute()
        )
        if not study_resp.data:
            raise RuntimeError(f"Failed to upsert study: {record.title}")

        study_id: str = study_resp.data[0]["id"]
        alerts_created = 0

        if scoring.should_create_drift_alert and extraction.matched_guideline_slugs:
            # Read-only SELECT on guidelines; never mutate guidelines from /pipeline
            guidelines_resp = (
                self._client.table("guidelines")
                .select("id, slug")
                .in_("slug", list(extraction.matched_guideline_slugs))
                .execute()
            )

            for g_row in guidelines_resp.data or []:
                alert_payload = {
                    "guideline_id": g_row["id"],
                    "trigger_study_id": study_id,
                    "drift_rationale": (
                        f"Newly ingested {extraction.study_design.replace('_', ' ')} "
                        f"('{record.title}') addresses '{g_row['slug']}': "
                        f"{extraction.summary_takeaway}"
                    ),
                    "status": "pending",
                }
                self._client.table("consensus_drift_alerts").upsert(
                    alert_payload,
                    on_conflict="guideline_id,trigger_study_id",
                ).execute()
                alerts_created += 1

        return study_id, alerts_created
