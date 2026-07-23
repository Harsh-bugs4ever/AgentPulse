"""
store.py — Supabase-backed application store for AgentPulse.

Provides the source of truth for all dashboard APIs:
  - /traces       → get_traces()
  - /traces/{id}  → get_spans()
  - /costs        → get_cost_summary()

SigNoz continues to receive full OpenTelemetry telemetry for visualization.
This store handles only application-level metadata queries.

All write operations are wrapped in try/except so that a Supabase failure
never interrupts the agent execution or the OTel export pipeline.
"""

import json
import logging
from typing import Any
from datetime import datetime, timezone

from supabase import create_client, Client

if __package__:
    from .config import SUPABASE_URL, SUPABASE_SECRET_KEY
else:
    from config import SUPABASE_URL, SUPABASE_SECRET_KEY

LOGGER = logging.getLogger(__name__)

# ── Client ──────────────────────────────────────────────────────────────────

_client: Client | None = None


def _get_client() -> Client | None:
    """Return the Supabase client, or None if credentials are missing."""
    global _client
    if _client is not None:
        return _client
    if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
        LOGGER.warning("[store] SUPABASE_URL or SUPABASE_SECRET_KEY not set — store is disabled.")
        return None
    try:
        _client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
        LOGGER.info("[store] Supabase client connected.")
    except Exception as exc:
        LOGGER.error("[store] Failed to create Supabase client: %s", exc)
        _client = None
    return _client


def _ensure_trace_exists(client: Client, trace_id: str | None, session_id: str = "") -> None:
    """Ensure parent trace exists in 'traces' table to prevent Foreign Key violations."""
    if not trace_id:
        return
    try:
        res = client.table("traces").select("trace_id").eq("trace_id", trace_id).limit(1).execute()
        if not res.data:
            client.table("traces").insert({
                "trace_id":   trace_id,
                "session_id": session_id,
                "question":   "Processing...",
                "status":     "running",
            }).execute()
    except Exception as exc:
        LOGGER.warning("[store] _ensure_trace_exists failed for %s: %s", trace_id, exc)


# ── Writers ─────────────────────────────────────────────────────────────────

def save_trace(
    *,
    trace_id: str,
    session_id: str,
    request_id: str,
    question: str,
    answer: str = "",
    status: str,
    strategy: str,
    healed: bool,
    total_cost_usd: float,
    duration_ms: int,
) -> None:
    """Upsert a trace record into Supabase."""
    client = _get_client()
    if client is None:
        return
    try:
        client.table("traces").upsert({
            "trace_id":       trace_id,
            "session_id":     session_id,
            "request_id":     request_id,
            "question":       question,
            "answer":         answer,
            "status":         status,
            "strategy":       strategy,
            "healed":         healed,
            "total_cost_usd": round(total_cost_usd, 8),
            "duration_ms":    duration_ms,
        }).execute()
    except Exception as exc:
        LOGGER.error("[store] save_trace failed: %s", exc)


def save_span(
    *,
    span_id: str,
    trace_id: str,
    parent_span_id: str = "",
    name: str,
    start_time: float,
    end_time: float,
    duration_ms: int,
    status: str,
    attributes: dict[str, Any] | None = None,
) -> None:
    """Upsert a span record into Supabase."""
    client = _get_client()
    if client is None:
        return
    clean_trace_id = trace_id if trace_id else None
    if clean_trace_id:
        _ensure_trace_exists(client, clean_trace_id)
    try:
        client.table("spans").upsert({
            "span_id":        span_id,
            "trace_id":       clean_trace_id,
            "parent_span_id": parent_span_id or None,
            "name":           name,
            "start_time":     start_time,
            "end_time":       end_time,
            "duration_ms":    duration_ms,
            "status":         status,
            "attributes":     attributes or {},
        }).execute()
    except Exception as exc:
        LOGGER.error("[store] save_span failed: %s", exc)


def save_cost(
    *,
    trace_id: str,
    session_id: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    total_tokens: int,
    cost_usd: float,
) -> None:
    """Append a cost record for one LLM call into Supabase."""
    client = _get_client()
    if client is None:
        return
    clean_trace_id = trace_id if trace_id else None
    if clean_trace_id:
        _ensure_trace_exists(client, clean_trace_id, session_id)
    try:
        client.table("costs").insert({
            "trace_id":          clean_trace_id,
            "session_id":        session_id,
            "model":             model,
            "prompt_tokens":     prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens":      total_tokens,
            "cost_usd":          round(cost_usd, 8),
        }).execute()
    except Exception as exc:
        LOGGER.error("[store] save_cost failed: %s", exc)


# ── Readers ─────────────────────────────────────────────────────────────────

