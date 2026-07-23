"""
signoz_client.py — SigNoz observability helpers.

This module is retained only for SRE Sidekick features that query
real-time error rates from SigNoz. It is NOT used for dashboard APIs
(traces, spans, costs) — those are served from Supabase via store.py.
"""

import requests
import time

if __package__:
    from .config import SIGNOZ_API_URL, SIGNOZ_API_KEY
else:
    from config import SIGNOZ_API_URL, SIGNOZ_API_KEY


def _headers() -> dict:
    """Build auth headers for SigNoz API."""
    h = {"Content-Type": "application/json"}
    if SIGNOZ_API_KEY:
        h["SIGNOZ-API-KEY"] = SIGNOZ_API_KEY
    return h


def get_error_rate(service_name: str = "agentpulse", window_minutes: int = 5) -> float:
    """
    Calculate error rate for the service over the given time window.

    Used by the SRE Sidekick feature. Returns 0.0 on failure.

    Args:
        service_name:    OTel service.name to filter on.
        window_minutes:  Look-back window in minutes.

    Returns:
        Float between 0.0 and 1.0.
    """
    try:
        end   = int(time.time() * 1e9)
        start = end - int(window_minutes * 60 * 1e9)

        total_payload = _build_count_query(service_name, start, end, error_only=False)
        error_payload = _build_count_query(service_name, start, end, error_only=True)

        total_resp = requests.post(
            f"{SIGNOZ_API_URL}/api/v3/query_range",
            json=total_payload,
            headers=_headers(),
            timeout=10,
        )
        total_resp.raise_for_status()

        error_resp = requests.post(
            f"{SIGNOZ_API_URL}/api/v3/query_range",
            json=error_payload,
            headers=_headers(),
            timeout=10,
        )
        error_resp.raise_for_status()

        total_count = _extract_count(total_resp.json())
        error_count = _extract_count(error_resp.json())

        return 0.0 if total_count == 0 else round(error_count / total_count, 4)

    except Exception as exc:
        print(f"[signoz_client] Failed to get error rate: {exc}")
        return 0.0


def _build_count_query(service_name: str, start: int, end: int, error_only: bool) -> dict:
    """Build a SigNoz span-count query payload."""
    filters: dict = {
        "items": [
            {
                "key": {
                    "key": "serviceName",
                    "dataType": "string",
                    "type": "resource",
                    "isColumn": True,
                },
                "op": "=",
                "value": service_name,
            }
        ],
        "op": "AND",
    }

    if error_only:
        filters["items"].append({
            "key": {
                "key": "hasError",
                "dataType": "bool",
                "type": "tag",
                "isColumn": True,
            },
            "op": "=",
            "value": True,
        })

    return {
        "start": start,
        "end": end,
        "step": 300,
        "compositeQuery": {
            "queryType": "builder",
            "panelType": "value",
            "builderQueries": {
                "A": {
                    "dataSource": "traces",
                    "queryName": "A",
                    "aggregateOperator": "count",
                    "aggregateAttribute": {
                        "key": "",
                        "dataType": "",
                        "type": "",
                        "isColumn": False,
                    },
                    "filters": filters,
                    "limit": 0,
                    "offset": 0,
                }
            },
        },
    }


def _extract_count(response_data: dict) -> int:
    """Extract a count value from a SigNoz query response."""
    try:
        result = response_data.get("result", [])
        if result:
            series = result[0].get("series", [])
            if series:
                values = series[0].get("values", [])
                if values:
                    return int(values[-1].get("value", 0))
        return 0
    except (KeyError, IndexError, ValueError):
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
