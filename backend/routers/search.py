"""Search router — SSE streaming endpoint."""

from __future__ import annotations

import json
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.models import ImageResult, SearchQuery
from backend.services.llm_query import build_queries
from backend.services.aggregator import aggregate_results
from backend.services.taggers import tag_batch
from backend.services.openai_client import get_async_openai_client, get_chat_model
from backend.services.search_query_coerce import coerce_search_query

router = APIRouter(prefix="/api", tags=["search"])


class SearchRequest(BaseModel):
    prompt: str
    project_name: str = ""
    include_internal: bool = False

async def _event_generator(req: SearchRequest) -> AsyncGenerator[str, None]:
    """Yield SSE events: queries → images → tag_updates → done."""

    # Step 1 — build queries via LLM
    try:
        queries = await build_queries(req.prompt)
    except Exception as exc:
        yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
        return

    yield f"data: {json.dumps({'type': 'queries', 'data': [q.model_dump() for q in queries]})}\n\n"

    # Step 2 — aggregate results from all scrapers, collect for tagging
    all_results: list[ImageResult] = []
    async for result in aggregate_results(queries, req.include_internal):
        yield f"data: {json.dumps({'type': 'image', 'data': result.model_dump()})}\n\n"
        all_results.append(result)

    # Step 3 — progressive AI tagging (does not block image delivery)
    async for tagged in tag_batch(all_results):
        yield f"data: {json.dumps({'type': 'tag_update', 'data': tagged.model_dump()})}\n\n"

    # Step 4 — done
    yield f"data: {json.dumps({'type': 'done', 'total': len(all_results)})}\n\n"


@router.post("/search")
async def search(body: SearchRequest) -> StreamingResponse:
    """Start a design search and stream results as SSE."""
    if not body.prompt or not body.prompt.strip():
        raise HTTPException(status_code=400, detail="prompt is required")

    return StreamingResponse(
        _event_generator(body),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


class ChatRequest(BaseModel):
    original_prompt: str
    follow_up: str
    current_tags: list[str]
    project_name: str = ""
    include_internal: bool = False


CHAT_SYSTEM_PROMPT = """You are a design research assistant. The user has searched for design inspiration and you've returned results tagged with these styles: {tags_summary}. The user wants to refine their search.

Output ONLY a single JSON object (no markdown, no backticks). Use this exact shape:

{
  "mode": "refine",
  "explanation": "one short sentence for the user",
  "queries": [
    {
      "platform": "unsplash",
      "query_string": "descriptive photography search terms",
      "style_hints": ["hint1", "hint2", "hint3"]
    },
    {
      "platform": "behance",
      "query_string": "project type or case study terms",
      "style_hints": ["hint1", "hint2", "hint3"]
    },
    {
      "platform": "dribbble",
      "query_string": "short punchy UI terms",
      "style_hints": ["hint1", "hint2", "hint3"]
    },
    {
      "platform": "google",
      "query_string": "site:behance.net ... design",
      "style_hints": ["hint1", "hint2", "hint3"]
    }
  ]
}

(mode must be exactly one of: refine, expand, replace)

Rules:
- Every element of "queries" MUST include exactly these three keys: "platform", "query_string", "style_hints".
- platform must be one of: unsplash, behance, dribbble, google (lowercase).
- style_hints must be a JSON array of 3-5 short strings (never a single string, never other key names like "keywords" or "style").
- refine: tighten queries (e.g. more dark, more minimal).
- expand: add new angles while keeping existing results on the client.
- replace: fresh search; still output 4 queries as above.

Only output the JSON object."""


async def _chat_event_generator(req: ChatRequest) -> AsyncGenerator[str, None]:
    try:
        client = get_async_openai_client()
        model = get_chat_model()
        tags_summary = ", ".join(req.current_tags) if req.current_tags else "none"
        sys_prompt = CHAT_SYSTEM_PROMPT.replace("{tags_summary}", tags_summary)
        
        user_msg = f"Original search: {req.original_prompt}\nUser follow-up: {req.follow_up}"

        response = await client.chat.completions.create(
            model=model,
            temperature=0.7,
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": user_msg},
            ],
        )
        
        raw = response.choices[0].message.content
        if not raw:
            raise ValueError("OpenAI returned empty content")
            
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

        data = json.loads(cleaned)
        mode = data.get("mode", "refine")
        explanation = data.get("explanation", "Refining search...")

        raw_queries = data.get("queries", [])
        if not isinstance(raw_queries, list):
            raw_queries = []

        queries = []
        for item in raw_queries:
            try:
                queries.append(coerce_search_query(item))
            except (ValueError, TypeError):
                continue

        # If the model returned the wrong schema for every item, fall back to a fresh query plan
        if not queries:
            fallback_prompt = f"{req.original_prompt.strip()}\n\nFollow-up: {req.follow_up.strip()}"
            queries = await build_queries(fallback_prompt)

    except Exception as exc:
        yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
        return

    yield f"data: {json.dumps({'type': 'chat_response', 'mode': mode, 'explanation': explanation})}\n\n"

    if queries:
        yield f"data: {json.dumps({'type': 'queries', 'data': [q.model_dump() for q in queries]})}\n\n"

        all_results: list[ImageResult] = []
        async for result in aggregate_results(queries, req.include_internal):
            yield f"data: {json.dumps({'type': 'image', 'data': result.model_dump()})}\n\n"
            all_results.append(result)

        async for tagged in tag_batch(all_results):
            yield f"data: {json.dumps({'type': 'tag_update', 'data': tagged.model_dump()})}\n\n"

        yield f"data: {json.dumps({'type': 'done', 'total': len(all_results)})}\n\n"
    else:
        yield f"data: {json.dumps({'type': 'done', 'total': 0})}\n\n"


@router.post("/chat")
async def chat(body: ChatRequest) -> StreamingResponse:
    if not body.follow_up or not body.follow_up.strip():
        raise HTTPException(status_code=400, detail="follow_up is required")

    return StreamingResponse(
        _chat_event_generator(body),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

