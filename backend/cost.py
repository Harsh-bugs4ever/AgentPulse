"""Groq completion cost helpers."""

from __future__ import annotations

from typing import Final

# USD per 1,000 tokens. Keep this mapping close to the calculation so a demo
# deployment can update pricing without touching request handling.
MODEL_PRICING: Final[dict[str, dict[str, float]]] = {
    "llama-3.3-70b-versatile": {"input": 0.00059, "output": 0.00079},
    "llama-3.1-8b-instant": {"input": 0.00005, "output": 0.00008},
}


def calculate_cost(model_name: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Return the USD cost of a completion, rounded for span storage."""
    if prompt_tokens < 0 or completion_tokens < 0:
        raise ValueError("Token counts cannot be negative")
    pricing = MODEL_PRICING.get(model_name)
    if pricing is None:
        return 0.0
    return round(
        prompt_tokens * pricing["input"] / 1_000
        + completion_tokens * pricing["output"] / 1_000,
        8,
    )
