"""Small, defensive SigNoz trace-query client used by the Sidekick."""

from __future__ import annotations

import logging
import time
from typing import Any

import requests

try:
    from .config import SIGNOZ_API_URL, SIGNOZ_API_KEY
except ImportError:  # direct execution from backend/
    from config import SIGNOZ_API_URL, SIGNOZ_API_KEY

LOGGER = logging.getLogger(__name__)


def _headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if SIGNOZ_API_KEY:
        headers["SIGNOZ-API-KEY"] = SIGNOZ_API_KEY
    return headers


def _range(minutes: int) -> tuple[int, int]:
    end = int(time.time() * 1e9)
    return end - minutes * 60 * int(1e9), end


def _payload(service_name: str, start: int, end: int, *, errors: bool = False, limit: int = 0) -> dict[str, Any]:
    filters: list[dict[str, Any]] = [{"key": {"key": "serviceName", "dataType": "string", "type": "resource", "isColumn": True}, "op": "=", "value": service_name}]
    if errors:
        filters.append({"key": {"key": "hasError", "dataType": "bool", "type": "tag", "isColumn": True}, "op": "=", "value": True})
    return {"start": start, "end": end, "step": 60, "compositeQuery": {"queryType": "builder", "panelType": "list" if limit else "value", "builderQueries": {"A": {"dataSource": "traces", "queryName": "A", "aggregateOperator": "count", "aggregateAttribute": {"key": "", "dataType": "", "type": "", "isColumn": False}, "filters": {"items": filters, "op": "AND"}, "limit": limit, "offset": 0}}}}


def _query(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        response = requests.post(f"{SIGNOZ_API_URL}/api/v3/query_range", json=payload, headers=_headers(), timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as exc:
        LOGGER.warning("SigNoz query unavailable: %s", exc)
        return {}


def _count(data: dict[str, Any]) -> int:
    try:
        values = data["result"][0].get("series", [])[0].get("values", [])
        return int(float(values[-1].get("value", 0))) if values else 0
    except (KeyError, IndexError, TypeError, ValueError):
        return 0


def get_error_rate(service_name: str = "agentpulse", window_minutes: int = 5) -> dict[str, Any]:
    start, end = _range(window_minutes)
    total = _count(_query(_payload(service_name, start, end)))
    errors = _count(_query(_payload(service_name, start, end, errors=True)))
    return {"error_rate": round(errors / total, 4) if total else 0.0, "error_count": errors, "total_count": total, "window_minutes": window_minutes}


def get_recent_failed_traces(limit: int = 20, service_name: str = "agentpulse") -> dict[str, Any]:
    start, end = _range(60)
    data = _query(_payload(service_name, start, end, errors=True, limit=limit))
    items = data.get("result", [{}])[0].get("list", []) if data else []
    traces = []
    for item in items:
        row = item.get("data", item)
        traces.append({"trace_id": row.get("traceID", ""), "span_id": row.get("spanID", ""), "operation_name": row.get("name", ""), "timestamp": row.get("timestamp", ""), "duration_ms": float(row.get("durationNano", 0) or 0) / 1e6, "attributes": row.get("attributes", {}), "error": row.get("error", row.get("statusMessage", ""))})
    return {"traces": traces, "count": len(traces)}
