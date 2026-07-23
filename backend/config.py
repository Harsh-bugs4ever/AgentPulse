"""
config.py — All environment variables in one place.
"""

import os
from dotenv import load_dotenv

load_dotenv(override=True)

# ── Groq ──
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_PLANNER_MODEL = os.getenv("GROQ_PLANNER_MODEL", "llama-3.1-8b-instant")

# ── Anthropic (sidekick only) ──

# ── SigNoz ──
OTEL_EXPORTER_OTLP_ENDPOINT = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
SIGNOZ_URL = os.getenv("SIGNOZ_URL", os.getenv("SIGNOZ_API_URL", "http://localhost:8080")).rstrip("/")
SIGNOZ_API_URL = SIGNOZ_URL  # compatibility alias
SIGNOZ_API_KEY = os.getenv("SIGNOZ_API_KEY", "")
if "your_signoz_api_key" in SIGNOZ_API_KEY:
    SIGNOZ_API_KEY = ""

# ── Supabase ──
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY", "")

# ── Search ──
SERPER_API_KEY = os.getenv("SERPER_API_KEY", "")
if "your_serper_api_key" in SERPER_API_KEY:
    SERPER_API_KEY = ""

# ── App ──
APP_NAME = os.getenv("APP_NAME", "agentpulse")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

# ── Sidekick ──
ERROR_RATE_THRESHOLD = float(os.getenv("ERROR_RATE_THRESHOLD", "0.20"))
SIDEKICK_INTERVAL = int(os.getenv("SIDEKICK_INTERVAL", os.getenv("SIDEKICK_POLL_INTERVAL", "60")))
SIDEKICK_POLL_INTERVAL = SIDEKICK_INTERVAL
COST_ALERT_THRESHOLD_USD = float(os.getenv("COST_ALERT_THRESHOLD_USD", "0.10"))
# Trigger uvicorn reload to update environment variables

