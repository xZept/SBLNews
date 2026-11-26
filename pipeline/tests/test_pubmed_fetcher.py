import logging
import httpx
import pytest

from src.config import PipelineSettings, load_settings
from src.fetchers import pubmed


PUBMED_EFETCH_XML = """<?xml version="1.0" encoding="UTF-8"?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <PMID>12345678</PMID>
      <Article>
        <Journal>
          <JournalIssue>
            <PubDate>
              <Year>2026</Year>
              <Month>Jan</Month>
              <Day>15</Day>
            </PubDate>
          </JournalIssue>
          <Title>Journal of Strength and Conditioning Research</Title>
        </Journal>
        <ArticleTitle>Effects of Resistance Training Volume on Muscle Hypertrophy</ArticleTitle>
        <Abstract>
          <AbstractText>This randomized controlled trial evaluated weekly resistance training volume and hypertrophy outcomes.</AbstractText>
        </Abstract>
      </Article>
    </MedlineCitation>
    <PubmedData>
      <ArticleIdList>
        <ArticleId IdType="doi">10.1519/jsc.0000000000009999</ArticleId>
        <ArticleId IdType="pmc">PMC999999</ArticleId>
      </ArticleIdList>
    </PubmedData>
  </PubmedArticle>
</PubmedArticleSet>
"""

PMC_EFETCH_XML = f"""<?xml version="1.0" encoding="UTF-8"?>
<pmc-articleset>
  <article>
    <body>{"Full text resistance training methods and results. " * 40}</body>
  </article>
</pmc-articleset>
"""


def test_config_treats_empty_ncbi_api_key_as_none(monkeypatch: pytest.MonkeyPatch) -> None:
    assert PipelineSettings(ncbi_api_key="").ncbi_api_key is None
    assert PipelineSettings(ncbi_api_key="   ").ncbi_api_key is None
    assert PipelineSettings(ncbi_api_key="abc-123").ncbi_api_key == "abc-123"

    monkeypatch.setenv("NCBI_API_KEY", "")
    assert load_settings(require_secrets=False).ncbi_api_key is None

    monkeypatch.setenv("NCBI_API_KEY", "env-key-456")
    assert load_settings(require_secrets=False).ncbi_api_key == "env-key-456"


def _make_mock_transport(captured_requests: list[httpx.Request]) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        captured_requests.append(request)
        if request.url.path.endswith("/esearch.fcgi"):
            return httpx.Response(
                200,
                json={"esearchresult": {"idlist": ["12345678"]}},
                request=request,
            )
        if request.url.path.endswith("/efetch.fcgi"):
            db = request.url.params.get("db")
            if db == "pubmed":
                return httpx.Response(200, text=PUBMED_EFETCH_XML, request=request)
            if db == "pmc":
                return httpx.Response(200, text=PMC_EFETCH_XML, request=request)
        return httpx.Response(404, request=request)

    return httpx.MockTransport(handler)


def test_fetch_pubmed_records_with_api_key_appends_param_and_uses_011_delay(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured_requests: list[httpx.Request] = []
    sleep_calls: list[float] = []

    transport = _make_mock_transport(captured_requests)
    original_client = httpx.Client

    def mock_client(*args, **kwargs):
        kwargs["transport"] = transport
        return original_client(*args, **kwargs)

    monkeypatch.setattr(pubmed.httpx, "Client", mock_client)
    monkeypatch.setattr(pubmed.time, "sleep", lambda seconds: sleep_calls.append(seconds))

    records = pubmed.fetch_pubmed_records(
        lookback_days=3,
        max_papers=5,
        email="researcher@example.com",
        api_key="my-ncbi-secret-key",
    )

    assert len(records) == 1
    assert records[0].pubmed_id == "12345678"
    assert records[0].inspection_depth == "Full-Text"
    assert len(captured_requests) == 3

    for req in captured_requests:
        assert req.url.params.get("api_key") == "my-ncbi-secret-key"
        assert req.url.params.get("email") == "researcher@example.com"
        assert req.url.params.get("tool") == "sbl-news"

    assert sleep_calls == [0.11, 0.11]


@pytest.mark.parametrize("api_key", [None, "", "   "])
def test_fetch_pubmed_records_without_api_key_omits_param_and_uses_035_delay(
    monkeypatch: pytest.MonkeyPatch,
    api_key: str | None,
) -> None:
    captured_requests: list[httpx.Request] = []
    sleep_calls: list[float] = []

    transport = _make_mock_transport(captured_requests)
    original_client = httpx.Client

    def mock_client(*args, **kwargs):
        kwargs["transport"] = transport
        return original_client(*args, **kwargs)

    monkeypatch.setattr(pubmed.httpx, "Client", mock_client)
    monkeypatch.setattr(pubmed.time, "sleep", lambda seconds: sleep_calls.append(seconds))

    records = pubmed.fetch_pubmed_records(
        lookback_days=3,
        max_papers=5,
        email="researcher@example.com",
        api_key=api_key,
    )

    assert len(records) == 1
    assert len(captured_requests) == 3

    for req in captured_requests:
        assert "api_key" not in req.url.params
        assert req.url.params.get("email") == "researcher@example.com"
        assert req.url.params.get("tool") == "sbl-news"

    assert sleep_calls == [0.35, 0.35]


def test_fetch_pubmed_records_error_logging_does_not_leak_api_key(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    secret_key = "super-secret-ncbi-key-999"

    def error_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text="Internal Server Error", request=request)

    transport = httpx.MockTransport(error_handler)
    original_client = httpx.Client

    def mock_client(*args, **kwargs):
        kwargs["transport"] = transport
        return original_client(*args, **kwargs)

    monkeypatch.setattr(pubmed.httpx, "Client", mock_client)

    with caplog.at_level(logging.WARNING, logger="src.fetchers.pubmed"):
        records = pubmed.fetch_pubmed_records(
            email="researcher@example.com",
            api_key=secret_key,
        )

    assert records == []
    assert "PubMed fetcher failed" in caplog.text
    assert secret_key not in caplog.text
    assert "api_key=[REDACTED]" in caplog.text
