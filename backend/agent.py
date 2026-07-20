"""Research-agent workflow with OpenTelemetry spans."""

import logging
import os
import uuid
from typing import Any

from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

if __package__:
    from .cost import calculate_cost
    from .instrumentation import get_tracer
else:  # pragma: no cover - supports execution from backend/
    from cost import calculate_cost
    from instrumentation import get_tracer


LOGGER = logging.getLogger(__name__)
DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile"


def web_search(query: str) -> str:
    """Return deterministic placeholder search results for the hackathon demo."""
    return f"Search results for {query}"


def _estimate_tokens(text: str) -> int:
    """Provide a conservative token estimate for local mock responses."""
    return max(1, (len(text) + 3) // 4)


def _generate_answer(question: str, search_results: str, session_id: str) -> dict[str, Any]:
    """Generate an answer through Groq and annotate its LLM span."""
    tracer = get_tracer()
    with tracer.start_as_current_span("llm.answer") as span:
        span.set_attribute("session_id", session_id)
        prompt = (
            "Answer the user's research question concisely using the supplied "
            f"search context.\nQuestion: {question}\nContext: {search_results}"
        )
        api_key = os.getenv("GROQ_API_KEY", "")
        model = os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL)

        try:
            if not api_key:
                raise RuntimeError("GROQ_API_KEY is not configured")

            from groq import Groq

            response = Groq(api_key=api_key).chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a helpful research assistant."},
                    {"role": "user", "content": prompt},
                ],
            )
            answer = response.choices[0].message.content or "I could not generate an answer."
            usage = response.usage
            prompt_tokens = usage.prompt_tokens if usage else _estimate_tokens(prompt)
            completion_tokens = usage.completion_tokens if usage else _estimate_tokens(answer)
        except Exception as exc:
            LOGGER.exception("Groq answer generation failed")
            span.record_exception(exc)
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            raise

        total_tokens = prompt_tokens + completion_tokens
        cost_usd = calculate_cost(prompt_tokens, completion_tokens, model)
        span.set_attribute("llm.model", model)
        span.set_attribute("llm.provider", "groq")
        span.set_attribute("llm.prompt_tokens", prompt_tokens)
        span.set_attribute("llm.completion_tokens", completion_tokens)
        span.set_attribute("llm.total_tokens", total_tokens)
        span.set_attribute("llm.cost_usd", cost_usd)
        return {"answer": answer, "cost_usd": cost_usd}


def run_agent(question: str) -> dict[str, Any]:
    """Run the search-and-answer workflow and return frontend response fields."""
    if not question or not question.strip():
        raise ValueError("question must not be empty")

    session_id = str(uuid.uuid4())
    tracer = get_tracer()
    with tracer.start_as_current_span("agent.run") as span:
        span.set_attribute("session_id", session_id)
        span.set_attribute("agent.strategy", "web_search")
        span.set_attribute("question", question)

        with tracer.start_as_current_span("tool.search") as search_span:
            search_span.set_attribute("tool.name", "web_search")
            search_span.set_attribute("query", question)
            try:
                search_results = web_search(question)
                search_span.set_attribute("status", "success")
            except Exception as exc:
                search_span.record_exception(exc)
                search_span.set_status(Status(StatusCode.ERROR, str(exc)))
                search_span.set_attribute("status", "error")
                raise

        llm_result = _generate_answer(question, search_results, session_id)
        trace_id = format(trace.get_current_span().get_span_context().trace_id, "032x")
        span.set_attribute("llm.cost_usd", llm_result["cost_usd"])
        return {
            "answer": llm_result["answer"],
            "trace_id": trace_id,
            "session_id": session_id,
            "cost_usd": llm_result["cost_usd"],
            "strategy": "web_search",
        }