def get_traces(limit: int = 20) -> list[dict]:
    """Return recent traces ordered newest-first from Supabase."""
    client = _get_client()
    if client is None:
        return []
    try:
        resp = (
            client.table("traces")
            .select("trace_id, session_id, question, status, strategy, healed, total_cost_usd, duration_ms, created_at")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        rows = resp.data or []
        result = []
        for row in rows:
            result.append({
                "traceID":        row["trace_id"],
                "sessionID":      row.get("session_id", ""),
                "question":       row.get("question", ""),
                "status":         row.get("status", "success"),
                "strategy":       row.get("strategy", ""),
                "healed":         bool(row.get("healed", False)),
                "total_cost_usd": row.get("total_cost_usd", 0.0),
                "duration_ms":    row.get("duration_ms", 0),
                "timestamp":      row.get("created_at", ""),
                "hasError":       row.get("status") == "error",
            })
        return result
    except Exception as exc:
        LOGGER.error("[store] get_traces failed: %s", exc)
        return []


def get_spans(trace_id: str) -> list[dict]:
    """Return all spans for a trace ordered by start time from Supabase."""
    client = _get_client()
    if client is None:
        return []
    try:
        resp = (
            client.table("spans")
            .select("span_id, trace_id, parent_span_id, name, start_time, end_time, duration_ms, status, attributes")
            .eq("trace_id", trace_id)
            .order("start_time")
            .execute()
        )
        rows = resp.data or []
        result = []
        for row in rows:
            attrs = row.get("attributes") or {}
            if isinstance(attrs, str):
                try:
                    attrs = json.loads(attrs)
                except (json.JSONDecodeError, TypeError):
                    attrs = {}
            result.append({
                "spanID":        row["span_id"],
                "parentSpanID":  row.get("parent_span_id", ""),
                "operationName": row["name"],
                "duration":      row.get("duration_ms", 0),
                "hasError":      row.get("status") == "error",
                "tags":          attrs,
            })
        return result
    except Exception as exc:
        LOGGER.error("[store] get_spans failed: %s", exc)
        return []


def get_cost_summary() -> dict:
    """
    Compute cost summary by reading trace execution totals from Supabase.
    Ensures 100% mathematical consistency between Traces and Cost Watchdog.

    Returns:
        dict with total_cost, today_cost, request_count, average_cost, per_session, series
    """
    client = _get_client()
    if client is None:
        return {"total_cost": 0, "today_cost": 0, "request_count": 0, "average_cost": 0, "per_session": {}, "series": []}
    try:
        # Fetch trace execution records from traces table
        traces_resp = (
            client.table("traces")
            .select("trace_id, session_id, question, total_cost_usd, status, created_at")
            .order("created_at", desc=False)
            .execute()
        )
        trace_rows = traces_resp.data or []

        # Filter out empty or uncosted running stubs if any
        completed_rows = [
            r for r in trace_rows
            if r.get("total_cost_usd") is not None and r.get("status") != "running"
        ]

        # Fallback to costs table if no completed traces exist yet
        if not completed_rows:
            costs_resp = client.table("costs").select("cost_usd, session_id, created_at").execute()
            completed_rows = [
                {
                    "trace_id": "",
                    "session_id": r.get("session_id", "unknown"),
                    "question": "LLM Call",
                    "total_cost_usd": r.get("cost_usd", 0),
                    "created_at": r.get("created_at", ""),
                }
                for r in (costs_resp.data or [])
            ]

        total   = sum(float(r.get("total_cost_usd", 0)) for r in completed_rows)
        count   = len(completed_rows)
        average = round(total / count, 8) if count > 0 else 0.0

        # Today's spend (UTC date match)
        today_prefix = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        today_rows = [r for r in completed_rows if (r.get("created_at") or "").startswith(today_prefix)]
        today = sum(float(r.get("total_cost_usd", 0)) for r in today_rows)

        # Per session total cost
        per_session: dict[str, float] = {}
        for r in completed_rows:
            sid = r.get("session_id") or r.get("trace_id") or "unknown"
            per_session[sid] = round(per_session.get(sid, 0.0) + float(r.get("total_cost_usd", 0)), 8)

        # Chronological series timeline matching traces 1-to-1
        series = [
            {
                "trace_id":   r.get("trace_id", ""),
                "session_id": r.get("session_id", "unknown"),
                "question":   r.get("question", ""),
                "cost_usd":   round(float(r.get("total_cost_usd", 0)), 8),
                "created_at": r.get("created_at", ""),
            }
            for r in completed_rows
        ]

        return {
            "total_cost":    round(total, 8),
            "today_cost":    round(today, 8),
            "request_count": count,
            "average_cost":  average,
            "per_session":   per_session,
            "series":        series,
        }
    except Exception as exc:
        LOGGER.error("[store] get_cost_summary failed: %s", exc)
        return {"total_cost": 0, "today_cost": 0, "request_count": 0, "average_cost": 0, "per_session": {}, "series": []}
