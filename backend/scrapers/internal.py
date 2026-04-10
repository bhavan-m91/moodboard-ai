"""Internal Scraper — reads mapped metadata payloads from local disk collections."""

from __future__ import annotations

import json
from pathlib import Path
from backend.models import ImageResult, SearchQuery

# Root directory mapped for internal
INTERNAL_DATA_DIR = Path("data/internal_images")

async def scrape(query: SearchQuery) -> list[ImageResult]:
    """
    Search across local internal collections via their metadata.json tags.
    Scores tags by exact matches with user style hints.
    """
    if not INTERNAL_DATA_DIR.exists():
        return []

    results: list[tuple[int, ImageResult]] = []
    
    query_hintslower = {hint.lower() for hint in query.style_hints}

    try:
        # Each child in dir is considered a collection
        for collection_dir in INTERNAL_DATA_DIR.iterdir():
            if not collection_dir.is_dir():
                continue
            
            meta_file = collection_dir / "metadata.json"
            if not meta_file.exists():
                continue
                
            try:
                with meta_file.open("r", encoding="utf-8") as f:
                    entries = json.load(f)
            except Exception:
                continue
            
            for entry in entries:
                filename = entry.get("filename")
                if not filename:
                    continue
                
                tags = [t.lower() for t in entry.get("tags", [])]
                
                # Scoring: how many hits overlap?
                score = len(query_hintslower.intersection(set(tags)))
                # If there are no style hints, we'll just gather them all
                # if there is a score, this will pop to the top.
                
                # We can also do a rudimentary textual check on query phrase to boost
                query_str = query.query_string.lower()
                if query_str and (query_str in filename.lower() or any(query_str in t for t in tags)):
                    score += 5
                
                # Create the ImageResult pseudo-object
                # We use a stable dummy ID mechanism so React doesn't bounce keys
                import hashlib
                
                # The url being served natively by FastAPI
                url = f"/static/internal_images/{collection_dir.name}/{filename}"
                uid_hash = hashlib.sha256(url.encode()).hexdigest()[:16]

                result = ImageResult(
                    id=uid_hash,
                    url=url,
                    thumbnail_url=url,
                    source_platform="internal",
                    source_link="",
                    title=filename.split(".")[0].replace("-", " ").title(),
                    tags=entry.get("tags", []),
                    caption=entry.get("caption", ""),
                    style_label=entry.get("style_label", ""),
                    color_palette=entry.get("color_palette", []),
                    mood=entry.get("mood", ""),
                    aspect_ratio=float(entry.get("aspect_ratio", 1.0)),
                    tagging_complete=True,
                )
                
                results.append((score, result))

        # Sort: Highest score first, then fallback to filename alphabetically to break ties cleanly.
        results.sort(key=lambda x: (-x[0], x[1].title))
        
        # Return top 10 mapped models
        return [res[1] for res in results[:10]]

    except Exception:
        return []
