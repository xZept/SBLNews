from datetime import date
from typing import Any

from src.models import RawLiteratureRecord, StudyExtractionSchema
from src.scoring import compute_deterministic_score
from src.storage.supabase_store import SupabaseStore


class _FakeResponse:
    def __init__(self, data: list[dict[str, Any]]) -> None:
        self.data = data


class _FakeTableQuery:
    def __init__(self, table_name: str, client: "_FakeSupabaseClient") -> None:
        self.table_name = table_name
        self.client = client
        self._op = "select"
        self._payload: Any = None
        self._filters: dict[str, Any] = {}

    def select(self, *_args: Any, **_kwargs: Any) -> "_FakeTableQuery":
        self._op = "select"
        return self

    def in_(self, col: str, vals: list[Any]) -> "_FakeTableQuery":
        self._filters[col] = vals
        return self

    def upsert(self, payload: dict[str, Any], **_kwargs: Any) -> "_FakeTableQuery":
        self._op = "upsert"
        self._payload = payload
        return self

    def insert(self, payload: dict[str, Any]) -> "_FakeTableQuery":
        self._op = "insert"
        self._payload = payload
        return self

    def update(self, payload: dict[str, Any]) -> "_FakeTableQuery":
        self._op = "update"
        self._payload = payload
        return self

    def delete(self) -> "_FakeTableQuery":
        self._op = "delete"
        return self

    def execute(self) -> _FakeResponse:
        self.client.operations.append((self.table_name, self._op, self._payload))
        if self.table_name == "studies" and self._op == "upsert":
            return _FakeResponse([{"id": "study-uuid-123"}])
        if self.table_name == "guidelines" and self._op == "select":
            rows = [
                {"id": "guideline-uuid-1", "slug": "weekly-volume"},
                {"id": "guideline-uuid-2", "slug": "rir-failure"},
            ]
            slug_filter = self._filters.get("slug")
            if slug_filter is not None:
                rows = [r for r in rows if r["slug"] in slug_filter]
            return _FakeResponse(rows)
        if self.table_name == "consensus_drift_alerts" and self._op == "upsert":
            return _FakeResponse([{"id": "alert-uuid-1"}])
        return _FakeResponse([])


class _FakeSupabaseClient:
    def __init__(self) -> None:
        self.operations: list[tuple[str, str, Any]] = []

    def table(self, name: str) -> _FakeTableQuery:
        return _FakeTableQuery(name, self)


def test_drift_alerts_created_without_mutating_guidelines() -> None:
    fake_client = _FakeSupabaseClient()
    store = SupabaseStore(client=fake_client)

    record = RawLiteratureRecord(
        doi="10.1007/s40279-025-0001",
        title="Systematic Review and Meta-Analysis of Weekly Set Volume",
        journal="Sports Medicine",
        publication_year=2025,
        published_at=date(2025, 11, 20),
        primary_url="https://doi.org/10.1007/s40279-025-0001",
        abstract_text="A systematic review and meta-analysis of resistance training weekly volume.",
        full_text_content="f" * 1600,
        inspection_depth="Full-Text",
    )
    extraction = StudyExtractionSchema(
        study_design="meta_analysis",
        population="Resistance-trained and untrained adults",
        is_human=True,
        is_trained_population=True,
        is_acute_emg_only=False,
        sample_size_n=520,
        duration_weeks=None,
        primary_outcome="Muscle hypertrophy",
        summary_takeaway=(
            "Higher weekly set volumes up to 20 sets produced greater hypertrophy. "
            "Diminishing returns appeared beyond 20 sets per muscle group."
        ),
        limitations=["Heterogeneity in exercise selection."],
        matched_guideline_slugs=["weekly-volume"],
    )
    scoring = compute_deterministic_score(extraction, record.inspection_depth)
    assert scoring.should_create_drift_alert is True

    study_id, alerts_created = store.upsert_study_and_alerts(
        record=record,
        extraction=extraction,
        scoring=scoring,
        embedding=[0.01] * 768,
    )

    assert study_id == "study-uuid-123"
    assert alerts_created == 1

    # Assert ZERO write operations on guidelines table
    guideline_writes = [
        op
        for op in fake_client.operations
        if op[0] == "guidelines" and op[1] in ("insert", "update", "upsert", "delete")
    ]
    assert guideline_writes == []

    # Assert consensus_drift_alerts received a pending alert
    alert_writes = [
        op for op in fake_client.operations if op[0] == "consensus_drift_alerts"
    ]
    assert len(alert_writes) == 1
    assert alert_writes[0][2]["status"] == "pending"
    assert alert_writes[0][2]["guideline_id"] == "guideline-uuid-1"
    assert alert_writes[0][2]["trigger_study_id"] == "study-uuid-123"
