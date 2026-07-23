"""
search.py — Primary search tool using Wikipedia.

Instruments a 'tool.search' span and persists span metadata to Supabase
so trace detail pages work without querying SigNoz.
"""

import time
import traceback
import uuid
import requests
import wikipediaapi
from opentelemetry import trace
from instrumentation import get_tracer
import store


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


LOGGER = logging.getLogger(__name__)

def search_tool(query: str, session_id: str) -> str:
    """
    Search Wikipedia for the given query.

    Args:
        query: Search query string.

    Returns:
        Wikipedia page summary (up to 2000 chars) or a not-found message.
    """
    tracer     = get_tracer()
    start_time = time.time()

    with tracer.start_as_current_span("tool.search") as span:
        span.set_attribute("tool.name", "search")
        span.set_attribute("tool.provider", "Wikipedia")
        span.set_attribute("search.query", query)

        try:
            search_url = "https://en.wikipedia.org/w/api.php"
            params = {
                "action":   "query",
                "list":     "search",
                "srsearch": query,
                "format":   "json",
                "utf8":     1,
            }
            headers = {"User-Agent": "AgentPulse/1.0 (hackathon project)"}

            resp = requests.get(search_url, params=params, headers=headers)
            resp.raise_for_status()
            search_data = resp.json().get("query", {}).get("search", [])

            end_time   = time.time()
            latency_ms = int((end_time - start_time) * 1000)

            if not search_data:
                span.set_attribute("search.result_count", 0)
                span.set_attribute("tool.success", True)
                span.set_attribute("tool.latency_ms", latency_ms)

                store.save_span(
                    span_id        = _span_id_hex(span),
                    trace_id       = _trace_id_hex(span),
                    parent_span_id = "",
                    name           = "tool.search",
                    start_time     = start_time,
                    end_time       = end_time,
                    duration_ms    = latency_ms,
                    status         = "success",
                    attributes     = {
                        "tool.name":           "search",
                        "tool.provider":       "Wikipedia",
                        "search.query":        query,
                        "search.result_count": 0,
                        "tool.success":        True,
                        "tool.latency_ms":     latency_ms,
                    },
                )
                return f"No Wikipedia article found for '{query}'."

            best_title = search_data[0]["title"]
            span.set_attribute("search.best_title", best_title)

            wiki = wikipediaapi.Wikipedia(
                user_agent="AgentPulse/1.0 (hackathon project)",
                language="en",
            )
            page = wiki.page(best_title)

            end_time   = time.time()
            latency_ms = int((end_time - start_time) * 1000)

            if page.exists():
                summary = page.summary[:2000]
                span.set_attribute("search.result_count", 1)
                span.set_attribute("tool.success", True)
                span.set_attribute("tool.latency_ms", latency_ms)

                store.save_span(
                    span_id        = _span_id_hex(span),
                    trace_id       = _trace_id_hex(span),
                    parent_span_id = "",
                    name           = "tool.search",
                    start_time     = start_time,
                    end_time       = end_time,
                    duration_ms    = latency_ms,
                    status         = "success",
                    attributes     = {
                        "tool.name":          "search",
                        "tool.provider":      "Wikipedia",
                        "search.query":       query,
                        "search.best_title":  best_title,
                        "search.result_count": 1,
                        "tool.success":       True,
                        "tool.latency_ms":    latency_ms,
                    },
                )
                return summary

            span.set_attribute("search.result_count", 0)
            span.set_attribute("tool.success", True)
            span.set_attribute("tool.latency_ms", latency_ms)

            store.save_span(
                span_id        = _span_id_hex(span),
                trace_id       = _trace_id_hex(span),
                parent_span_id = "",
                name           = "tool.search",
                start_time     = start_time,
                end_time       = end_time,
                duration_ms    = latency_ms,
                status         = "success",
                attributes     = {
                    "tool.name":          "search",
                    "tool.provider":      "Wikipedia",
                    "search.query":       query,
                    "search.best_title":  best_title,
                    "search.result_count": 0,
                    "tool.success":       True,
                    "tool.latency_ms":    latency_ms,
                },
            )
            return f"No Wikipedia article found for '{best_title}'."

        except Exception as exc:
            end_time   = time.time()
            latency_ms = int((end_time - start_time) * 1000)

            span.set_status(trace.Status(trace.StatusCode.ERROR, str(exc)))
            span.record_exception(exc)
            span.set_attribute("tool.success", False)
            span.set_attribute("error.type", type(exc).__name__)
            span.set_attribute("error.message", str(exc))
            span.set_attribute("error.stacktrace", traceback.format_exc())

            store.save_span(
                span_id        = _span_id_hex(span),
                trace_id       = _trace_id_hex(span),
                parent_span_id = "",
                name           = "tool.search",
                start_time     = start_time,
                end_time       = end_time,
                duration_ms    = latency_ms,
                status         = "error",
                attributes     = {
                    "tool.name":     "search",
                    "tool.provider": "Wikipedia",
                    "search.query":  query,
                    "tool.success":  False,
                    "error.type":    type(exc).__name__,
                    "error.message": str(exc),
                },
            )
            raise
