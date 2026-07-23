"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Box,
  RefreshCw,
  AlertCircle,
  HeartPulse,
} from "lucide-react";

import Link from "next/link";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

type Span = {
  id: string;
  name: string;
  duration_ms: number;
  status: string;
  depth: number;
  attributes?: Record<string, any>;
};

type TraceDetailData = {
  trace_id: string;
  duration_ms: number;
  status: string;
  spans: Span[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function spanAccent(span: Span): { border: string; icon: string } {
  if (span.status === "error")
    return { border: "border-destructive/40", icon: "text-destructive" };
  if (
    span.name === "tool.wikipedia_fallback" ||
    span.name === "agent.heal"
  )
    return { border: "border-emerald-500/40", icon: "text-emerald-500" };
  return { border: "border-border", icon: "text-muted-foreground" };
}

function DurationBar({
  duration,
  max,
  status,
  healed,
}: {
  duration: number;
  max: number;
  status: string;
  healed: boolean;
}) {
  const pct = max > 0 ? Math.max(3, (duration / max) * 100) : 3;
  const color =
    status === "error"
      ? "bg-destructive"
      : healed
      ? "bg-emerald-500"
      : "bg-primary";
  return (
    <div className="h-0.5 w-full rounded-full bg-muted mt-3">
      <div
        className={`h-0.5 rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function TraceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [traceData, setTraceData] = useState<TraceDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTraceDetail = async () => {
      try {
        const res = await fetch(`/api/trace/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setTraceData(data);
          setError(null);
        } else {
          throw new Error("Failed to fetch trace details");
        }
      } catch (err: any) {
        console.error(err);
        setError("Could not load trace details.");
      } finally {
        setLoading(false);
      }
    };

    fetchTraceDetail();
  }, [params.id]);

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <RefreshCw className="h-6 w-6 animate-spin mb-3" />
        <span className="text-sm">Loading trace details…</span>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (error || !traceData) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto space-y-4">
        <Link
          href="/trace"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to traces
        </Link>
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive flex items-center gap-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error || "Trace not found"}</span>
        </div>
      </div>
    );
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  const isHealed = traceData.spans.some(
    (s) =>
      s.name === "agent.heal" ||
      s.name === "tool.wikipedia_fallback" ||
      s.attributes?.["agent.healed"] === true ||
      s.attributes?.["agent.healed"] === "true"
  );
  const isError = traceData.status === "error";

  const maxDuration = Math.max(...traceData.spans.map((s) => s.duration_ms), 1);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <header className="space-y-4">
        <Link
          href="/trace"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to traces
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-medium tracking-tighter text-foreground flex flex-wrap items-center gap-3">
              Trace
              <span className="font-mono text-xl text-muted-foreground">
                {traceData.trace_id.substring(0, 16)}…
              </span>
            </h1>
            <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {traceData.duration_ms}ms total
              </span>
              <span
                className={cn(
                  "flex items-center gap-1.5 font-medium",
                  isError
                    ? "text-destructive"
                    : isHealed
                    ? "text-emerald-500"
                    : "text-primary"
                )}
              >
                {isError ? (
                  <XCircle className="h-4 w-4" />
                ) : isHealed ? (
                  <HeartPulse className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {isError
                  ? "Failed"
                  : isHealed
                  ? "Completed with fallback"
                  : "Completed"}
              </span>
              <span className="text-muted-foreground">
                {traceData.spans.length} span
                {traceData.spans.length !== 1 ? "s" : ""}
              </span>
            </p>
          </div>
        </div>
      </header>

      {/* Span hierarchy */}
      <div className="space-y-3">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          Span Hierarchy
        </h2>

        <div className="space-y-2">
          {traceData.spans.length === 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-background text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 shrink-0" />
              No span data for this trace. It was likely recorded before span persistence was enabled — run a new query to get full span hierarchies.
            </div>
          ) : traceData.spans.map((span) => {

            const accent = spanAccent(span);
            const attrs = span.attributes
              ? Object.entries(span.attributes).filter(
                  ([, v]) => v !== null && v !== undefined && v !== ""
                )
              : [];

            return (
              <Card
                key={span.id}
                className={cn(
                  "overflow-hidden border transition-colors bg-background",
                  accent.border
                )}
              >
                <CardContent className="p-4">
                  {/* Span name row */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Depth connector */}
                    {span.depth > 0 && (
                      <span
                        className="inline-block h-px bg-border"
                        style={{ width: `${span.depth * 1.25}rem` }}
                      />
                    )}

                    {/* Span name pill */}
                    <div className="flex items-center gap-2 bg-muted/60 border border-border rounded-md px-3 py-1.5">
                      <Box className={cn("h-3.5 w-3.5 shrink-0", accent.icon)} />
                      <span className="font-mono text-sm font-semibold text-foreground tracking-tight">
                        {span.name}
                      </span>
                    </div>

                    {/* Duration badge */}
                    <span className="text-xs text-muted-foreground bg-background border border-border px-2 py-1 rounded-md font-mono">
                      {span.duration_ms}ms
                    </span>

                    {/* Status badges */}
                    {span.status === "error" && (
                      <span className="text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 px-2 py-1 rounded-md">
                        error
                      </span>
                    )}
                    {(span.name === "tool.wikipedia_fallback" ||
                      span.name === "agent.heal" ||
                      span.attributes?.["agent.healed"] === true ||
                      span.attributes?.["agent.healed"] === "true") && (
                      <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md">
                        healed
                      </span>
                    )}
                  </div>

                  {/* Duration bar */}
                  <DurationBar
                    duration={span.duration_ms}
                    max={maxDuration}
                    status={span.status}
                    healed={
                      span.name === "tool.wikipedia_fallback" ||
                      span.name === "agent.heal" ||
                      span.attributes?.["agent.healed"] === true ||
                      span.attributes?.["agent.healed"] === "true"
                    }
                  />

                  {/* Attributes */}
                  {attrs.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
                      {attrs.map(([key, value]) => (
                        <div
                          key={key}
                          className="flex flex-col bg-muted/20 rounded-md p-2.5 border border-border/50"
                        >
                          <span className="text-xs text-muted-foreground font-mono tracking-wide mb-1">
                            {key}
                          </span>
                          <span className="text-sm text-foreground font-semibold break-all leading-snug">
                            {typeof value === "boolean"
                              ? value
                                ? "true"
                                : "false"
                              : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
