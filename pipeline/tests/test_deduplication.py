from datetime import date

from src.deduplication import (
    deduplicate_records,
    normalize_doi,
    normalize_openalex_id,
    normalize_pubmed_id,
)
from src.models import RawLiteratureRecord


def _record(**overrides) -> RawLiteratureRecord:
    defaults = dict(
        doi="10.1519/JSC.0000000000004812",
        pubmed_id="39123456",
        openalex_id="https://openalex.org/W4390000001",
        title="Volume and Hypertrophy in Trained Lifters",
        journal="JSCR",
        publication_year=2025,
        published_at=date(2025, 11, 10),
        primary_url="https://pubmed.ncbi.nlm.nih.gov/39123456/",
        abstract_text="A randomized controlled trial evaluating weekly volume in trained lifters.",
        full_text_content=None,
        inspection_depth="Abstract-Only",
    )
    defaults.update(overrides)
    return RawLiteratureRecord(**defaults)


def test_canonical_id_normalization() -> None:
    assert normalize_doi("https://doi.org/10.1519/JSC.001 ") == "10.1519/jsc.001"
    assert normalize_doi("doi:10.1007/s40279-024-01") == "10.1007/s40279-024-01"
    assert normalize_pubmed_id("PMID: 39123456 ") == "39123456"
    assert normalize_openalex_id("https://openalex.org/W4390000001") == "W4390000001"


def test_deduplicate_records_filters_batch_and_existing_ids() -> None:
    r1 = _record(doi="https://doi.org/10.1519/JSC.001", pubmed_id="111", openalex_id="W1")
    r2_dup_doi = _record(doi="10.1519/jsc.001", pubmed_id="222", openalex_id="W2")
    r3_dup_pmid = _record(doi=None, pubmed_id="111", openalex_id="W3")
    r4_existing_oa = _record(doi="10.9999/other", pubmed_id="999", openalex_id="W999")
    r5_unique = _record(doi="10.1007/unique", pubmed_id="555", openalex_id="W555")

    unique = deduplicate_records(
        [r1, r2_dup_doi, r3_dup_pmid, r4_existing_oa, r5_unique],
        existing_dois=set(),
        existing_pmids=set(),
        existing_openalex_ids={"W999"},
    )

    assert len(unique) == 2
    assert unique[0].pubmed_id == "111"
    assert unique[1].pubmed_id == "555"
