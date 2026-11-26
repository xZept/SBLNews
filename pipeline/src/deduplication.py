import re
from src.models import RawLiteratureRecord


def normalize_doi(doi: str | None) -> str | None:
    if not doi:
        return None
    cleaned = doi.strip().lower()
    cleaned = re.sub(r"^https?://(dx\.)?doi\.org/", "", cleaned)
    cleaned = re.sub(r"^doi:\s*", "", cleaned)
    return cleaned or None


def normalize_pubmed_id(pmid: str | None) -> str | None:
    if not pmid:
        return None
    match = re.search(r"(\d+)", pmid.strip())
    return match.group(1) if match else None


def normalize_openalex_id(openalex_id: str | None) -> str | None:
    if not openalex_id:
        return None
    cleaned = openalex_id.strip()
    cleaned = re.sub(r"^https?://openalex\.org/", "", cleaned, flags=re.IGNORECASE)
    return cleaned.upper() or None


def deduplicate_records(
    records: list[RawLiteratureRecord],
    existing_dois: set[str] | None = None,
    existing_pmids: set[str] | None = None,
    existing_openalex_ids: set[str] | None = None,
) -> list[RawLiteratureRecord]:
    seen_dois = {d for d in (normalize_doi(x) for x in (existing_dois or set())) if d}
    seen_pmids = {
        p for p in (normalize_pubmed_id(x) for x in (existing_pmids or set())) if p
    }
    seen_oa = {
        o
        for o in (normalize_openalex_id(x) for x in (existing_openalex_ids or set()))
        if o
    }

    unique: list[RawLiteratureRecord] = []
    for rec in records:
        doi = normalize_doi(rec.doi)
        pmid = normalize_pubmed_id(rec.pubmed_id)
        oa = normalize_openalex_id(rec.openalex_id)

        if (doi and doi in seen_dois) or (pmid and pmid in seen_pmids) or (oa and oa in seen_oa):
            continue

        normalized_rec = rec.model_copy(
            update={
                "doi": doi,
                "pubmed_id": pmid,
                "openalex_id": oa,
            }
        )
        unique.append(normalized_rec)

        if doi:
            seen_dois.add(doi)
        if pmid:
            seen_pmids.add(pmid)
        if oa:
            seen_oa.add(oa)

    return unique
