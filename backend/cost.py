"""
cost.py — LLM cost calculation helpers.
Calculates cost per LLM call using Groq model pricing.
"""

# Groq USD pricing per 1K tokens. Add models here as the configured model set grows.
MODEL_PRICING = {
    "llama-3.3-70b-versatile": {"input": 0.00059, "output": 0.00079},
    "llama-3.1-8b-instant": {"input": 0.00005, "output": 0.00008},
}


def calculate_cost(prompt_tokens: int, completion_tokens: int, model_name: str) -> float:
    """
    Calculate the USD cost for one Groq completion.
    """
    if prompt_tokens < 0 or completion_tokens < 0:
        raise ValueError("Token counts cannot be negative")

    prices = MODEL_PRICING.get(model_name)
    if prices is None:
        return 0.0

    input_cost = (prompt_tokens / 1_000) * prices["input"]
    output_cost = (completion_tokens / 1_000) * prices["output"]
    return round(input_cost + output_cost, 8)
