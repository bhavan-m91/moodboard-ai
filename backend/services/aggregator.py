"""Aggregator — run all scrapers in parallel and yield deduplicated results."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator, Callable, Coroutine
from typing import Any

from backend.models import ImageResult, SearchQuery
from backend.scrapers import unsplash, behance, dribbble, google_cse, internal

# Registry: platform name → scraper module's scrape function
_SCRAPER_MAP: dict[str, Callable[[SearchQuery], Coroutine[Any, Any, list[ImageResult]]]] = {
    "unsplash": unsplash.scrape,
    "behance": behance.scrape,
    "dribbble": dribbble.scrape,
    "google": google_cse.scrape,
    "internal": internal.scrape,
}

async def get_scraper(
    platform: str,
) -> Callable[[SearchQuery], Coroutine[Any, Any, list[ImageResult]]]:
    """Return the scrape function for a given platform name."""
    if platform not in _SCRAPER_MAP:
        raise ValueError(f"Unknown platform: {platform}")
    return _SCRAPER_MAP[platform]

async def aggregate_results(
    queries: list[SearchQuery],
    include_internal: bool = False
) -> AsyncGenerator[ImageResult, None]:
    """Run all scrapers in parallel, deduplicate by URL, and yield results as they arrive."""

    seen_urls: set[str] = set()

    # Build one task per query → scraper
    async def _run_scraper(query: SearchQuery) -> list[ImageResult]:
        scrape_fn = _SCRAPER_MAP.get(query.platform)
        if scrape_fn is None:
            return []
        try:
            return await scrape_fn(query)
        except Exception:
            return []

    tasks = [asyncio.ensure_future(_run_scraper(q)) for q in queries]

    if include_internal:
        # Spin up internal scraper utilizing the combined hints to synthesize one aggregated payload
        for q in queries:
            tasks.append(asyncio.ensure_future(_SCRAPER_MAP["internal"](q)))

    # Yield results as each task completes (earliest-first)
    for coro in asyncio.as_completed(tasks):
        try:
            batch = await coro
        except Exception:
            continue

        for result in batch:
            if result.url in seen_urls:
                continue
            seen_urls.add(result.url)
            yield result
