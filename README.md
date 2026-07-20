# 🫀 AgentPulse

**AI-native observability for autonomous agents — observe, debug, and self-correct in real time.**

Built for the [Agents of SigNoz Hackathon](https://www.wemakedevs.org/hackathons/signoz) (SigNoz × WeMakeDevs) · Track 01 — AI & Agent Observability

---

## The Problem

AI agents chain LLM calls, hit tools, and make autonomous decisions. When something goes wrong — hallucination, latency spike, cost explosion — you have **zero visibility**. AgentPulse fixes this by making every agent decision **observable, debuggable, and self-correcting**.

## What It Does

AgentPulse is a single project that combines **4 features** into one AI-native observability system:

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Instrumented Research Agent** | Python AI agent (question → web search → LLM → answer) fully instrumented with OpenTelemetry. Every tool call, LLM call, and decision emits spans to SigNoz. |
| 2 | **SRE Sidekick** | Background loop watches error rate in SigNoz every 60s. When errors spike > 20%, it queries SigNoz via MCP, sends findings to Claude, and returns plain-English root cause analysis. |
| 3 | **LLM Cost Watchdog** | Every LLM span logs `llm.cost_usd` and `llm.session_id`. SigNoz aggregates cost per session. Alert fires when a session crosses $0.10. |
| 4 | **Self-Healing Agent** | When web search fails twice in a row, the agent auto-switches to Wikipedia fallback. Healing is logged as span attributes (`agent.healed = true`) visible in SigNoz. |

## Demo Flow (3 minutes)

1. **Normal run** — Ask a question → see SigNoz flame graph *(30s)*
2. **Break it** — Click "Break It" → error rate spikes → sidekick fires → Claude's investigation appears *(60s)*
3. **Self-healing** — Agent switches to Wikipedia fallback → `agent.healed = true` visible in trace *(30s)*
4. **Cost dashboard** — Most expensive session, alert that fired *(30s)*

## Tech Stack

| Layer | Technology |
|-------|------------|
| Agent + API | Python · FastAPI |
| LLM (agent) | Groq API — `llama-3.3-70b-versatile` |
| LLM (planner) | Groq API — `llama-3.1-8b-instant` |
| LLM (sidekick) | Anthropic Claude API |
| Search tool | Serper API (serper.dev) |
| Observability | SigNoz (self-hosted dev, SigNoz Cloud prod) |
| Instrumentation | OpenTelemetry Python SDK |
| Frontend | Next.js 14 · Tailwind CSS |
| Prod backend | Railway (free tier) |
| Prod frontend | Vercel (free tier) |

## Project Structure

```
agentpulse/
│
├── backend/
│   ├── main.py                 # FastAPI app, all routes
│   ├── agent.py                # Core research agent logic
│   ├── instrumentation.py      # OTel setup, tracer config
│   ├── sidekick.py             # SRE Sidekick polling loop
│   ├── cost.py                 # Cost calculation helpers
│   ├── healing.py              # Self-healing fallback logic
│   ├── signoz_client.py        # Queries SigNoz HTTP API
│   ├── config.py               # All env vars in one place
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Main dashboard
│   │   ├── layout.tsx          # Root layout
│   │   └── trace/
│   │       └── [id]/
│   │           └── page.tsx    # Trace detail page
│   ├── components/
│   │   ├── QuestionBox.tsx     # Input + Ask button
│   │   ├── TraceFeed.tsx       # Live trace list
│   │   ├── CostPanel.tsx       # Cost meter
│   │   ├── SidekickPanel.tsx   # Investigation output
│   │   ├── AgentStatus.tsx     # Healthy/Healing pill
│   │   └── TraceDetail.tsx     # Span breakdown
│   ├── lib/
│   │   └── api.ts              # All fetch calls to backend
│   ├── .env.local
│   ├── package.json
│   └── next.config.js
│
├── casting.yaml                # SigNoz Foundry config
├── docker-compose.yml          # SigNoz reference
├── .gitignore
└── README.md
```

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- Docker Engine 20.10+ with Compose v2
- 4GB+ RAM allocated to Docker

### 1. Self-host SigNoz

```bash
# Install Foundry CLI
curl -fsSL https://signoz.io/foundry.sh | bash

# Deploy SigNoz (from project root)
foundryctl cast -f casting.yaml
```

SigNoz UI → [http://localhost:8080](http://localhost:8080)
OTLP endpoint → `localhost:4317` (gRPC) / `localhost:4318` (HTTP)
MCP Server → `localhost:8000`

### 2. Backend

```bash
cd backend

# Create virtualenv
python -m venv venv
source venv/bin/activate

# Install deps
pip install -r requirements.txt

# Add your API keys to .env
# GROQ_API_KEY, ANTHROPIC_API_KEY, SERPER_API_KEY

# Run
uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard → [http://localhost:3000](http://localhost:3000)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ask` | Takes `{question, session_id}`, runs agent, returns answer |
| `GET` | `/traces` | Returns last N traces from SigNoz |
| `GET` | `/cost` | Returns cost per session from SigNoz |
| `GET` | `/health` | Returns agent status (healthy / healing / investigating) |
| `GET` | `/investigation` | Returns latest SRE Sidekick finding |
| `POST` | `/break` | Intentionally fails search tool for demo |

## OpenTelemetry Spans

| Span Name | What It Captures |
|-----------|-----------------|
| `agent.run` | Full agent lifecycle |
| `tool.web_search` | Search tool call |
| `tool.wikipedia_fallback` | Fallback tool |
| `llm.planner` | Planning step |
| `llm.answer` | Final answer generation |

### Key Span Attributes

```
search.query, search.result_chars, search.returned_empty
llm.model, llm.prompt_tokens, llm.completion_tokens, llm.cost_usd
llm.session_id, llm.context_chars
agent.strategy, agent.healed, agent.fallback_reason
```

## Environment Variables

<details>
<summary><strong>backend/.env</strong></summary>

```env
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_PLANNER_MODEL=llama-3.1-8b-instant
ANTHROPIC_API_KEY=sk-ant-...
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
SIGNOZ_API_URL=http://localhost:8080
SIGNOZ_API_KEY=
SERPER_API_KEY=...
APP_NAME=agentpulse
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:3000
ERROR_RATE_THRESHOLD=0.20
SIDEKICK_POLL_INTERVAL=60
COST_ALERT_THRESHOLD_USD=0.10
```

</details>

<details>
<summary><strong>frontend/.env.local</strong></summary>

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_TRACE_POLL_MS=5000
NEXT_PUBLIC_COST_POLL_MS=10000
NEXT_PUBLIC_HEALTH_POLL_MS=5000
```

</details>

## Production Deployment

Only 4 env vars change between dev and prod:

| Variable | Dev | Prod |
|----------|-----|------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4317` | `https://ingest.in.signoz.cloud:443` |
| `SIGNOZ_API_URL` | `http://localhost:8080` | `https://api.in.signoz.cloud` |
| `SIGNOZ_API_KEY` | *(empty)* | SigNoz Cloud key |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Railway backend URL |

- **Backend** → Railway (free tier)
- **Frontend** → Vercel (free tier)
- **Observability** → SigNoz Cloud (free tier)

## API Keys Needed

| Key | Where to get | Cost |
|-----|-------------|------|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) | Free |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | ~$1 enough |
| `SERPER_API_KEY` | [serper.dev](https://serper.dev) | 2,500 free searches |
| `SIGNOZ_API_KEY` | [signoz.io](https://signoz.io) (prod only) | Free tier |

## License

MIT

---

Built with ❤️ for the Agents of SigNoz Hackathon
