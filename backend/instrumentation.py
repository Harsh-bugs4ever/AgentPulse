"""
instrumentation.py — OpenTelemetry setup and tracer configuration.
Initializes the OTel SDK, sets up OTLP exporter to SigNoz,
and provides a tracer instance for the entire app.
"""

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor

if __package__:  # Supports both `uvicorn backend.main:app` and running from backend/.
    from .config import APP_NAME, ENVIRONMENT, OTEL_EXPORTER_OTLP_ENDPOINT
else:  # pragma: no cover - retained for direct script execution
    from config import APP_NAME, ENVIRONMENT, OTEL_EXPORTER_OTLP_ENDPOINT


def setup_telemetry(app=None):
    """Initialize OpenTelemetry with OTLP gRPC exporter pointed at SigNoz."""

    resource = Resource.create({
        "service.name": APP_NAME,
        "service.version": "1.0.0",
        "deployment.environment": ENVIRONMENT,
    })

    provider = TracerProvider(resource=resource)

    otlp_exporter = OTLPSpanExporter(
        endpoint=OTEL_EXPORTER_OTLP_ENDPOINT,
        insecure=True,
    )

    provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
    trace.set_tracer_provider(provider)

    # Auto-instrument outgoing HTTP requests
    RequestsInstrumentor().instrument()

    # Auto-instrument FastAPI
    if app:
        FastAPIInstrumentor.instrument_app(app)

    return trace.get_tracer(APP_NAME)


# Module-level tracer — import this wherever you need spans
tracer = None


def get_tracer():
    """Get the app tracer. Call setup_telemetry() first."""
    global tracer
    if tracer is None:
        tracer = trace.get_tracer(APP_NAME)
    return tracer
