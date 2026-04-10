"""LLM query builder — generates platform-specific search queries via OpenAI."""

from __future__ import annotations

import hashlib
import json
import time
from typing import Any

from backend.models import SearchQuery
from backend.services.openai_client import get_async_openai_client, get_chat_model
from backend.services.search_query_coerce import coerce_search_query

# ---------------------------------------------------------------------------
# In-memory cache: prompt_hash -> (timestamp, results)
# ---------------------------------------------------------------------------
_cache: dict[str, tuple[float, list[SearchQuery]]] = {}
_CACHE_TTL_SECONDS = 600  # 10 minutes

SYSTEM_PROMPT = (
    "You are a design research assistant. Given a designer's prompt, output ONLY a "
    "JSON array with no preamble or markdown. Each element has: platform (one of: "
    "unsplash, behance, dribbble, google), query_string (optimised search string for "
    "that platform), style_hints (list of 3-5 implied style keywords). Generate one "
    "query per platform (4 total). Make each query_string platform-appropriate — "
    "Dribbble expects short punchy terms, Unsplash responds to descriptive photography "
    "terms, Behance to project type terms, Google to \"site:behance.net [topic] design\"."
)


def _prompt_hash(prompt: str) -> str:
    return hashlib.sha256(prompt.strip().lower().encode()).hexdigest()


def _is_cache_valid(key: str) -> bool:
    if key not in _cache:
        return False
    ts, _ = _cache[key]
    return (time.time() - ts) < _CACHE_TTL_SECONDS


async def build_queries(prompt: str) -> list[SearchQuery]:
    """Call OpenAI GPT-4o to expand a design prompt into platform search queries."""
    key = _prompt_hash(prompt)

    # Return cached result if still fresh
    if _is_cache_valid(key):
        return _cache[key][1]

    client = get_async_openai_client()
    model = get_chat_model()

    response = await client.chat.completions.create(
        model=model,
        temperature=0.7,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    )

    raw = response.choices[0].message.content
    if raw is None:
        raise ValueError("OpenAI returned empty content")

    # Strip potential markdown fencing
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

    parsed_raw = json.loads(cleaned)
    if isinstance(parsed_raw, dict) and "queries" in parsed_raw:
        parsed = parsed_raw["queries"]
    else:
        parsed = parsed_raw
    if not isinstance(parsed, list):
        raise ValueError("LLM must return a JSON array of query objects")

    queries: list[SearchQuery] = []
    for item in parsed:
        try:
            queries.append(coerce_search_query(item))
        except (ValueError, TypeError):
            continue

    if not queries:
        raise ValueError("No valid search queries could be parsed from the LLM response")

    # Store in cache
    _cache[key] = (time.time(), queries)

    return queries
