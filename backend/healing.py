"""
healing.py — Self-healing fallback logic.
Tracks consecutive search failures and triggers Wikipedia fallback
when the threshold is exceeded.
"""

import wikipediaapi
from instrumentation import get_tracer
from opentelemetry import trace

# ── State ──
_consecutive_failures = 0
_FAILURE_THRESHOLD = 2
_is_healed = False
_force_fail = False  # Set by /break endpoint for demo


def reset_healing():
    """Reset healing state."""
    global _consecutive_failures, _is_healed, _force_fail
    _consecutive_failures = 0
    _is_healed = False
    _force_fail = False


def force_search_failure(enabled: bool = True):
    """Toggle forced search failure for demo purposes."""
    global _force_fail
    _force_fail = enabled


def is_force_fail() -> bool:
    """Check if search is being intentionally broken."""
    return _force_fail


def record_search_failure():
    """Record a search failure. Returns True if healing should activate."""
    global _consecutive_failures, _is_healed
    _consecutive_failures += 1
    if _consecutive_failures >= _FAILURE_THRESHOLD:
        _is_healed = True
        return True
    return False


def record_search_success():
    """Record a successful search, reset failure counter."""
    global _consecutive_failures
    _consecutive_failures = 0


def is_healing_active() -> bool:
    """Check if agent is currently in self-healing mode."""
    return _is_healed


def wikipedia_fallback(query: str) -> str:
    """
    Fallback tool: search Wikipedia when web search fails repeatedly.
    Instrumented with OTel span.
    """
    t = get_tracer()
    with t.start_as_current_span("tool.wikipedia_fallback") as span:
        span.set_attribute("search.query", query)
        span.set_attribute("agent.healed", True)
        span.set_attribute("agent.fallback_reason", "consecutive_search_failures")

        try:
            wiki = wikipediaapi.Wikipedia(
                user_agent="AgentPulse/1.0 (hackathon project)",
                language="en",
            )

            # Try direct page lookup first
            page = wiki.page(query)
            if page.exists():
                summary = page.summary[:2000]
                span.set_attribute("search.result_chars", len(summary))
                span.set_attribute("search.returned_empty", False)
                return summary

            # If no direct match, return a note
            span.set_attribute("search.returned_empty", True)
            return f"No Wikipedia article found for '{query}'. The agent could not find relevant information."

        except Exception as e:
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            span.record_exception(e)
            return f"Wikipedia fallback also failed: {str(e)}"
