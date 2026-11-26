from datetime import date, datetime, timedelta, timezone
import logging
import re
import time
import xml.etree.ElementTree as ET
import httpx

from src.models import MIN_FULL_TEXT_CHARS, RawLiteratureRecord

logger = logging.getLogger(__name__)

EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
RATE_LIMIT_WITH_API_KEY = 0.11
RATE_LIMIT_WITHOUT_API_KEY = 0.35
PUBMED_QUERY = (
    '("resistance training"[Title/Abstract] OR "strength training"[Title/Abstract] '
    'OR "muscle hypertrophy"[Title/Abstract]) AND (hypertrophy OR strength OR volume OR protein)'
)

MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


def _parse_pub_date(article: ET.Element) -> date:
    year_el = article.find(".//JournalIssue/PubDate/Year")
    month_el = article.find(".//JournalIssue/PubDate/Month")
    day_el = article.find(".//JournalIssue/PubDate/Day")

    today = datetime.now(timezone.utc).date()
    try:
        year = int(year_el.text) if year_el is not None and year_el.text else today.year
    except ValueError:
        year = today.year

    month = 1
    if month_el is not None and month_el.text:
        m_txt = month_el.text.strip().lower()[:3]
        if m_txt.isdigit():
            month = max(1, min(12, int(m_txt)))
        else:
            month = MONTH_MAP.get(m_txt, 1)

    day = 1
    if day_el is not None and day_el.text and day_el.text.strip().isdigit():
        day = max(1, min(28, int(day_el.text.strip())))

    return date(year, month, day)


def _normalize_api_key(api_key: str | None) -> str | None:
    if isinstance(api_key, str):
        stripped = api_key.strip()
        return stripped if stripped else None
    return None


def _build_eutils_params(
    email: str, api_key: str | None = None, **extra: str | int
) -> dict[str, str | int]:
    params: dict[str, str | int] = {
        **extra,
        "tool": "sbl-news",
        "email": email,
    }
    if api_key:
        params["api_key"] = api_key
    return params


def _sanitize_error_message(exc: Exception, api_key: str | None = None) -> str:
    msg = re.sub(r"(api_key=)[^&\s'\"]+", r"\1[REDACTED]", str(exc))
    if api_key:
        msg = msg.replace(api_key, "[REDACTED]")
    return msg


def _fetch_pmc_full_text(
    client: httpx.Client,
    pmc_id: str,
    email: str,
    api_key: str | None = None,
) -> str | None:
    try:
        resp = client.get(
            f"{EUTILS_BASE}/efetch.fcgi",
            params=_build_eutils_params(
                email=email,
                api_key=api_key,
                db="pmc",
                id=pmc_id,
                retmode="xml",
            ),
        )
        resp.raise_for_status()
        root = ET.fromstring(resp.text)
        body_texts = [
            "".join(body.itertext()).strip() for body in root.findall(".//body")
        ]
        combined = "\n".join(t for t in body_texts if t)
        if len(combined) >= MIN_FULL_TEXT_CHARS:
            return combined
    except Exception as exc:
        logger.debug(
            "PMC full-text fetch failed for %s: %s",
            pmc_id,
            _sanitize_error_message(exc, api_key),
        )
    return None


def fetch_pubmed_records(
    lookback_days: int = 3,
    max_papers: int = 15,
    email: str = "sblnews-pipeline@example.com",
    api_key: str | None = None,
) -> list[RawLiteratureRecord]:
    since = (datetime.now(timezone.utc).date() - timedelta(days=lookback_days)).strftime(
        "%Y/%m/%d"
    )
    normalized_api_key = _normalize_api_key(api_key)
    rate_limit_delay = (
        RATE_LIMIT_WITH_API_KEY if normalized_api_key else RATE_LIMIT_WITHOUT_API_KEY
    )
    records: list[RawLiteratureRecord] = []

    try:
        with httpx.Client(timeout=20.0) as client:
            search_resp = client.get(
                f"{EUTILS_BASE}/esearch.fcgi",
                params=_build_eutils_params(
                    email=email,
                    api_key=normalized_api_key,
                    db="pubmed",
                    term=PUBMED_QUERY,
                    retmax=max_papers,
                    retmode="json",
                    datetype="pdat",
                    mindate=since,
                ),
            )
            search_resp.raise_for_status()
            id_list = search_resp.json().get("esearchresult", {}).get("idlist", [])
            if not id_list:
                return []

            time.sleep(rate_limit_delay)
            fetch_resp = client.get(
                f"{EUTILS_BASE}/efetch.fcgi",
                params=_build_eutils_params(
                    email=email,
                    api_key=normalized_api_key,
                    db="pubmed",
                    id=",".join(id_list),
                    retmode="xml",
                ),
            )
            fetch_resp.raise_for_status()
            root = ET.fromstring(fetch_resp.text)

            for article in root.findall(".//PubmedArticle"):
                pmid_el = article.find(".//MedlineCitation/PMID")
                pmid = pmid_el.text.strip() if pmid_el is not None and pmid_el.text else None
                if not pmid:
                    continue

                title_el = article.find(".//ArticleTitle")
                title = "".join(title_el.itertext()).strip() if title_el is not None else ""
                journal_el = article.find(".//Journal/Title")
                journal = journal_el.text.strip() if journal_el is not None and journal_el.text else "PubMed"

                abstract_parts = [
                    "".join(ab.itertext()).strip()
                    for ab in article.findall(".//Abstract/AbstractText")
                ]
                abstract_text = " ".join(p for p in abstract_parts if p)
                if len(title) < 5 or len(abstract_text) < 20:
                    continue

                doi = None
                pmc_id = None
                for aid in article.findall(".//PubmedData/ArticleIdList/ArticleId"):
                    id_type = aid.attrib.get("IdType")
                    if id_type == "doi" and aid.text:
                        doi = aid.text.strip()
                    elif id_type == "pmc" and aid.text:
                        pmc_id = aid.text.strip()

                if pmc_id:
                    time.sleep(rate_limit_delay)
                    full_text = _fetch_pmc_full_text(
                        client, pmc_id, email, api_key=normalized_api_key
                    )
                else:
                    full_text = None
                inspection_depth = (
                    "Full-Text"
                    if full_text and len(full_text.strip()) >= MIN_FULL_TEXT_CHARS
                    else "Abstract-Only"
                )
                pub_date = _parse_pub_date(article)

                try:
                    records.append(
                        RawLiteratureRecord(
                            doi=doi,
                            pubmed_id=pmid,
                            title=title,
                            journal=journal,
                            publication_year=pub_date.year,
                            published_at=pub_date,
                            primary_url=f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                            abstract_text=abstract_text,
                            full_text_content=full_text,
                            inspection_depth=inspection_depth,
                        )
                    )
                except Exception as exc:
                    logger.debug("Skipping invalid PubMed record %s: %s", pmid, exc)
    except Exception as exc:
        logger.warning(
            "PubMed fetcher failed: %s",
            _sanitize_error_message(exc, normalized_api_key),
        )

    return records
