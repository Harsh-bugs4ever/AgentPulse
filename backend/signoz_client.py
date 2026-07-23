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
