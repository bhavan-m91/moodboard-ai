"""Unsplash scraper — uses the official Unsplash API."""

from __future__ import annotations

import hashlib
import os

import httpx

from backend.models import ImageResult, SearchQuery


async def scrape(query: SearchQuery) -> list[ImageResult]:
    """Fetch photos from the Unsplash API for the given search query."""
    try:
        access_key = os.environ["UNSPLASH_ACCESS_KEY"]

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://api.unsplash.com/search/photos",
                params={
                    "query": query.query_string,
                    "per_page": 20,
                    "client_id": access_key,
                },
            )
            resp.raise_for_status()

        data = resp.json()
        results: list[ImageResult] = []

        for item in data.get("results", []):
            url = item.get("urls", {}).get("regular", "")
            if not url:
                continue

            img_id = hashlib.sha256(url.encode()).hexdigest()[:16]

            # Extract tags (up to 5)
            raw_tags = [t.get("title", "") for t in item.get("tags", []) if t.get("title")]
            tags = raw_tags[:5]

            # Merge in style_hints that aren't already present
            existing_lower = {t.lower() for t in tags}
            for hint in query.style_hints:
                if hint.lower() not in existing_lower and len(tags) < 10:
                    tags.append(hint)

            # Aspect ratio
            width = item.get("width", 1)
            height = item.get("height", 1)
            aspect_ratio = round(width / height, 3) if height else 1.0

            results.append(
                ImageResult(
                    id=img_id,
                    url=url,
                    thumbnail_url=item.get("urls", {}).get("thumb", url),
                    source_platform="unsplash",
                    source_link=item.get("links", {}).get("html", ""),
                    title=item.get("alt_description", "") or item.get("description", "") or "Untitled",
                    tags=tags,
                    caption=item.get("description", "") or item.get("alt_description", "") or "",
                    color_palette=[item.get("color", "")] if item.get("color") else [],
                    style_label=query.style_hints[0] if query.style_hints else "",
                    aspect_ratio=aspect_ratio,
                    tagging_complete=False,
                )
            )

        return results

    except Exception:
        return []
