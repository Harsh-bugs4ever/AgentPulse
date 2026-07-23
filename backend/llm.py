"""
llm.py — Groq LLM calls for query extraction and answer generation.

Each public function returns a (result, cost_usd) tuple so callers can
accumulate session-level cost without re-querying span attributes.

After every LLM call, cost and span metadata is persisted to Supabase
via store.py so the Cost Watchdog dashboard works without SigNoz APIs.
"""

import time
import traceback
import uuid

from groq import Groq
from opentelemetry import trace
from instrumentation import get_tracer
from config import GROQ_API_KEY, GROQ_MODEL
from cost import calculate_cost
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


def llm_answer(question: str, context: str, session_id: str) -> tuple[str, float]:
    """
    Generate an answer using Groq LLM based on the search context.

    Args:
        question:   The user's original question.
        context:    Search results to use as grounding.
        session_id: Unique ID for the current agent session.

    Returns:
        (answer, cost_usd) — the generated answer and its USD cost.
    """
    tracer     = get_tracer()
    start_time = time.time()

    with tracer.start_as_current_span("llm.answer") as span:
        span.set_attribute("llm.provider", "Groq")
        span.set_attribute("llm.model", GROQ_MODEL)
        span.set_attribute("llm.session_id", session_id)
        temperature = 0.0
        span.set_attribute("llm.temperature", temperature)

        try:
            client = Groq(api_key=GROQ_API_KEY)

            prompt = (
                "Answer the user's question using ONLY the provided context.\n\n"
                f"Context: {context}\n\nQuestion: {question}"
            )

            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": "You are a helpful research assistant."},
                    {"role": "user", "content": prompt},
                ],
                temperature=temperature,
            )

            answer = response.choices[0].message.content

            usage             = response.usage
            prompt_tokens     = usage.prompt_tokens if usage else 0
            completion_tokens = usage.completion_tokens if usage else 0
            total_tokens      = usage.total_tokens if usage else 0

            span.set_attribute("llm.prompt_tokens", prompt_tokens)
            span.set_attribute("llm.completion_tokens", completion_tokens)
            span.set_attribute("llm.total_tokens", total_tokens)

            cost = calculate_cost(prompt_tokens, completion_tokens, GROQ_MODEL)
            span.set_attribute("llm.cost_usd", cost)

            end_time   = time.time()
            latency_ms = int((end_time - start_time) * 1000)
            span.set_attribute("llm.latency_ms", latency_ms)

            trace_id = _trace_id_hex(span)
            span_id  = _span_id_hex(span)

            # Persist span
            store.save_span(
                span_id        = span_id,
                trace_id       = trace_id,
                parent_span_id = "",   # agent.py will set root span as parent
                name           = "llm.answer",
                start_time     = start_time,
                end_time       = end_time,
                duration_ms    = latency_ms,
                status         = "success",
                attributes     = {
                    "llm.provider":           "Groq",
                    "llm.model":              GROQ_MODEL,
                    "llm.session_id":         session_id,
                    "llm.prompt_tokens":      prompt_tokens,
                    "llm.completion_tokens":  completion_tokens,
                    "llm.total_tokens":       total_tokens,
                    "llm.cost_usd":           cost,
                    "llm.latency_ms":         latency_ms,
                },
            )

            # Persist cost
            store.save_cost(
                trace_id          = trace_id,
                session_id        = session_id,
                model             = GROQ_MODEL,
                prompt_tokens     = prompt_tokens,
                completion_tokens = completion_tokens,
                total_tokens      = total_tokens,
                cost_usd          = cost,
            )

            return answer, cost

        except Exception as exc:
            end_time   = time.time()
            latency_ms = int((end_time - start_time) * 1000)

            span.set_status(trace.Status(trace.StatusCode.ERROR, str(exc)))
            span.record_exception(exc)
            span.set_attribute("error.type", type(exc).__name__)
            span.set_attribute("error.message", str(exc))
            span.set_attribute("error.stacktrace", traceback.format_exc())

            store.save_span(
                span_id        = _span_id_hex(span),
                trace_id       = _trace_id_hex(span),
                parent_span_id = "",
                name           = "llm.answer",
                start_time     = start_time,
                end_time       = end_time,
                duration_ms    = latency_ms,
                status         = "error",
                attributes     = {
                    "error.type":    type(exc).__name__,
                    "error.message": str(exc),
                },
            )
            raise


