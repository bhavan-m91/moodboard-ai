"""Dribbble scraper — HTML scraping with regex (no BeautifulSoup)."""

from __future__ import annotations

import hashlib
import re
from urllib.parse import quote_plus

import httpx

from backend.models import ImageResult, SearchQuery


def _extract_shots(html: str, style_hints: list[str]) -> list[ImageResult]:
    """Parse Dribbble search HTML and extract shot data using regex."""
    results: list[ImageResult] = []

    # Find shot thumbnail list items
    # Dribbble wraps each shot in elements with data attributes and nested <img>/<a> tags.
    # We'll extract shot blocks between shot-related markers.
    shot_blocks = re.findall(
        r'<li[^>]*class="[^"]*shot-thumbnail[^"]*"[^>]*>(.*?)</li>',
        html,
        re.DOTALL,
    )

    # Fallback: try broader pattern if the above finds nothing
    if not shot_blocks:
        shot_blocks = re.findall(
            r'(<div[^>]*class="[^"]*shot-thumbnail[^"]*"[^>]*>.*?</div>\s*</div>)',
            html,
            re.DOTALL,
        )

    # If still nothing, try to find any shot-like cards
    if not shot_blocks:
        shot_blocks = re.findall(
            r'(<a[^>]*href="/shots/[^"]*"[^>]*>.*?</a>)',
            html,
            re.DOTALL,
        )

    for block in shot_blocks[:20]:
        # --- Image URL ---
        # Prefer srcset 2x, then src
        img_url = ""
        srcset_match = re.search(r'srcset="([^"]+)"', block)
        if srcset_match:
            srcset = srcset_match.group(1)
            # Prefer 2x variant
            two_x = re.search(r'(https?://[^\s,]+)\s+2x', srcset)
            if two_x:
                img_url = two_x.group(1)
            else:
                # Take the first URL from srcset
                first = re.search(r'(https?://[^\s,]+)', srcset)
                if first:
                    img_url = first.group(1)

        if not img_url:
            src_match = re.search(r'<img[^>]+src="(https?://[^"]+)"', block)
            if src_match:
                img_url = src_match.group(1)

        if not img_url:
            continue

        img_id = hashlib.sha256(img_url.encode()).hexdigest()[:16]

        # --- Thumbnail URL ---
        thumbnail_url = re.sub(r'(\d+)x(\d+)', '400x300', img_url, count=1)
        if thumbnail_url == img_url:
            thumbnail_url = img_url  # no size pattern found, use original

        # --- Title ---
        title = "Untitled"
        title_match = re.search(
            r'class="[^"]*shot-title[^"]*"[^>]*>([^<]+)<', block
        )
        if title_match:
            title = title_match.group(1).strip()
        else:
            # Alt text fallback
            alt_match = re.search(r'alt="([^"]+)"', block)
            if alt_match:
                title = alt_match.group(1).strip()

        # --- Source link ---
        source_link = ""
        link_match = re.search(r'href="(/shots/[^"]+)"', block)
        if link_match:
            source_link = f"https://dribbble.com{link_match.group(1)}"

        # --- Aspect ratio ---
        aspect_ratio = 1.0
        w_match = re.search(r'data-thumbnail-retina-width="(\d+)"', block)
        h_match = re.search(r'data-thumbnail-retina-height="(\d+)"', block)
        if w_match and h_match:
            w, h = int(w_match.group(1)), int(h_match.group(1))
            if h > 0:
                aspect_ratio = round(w / h, 3)
        else:
            # Fallback: try width/height from img tag
            w2 = re.search(r'width="(\d+)"', block)
            h2 = re.search(r'height="(\d+)"', block)
            if w2 and h2:
                w, h = int(w2.group(1)), int(h2.group(1))
                if h > 0:
                    aspect_ratio = round(w / h, 3)

        # --- Tags ---
        tags = list(style_hints)

        results.append(
            ImageResult(
                id=img_id,
                url=img_url,
                thumbnail_url=thumbnail_url,
                source_platform="dribbble",
                source_link=source_link,
                title=title,
                tags=tags,
                caption="",
                color_palette=[],
                style_label=style_hints[0] if style_hints else "",
                aspect_ratio=aspect_ratio,
                tagging_complete=False,
            )
        )

    return results


async def scrape(query: SearchQuery) -> list[ImageResult]:
    """Scrape Dribbble search results page via HTML parsing."""
    try:
        encoded = quote_plus(query.query_string)
        url = f"https://dribbble.com/search/shots?q={encoded}"

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

            # Silently bail on 403/429
            if resp.status_code in (403, 429):
                return []

            resp.raise_for_status()

        return _extract_shots(resp.text, query.style_hints)

    except Exception:
        return []
