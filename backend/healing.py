"""
healing.py — Self-healing fallback logic.

Tracks consecutive search failures and triggers Wikipedia fallback
when the threshold is exceeded. Exposes get_status() for the /health endpoint.

State machine:
  idle -> (failures) -> degraded -> (threshold) -> healing -> (success) -> recovered -> idle

Fallback spans are persisted to Supabase via store.py.
"""

import time
import uuid
import wikipediaapi
from opentelemetry import trace
try:
    from .instrumentation import get_tracer
    from . import store
except ImportError:  # direct execution from backend/
    from instrumentation import get_tracer
    import store


# ── Thresholds ──
_FAILURE_THRESHOLD = 2

# ── State ──
_consecutive_failures: int = 0
_is_healed: bool = False
_force_fail: bool = False
_agent_status: str = "idle"   # "idle" | "degraded" | "healing" | "recovered"
_recovered_at: float = 0.0
_RECOVERY_DISPLAY_SECONDS: float = 30.0


# ── Helpers ─────────────────────────────────────────────────────────────────

def _span_id_hex(span) -> str:
    ctx = span.get_span_context()
    if ctx and ctx.is_valid:
        return format(ctx.span_id, "016x")
    return uuid.uuid4().hex[:16]


def _trace_id_hex(span) -> str:
    ctx = span.get_span_context()
    if ctx and ctx.is_valid:
        return format(ctx.trace_id, "032x")
    return ""


# ── Public state readers ──────────────────────────────────────────────────

def get_status() -> dict:
    """Return current agent healing status for the /health endpoint."""
    status = _agent_status

    # Auto-expire "recovered" display after 30 seconds of no activity
    if status == "recovered" and time.time() - _recovered_at > _RECOVERY_DISPLAY_SECONDS:
        status = "idle"

    return {
        "status":   status,
        "healed":   _is_healed,
        "failures": _consecutive_failures,
    }


def is_healing_active() -> bool:
    """Return True if the agent is currently in self-healing (fallback) mode."""
    return _is_healed


def is_force_fail() -> bool:
    """Return True if search failures are being forced for demo purposes."""
    return _force_fail


# ── State mutators ────────────────────────────────────────────────────────

def record_search_success() -> None:
    """Mark a successful primary search. Resets failure counter and advances state."""
    global _consecutive_failures, _agent_status, _recovered_at

    _consecutive_failures = 0

    if _agent_status in ("healing", "degraded"):
        _agent_status = "recovered"
        _recovered_at = time.time()
    elif _agent_status == "recovered":
        _agent_status = "idle"


def record_search_failure() -> bool:
    """
    Record a primary search failure.

    Returns True if healing should activate (threshold reached).
    """
    global _consecutive_failures, _is_healed, _agent_status

    _consecutive_failures += 1

    if _consecutive_failures >= _FAILURE_THRESHOLD:
        _is_healed = True
        _agent_status = "healing"
        return True

    # Below threshold — degraded but not healing yet
    _agent_status = "degraded"
    return False


def force_search_failure(enabled: bool = True) -> None:
    """Toggle forced search failure for demo purposes."""
    global _force_fail
    _force_fail = enabled


def reset_healing() -> None:
    """
    Reset all healing state.

    If the agent was healing, transitions to 'recovered' briefly so the
    frontend can show the green pill before returning to idle.
    """
    global _consecutive_failures, _is_healed, _force_fail, _agent_status, _recovered_at

    was_healing = _agent_status in ("healing", "degraded")

    _consecutive_failures = 0
    _is_healed = False
    _force_fail = False

    if was_healing:
        _agent_status = "recovered"
        _recovered_at = time.time()
    else:
        _agent_status = "idle"


# ── Fallback tool ─────────────────────────────────────────────────────────

def wikipedia_fallback(query: str) -> str:
    """
    Fallback tool: search Wikipedia when the primary search fails repeatedly.

    Instrumented with OTel span including agent.healed and agent.strategy attributes.
    Span metadata is persisted to Supabase.

    Args:
        query: The search query extracted from the user's question.

    Returns:
        Wikipedia page summary (up to 2000 chars) or an informative fallback message.
    """
    tracer     = get_tracer()
    start_time = time.time()

    with tracer.start_as_current_span("tool.wikipedia_fallback") as span:
        span.set_attribute("tool.name", "wikipedia_fallback")
        span.set_attribute("search.query", query)
        span.set_attribute("agent.healed", True)
        span.set_attribute("agent.strategy", "wikipedia_fallback")
        span.set_attribute("agent.fallback_reason", "consecutive_search_failures")

        try:
            wiki = wikipediaapi.Wikipedia(
                user_agent="AgentPulse/1.0 (hackathon project)",
                language="en",
            )

            page = wiki.page(query)

            end_time   = time.time()
            latency_ms = int((end_time - start_time) * 1000)

            if page.exists():
                summary = page.summary[:2000]
                span.set_attribute("search.result_chars", len(summary))
                span.set_attribute("search.returned_empty", False)
                span.set_attribute("tool.latency_ms", latency_ms)

                store.save_span(
                    span_id        = _span_id_hex(span),
                    trace_id       = _trace_id_hex(span),
                    parent_span_id = "",
                    name           = "tool.wikipedia_fallback",
                    start_time     = start_time,
                    end_time       = end_time,
                    duration_ms    = latency_ms,
                    status         = "success",
                    attributes     = {
                        "tool.name":              "wikipedia_fallback",
                        "search.query":           query,
                        "agent.healed":           True,
                        "agent.strategy":         "wikipedia_fallback",
                        "search.result_chars":    len(summary),
                        "search.returned_empty":  False,
                        "tool.latency_ms":        latency_ms,
                    },
                )
                return summary

            span.set_attribute("search.returned_empty", True)
            span.set_attribute("tool.latency_ms", latency_ms)

            store.save_span(
                span_id        = _span_id_hex(span),
                trace_id       = _trace_id_hex(span),
                parent_span_id = "",
                name           = "tool.wikipedia_fallback",
                start_time     = start_time,
                end_time       = end_time,
                duration_ms    = latency_ms,
                status         = "success",
                attributes     = {
                    "tool.name":             "wikipedia_fallback",
                    "search.query":          query,
                    "agent.healed":          True,
                    "agent.strategy":        "wikipedia_fallback",
                    "search.returned_empty": True,
                    "tool.latency_ms":       latency_ms,
                },
            )
            return (
                f"No Wikipedia article found for '{query}'. "
                "The agent could not find relevant information."
            )

        except Exception as exc:
            end_time   = time.time()
            latency_ms = int((end_time - start_time) * 1000)

            span.set_status(trace.Status(trace.StatusCode.ERROR, str(exc)))
            span.record_exception(exc)
            span.set_attribute("error.type", type(exc).__name__)
            span.set_attribute("error.message", str(exc))

            store.save_span(
                span_id        = _span_id_hex(span),
                trace_id       = _trace_id_hex(span),
                parent_span_id = "",
                name           = "tool.wikipedia_fallback",
                start_time     = start_time,
                end_time       = end_time,
                duration_ms    = latency_ms,
                status         = "error",
                attributes     = {
                    "tool.name":     "wikipedia_fallback",
                    "search.query":  query,
                    "agent.healed":  True,
                    "error.type":    type(exc).__name__,
                    "error.message": str(exc),
                },
            )
            return f"Wikipedia fallback also failed: {exc}"
