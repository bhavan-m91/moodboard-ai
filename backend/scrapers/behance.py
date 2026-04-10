"""Behance scraper — API v2 with RSS fallback."""

from __future__ import annotations

import hashlib
import os
import re
from urllib.parse import quote_plus

import httpx

from backend.models import ImageResult, SearchQuery


async def _scrape_api(query: SearchQuery, api_key: str) -> list[ImageResult]:
    """Fetch projects via the Behance API v2."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            "https://api.behance.net/v2/projects",
            params={
                "q": query.query_string,
                "api_key": api_key,
                "per_page": 20,
            },
        )
        resp.raise_for_status()

    data = resp.json()
    results: list[ImageResult] = []

    for project in data.get("projects", []):
        covers = project.get("covers", {})
        url = covers.get("404", "") or covers.get("808", "") or covers.get("202", "")
        if not url:
            continue

        img_id = hashlib.sha256(url.encode()).hexdigest()[:16]

        # Tags from project fields
        tags = list(project.get("fields", []))[:5]
        existing_lower = {t.lower() for t in tags}
        for hint in query.style_hints:
            if hint.lower() not in existing_lower and len(tags) < 10:
                tags.append(hint)

        results.append(
            ImageResult(
                id=img_id,
                url=url,
                thumbnail_url=covers.get("115", "") or covers.get("202", "") or url,
                source_platform="behance",
                source_link=project.get("url", ""),
                title=project.get("name", "Untitled"),
                tags=tags,
                caption="",
                color_palette=[],
                style_label=query.style_hints[0] if query.style_hints else "",
                aspect_ratio=1.0,
                tagging_complete=False,
            )
        )

    return results


async def _scrape_rss_fallback(query: SearchQuery) -> list[ImageResult]:
    """Fallback: scrape Behance search page and extract thumbnail URLs via regex."""
    encoded = quote_plus(query.query_string)
    url = f"https://www.behance.net/search/projects?search={encoded}"

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        resp = await client.get(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                              "AppleWebKit/537.36 (KHTML, like Gecko) "
                              "Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml",
            },
        )
        resp.raise_for_status()

    html = resp.text
    results: list[ImageResult] = []

    # Try to find <media:thumbnail> in RSS-style feeds
    rss_thumbs = re.findall(r'<media:thumbnail\s+url=["\']([^"\']+)["\']', html)

    # Also try og:image / project cover URLs embedded in HTML/JSON
    if not rss_thumbs:
        rss_thumbs = re.findall(
            r'(?:src|srcset|url)\s*[=:]\s*["\']?(https://mir-s3-cdn-cf\.behance\.net/[^\s"\'>,]+)',
            html,
        )

    seen: set[str] = set()
    for thumb_url in rss_thumbs[:20]:
        if thumb_url in seen:
            continue
        seen.add(thumb_url)

        img_id = hashlib.sha256(thumb_url.encode()).hexdigest()[:16]

        tags = list(query.style_hints)

        results.append(
            ImageResult(
                id=img_id,
                url=thumb_url,
                thumbnail_url=thumb_url,
                source_platform="behance",
                source_link="https://www.behance.net",
                title="Behance Project",
                tags=tags,
                caption="",
                color_palette=[],
                style_label=query.style_hints[0] if query.style_hints else "",
                aspect_ratio=1.0,
                tagging_complete=False,
            )
        )

    return results


async def scrape(query: SearchQuery) -> list[ImageResult]:
    """Scrape Behance — API if key is available, else HTML/RSS fallback."""
    try:
        api_key = os.environ.get("BEHANCE_API_KEY", "")
        if api_key:
            return await _scrape_api(query, api_key)
        else:
            return await _scrape_rss_fallback(query)
    except Exception:
        return []
