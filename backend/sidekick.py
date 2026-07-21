"""In-memory SRE Sidekick, triggered by SigNoz error-rate observations."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any, Literal

from groq import Groq
from opentelemetry import trace
from pydantic import BaseModel, Field, ValidationError

if __package__:
    from .config import ERROR_RATE_THRESHOLD, GROQ_API_KEY, SIDEKICK_INTERVAL
    from .instrumentation import get_tracer
    from .signoz_client import get_error_rate, get_recent_failed_traces
else:  # pragma: no cover
    from config import ERROR_RATE_THRESHOLD, GROQ_API_KEY, SIDEKICK_INTERVAL
    from instrumentation import get_tracer
    from signoz_client import get_error_rate, get_recent_failed_traces

LOGGER = logging.getLogger(__name__)


class Investigation(BaseModel):
    status: str = "completed"
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "MEDIUM"
    confidence: int = Field(default=0, ge=0, le=100)
    root_cause: str
    affected_component: str
    failure_pattern: str
    evidence: list[str]
    recommended_action: str
    timeline: list[str]
    summary: str
    estimated_impact: str = "Unknown"


class Sidekick:
    def __init__(self) -> None:
        self.latest: dict[str, Any] = {"status": "idle"}
        self._task: asyncio.Task[None] | None = None

    def state(self) -> dict[str, Any]:
        return self.latest.copy()

    def start(self) -> None:
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._loop(), name="agentpulse-sidekick")

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _loop(self) -> None:
        while True:
            try:
                await self.run_once()
            except Exception:  # defensive boundary: sidekick must never take down FastAPI
                LOGGER.exception("Sidekick loop failed")
            await asyncio.sleep(SIDEKICK_INTERVAL)

    async def run_once(self) -> None:
        tracer = get_tracer()
        started = time.perf_counter()
        with tracer.start_as_current_span("sidekick.loop") as loop_span:
            with tracer.start_as_current_span("sidekick.fetch_error_rate") as span:
                fetch_started = time.perf_counter()
                rate_data = await asyncio.to_thread(get_error_rate)
                error_rate = float(rate_data["error_rate"])
                span.set_attributes({"error_rate": error_rate, "duration_ms": int((time.perf_counter() - fetch_started) * 1000)})
            if error_rate <= ERROR_RATE_THRESHOLD:
                loop_span.set_attributes({"error_rate": error_rate, "investigation_status": "idle",
                    "duration_ms": int((time.perf_counter() - started) * 1000)})
                return
            self.latest = {"status": "running", "error_rate": error_rate}
            with tracer.start_as_current_span("sidekick.fetch_failed_traces") as span:
                fetch_started = time.perf_counter()
                failed = await asyncio.to_thread(get_recent_failed_traces)
                span.set_attributes({"failed_trace_count": failed["count"], "duration_ms": int((time.perf_counter() - fetch_started) * 1000)})
            with tracer.start_as_current_span("sidekick.groq_analysis") as span:
                analysis_started = time.perf_counter()
                investigation = await asyncio.to_thread(self._investigate, error_rate, failed["traces"])
                span.set_attributes({"error_rate": error_rate, "severity": investigation.severity,
                    "confidence": investigation.confidence, "failed_trace_count": failed["count"],
                    "investigation_status": "completed", "duration_ms": int((time.perf_counter() - analysis_started) * 1000)})
            self.latest = investigation.model_dump()
            loop_span.set_attributes({"error_rate": error_rate, "severity": investigation.severity,
                "confidence": investigation.confidence, "failed_trace_count": failed["count"],
                "investigation_status": "completed", "duration_ms": int((time.perf_counter() - started) * 1000)})

    def _investigate(self, error_rate: float, traces: list[dict[str, Any]]) -> Investigation:
        prompt = """You are an expert Site Reliability Engineer. Analyze this incident. Return ONLY a JSON object with: status ('completed'), severity (LOW|MEDIUM|HIGH|CRITICAL), confidence (0-100), root_cause, affected_component, failure_pattern, evidence (array), recommended_action, timeline (array of timestamped incident events), summary, estimated_impact. Do not invent certainty; cite the supplied trace evidence.\n\n""" + json.dumps({"current_error_rate": error_rate, "failed_traces": traces}, default=str)
        try:
            client = Groq(api_key=GROQ_API_KEY, timeout=25.0, max_retries=2)
            response = client.chat.completions.create(model="llama-3.3-70b-versatile", temperature=0,
                response_format={"type": "json_object"}, messages=[{"role": "system", "content": "Return valid JSON only."}, {"role": "user", "content": prompt}])
            return Investigation.model_validate_json(response.choices[0].message.content or "{}")
        except (Exception, ValidationError) as exc:
            LOGGER.exception("Sidekick Groq analysis failed")
            current_span = trace.get_current_span()
            current_span.record_exception(exc)
            current_span.set_status(trace.Status(trace.StatusCode.ERROR, str(exc)))
            return Investigation(confidence=0, severity="HIGH", root_cause="Investigation analysis unavailable",
                affected_component="Unknown", failure_pattern=f"Error rate {error_rate:.2%}",
                evidence=[f"{len(traces)} failed trace(s) observed", type(exc).__name__],
                recommended_action="Inspect failed traces in SigNoz and retry the investigation.",
                timeline=["Error rate threshold exceeded", "Failed traces collected", "Analysis fallback completed"],
                summary="SigNoz detected an elevated error rate, but the AI analysis request failed.", estimated_impact="Requests may fail until the underlying error is resolved.")


sidekick = Sidekick()
