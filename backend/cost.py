"""
cost.py — LLM cost calculation helpers.
Calculates cost per LLM call based on Groq pricing.
"""

# Groq llama-3.3-70b-versatile pricing (per 1K tokens)
PRICING = {
    "llama-3.3-70b-versatile": {
        "input": 0.00059,
        "output": 0.00079,
    },
    "llama-3.1-8b-instant": {
        "input": 0.00005,
        "output": 0.00008,
    },
}


def calculate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """
    Calculate the USD cost for a single LLM call.

    Returns 0.0 if the model isn't in the pricing table.
    """
    prices = PRICING.get(model)
    if not prices:
        return 0.0

    input_cost = (prompt_tokens / 1000) * prices["input"]
    output_cost = (completion_tokens / 1000) * prices["output"]

    return round(input_cost + output_cost, 8)
