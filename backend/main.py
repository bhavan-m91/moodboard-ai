"""MoodBoard AI — FastAPI application entry point."""

from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

# Load backend/.env when running from repo root (uvicorn backend.main:app)
load_dotenv(Path(__file__).resolve().parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.db import init_db
from backend.routers import proxy_image, search, wishlist
from fastapi.staticfiles import StaticFiles


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise resources on startup."""
    await init_db()
    yield


app = FastAPI(
    title="MoodBoard AI",
    description="Design inspiration search tool — fetches images from multiple platforms and returns AI-tagged results.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow all origins for hackathon / dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(search.router)
app.include_router(wishlist.router)
app.include_router(proxy_image.router)

# Mount local data directory for internal collections
app.mount("/static", StaticFiles(directory="data"), name="static")

@app.get("/health")
async def health():
    return {"status": "ok"}
