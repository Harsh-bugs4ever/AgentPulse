"""
signoz_client.py — Queries SigNoz HTTP API for traces, costs, and error rates.
"""

import requests
import time
from config import SIGNOZ_API_URL, SIGNOZ_API_KEY


def _headers():
    """Build auth headers for SigNoz API."""
    h = {"Content-Type": "application/json"}
    if SIGNOZ_API_KEY:
        h["SIGNOZ-API-KEY"] = SIGNOZ_API_KEY
    return h


def get_traces(service_name: str = "agentpulse", limit: int = 20):
    """
    Fetch recent traces from SigNoz.
    Returns a list of trace summaries.
    """
    try:
        end = int(time.time() * 1e9)  # now in nanoseconds
        start = end - (60 * 60 * 1e9)  # last 1 hour

        # SigNoz v3 query API
        payload = {
            "start": int(start),
            "end": int(end),
            "step": 60,
            "compositeQuery": {
                "queryType": "builder",
                "panelType": "list",
                "builderQueries": {
                    "A": {
                        "dataSource": "traces",
                        "queryName": "A",
                        "aggregateOperator": "noop",
                        "aggregateAttribute": {
                            "key": "",
                            "dataType": "",
                            "type": "",
                            "isColumn": False,
                        },
                        "filters": {
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
                        },
                        "orderBy": [{"columnName": "timestamp", "order": "desc"}],
                        "limit": limit,
                        "offset": 0,
                    }
                },
            },
        }

        resp = requests.post(
            f"{SIGNOZ_API_URL}/api/v3/query_range",
            json=payload,
            headers=_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

        # Parse the response
        traces = []
        result = data.get("result", [])
        if result and len(result) > 0:
            series = result[0].get("list", [])
            for item in series:
                trace_data = item.get("data", {})
                traces.append({
                    "traceID": trace_data.get("traceID", ""),
                    "spanID": trace_data.get("spanID", ""),
                    "operationName": trace_data.get("name", ""),
                    "serviceName": trace_data.get("serviceName", service_name),
                    "duration": trace_data.get("durationNano", 0) / 1e6,  # ms
                    "timestamp": trace_data.get("timestamp", ""),
                    "statusCode": trace_data.get("statusCode", 0),
                    "hasError": trace_data.get("hasError", False),
                })

        return traces

    except Exception as e:
        print(f"[signoz_client] Failed to fetch traces: {e}")
        return []


def get_error_rate(service_name: str = "agentpulse", window_minutes: int = 5) -> float:
    """
    Calculate error rate for the service over the given time window.
    Returns a float between 0.0 and 1.0.
    """
    try:
        end = int(time.time() * 1e9)
        start = end - int(window_minutes * 60 * 1e9)

        # Query for total spans
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

        if total_count == 0:
            return 0.0

        return round(error_count / total_count, 4)

    except Exception as e:
        print(f"[signoz_client] Failed to get error rate: {e}")
        return 0.0


def get_cost_by_session(service_name: str = "agentpulse"):
    """
    Aggregate llm.cost_usd by llm.session_id from SigNoz span attributes.
    Returns a dict of {session_id: total_cost}.
    """
    try:
        end = int(time.time() * 1e9)
        start = end - int(24 * 60 * 60 * 1e9)  # last 24h

        payload = {
            "start": int(start),
            "end": int(end),
            "step": 3600,
            "compositeQuery": {
                "queryType": "builder",
                "panelType": "table",
                "builderQueries": {
                    "A": {
                        "dataSource": "traces",
                        "queryName": "A",
                        "aggregateOperator": "sum",
                        "aggregateAttribute": {
                            "key": "llm.cost_usd",
                            "dataType": "float64",
                            "type": "tag",
                            "isColumn": False,
                        },
                        "filters": {
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
                        },
                        "groupBy": [
                            {
                                "key": "llm.session_id",
                                "dataType": "string",
                                "type": "tag",
                                "isColumn": False,
                            }
                        ],
                        "orderBy": [{"columnName": "sum(llm.cost_usd)", "order": "desc"}],
                        "limit": 50,
                        "offset": 0,
                    }
                },
            },
        }

        resp = requests.post(
            f"{SIGNOZ_API_URL}/api/v3/query_range",
            json=payload,
            headers=_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

        costs = {}
        result = data.get("result", [])
        if result and len(result) > 0:
            rows = result[0].get("table", {}).get("rows", [])
            for row in rows:
                session_id = row.get("data", {}).get("llm.session_id", "unknown")
                cost = row.get("data", {}).get("sum(llm.cost_usd)", 0)
                costs[session_id] = round(float(cost), 8)

        return costs

    except Exception as e:
        print(f"[signoz_client] Failed to get costs: {e}")
        return {}


def _build_count_query(service_name: str, start: int, end: int, error_only: bool):
    """Build a SigNoz count query payload."""
    filters = {
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
    """Extract a count value from SigNoz query response."""
    try:
        result = response_data.get("result", [])
        if result and len(result) > 0:
            series = result[0].get("series", [])
            if series and len(series) > 0:
                values = series[0].get("values", [])
                if values and len(values) > 0:
                    return int(values[-1].get("value", 0))
        return 0
    except (KeyError, IndexError, ValueError):
        return 0
