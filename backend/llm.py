"""Groq calls used by the research agent."""

from __future__ import annotations

import logging
import time
from typing import Callable, TypeVar

from groq import Groq
from opentelemetry import trace

if __package__:
    from .config import GROQ_API_KEY, GROQ_MODEL
    from .cost import calculate_cost
    from .instrumentation import get_tracer
else:  # pragma: no cover
    from config import GROQ_API_KEY, GROQ_MODEL
    from cost import calculate_cost
    from instrumentation import get_tracer

LOGGER = logging.getLogger(__name__)
T = TypeVar("T")


def _with_retry(operation: Callable[[], T], attempts: int = 3) -> T:
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            return operation()
        except Exception as exc:
            last_error = exc
            LOGGER.warning("Groq request failed (attempt %s/%s): %s", attempt + 1, attempts, exc)
            if attempt + 1 < attempts:
                time.sleep(0.4 * (2 ** attempt))
    assert last_error is not None
    raise last_error


def _completion(messages: list[dict[str, str]]):
    client = Groq(api_key=GROQ_API_KEY, timeout=20.0, max_retries=0)
    return _with_retry(lambda: client.chat.completions.create(
        model=GROQ_MODEL, messages=messages, temperature=0.0
    ))


def _instrumented_completion(span_name: str, session_id: str, messages: list[dict[str, str]]) -> tuple[str, float]:
    tracer, started = get_tracer(), time.perf_counter()
    with tracer.start_as_current_span(span_name) as span:
        span.set_attributes({"llm.provider": "Groq", "llm.model": GROQ_MODEL,
                             "session_id": session_id, "llm.session_id": session_id,
                             "llm.temperature": 0.0})
        try:
            response = _completion(messages)
            usage = response.usage
            prompt_tokens = usage.prompt_tokens if usage else 0
            completion_tokens = usage.completion_tokens if usage else 0
            total_tokens = usage.total_tokens if usage else prompt_tokens + completion_tokens
            cost = calculate_cost(GROQ_MODEL, prompt_tokens, completion_tokens)
            span.set_attributes({"llm.prompt_tokens": prompt_tokens,
                                 "llm.completion_tokens": completion_tokens,
                                 "llm.total_tokens": total_tokens, "llm.cost_usd": cost,
                                 "llm.latency_ms": int((time.perf_counter() - started) * 1000)})
            return (response.choices[0].message.content or ""), cost
        except Exception as exc:
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(exc)))
            span.record_exception(exc)
            span.set_attribute("error.type", type(exc).__name__)
            raise


def llm_answer(question: str, context: str, session_id: str) -> tuple[str, float]:
    prompt = f"Answer the user's question using ONLY the provided context.\n\nContext: {context}\n\nQuestion: {question}"
    return _instrumented_completion("llm.answer", session_id, [
        {"role": "system", "content": "You are a helpful research assistant."},
        {"role": "user", "content": prompt},
    ])


def extract_query(question: str, session_id: str) -> str:
    prompt = "Extract the core subject or entity for a Wikipedia search. Return only the query.\n\nQuestion: " + question
    query, _ = _instrumented_completion("llm.extract_query", session_id, [
        {"role": "system", "content": "You are a helpful research assistant."},
        {"role": "user", "content": prompt},
    ])
    return query.strip()
