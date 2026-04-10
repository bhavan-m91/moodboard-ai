"""Normalize LLM JSON into SearchQuery — chat models often invent alternate field names."""

from __future__ import annotations

from backend.models import SearchQuery

_VALID_PLATFORMS = frozenset({"unsplash", "behance", "dribbble", "google"})


def _as_str_list(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(x).strip() for x in value if str(x).strip()]
    if isinstance(value, str):
        parts: list[str] = []
        for chunk in value.replace(";", ",").split(","):
            s = chunk.strip()
            if s:
                parts.append(s)
        return parts
    s = str(value).strip()
    return [s] if s else []


def coerce_search_query(item: object) -> SearchQuery:
    """
    Build a SearchQuery from an LLM dict.

    Tries strict Pydantic validation first, then maps common aliases:
    query / search / q, keywords / tags / hints, style / theme / abstract, etc.
    """
    if not isinstance(item, dict):
        raise ValueError("Each query must be a JSON object")

    try:
        return SearchQuery.model_validate(item)
    except Exception:
        pass

    raw = item

    platform_raw = raw.get("platform") or raw.get("source") or raw.get("site")
    platform = str(platform_raw or "google").lower().strip()
    if platform not in _VALID_PLATFORMS:
        platform = "google"

    query_string = raw.get("query_string") or raw.get("query") or raw.get("search_query")
    query_string = str(query_string).strip() if query_string is not None else ""

    style_hints = _as_str_list(
        raw.get("style_hints") or raw.get("hints") or raw.get("tags") or raw.get("keywords")
    )

    if not query_string:
        bits: list[str] = []
        for key in (
            "style",
            "theme",
            "topic",
            "subject",
            "abstract",
            "campaign",
            "mood",
            "concept",
            "title",
            "name",
        ):
            val = raw.get(key)
            if val is None:
                continue
            if isinstance(val, list):
                bits.extend(str(x).strip() for x in val if str(x).strip())
            else:
                s = str(val).strip()
                if s:
                    bits.append(s)
        kw = raw.get("keywords")
        if isinstance(kw, list):
            bits.extend(str(x).strip() for x in kw if str(x).strip())
        elif isinstance(kw, str) and kw.strip():
            bits.append(kw.strip())
        query_string = " ".join(bits).strip()

    if not style_hints and query_string:
        style_hints = [query_string[:60].strip() or "design"]
    if not style_hints:
        style_hints = ["design"]

    if not query_string:
        query_string = "design inspiration"

    # Cap length for APIs
    query_string = query_string[:800]
    style_hints = style_hints[:10]

    return SearchQuery(platform=platform, query_string=query_string, style_hints=style_hints)
