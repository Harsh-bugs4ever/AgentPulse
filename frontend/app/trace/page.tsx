"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCheck, ShieldAlert, Clock, Search, Terminal, RefreshCw, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Trace = {
  id: string;
  query: string;
  status: string;
  duration: string;
  time: string;
  tool: string;
  healed?: boolean;
  cost?: string | null;
};

export default function TraceList() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchTraces = async () => {
    try {
      const res = await fetch("/api/traces");
      if (res.ok) {
        const data = await res.json();
        setTraces(data.traces || []);
        setError(null);
      } else {
        throw new Error("Failed to fetch traces");
      }
    } catch (err: any) {
      console.error(err);
      setError("Unable to connect to observability provider. Is SigNoz running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraces();
  }, []);

  const filteredTraces = traces.filter((trace) =>
    (trace.query || '').toLowerCase().includes(search.toLowerCase()) ||
    trace.id.toLowerCase().includes(search.toLowerCase()) ||
    (trace.tool || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="space-y-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-medium tracking-tighter text-foreground">Agent Traces</h1>
          <p className="text-muted-foreground max-w-[65ch]">
            Live stream of all agent executions, tool calls, and LLM responses from SigNoz.
          </p>
        </div>
        <button
          onClick={fetchTraces}
          className="self-start sm:self-center px-4 py-2 border border-border bg-card hover:bg-muted text-foreground text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </header>

      {error && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive flex items-center gap-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Executions</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Filter traces..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading traces...
            </div>
          ) : filteredTraces.length === 0 ? (
            <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
              No executions found.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredTraces.map((trace) => (
                <Link 
                  key={trace.id} 
                  href={`/trace/${trace.id}`}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center",
                      trace.status === "success" ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
                    )}>
                      {trace.status === "success" ? <BadgeCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{trace.id.slice(0, 8)}…</span>
                        <span className="text-sm font-medium text-foreground group-hover:underline decoration-muted-foreground underline-offset-2">
                          {trace.query || 'Unknown query'}
                        </span>
                        {trace.healed && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500 ring-1 ring-inset ring-emerald-500/20">
                            Healed
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Terminal className="h-3 w-3" />
                          {trace.tool || 'agent.run'}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {trace.duration}
                        </span>
                        {trace.cost && (
                          <span className="text-xs text-muted-foreground">{trace.cost}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">
                    {trace.time}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
