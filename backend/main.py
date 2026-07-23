"""FastAPI entry point for the AgentPulse research workflow."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

if __package__:
    from .agent import run_agent
    from .instrumentation import setup_telemetry
    from .healing import get_status, force_search_failure, reset_healing
    from .store import get_traces, get_spans, get_cost_summary, get_sidekick_data
    from .config import ALLOWED_ORIGINS
    from .sidekick import sidekick
else:
    from agent import run_agent
    from instrumentation import setup_telemetry
    from healing import get_status, force_search_failure, reset_healing
    from store import get_traces, get_spans, get_cost_summary, get_sidekick_data
    from config import ALLOWED_ORIGINS
    from sidekick import sidekick


logging.basicConfig(level=logging.INFO)
LOGGER = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(_: FastAPI):
    sidekick.start()
    try:
        yield
    finally:
        await sidekick.stop()


app = FastAPI(title="AgentPulse API", lifespan=lifespan)
setup_telemetry(app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ──────────────────────────────────────────────────

class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=10_000)


class AskResponse(BaseModel):
    answer: str
    trace_id: str
    session_id: str
    cost_usd: float
    strategy: str


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/")
def root() -> dict[str, str]:
    """Basic liveness probe."""
    return {"status": "running"}


@app.get("/health")
def health() -> dict:
    """
    Return the current agent healing status.

    Response:
        status   — "idle" | "degraded" | "healing" | "recovered"
        healed   — True once the Wikipedia fallback has activated
        failures — consecutive primary-search failure count
    """
    return get_status()


@app.post("/break")
def break_agent() -> dict[str, str]:
    """Force primary search failures (demo mode). Clears automatically after /reset."""
    force_search_failure(True)
    LOGGER.info("Demo mode: forced search failure enabled")
    return {"message": "Search failure mode enabled. Ask a question to trigger healing."}


@app.post("/reset")
def reset_agent() -> dict[str, str]:
    """Reset the agent to a healthy state and clear demo failure mode."""
    reset_healing()
    LOGGER.info("Agent reset to healthy state")
    return {"message": "Agent reset. Healing state cleared."}


@app.get("/traces")
def traces_list(limit: int = 20) -> dict:
    """
    Return recent traces from the local Supabase store.

    Query params:
        limit — max number of traces to return (default 20)
    """
    return {"traces": get_traces(limit=limit)}


@app.get("/traces/{trace_id}/spans")
def trace_spans(trace_id: str) -> dict:
    """Return all spans for a specific trace from the local Supabase store."""
    return {"spans": get_spans(trace_id)}


@app.get("/costs")
def costs_summary() -> dict:
    """Return LLM cost summary computed from the local Supabase store."""
    return get_cost_summary()


@app.get("/cost")
def cost_summary() -> dict:
    """Compatibility endpoint for the documented cost API."""
    return get_cost_summary()


@app.get("/sidekick")
def sidekick_summary(limit: int = 50) -> dict:
    """
    Return SRE Sidekick data: error-rate timeline, active investigations, health stats.
    All data is computed from the local Supabase store.
    """
    return get_sidekick_data(limit=limit)


@app.get("/investigation")
def investigation() -> dict:
    """Return the live SigNoz/Groq Sidekick investigation state."""
    return sidekick.state()


@app.post("/ask", response_model=AskResponse)
def ask(request: AskRequest) -> AskResponse:
    """
    Answer a research question and return its trace metadata.

    The agent may self-heal via Wikipedia fallback if primary search fails
    repeatedly. The response includes the strategy used and the trace ID
    for looking up spans in SigNoz.
    """
    try:
        result = run_agent(request.question.strip())
        return AskResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        LOGGER.exception("Unhandled error while processing /ask")
        raise HTTPException(status_code=500, detail="Unable to process the question") from exc
