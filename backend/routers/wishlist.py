"""Wishlist router — CRUD for saved design images."""

from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from backend.db import delete_item, get_project_items, save_item
from backend.models import WishlistCreate, WishlistItem

router = APIRouter(prefix="/api/wishlist", tags=["wishlist"])


@router.post("/save", response_model=WishlistItem)
async def save_to_wishlist(body: WishlistCreate) -> WishlistItem:
    """Save an ImageResult to a named project."""
    if not body.project_name or not body.project_name.strip():
        raise HTTPException(status_code=400, detail="project_name is required")

    item = WishlistItem(
        id=str(uuid.uuid4()),
        project_name=body.project_name.strip(),
        image_result=body.image_result,
        added_at=datetime.now(timezone.utc),
        notes=body.notes,
    )
    await save_item(item)
    return item


@router.get("/{project_name}", response_model=list[WishlistItem])
async def get_wishlist(project_name: str) -> list[WishlistItem]:
    """Retrieve all wishlist items for a project."""
    items = await get_project_items(project_name)
    return items


@router.delete("/{item_id}")
async def remove_from_wishlist(item_id: str) -> dict:
    """Delete a wishlist item by its ID."""
    deleted = await delete_item(item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"status": "deleted", "id": item_id}
