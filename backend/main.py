"""FastAPI entry point for the AgentPulse research workflow."""

import logging

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

if __package__:
    from .agent import run_agent
    from .instrumentation import setup_telemetry
else:  # pragma: no cover - supports execution from backend/
    from agent import run_agent
    from instrumentation import setup_telemetry


logging.basicConfig(level=logging.INFO)
LOGGER = logging.getLogger(__name__)

app = FastAPI(title="AgentPulse API")
setup_telemetry(app)


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=10_000)


class AskResponse(BaseModel):
    answer: str
    trace_id: str
    session_id: str
    cost_usd: float
    strategy: str


@app.get("/")
def health_check() -> dict[str, str]:
    return {"status": "running"}


@app.post("/ask", response_model=AskResponse)
def ask(request: AskRequest) -> AskResponse:
    """Answer a research question and return its trace metadata."""
    try:
        return AskResponse(**run_agent(request.question.strip()))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        LOGGER.exception("Unhandled error while processing /ask")
        raise HTTPException(status_code=500, detail="Unable to process the question") from exc
