from datetime import datetime, timedelta, timezone
import logging
import re
import feedparser
import httpx

from src.models import RawLiteratureRecord

logger = logging.getLogger(__name__)

EXERCISE_SCIENCE_FEEDS: list[tuple[str, str]] = [
    ("Sports Medicine", "https://link.springer.com/search.rss?facet-journal-id=40279&channel-name=Sports+Medicine"),
    ("Journal of Applied Physiology", "https://journals.physiology.org/action/showFeed?type=etoc&feed=rss&jc=jappl"),
]

RELEVANCE_KEYWORDS = (
    "resistance training",
    "strength training",
    "hypertrophy",
    "muscle mass",
    "one-repetition maximum",
    "1rm",
    "lifting",
)


def _extract_doi(entry: dict) -> str | None:
    for field in (entry.get("prism_doi"), entry.get("dc_identifier"), entry.get("id"), entry.get("link")):
        if not field:
            continue
        match = re.search(r"(10\.\d{4,9}/[-._;()/:A-Za-z0-9]+)", str(field))
        if match:
            return match.group(1)
    return None


def fetch_rss_records(
    lookback_days: int = 3,
    max_papers: int = 10,
) -> list[RawLiteratureRecord]:
    cutoff = datetime.now(timezone.utc).date() - timedelta(days=lookback_days)
    records: list[RawLiteratureRecord] = []

    with httpx.Client(timeout=15.0, follow_redirects=True) as client:
        for journal_name, feed_url in EXERCISE_SCIENCE_FEEDS:
            if len(records) >= max_papers:
                break
            try:
                resp = client.get(feed_url)
                resp.raise_for_status()
                parsed = feedparser.parse(resp.text)
            except Exception as exc:
                logger.warning("RSS feed fetch failed for %s: %s", journal_name, exc)
                continue

            for entry in parsed.entries:
                if len(records) >= max_papers:
                    break
                title = (entry.get("title") or "").strip()
                summary = re.sub(r"<[^>]+>", " ", entry.get("summary") or "").strip()
                combined = f"{title} {summary}".lower()
                if not any(kw in combined for kw in RELEVANCE_KEYWORDS):
                    continue

                doi = _extract_doi(entry)
                link = entry.get("link")
                if not doi or not link or len(title) < 5 or len(summary) < 20:
                    continue

                pub_struct = entry.get("published_parsed") or entry.get("updated_parsed")
                if pub_struct:
                    pub_date = datetime(*pub_struct[:6], tzinfo=timezone.utc).date()
                else:
                    pub_date = datetime.now(timezone.utc).date()

                if pub_date < cutoff:
                    continue

                try:
                    records.append(
                        RawLiteratureRecord(
                            doi=doi,
                            title=title,
                            journal=journal_name,
                            publication_year=pub_date.year,
                            published_at=pub_date,
                            primary_url=link,
                            abstract_text=summary,
                            full_text_content=None,
                            inspection_depth="Abstract-Only",
                        )
                    )
                except Exception as exc:
                    logger.debug("Skipping invalid RSS record %s: %s", title, exc)

    return records
