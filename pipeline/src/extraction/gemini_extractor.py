from google import genai
from google.genai import types

from src.models import RawLiteratureRecord, StudyExtractionSchema

GEMINI_EXTRACTION_MODEL = "gemini-3.5-flash-lite"

SYSTEM_INSTRUCTION = (
    "You are a scientific literature metadata extractor for resistance-training and "
    "exercise-science research. Extract ONLY objective facts explicitly stated in the "
    "provided study text. Do NOT fabricate or estimate sample_size_n or duration_weeks "
    "if they are not explicitly reported—return null instead. Do NOT assign any quality score."
)


def extract_study_metadata(
    record: RawLiteratureRecord,
    api_key: str,
) -> StudyExtractionSchema:
    client = genai.Client(api_key=api_key)

    source_body = (
        record.full_text_content[:24000]
        if record.inspection_depth == "Full-Text" and record.full_text_content
        else record.abstract_text
    )

    prompt = (
        f"Title: {record.title}\n"
        f"Journal: {record.journal} ({record.publication_year})\n"
        f"Inspection Depth: {record.inspection_depth}\n\n"
        f"Text:\n{source_body}"
    )

    response = client.models.generate_content(
        model=GEMINI_EXTRACTION_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=StudyExtractionSchema,
            temperature=0.1,
        ),
    )

    if not response.text:
        raise RuntimeError(f"Empty Gemini extraction response for {record.title}")

    return StudyExtractionSchema.model_validate_json(response.text)
