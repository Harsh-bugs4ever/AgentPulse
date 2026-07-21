"""Small, failure-tolerant client for SigNoz trace queries."""

from __future__ import annotations

import logging
import time
from typing import Any

import requests

if __package__:
    from .config import SIGNOZ_API_KEY, SIGNOZ_URL
else:  # pragma: no cover
    from config import SIGNOZ_API_KEY, SIGNOZ_URL

LOGGER = logging.getLogger(__name__)
TIMEOUT_SECONDS = 10
RETRIES = 3


def _headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if SIGNOZ_API_KEY:
        headers["SIGNOZ-API-KEY"] = SIGNOZ_API_KEY
    return headers


def _query(payload: dict[str, Any]) -> dict[str, Any]:
    """Execute a query with bounded retries; never leak network errors to FastAPI."""
    for attempt in range(RETRIES):
        try:
            response = requests.post(f"{SIGNOZ_URL}/api/v3/query_range", json=payload,
                                     headers=_headers(), timeout=TIMEOUT_SECONDS)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as exc:
            LOGGER.warning("SigNoz query failed (%s/%s): %s", attempt + 1, RETRIES, exc)
            if attempt + 1 < RETRIES:
                time.sleep(0.3 * (2 ** attempt))
    return {}


def _time_range(minutes: int) -> tuple[int, int]:
    end = time.time_ns()
    return end - minutes * 60 * 1_000_000_000, end


def _filters(service_name: str, error_only: bool = False) -> dict[str, Any]:
    items: list[dict[str, Any]] = [{"key": {"key": "serviceName", "dataType": "string", "type": "resource", "isColumn": True}, "op": "=", "value": service_name}]
    if error_only:
        items.append({"key": {"key": "hasError", "dataType": "bool", "type": "tag", "isColumn": True}, "op": "=", "value": True})
    return {"items": items, "op": "AND"}


def _builder(aggregate: str, start: int, end: int, service_name: str, *, error_only: bool = False, panel: str = "value", attribute: dict[str, Any] | None = None, group_by: list[dict[str, Any]] | None = None, limit: int = 100) -> dict[str, Any]:
    query: dict[str, Any] = {"dataSource": "traces", "queryName": "A", "aggregateOperator": aggregate,
        "aggregateAttribute": attribute or {"key": "", "dataType": "", "type": "", "isColumn": False},
        "filters": _filters(service_name, error_only), "limit": limit, "offset": 0}
    if group_by:
        query["groupBy"] = group_by
    return {"start": start, "end": end, "step": 60, "compositeQuery": {"queryType": "builder", "panelType": panel, "builderQueries": {"A": query}}}


def _count(data: dict[str, Any]) -> int:
    try:
        values = data["result"][0]["series"][0]["values"]
        return int(values[-1].get("value", 0)) if values else 0
    except (KeyError, IndexError, TypeError, ValueError):
        return 0


def get_error_rate(service_name: str = "agentpulse", window_minutes: int = 5) -> dict[str, Any]:
    start, end = _time_range(window_minutes)
    total = _count(_query(_builder("count", start, end, service_name)))
    errors = _count(_query(_builder("count", start, end, service_name, error_only=True)))
    return {"error_rate": round(errors / total, 4) if total else 0.0,
            "error_count": errors, "total_count": total, "window_minutes": window_minutes}


def get_recent_failed_traces(limit: int = 20, service_name: str = "agentpulse") -> dict[str, Any]:
    start, end = _time_range(60)
    data = _query(_builder("noop", start, end, service_name, error_only=True, panel="list", limit=limit))
    traces: list[dict[str, Any]] = []
    try:
        rows = data["result"][0].get("list", [])
        for item in rows:
            row = item.get("data", item)
            traces.append({"trace_id": row.get("traceID", ""), "span_id": row.get("spanID", ""),
                "operation_name": row.get("name", ""), "timestamp": row.get("timestamp", ""),
                "duration_ms": float(row.get("durationNano", 0)) / 1e6,
                "attributes": row.get("attributes", {}), "error": row.get("error", row.get("statusMessage", ""))})
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        LOGGER.warning("Unable to parse failed trace response: %s", exc)
    return {"traces": traces, "count": len(traces)}


def get_cost_per_session(service_name: str = "agentpulse") -> dict[str, Any]:
    start, end = _time_range(24 * 60)
    session_key = {"key": "session_id", "dataType": "string", "type": "tag", "isColumn": False}
    cost_key = {"key": "llm.cost_usd", "dataType": "float64", "type": "tag", "isColumn": False}
    data = _query(_builder("sum", start, end, service_name, panel="table", attribute=cost_key, group_by=[session_key]))
    count_data = _query(_builder("count", start, end, service_name, panel="table", group_by=[session_key]))
    request_counts: dict[str, int] = {}
    try:
        for row in count_data["result"][0].get("table", {}).get("rows", []):
            values = row.get("data", row)
            session_id = values.get("session_id", values.get("llm.session_id", "unknown"))
            request_counts[session_id] = int(values.get("count()", values.get("count", 0)) or 0)
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        LOGGER.warning("Unable to parse session request counts: %s", exc)
    sessions: list[dict[str, Any]] = []
    try:
        for row in data["result"][0].get("table", {}).get("rows", []):
            values = row.get("data", row)
            session_id = values.get("session_id", values.get("llm.session_id", "unknown"))
            cost = float(values.get("sum(llm.cost_usd)", 0) or 0)
            requests_count = request_counts.get(session_id, 0)
            sessions.append({"session_id": session_id, "requests": requests_count, "cost": round(cost, 8)})
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        LOGGER.warning("Unable to parse cost response: %s", exc)
    sessions.sort(key=lambda item: item["cost"], reverse=True)
    return {"total_cost_today": round(sum(item["cost"] for item in sessions), 8), "sessions": sessions}


# Retained for older callers; new code uses the structured method above.
def get_cost_by_session(service_name: str = "agentpulse") -> dict[str, float]:
    return {item["session_id"]: item["cost"] for item in get_cost_per_session(service_name)["sessions"]}
