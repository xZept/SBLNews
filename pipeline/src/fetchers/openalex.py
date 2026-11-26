from datetime import date, datetime, timedelta, timezone
import logging
import httpx

from src.models import RawLiteratureRecord

logger = logging.getLogger(__name__)

OPENALEX_WORKS_URL = "https://api.openalex.org/works"


def _reconstruct_abstract(inverted_index: dict[str, list[int]] | None) -> str:
    if not inverted_index:
        return ""
    words: dict[int, str] = {}
    for word, positions in inverted_index.items():
        for pos in positions:
            words[pos] = word
    return " ".join(words[idx] for idx in sorted(words))


def fetch_openalex_records(
    lookback_days: int = 3,
    max_papers: int = 15,
    mailto: str = "sblnews-pipeline@example.com",
) -> list[RawLiteratureRecord]:
    since = (datetime.now(timezone.utc).date() - timedelta(days=lookback_days)).isoformat()
    records: list[RawLiteratureRecord] = []

    try:
        with httpx.Client(timeout=20.0) as client:
            resp = client.get(
                OPENALEX_WORKS_URL,
                params={
                    "search": "resistance training hypertrophy strength",
                    "filter": f"from_publication_date:{since},type:article",
                    "per-page": max_papers,
                    "sort": "publication_date:desc",
                    "mailto": mailto,
                },
            )
            resp.raise_for_status()
            results = resp.json().get("results", [])

            for work in results:
                oa_id = work.get("id")
                title = (work.get("title") or "").strip()
                abstract_text = _reconstruct_abstract(
                    work.get("abstract_inverted_index")
                ).strip()
                if len(title) < 5 or len(abstract_text) < 20 or not oa_id:
                    continue

                doi = work.get("doi")
                pub_date_str = work.get("publication_date")
                try:
                    pub_date = (
                        date.fromisoformat(pub_date_str)
                        if pub_date_str
                        else datetime.now(timezone.utc).date()
                    )
                except ValueError:
                    pub_date = datetime.now(timezone.utc).date()

                source_info = (work.get("primary_location") or {}).get("source") or {}
                journal = (source_info.get("display_name") or "OpenAlex").strip()
                primary_url = doi or oa_id

                try:
                    records.append(
                        RawLiteratureRecord(
                            doi=doi,
                            openalex_id=oa_id,
                            title=title,
                            journal=journal,
                            publication_year=pub_date.year,
                            published_at=pub_date,
                            primary_url=primary_url,
                            abstract_text=abstract_text,
                            full_text_content=None,
                            inspection_depth="Abstract-Only",
                        )
                    )
                except Exception as exc:
                    logger.debug("Skipping invalid OpenAlex record %s: %s", oa_id, exc)
    except Exception as exc:
        logger.warning("OpenAlex fetcher failed: %s", exc)

    return records
