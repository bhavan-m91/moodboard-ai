"""AI image tagger — GPT-4o Vision for style analysis and metadata extraction."""

from __future__ import annotations

import asyncio
import json
import sys
from collections import OrderedDict
from typing import Any, AsyncGenerator

import httpx

from backend.models import ImageResult
from backend.services.openai_client import get_async_openai_client, get_vision_model

# ---------------------------------------------------------------------------
# System prompt for Vision tagging
# ---------------------------------------------------------------------------
TAGGER_SYSTEM_PROMPT = (
    "Analyse this design/UI/photography image and return ONLY a JSON object "
    "with no preamble or markdown backticks. Fields: caption (string, one "
    "sentence describing the design style and content), tags (array of 6-8 "
    "short descriptive strings — include style adjectives, colors, use case, "
    "vibe), style_label (exactly one of: minimalist, maximalist, brutalist, "
    "glassmorphism, neumorphic, editorial, retro, futuristic, organic, "
    "geometric, dark-ui, light-ui, illustration, photography), color_palette "
    "(array of 3 most dominant hex color strings), mood (exactly one of: calm, "
    "energetic, luxurious, playful, corporate, rebellious, romantic, technical). "
    "Output only the JSON object."
)

# ---------------------------------------------------------------------------
# LRU cache — same URL never tagged twice in a session
# ---------------------------------------------------------------------------
_LRU_MAX = 500


class _LRUCache:
    """Simple LRU cache backed by an OrderedDict."""

    def __init__(self, maxsize: int = _LRU_MAX) -> None:
        self._store: OrderedDict[str, ImageResult] = OrderedDict()
        self._maxsize = maxsize

    def get(self, key: str) -> ImageResult | None:
        if key in self._store:
            self._store.move_to_end(key)
            return self._store[key]
        return None

    def put(self, key: str, value: ImageResult) -> None:
        if key in self._store:
            self._store.move_to_end(key)
        else:
            if len(self._store) >= self._maxsize:
                self._store.popitem(last=False)
        self._store[key] = value


_tag_cache = _LRUCache(maxsize=_LRU_MAX)


# ---------------------------------------------------------------------------
# Single-image tagger
# ---------------------------------------------------------------------------
async def tag_image(image: ImageResult) -> ImageResult:
    """
    Use GPT-4o Vision to analyse a design image and populate AI metadata.

    Returns the updated ImageResult, or the original on failure.
    """
    if image.tagging_complete:
        return image

    # Check LRU cache first
    cached = _tag_cache.get(image.url)
    if cached is not None:
        return cached

    try:
        # Quick reachability check (many CDNs block HEAD; still try vision on 403/405)
        async with httpx.AsyncClient(timeout=3.0, follow_redirects=True) as http:
            try:
                head = await http.head(image.url)
                if head.status_code == 404:
                    return image
                if head.status_code >= 400 and head.status_code not in (403, 405, 501):
                    return image
            except httpx.RequestError:
                return image

        client = get_async_openai_client()
        vision_model = get_vision_model()

        response = await client.chat.completions.create(
            model=vision_model,
            max_tokens=300,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": image.url, "detail": "low"},
                        },
                        {
                            "type": "text",
                            "text": TAGGER_SYSTEM_PROMPT,
                        },
                    ],
                }
            ],
        )

        raw = response.choices[0].message.content
        if not raw:
            return image

        # Strip potential markdown fences
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

        data: dict[str, Any] = json.loads(cleaned)

        # Build updated image with AI tags
        tagged = image.model_copy(
            update={
                "caption": data.get("caption", image.caption),
                "tags": data.get("tags", image.tags),
                "style_label": data.get("style_label", image.style_label),
                "color_palette": data.get("color_palette", image.color_palette),
                "mood": data.get("mood", image.mood),
                "tagging_complete": True,
            }
        )

        # Store in LRU cache
        _tag_cache.put(image.url, tagged)

        return tagged

    except Exception as exc:
        print(f"[tagger] Failed to tag {image.url}: {exc}", file=sys.stderr)
        return image


# ---------------------------------------------------------------------------
# Batch tagger — concurrent with semaphore
# ---------------------------------------------------------------------------
async def tag_batch(
    images: list[ImageResult],
    max_concurrent: int = 5,
) -> AsyncGenerator[ImageResult, None]:
    """
    Tag multiple images concurrently (up to max_concurrent at a time).

    Yields each tagged ImageResult as it completes — fastest first, not in order.
    """
    semaphore = asyncio.Semaphore(max_concurrent)

    async def _tag_with_limit(img: ImageResult) -> ImageResult:
        async with semaphore:
            return await tag_image(img)

    tasks = [asyncio.ensure_future(_tag_with_limit(img)) for img in images]

    for coro in asyncio.as_completed(tasks):
        try:
            result = await coro
            yield result
        except Exception as exc:
            print(f"[tagger] Batch item failed: {exc}", file=sys.stderr)
            continue
