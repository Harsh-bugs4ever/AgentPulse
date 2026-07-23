"""
agent.py — Orchestrates the research agent pipeline.

Flow:
  1. Extract a search query from the user's question (LLM)
  2. Search for relevant content (primary: web search, fallback: Wikipedia)
  3. Generate an answer from the search results (LLM)

Self-healing: if the primary search fails consecutively, the agent
automatically falls back to Wikipedia and records agent.healed = True
and agent.strategy = "wikipedia_fallback" on the root span.

After every request, full trace + span metadata is persisted to Supabase
via store.py so that dashboard APIs work without querying SigNoz.
"""

import sys
import uuid
import time
import traceback

from opentelemetry import trace

from instrumentation import get_tracer
from search import search_tool
from llm import llm_answer, extract_query
from healing import (
    is_force_fail,
    is_healing_active,
    record_search_failure,
    record_search_success,
    wikipedia_fallback,
)
import store


def _span_id_hex(span) -> str:
    """Return the span ID as a 16-char hex string, or a new UUID if invalid."""
    ctx = span.get_span_context()
    if ctx and ctx.is_valid:
        return format(ctx.span_id, "016x")
    return uuid.uuid4().hex[:16]


def _trace_id_hex(span) -> str:
    """Return the trace ID as a 32-char hex string, or empty if invalid."""
    ctx = span.get_span_context()
    if ctx and ctx.is_valid:
        return format(ctx.trace_id, "032x")
    return ""


