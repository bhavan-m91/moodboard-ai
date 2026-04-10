"""Google Custom Search Engine scraper — image search via CSE API."""

from __future__ import annotations

import hashlib
import os
from urllib.parse import urlparse

import httpx

from backend.models import ImageResult, SearchQuery

# Map known domains to platform labels
_DOMAIN_PLATFORM_MAP = {
    "behance.net": "behance",
    "www.behance.net": "behance",
    "dribbble.com": "dribbble",
    "www.dribbble.com": "dribbble",
    "unsplash.com": "unsplash",
    "www.unsplash.com": "unsplash",
    "pinterest.com": "pinterest",
    "www.pinterest.com": "pinterest",
}


def _detect_platform(context_link: str) -> str:
    """Determine the source platform from a URL's domain."""
    try:
        domain = urlparse(context_link).netloc.lower()
        for pattern, platform in _DOMAIN_PLATFORM_MAP.items():
            if domain == pattern or domain.endswith(f".{pattern}"):
                return platform
    except Exception:
        pass
    return "web"


async def scrape(query: SearchQuery) -> list[ImageResult]:
    """Fetch image results from Google Custom Search Engine API."""
    try:
        api_key = os.environ["GOOGLE_CSE_KEY"]
        cse_id = os.environ["GOOGLE_CSE_ID"]

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://www.googleapis.com/customsearch/v1",
                params={
                    "q": query.query_string,
                    "searchType": "image",
                    "key": api_key,
                    "cx": cse_id,
                    "num": 10,
                    "safe": "active",
                },
            )
            resp.raise_for_status()

        data = resp.json()
        results: list[ImageResult] = []

        for item in data.get("items", []):
            url = item.get("link", "")
            if not url:
                continue

            img_id = hashlib.sha256(url.encode()).hexdigest()[:16]
            image_meta = item.get("image", {})

            # Aspect ratio
            width = image_meta.get("width", 1)
            height = image_meta.get("height", 1)
            aspect_ratio = round(width / height, 3) if height else 1.0

            # Platform detection
            context_link = image_meta.get("contextLink", "")
            source_platform = _detect_platform(context_link)

            # Tags from style hints
            tags = list(query.style_hints)

            results.append(
                ImageResult(
                    id=img_id,
                    url=url,
                    thumbnail_url=image_meta.get("thumbnailLink", url),
                    source_platform=source_platform,
                    source_link=context_link or url,
                    title=item.get("title", "Untitled"),
                    tags=tags,
                    caption=item.get("snippet", ""),
                    color_palette=[],
                    style_label=query.style_hints[0] if query.style_hints else "",
                    aspect_ratio=aspect_ratio,
                    tagging_complete=False,
                )
            )

        return results

    except Exception:
        return []
