"""SQLite database layer using aiosqlite."""

from __future__ import annotations

import json
from datetime import datetime

import aiosqlite

from backend.models import ImageResult, WishlistItem

DB_PATH = "moodboard.db"


async def init_db() -> None:
    """Create the wishlists table if it does not exist."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS wishlists (
                id         TEXT PRIMARY KEY,
                project_name TEXT NOT NULL,
                image_data TEXT NOT NULL,
                added_at   TEXT NOT NULL,
                notes      TEXT DEFAULT ''
            )
            """
        )
        await db.commit()


async def save_item(item: WishlistItem) -> None:
    """Insert or replace a wishlist item."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT OR REPLACE INTO wishlists (id, project_name, image_data, added_at, notes)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                item.id,
                item.project_name,
                item.image_result.model_dump_json(),
                item.added_at.isoformat(),
                item.notes,
            ),
        )
        await db.commit()


async def get_project_items(project_name: str) -> list[WishlistItem]:
    """Return all wishlist items for a given project."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM wishlists WHERE project_name = ? ORDER BY added_at DESC",
            (project_name,),
        )
        rows = await cursor.fetchall()

    items: list[WishlistItem] = []
    for row in rows:
        items.append(
            WishlistItem(
                id=row["id"],
                project_name=row["project_name"],
                image_result=ImageResult.model_validate_json(row["image_data"]),
                added_at=datetime.fromisoformat(row["added_at"]),
                notes=row["notes"],
            )
        )
    return items


async def delete_item(item_id: str) -> bool:
    """Delete a wishlist item by ID. Returns True if a row was deleted."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("DELETE FROM wishlists WHERE id = ?", (item_id,))
        await db.commit()
        return cursor.rowcount > 0
