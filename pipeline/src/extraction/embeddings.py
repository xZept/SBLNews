from google import genai
from google.genai import types

GEMINI_EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSIONS = 768


def generate_study_embedding(text: str, api_key: str) -> list[float]:
    client = genai.Client(api_key=api_key)
    response = client.models.embed_content(
        model=GEMINI_EMBEDDING_MODEL,
        contents=text[:8000],
        config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIMENSIONS),
    )
    if not response.embeddings:
        raise RuntimeError("Gemini embedding API returned no embeddings")

    values = list(response.embeddings[0].values)
    if len(values) != EMBEDDING_DIMENSIONS:
        raise RuntimeError(
            f"Expected {EMBEDDING_DIMENSIONS}-dim embedding, got {len(values)}"
        )
    return values
