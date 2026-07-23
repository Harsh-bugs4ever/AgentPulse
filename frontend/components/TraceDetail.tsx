"use client";

import { useEffect, useState } from "react";
import { X, Activity, Terminal, Clock, Box, AlignLeft, ShieldAlert } from "lucide-react";

interface TraceDetailProps {
  traceId: string | null;
  onClose: () => void;
}

export function TraceDetail({ traceId, onClose }: TraceDetailProps) {
  const [spanTree, setSpanTree] = useState<any>(null);

  useEffect(() => {
    if (!traceId) {
      setSpanTree(null);
      return;
    }
    // Fetch mock details
    fetch(`/api/trace/${traceId}`)
      .then(res => res.json())
      .then(data => setSpanTree(data))
      .catch(console.error);
  }, [traceId]);

  return (
    <>
      {/* Backdrop */}
      {traceId && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-all duration-300"
          onClick={onClose}
        />
      )}

      {/* Slide-over panel */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l border-border bg-card shadow-2xl transition-transform duration-500 ease-in-out sm:max-w-md ${
          traceId ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col bg-card/50 text-foreground overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50">
            <h2 className="text-lg font-medium tracking-tight flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Trace Details
            </h2>
            <button 
              onClick={onClose}
              className="rounded-full p-2 hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 space-y-6">
            {!spanTree ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground/50">
                <span className="animate-pulse">Loading trace data...</span>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Meta Summary */}
                <div className="p-4 rounded-xl border border-border bg-secondary/20 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Trace ID</span>
                    <span className="font-mono text-xs text-foreground bg-secondary px-2 py-1 rounded">{spanTree.trace_id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Duration</span>
                    <span className="text-sm flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3 text-muted-foreground" /> {spanTree.duration_ms}ms
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Status</span>
                    <span className="text-sm flex items-center gap-1 text-primary">
                      {spanTree.status}
                    </span>
                  </div>
                </div>

                {/* Spans Tree (Mocked) */}
                <div>
                  <h3 className="text-sm font-medium mb-4 text-foreground flex items-center gap-2">
                    <AlignLeft className="h-4 w-4" /> Spans
                  </h3>
                  <div className="space-y-3 border-l-2 border-border/50 ml-2 pl-4">
                    {spanTree.spans?.map((span: any, i: number) => (
                      <div key={i} className="relative">
                        {/* Tree connector */}
                        <div className="absolute -left-4 top-4 h-px w-4 bg-border/50" />
                        
                        <div className="p-3 rounded-lg border border-border/60 bg-card hover:bg-secondary/30 transition-colors shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-mono text-sm font-medium flex items-center gap-2">
                              {span.name === 'llm' ? <Box className="h-4 w-4 text-purple-400" /> : <Terminal className="h-4 w-4 text-blue-400" />}
                              {span.name}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">{span.duration_ms}ms</span>
                          </div>
                          <div className="space-y-1">
                            {Object.entries(span.attributes || {}).map(([k, v]) => (
                              <div key={k} className="text-xs flex items-start gap-2">
                                <span className="text-muted-foreground min-w-[80px]">{k}:</span>
                                <span className="text-foreground/80 break-all">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
