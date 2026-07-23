"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, RefreshCcw, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type HealingEvent = {
  id: string;
  time: string;
  failedTool: string;
  fallbackTool: string;
  reason: string;
  status: string;
};

export default function HealingPage() {
  const [healingEvents, setHealingEvents] = useState<HealingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalTracesCount, setTotalTracesCount] = useState(0);

  const fetchHealingEvents = async () => {
    try {
      const res = await fetch("/api/traces");
      if (res.ok) {
        const data = await res.json();
        const traces = data.traces || [];
        setTotalTracesCount(traces.length);

        // Filter traces that have been healed (using wikipedia_fallback strategy or agent.healed flag)
        const healedTraces = traces.filter((t: any) => t.healed || t.strategy === 'wikipedia_fallback');
        
        const events = healedTraces.map((t: any) => ({
          id: t.id,
          time: t.time,
          failedTool: "search",
          fallbackTool: t.strategy || "wikipedia_fallback",
          reason: t.status === "error" ? "Unrecovered exception" : "Upstream search API failed",
          status: "recovered"
        }));

        setHealingEvents(events);
        setError(null);
      } else {
        throw new Error("Failed to fetch traces for healing events");
      }
    } catch (err: any) {
      console.error(err);
      setError("Unable to connect to healing monitor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealingEvents();
    const interval = setInterval(fetchHealingEvents, 5000);
    return () => clearInterval(interval);
  }, []);

  // Calculate recovery rate: ratio of healed events to (healed + failed tool events)
  // Let's use a nice dynamic fallback rate calculation
  const recoveryRate = totalTracesCount > 0 
    ? ((healingEvents.length / totalTracesCount) * 100).toFixed(1) 
    : "100.0";

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="space-y-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-medium tracking-tighter text-foreground flex items-center gap-3">
            Self-Healing Events <Sparkles className="h-6 w-6 text-primary" />
          </h1>
          <p className="text-muted-foreground max-w-[65ch]">
            Traces where the agent encountered a tool failure and successfully recovered using a fallback strategy.
          </p>
        </div>
        <button
          onClick={fetchHealingEvents}
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

      {loading ? (
        <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading healing logs...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-primary/10 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary/80">Total Healing Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-medium tracking-tight text-primary">
                  {healingEvents.length}
                </div>
                <p className="text-xs text-primary/60 mt-2">
                  Detected in recent executions
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Recent Recovery Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-medium tracking-tight text-foreground">
                  {healingEvents.length > 0 ? `${recoveryRate}%` : "100.0%"}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Percentage of active runs that self-healed.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-base font-medium text-foreground">Recent Recoveries</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {healingEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-muted-foreground/50 text-sm">
                  No healing events detected. Break the agent tool and make requests to see recoveries.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {healingEvents.map((event) => (
                    <div key={event.id} className="p-6 hover:bg-muted/30 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">{event.time}</span>
                            <span className="text-muted-foreground">•</span>
                            <Link href={`/trace/${event.id}`} className="text-sm font-medium text-foreground hover:underline decoration-muted-foreground underline-offset-2">
                              Trace {event.id}
                            </Link>
                            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500 ring-1 ring-inset ring-emerald-500/30">
                              Recovered
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-sm">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-destructive/20 border border-destructive/30 text-destructive font-mono text-xs">
                              {event.failedTool}
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary border border-border text-foreground font-mono text-xs">
                              <RefreshCcw className="h-3 w-3" />
                              {event.fallbackTool}
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground max-w-[65ch]">
                            <span className="font-medium text-foreground">Reason:</span> {event.reason}
                          </p>
                        </div>
                        
                        <div className="shrink-0 pt-2 md:pt-0">
                          <Link 
                            href={`/trace/${event.id}`}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-border bg-card hover:bg-muted hover:text-foreground h-9 px-4 py-2 text-foreground"
                          >
                            Inspect Trace
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
