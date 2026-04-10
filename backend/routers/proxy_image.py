"""Proxy remote images so the browser can load CDN assets without hotlink / referrer blocks."""

from __future__ import annotations

from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

router = APIRouter(prefix="/api", tags=["proxy"])

# Host suffixes we allow (design inspiration sources only)
_ALLOWED_HOST_SUFFIXES: tuple[str, ...] = (
    "behance.net",
    "unsplash.com",
    "dribbble.com",
    "dribbbleusercontent.com",
    "googleusercontent.com",
    "gstatic.com",
    "ggpht.com",
    "pinimg.com",
    "cdninstagram.com",
)

_MAX_BYTES = 15 * 1024 * 1024

_BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def _host_allowed(host: str) -> bool:
    h = (host or "").lower().strip(".")
    return any(h == s or h.endswith("." + s) for s in _ALLOWED_HOST_SUFFIXES)


def _validate_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="Only http(s) URLs are allowed")
    if not parsed.hostname or not _host_allowed(parsed.hostname):
        raise HTTPException(status_code=400, detail="Host not allowed for proxy")
    return url


@router.get("/proxy-image")
async def proxy_image(url: str = Query(..., min_length=8, max_length=4096)) -> Response:
    """Fetch an image server-side and return bytes (bypasses browser referrer restrictions)."""
    _validate_url(url)

    async with httpx.AsyncClient(
        timeout=httpx.Timeout(25.0),
        follow_redirects=True,
        headers={"User-Agent": _BROWSER_UA, "Accept": "image/*,*/*;q=0.8"},
    ) as client:
        try:
            upstream = await client.get(url)
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail=f"Fetch failed: {exc!s}") from exc

    if upstream.status_code != 200:
        raise HTTPException(status_code=upstream.status_code, detail="Upstream returned error")

    body = upstream.content
    if len(body) > _MAX_BYTES:
        raise HTTPException(status_code=413, detail="Image too large")

    ctype = upstream.headers.get("content-type", "").split(";")[0].strip().lower()
    if ctype and not (ctype.startswith("image/") or ctype in ("application/octet-stream", "binary/octet-stream")):
        raise HTTPException(status_code=415, detail="Response is not an image")

    media_type = ctype if ctype.startswith("image/") else "image/jpeg"

    return Response(
        content=body,
        media_type=media_type,
        headers={
            "Cache-Control": "public, max-age=3600",
            "X-Content-Type-Options": "nosniff",
        },
    )
