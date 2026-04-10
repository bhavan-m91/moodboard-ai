"""Shared OpenAI-compatible async client (OpenAI, DeepSeek, or other proxies)."""

from __future__ import annotations

import os

from openai import AsyncOpenAI


def get_async_openai_client() -> AsyncOpenAI:
    """
    Build AsyncOpenAI from environment.

    - OPENAI_API_KEY: API key (DeepSeek keys work here too; same SDK parameter name).
    - OPENAI_BASE_URL or LLM_BASE_URL: optional OpenAI-compatible root, e.g. for DeepSeek
      often ``https://api.deepseek.com`` or ``https://api.deepseek.com/v1`` per their docs.

    Text calls use OPENAI_MODEL (e.g. ``deepseek-chat``). Vision tagging uses the same client
    and OPENAI_VISION_MODEL; if the provider does not support ``image_url`` inputs, tagging
    fails gracefully and the image is returned untagged.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")

    base = os.environ.get("OPENAI_BASE_URL") or os.environ.get("LLM_BASE_URL")
    kwargs: dict = {"api_key": api_key}
    if base and base.strip():
        kwargs["base_url"] = base.strip().rstrip("/")
    return AsyncOpenAI(**kwargs)


def get_chat_model() -> str:
    """Model for text / JSON query planning and chat."""
    return os.environ.get("OPENAI_MODEL", "gpt-4o")


def get_vision_model() -> str:
    """Model for image_url multimodal calls; defaults to chat model if unset."""
    return os.environ.get("OPENAI_VISION_MODEL") or os.environ.get("OPENAI_MODEL", "gpt-4o")
