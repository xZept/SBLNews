import os
from pydantic import BaseModel, Field


class PipelineSettings(BaseModel):
    supabase_url: str | None = Field(default=None)
    supabase_service_role_key: str | None = Field(default=None)
    gemini_api_key: str | None = Field(default=None)
    pubmed_email: str = Field(default="sblnews-pipeline@example.com")
    openalex_mailto: str = Field(default="sblnews-pipeline@example.com")


def load_settings(require_secrets: bool = True) -> PipelineSettings:
    settings = PipelineSettings(
        supabase_url=os.environ.get("SUPABASE_URL") or None,
        supabase_service_role_key=os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or None,
        gemini_api_key=os.environ.get("GEMINI_API_KEY") or None,
        pubmed_email=os.environ.get("PUBMED_EMAIL") or "sblnews-pipeline@example.com",
        openalex_mailto=os.environ.get("OPENALEX_MAILTO") or "sblnews-pipeline@example.com",
    )

    if require_secrets:
        missing = [
            name
            for name, val in (
                ("SUPABASE_URL", settings.supabase_url),
                ("SUPABASE_SERVICE_ROLE_KEY", settings.supabase_service_role_key),
                ("GEMINI_API_KEY", settings.gemini_api_key),
            )
            if not val
        ]
        if missing:
            raise RuntimeError(
                f"Missing required environment variables: {', '.join(missing)}"
            )

    return settings
