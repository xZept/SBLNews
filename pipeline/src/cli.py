import argparse
import logging
import sys

from src.config import load_settings
from src.deduplication import deduplicate_records
from src.extraction.embeddings import generate_study_embedding
from src.extraction.gemini_extractor import extract_study_metadata
from src.fetchers.openalex import fetch_openalex_records
from src.fetchers.pubmed import fetch_pubmed_records
from src.fetchers.rss import fetch_rss_records
from src.scoring import compute_deterministic_score
from src.storage.supabase_store import SupabaseStore

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sblnews.cli")


def run_ingest(lookback_days: int, max_papers: int, dry_run: bool) -> int:
    settings = load_settings(require_secrets=not dry_run)

    per_source_limit = max(1, max_papers // 3 + 2)
    raw_records = []
    raw_records.extend(
        fetch_pubmed_records(
            lookback_days=lookback_days,
            max_papers=per_source_limit,
            email=settings.pubmed_email,
        )
    )
    raw_records.extend(
        fetch_openalex_records(
            lookback_days=lookback_days,
            max_papers=per_source_limit,
            mailto=settings.openalex_mailto,
        )
    )
    raw_records.extend(
        fetch_rss_records(
            lookback_days=lookback_days,
            max_papers=per_source_limit,
        )
    )

    store: SupabaseStore | None = None
    existing_dois: set[str] = set()
    existing_pmids: set[str] = set()
    existing_oa: set[str] = set()

    if not dry_run:
        assert settings.supabase_url and settings.supabase_service_role_key
        store = SupabaseStore(
            url=settings.supabase_url,
            service_role_key=settings.supabase_service_role_key,
        )
        existing_dois, existing_pmids, existing_oa = store.fetch_existing_identifiers()

    unique_records = deduplicate_records(
        raw_records,
        existing_dois=existing_dois,
        existing_pmids=existing_pmids,
        existing_openalex_ids=existing_oa,
    )[:max_papers]

    logger.info(
        "Fetched %d raw records; %d unique records to process (dry_run=%s)",
        len(raw_records),
        len(unique_records),
        dry_run,
    )

    if dry_run:
        for idx, rec in enumerate(unique_records, start=1):
            logger.info(
                "[DRY-RUN %d/%d] %s | %s (%s)",
                idx,
                len(unique_records),
                rec.inspection_depth,
                rec.title,
                rec.doi or rec.pubmed_id or rec.openalex_id,
            )
        return 0

    assert store is not None and settings.gemini_api_key
    processed = 0
    alerts_total = 0

    for rec in unique_records:
        try:
            extraction = extract_study_metadata(rec, api_key=settings.gemini_api_key)
            scoring = compute_deterministic_score(extraction, rec.inspection_depth)
            embed_input = (
                f"{rec.title}\n{extraction.primary_outcome}\n"
                f"{extraction.population}\n{extraction.summary_takeaway}"
            )
            embedding = generate_study_embedding(
                embed_input, api_key=settings.gemini_api_key
            )
            _, alerts_created = store.upsert_study_and_alerts(
                record=rec,
                extraction=extraction,
                scoring=scoring,
                embedding=embedding,
            )
            processed += 1
            alerts_total += alerts_created
        except Exception as exc:
            logger.error("Failed processing '%s': %s", rec.title, exc)

    logger.info(
        "Ingestion complete: %d/%d studies stored, %d Consensus Drift alerts created.",
        processed,
        len(unique_records),
        alerts_total,
    )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="sbl-pipeline",
        description="SBL News daily primary literature ingestion & deterministic scoring CLI",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    ingest_parser = subparsers.add_parser("ingest", help="Run literature ingestion")
    ingest_parser.add_argument("--lookback-days", type=int, default=3)
    ingest_parser.add_argument("--max-papers", type=int, default=25)
    ingest_parser.add_argument("--dry-run", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command == "ingest":
        return run_ingest(
            lookback_days=args.lookback_days,
            max_papers=args.max_papers,
            dry_run=args.dry_run,
        )
    return 1


if __name__ == "__main__":
    sys.exit(main())
