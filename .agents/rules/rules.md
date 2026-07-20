---
trigger: always_on
---

# AgentPulse Development Rules

These rules apply to every feature implemented in the AgentPulse project.

---

# 1. Project Goal

AgentPulse is an **AI-native observability platform**, not an AI chatbot.

The AI research agent exists only to generate realistic telemetry.

Every implementation decision should prioritize:

- Better traces
- Better observability
- Better debugging
- Better demonstrations

over AI capability.

---

# 2. Keep It Simple

This is a hackathon project.

Avoid enterprise-level architecture unless absolutely necessary.

Prefer:

- Simple functions
- Small modules
- Readable code
- Minimal dependencies

over unnecessary abstraction.

---

# 3. Modular Code

Separate responsibilities.

Example structure:

```
agent/
    agent.py
    search.py
    llm.py
    telemetry.py
    config.py
```

Avoid large files with multiple responsibilities.

---

# 4. Every Important Action Must Be Observable

If something important happens, it should create telemetry.

Examples:

- Agent starts
- Tool executes
- LLM is called
- Retry happens
- Fallback happens
- Error occurs
- Agent finishes

Every one of these should be represented by spans or span attributes.

---

# 5. Span Naming

Use clear, consistent names.

Good

```
agent.run

tool.search

tool.wikipedia

llm.answer

agent.finish
```

Bad

```
step1

main

call

execute

function
```

Span names should explain exactly what happened.

---

# 6. Span Attributes

Attributes should always be structured.

Good

```
llm.model

llm.provider

tool.name

tool.success

agent.strategy

agent.healed
```

Avoid vague names like

```
data

info

status

value
```

Use namespaces.

---

# 7. Errors

Never swallow exceptions.

Every error must:

- Record exception
- Mark span as ERROR
- Include useful attributes
- Continue propagating unless intentionally handled

Always capture:

```
error.type

error.message

error.stacktrace
```

---

# 8. Logging

Do not spam logs.

Only log meaningful events.

Examples

```
Agent started

Search completed

LLM responded

Fallback activated

Session completed
```

Avoid debug logs for every variable.

---

# 9. Configuration

Never hardcode:

- API keys
- Endpoints
- Ports
- Tokens
- Secrets

Use environment variables.

```
OPENAI_API_KEY

OTEL_EXPORTER_OTLP_ENDPOINT

SIGNOZ_ENDPOINT
```

---

# 10. OpenTelemetry

Always use the official OpenTelemetry SDK.

Every new feature should reuse the existing tracer.

Never create multiple tracer providers.

---

# 11. SigNoz Compatibility

All telemetry should be compatible with SigNoz.

Use standard OTel conventions whenever possible.

Avoid custom exporters.

---

# 12. Keep Business Logic Separate

Telemetry should not be mixed with application logic.

Preferred:

```
telemetry.py
```

contains

- tracer setup
- exporter
- helper utilities

Business files should focus on business logic.

---

# 13. Cost Tracking

Every LLM call should include:

```
llm.prompt_tokens

llm.completion_tokens

llm.total_tokens

llm.cost_usd

llm.session_id
```

Even if dashboards are built later.

---

# 14. Timing

Record execution duration for important operations.

Examples

- Search latency
- LLM latency
- Total execution time

Avoid manually measuring if OpenTelemetry already provides duration.

---

# 15. No Premature Optimization

Don't optimize before the project works.

Correctness > Performance.

Readable code > Clever code.

---

# 16. File Size

Aim for:

- 100–250 lines per file
- Small focused modules
- Single responsibility

Split files when they become difficult to navigate.

---

# 17. Type Hints

Use Python type hints wherever practical.

Example

```python
def search(query: str) -> str:
```

---

# 18. Documentation

Every module should include:

- Purpose
- Inputs
- Outputs

Public functions should have docstrings.

---

# 19. Code Style

Follow:

- PEP 8
- Descriptive variable names
- Clear function names
- Early returns where appropriate

Avoid deeply nested code.

---

# 20. Dependencies

Only install dependencies that are necessary.

Preferred stack:

- OpenTelemetry SDK
- OpenAI (or chosen LLM SDK)
- Requests
- Wikipedia API (optional)

Avoid heavy frameworks unless required.

---

# 21. Testing

Before marking a feature complete, verify:

- Agent runs successfully
- Traces appear in SigNoz
- Errors appear correctly
- Span hierarchy is correct
- Attributes are populated
- No uncaught exceptions

---

# 22. Feature Scope

Only implement the requested feature.

Do not begin future features unless explicitly instructed.

Current roadmap:

1. Instrumented Research Agent
2. SRE Sidekick
3. Cost Watchdog
4. Self-Healing

Keep implementations isolated.

---

# 23. Git Practices

- Small, focused commits
- Clear commit messages
- One feature per commit where possible

Example:

```
feat: add OpenTelemetry instrumentation

feat: implement search tool span

feat: add llm token attributes
```

---

# 24. Hackathon Philosophy

The demo is more important than architectural perfection.

Prioritize:

- Working end-to-end flow
- Reliable telemetry
- Clean traces
- Clear dashboards
- Easy-to-understand code

If choosing between a complex feature and a polished demo, choose the polished demo.