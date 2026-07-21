import logging
import os
import time
import wikipediaapi
from opentelemetry import trace
if __package__:
    from .instrumentation import get_tracer
else:  # pragma: no cover
    from instrumentation import get_tracer

LOGGER = logging.getLogger(__name__)

def search_tool(query: str, session_id: str) -> str:
    """
    Search Wikipedia for the given query.
    Instruments a 'tool.search' span.
    """
    tracer = get_tracer()
    start_time = time.time()
    
    with tracer.start_as_current_span("tool.search") as span:
        span.set_attribute("tool.name", "search")
        span.set_attribute("tool.provider", "Wikipedia")
        span.set_attribute("search.query", query)
        span.set_attribute("session_id", session_id)
        
        try:
            if os.getenv("BREAK_SEARCH", "false").lower() == "true":
                raise RuntimeError("tool.search forced failure (BREAK_SEARCH=true)")
            # Find best matching title via Wikipedia search API
            import requests
            search_url = "https://en.wikipedia.org/w/api.php"
            params = {
                "action": "query",
                "list": "search",
                "srsearch": query,
                "format": "json",
                "utf8": 1
            }
            headers = {
                "User-Agent": "AgentPulse/1.0 (hackathon project)"
            }
            resp = requests.get(search_url, params=params, headers=headers, timeout=10)
            resp.raise_for_status()
            search_data = resp.json().get("query", {}).get("search", [])
            
            if not search_data:
                span.set_attribute("search.result_count", 0)
                span.set_attribute("tool.success", True)
                span.set_attribute("tool.latency_ms", int((time.time() - start_time) * 1000))
                return f"No Wikipedia article found for '{query}'."
                
            best_title = search_data[0]["title"]
            span.set_attribute("search.best_title", best_title)
            
            wiki = wikipediaapi.Wikipedia(
                user_agent="AgentPulse/1.0 (hackathon project)",
                language="en",
            )
            
            page = wiki.page(best_title)
            
            if page.exists():
                summary = page.summary[:2000] # Limit summary length
                span.set_attribute("search.result_count", 1)
                span.set_attribute("tool.success", True)
                span.set_attribute("tool.latency_ms", int((time.time() - start_time) * 1000))
                return summary
            else:
                span.set_attribute("search.result_count", 0)
                span.set_attribute("tool.success", True) # Call succeeded, just no results
                span.set_attribute("tool.latency_ms", int((time.time() - start_time) * 1000))
                return f"No Wikipedia article found for '{best_title}'."
                
        except Exception as e:
            LOGGER.exception("Wikipedia search failed")
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            span.record_exception(e)
            span.set_attribute("tool.success", False)
            span.set_attribute("error.type", type(e).__name__)
            span.set_attribute("error.message", str(e))
            import traceback
            span.set_attribute("error.stacktrace", traceback.format_exc())
            raise
