"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, ChevronRight, Clock, Box, RefreshCw, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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

export default function TraceDetailPage({ params }: { params: { id: string } }) {
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
        setError("Could not load trace details. Is SigNoz running?");
      } finally {
        setLoading(false);
      }
    };

    fetchTraceDetail();
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <RefreshCw className="h-6 w-6 animate-spin mb-2" />
        Loading trace details...
      </div>
    );
  }

  if (error || !traceData) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto space-y-4">
        <Link href="/trace" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to traces
        </Link>
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive flex items-center gap-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error || "Trace not found"}</span>
        </div>
      </div>
    );
  }

  const isHealed = traceData.spans.some((s) => s.name === "agent.heal" || s.name === "tool.wikipedia_fallback");

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="space-y-4">
        <Link href="/trace" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to traces
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-medium tracking-tighter text-zinc-900 flex items-center gap-3">
              Trace <span className="text-zinc-400 font-mono text-xl">{traceData.trace_id}</span>
            </h1>
            <p className="text-zinc-500 mt-1 flex items-center gap-4">
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {traceData.duration_ms}ms total duration</span>
              <span className={cn(
                "flex items-center gap-1.5 font-medium",
                traceData.status === "error" ? "text-red-600" : (isHealed ? "text-emerald-600" : "text-green-600")
              )}>
                <CheckCircle2 className="h-4 w-4" /> {traceData.status === "error" ? "Failed" : (isHealed ? "Completed with fallback" : "Completed")}
              </span>
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        <h2 className="text-sm font-medium text-zinc-900 uppercase tracking-widest mb-4">Span Hierarchy</h2>
        
        <div className="space-y-2">
          {traceData.spans.map((span) => (
            <Card key={span.id} className={cn(
              "overflow-hidden transition-colors border-l-4",
              span.status === "error" ? "border-l-red-500 bg-red-50/30" : 
              (span.name === "agent.heal" || span.name === "tool.wikipedia_fallback") ? "border-l-emerald-500 bg-emerald-50/30" : 
              "border-l-zinc-300 hover:border-l-zinc-400"
            )}>
              <CardContent className="p-4 flex flex-col md:flex-row md:items-start gap-4">
                <div style={{ paddingLeft: `${span.depth * 2}rem` }} className="flex items-center gap-3 w-64 shrink-0">
                  {span.depth > 0 && <ChevronRight className="h-4 w-4 text-zinc-300" />}
                  <Box className={cn("h-4 w-4", span.status === "error" ? "text-red-500" : "text-zinc-400")} />
                  <span className="font-mono text-sm font-medium text-zinc-900 break-all">{span.name}</span>
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 font-medium bg-white px-2 py-0.5 rounded border border-zinc-200 shadow-sm">
                      {span.duration_ms}ms
                    </span>
                  </div>
                  
                  {span.attributes && Object.keys(span.attributes).length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {Object.entries(span.attributes).map(([key, value]) => (
                        <div key={key} className="flex flex-col bg-white/50 rounded-md p-2 border border-zinc-100">
                          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">{key}</span>
                          <span className="text-sm text-zinc-900 mt-0.5 font-medium break-all">
                            {typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
