"""The existing research-agent workflow, with request/session metadata."""

from __future__ import annotations

import time
import uuid

from opentelemetry import trace

if __package__:
    from .instrumentation import get_tracer
    from .llm import extract_query, llm_answer
    from .search import search_tool
else:  # pragma: no cover
    from instrumentation import get_tracer
    from llm import extract_query, llm_answer
    from search import search_tool


def run_agent(question: str) -> dict[str, str | float]:
    """Run the unchanged extract-search-answer flow and return API metadata."""
    tracer = get_tracer()
    session_id, request_id = str(uuid.uuid4()), str(uuid.uuid4())
    started = time.perf_counter()

    with tracer.start_as_current_span("agent.run") as root_span:
        root_span.set_attributes({
            "agent.name": "research-agent", "agent.version": "1.0",
            "session_id": session_id, "session.id": session_id,
            "request.id": request_id, "user.question": question,
        })
        try:
            search_query = extract_query(question, session_id)
            search_results = search_tool(search_query, session_id)
            answer, cost_usd = llm_answer(question, search_results, session_id)
            with tracer.start_as_current_span("agent.finish") as finish_span:
                finish_span.set_attributes({
                    "session_id": session_id, "agent.success": True,
                    "response.length": len(answer),
                    "execution.time_ms": int((time.perf_counter() - started) * 1000),
                })
            trace_id = format(root_span.get_span_context().trace_id, "032x")
            return {"answer": answer, "trace_id": trace_id, "session_id": session_id,
                    "cost_usd": cost_usd, "strategy": "wikipedia_research"}
        except Exception as exc:
            root_span.set_status(trace.Status(trace.StatusCode.ERROR, str(exc)))
            root_span.record_exception(exc)
            raise