def run_agent(question: str) -> dict:
    """
    Run the full research agent pipeline for one question.

    Args:
        question: The user's research question.

    Returns:
        dict with keys: answer, trace_id, session_id, cost_usd, strategy
    """
    tracer = get_tracer()

    session_id  = str(uuid.uuid4())
    request_id  = str(uuid.uuid4())
    started_at  = time.time()
    total_cost: float = 0.0

    with tracer.start_as_current_span("agent.run") as root_span:
        root_span.set_attribute("agent.name", "research-agent")
        root_span.set_attribute("agent.version", "1.0")
        root_span.set_attribute("session.id", session_id)
        root_span.set_attribute("request.id", request_id)
        root_span.set_attribute("user.question", question)
        root_span.set_attribute("start.timestamp", int(started_at * 1000))

        strategy = "web_search"
        healed   = False
        answer   = ""

        trace_id = _trace_id_hex(root_span)

        # Save initial trace record immediately so FK constraints for spans & costs pass
        store.save_trace(
            trace_id       = trace_id,
            session_id     = session_id,
            request_id     = request_id,
            question       = question,
            answer         = "",
            status         = "running",
            strategy       = strategy,
            healed         = False,
            total_cost_usd = 0.0,
            duration_ms    = 0,
        )

        try:
            # ── Step 1: Extract search query ──────────────────────────────
            search_query, query_cost = extract_query(question, session_id)
            total_cost += query_cost

            # ── Step 2: Search (with self-healing fallback) ───────────────
            search_results: str

            try:
                if is_force_fail():
                    raise RuntimeError("Forced search failure (demo mode)")

                search_results = search_tool(search_query)
                record_search_success()

            except Exception as search_exc:
                should_activate = record_search_failure()

                if should_activate or is_healing_active():
                    # ── Self-healing: activate Wikipedia fallback ──
                    healed   = True
                    strategy = "wikipedia_fallback"

                    root_span.set_attribute("agent.healed", True)
                    root_span.set_attribute("agent.strategy", strategy)
                    root_span.set_attribute(
                        "agent.fallback_reason", type(search_exc).__name__
                    )

                    search_results = wikipedia_fallback(search_query)
                else:
                    # Failure count below threshold — propagate the error
                    root_span.set_status(
                        trace.Status(trace.StatusCode.ERROR, str(search_exc))
                    )
                    root_span.record_exception(search_exc)
                    root_span.set_attribute("error.type", type(search_exc).__name__)
                    root_span.set_attribute("error.message", str(search_exc))
                    raise

            # ── Step 3: Generate answer ───────────────────────────────────
            answer, answer_cost = llm_answer(question, search_results, session_id)
            total_cost += answer_cost

            # ── Step 4: Record final attributes ──────────────────────────
            if not healed:
                root_span.set_attribute("agent.healed", False)
                root_span.set_attribute("agent.strategy", strategy)

            root_span.set_attribute("session.total_cost_usd", round(total_cost, 8))

            with tracer.start_as_current_span("agent.finish") as finish_span:
                finish_span.set_attribute("agent.success", True)
                finish_span.set_attribute("agent.healed", healed)
                finish_span.set_attribute("agent.strategy", strategy)
                finish_span.set_attribute("response.length", len(answer))
                finish_span.set_attribute("response.words", len(answer.split()))
                finished_at  = time.time()
                duration_ms  = int((finished_at - started_at) * 1000)
                finish_span.set_attribute("execution.time_ms", duration_ms)
                finish_span.set_attribute("session.total_cost_usd", round(total_cost, 8))

                # ── Persist finish span ──────────────────────────────────
                finish_span_id  = _span_id_hex(finish_span)
                root_span_id    = _span_id_hex(root_span)
                trace_id        = _trace_id_hex(root_span)
                finish_span_start = finished_at - 0.05  # approximate

                store.save_span(
                    span_id        = finish_span_id,
                    trace_id       = trace_id,
                    parent_span_id = root_span_id,
                    name           = "agent.finish",
                    start_time     = finish_span_start,
                    end_time       = finished_at,
                    duration_ms    = int((finished_at - finish_span_start) * 1000),
                    status         = "success",
                    attributes     = {
                        "agent.success":         True,
                        "agent.healed":          healed,
                        "agent.strategy":        strategy,
                        "response.length":       len(answer),
                        "execution.time_ms":     duration_ms,
                        "session.total_cost_usd": round(total_cost, 8),
                    },
                )

            # ── Extract trace ID ──────────────────────────────────────────
            trace_id = _trace_id_hex(root_span)

            # ── Persist root span ─────────────────────────────────────────
            store.save_span(
                span_id        = _span_id_hex(root_span),
                trace_id       = trace_id,
                parent_span_id = "",
                name           = "agent.run",
                start_time     = started_at,
                end_time       = finished_at,
                duration_ms    = duration_ms,
                status         = "success",
                attributes     = {
                    "session.id":             session_id,
                    "request.id":             request_id,
                    "agent.strategy":         strategy,
                    "agent.healed":           healed,
                    "session.total_cost_usd": round(total_cost, 8),
                },
            )

            # ── Persist trace summary ─────────────────────────────────────
            store.save_trace(
                trace_id       = trace_id,
                session_id     = session_id,
                request_id     = request_id,
                question       = question,
                answer         = answer,
                status         = "success",
                strategy       = strategy,
                healed         = healed,
                total_cost_usd = round(total_cost, 8),
                duration_ms    = duration_ms,
            )

            return {
                "answer":     answer,
                "trace_id":   trace_id,
                "session_id": session_id,
                "cost_usd":   round(total_cost, 8),
                "strategy":   strategy,
            }

        except Exception as exc:
            root_span.set_status(trace.Status(trace.StatusCode.ERROR, str(exc)))
            root_span.record_exception(exc)
            root_span.set_attribute("error.type", type(exc).__name__)
            root_span.set_attribute("error.message", str(exc))
            root_span.set_attribute("error.stacktrace", traceback.format_exc())

            finished_at = time.time()
            duration_ms = int((finished_at - started_at) * 1000)
            trace_id    = _trace_id_hex(root_span)

            with tracer.start_as_current_span("agent.finish") as finish_span:
                finish_span.set_attribute("agent.success", False)
                finish_span.set_attribute("agent.healed", healed)
                finish_span.set_attribute("agent.strategy", strategy)
                finish_span.set_attribute("execution.time_ms", duration_ms)

            # Persist the failed trace
            store.save_trace(
                trace_id       = trace_id,
                session_id     = session_id,
                request_id     = request_id,
                question       = question,
                answer         = "",
                status         = "error",
                strategy       = strategy,
                healed         = healed,
                total_cost_usd = round(total_cost, 8),
                duration_ms    = duration_ms,
            )

            raise


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python agent.py <question>")
        sys.exit(1)

    user_question = " ".join(sys.argv[1:])
    print(f"Ask:\n{user_question}")

    try:
        result = run_agent(user_question)
        print(f"\nAnswer:\n{result['answer']}")
        print(f"\nTrace ID: {result['trace_id']}")
        print(f"Strategy: {result['strategy']}")
        print(f"Cost:     ${result['cost_usd']:.8f}")
    except Exception as ex:
        print(f"\nFailed to answer: {ex}")