def extract_query(question: str, session_id: str) -> tuple[str, float]:
    """
    Extract a Wikipedia search query from the user's question using Groq LLM.

    Args:
        question:   The user's original question.
        session_id: Unique ID for the current agent session.

    Returns:
        (query, cost_usd) — the extracted search query and its USD cost.
    """
    tracer     = get_tracer()
    start_time = time.time()

    with tracer.start_as_current_span("llm.extract_query") as span:
        span.set_attribute("llm.provider", "Groq")
        span.set_attribute("llm.model", GROQ_MODEL)
        span.set_attribute("llm.session_id", session_id)
        temperature = 0.0
        span.set_attribute("llm.temperature", temperature)

        try:
            client = Groq(api_key=GROQ_API_KEY)

            prompt = (
                "Extract the core subject or entity from the following question to use "
                "as a Wikipedia search query. Return ONLY the search query, nothing else.\n\n"
                f"Question: {question}"
            )

            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": "You are a helpful research assistant."},
                    {"role": "user", "content": prompt},
                ],
                temperature=temperature,
            )

            query = response.choices[0].message.content.strip()
            span.set_attribute("search.extracted_query", query)

            usage             = response.usage
            prompt_tokens     = usage.prompt_tokens if usage else 0
            completion_tokens = usage.completion_tokens if usage else 0
            total_tokens      = usage.total_tokens if usage else 0

            span.set_attribute("llm.prompt_tokens", prompt_tokens)
            span.set_attribute("llm.completion_tokens", completion_tokens)
            span.set_attribute("llm.total_tokens", total_tokens)

            cost = calculate_cost(prompt_tokens, completion_tokens, GROQ_MODEL)
            span.set_attribute("llm.cost_usd", cost)

            end_time   = time.time()
            latency_ms = int((end_time - start_time) * 1000)
            span.set_attribute("llm.latency_ms", latency_ms)

            trace_id = _trace_id_hex(span)
            span_id  = _span_id_hex(span)

            # Persist span
            store.save_span(
                span_id        = span_id,
                trace_id       = trace_id,
                parent_span_id = "",
                name           = "llm.extract_query",
                start_time     = start_time,
                end_time       = end_time,
                duration_ms    = latency_ms,
                status         = "success",
                attributes     = {
                    "llm.provider":           "Groq",
                    "llm.model":              GROQ_MODEL,
                    "llm.session_id":         session_id,
                    "search.extracted_query": query,
                    "llm.prompt_tokens":      prompt_tokens,
                    "llm.completion_tokens":  completion_tokens,
                    "llm.total_tokens":       total_tokens,
                    "llm.cost_usd":           cost,
                    "llm.latency_ms":         latency_ms,
                },
            )

            # Persist cost
            store.save_cost(
                trace_id          = trace_id,
                session_id        = session_id,
                model             = GROQ_MODEL,
                prompt_tokens     = prompt_tokens,
                completion_tokens = completion_tokens,
                total_tokens      = total_tokens,
                cost_usd          = cost,
            )

            return query, cost

        except Exception as exc:
            end_time   = time.time()
            latency_ms = int((end_time - start_time) * 1000)

            span.set_status(trace.Status(trace.StatusCode.ERROR, str(exc)))
            span.record_exception(exc)
            span.set_attribute("error.type", type(exc).__name__)
            span.set_attribute("error.message", str(exc))
            span.set_attribute("error.stacktrace", traceback.format_exc())

            store.save_span(
                span_id        = _span_id_hex(span),
                trace_id       = _trace_id_hex(span),
                parent_span_id = "",
                name           = "llm.extract_query",
                start_time     = start_time,
                end_time       = end_time,
                duration_ms    = latency_ms,
                status         = "error",
                attributes     = {
                    "error.type":    type(exc).__name__,
                    "error.message": str(exc),
                },
            )
            raise
