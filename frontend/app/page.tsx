"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Clock, Terminal, Activity, Loader2, Sparkles, DollarSign } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Trace = { id: string; name: string; tool: string; status: string };

export default function InteractiveDashboard() {
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<"Healthy" | "Investigating" | "Healing">("Healthy");
  const [isStreaming, setIsStreaming] = useState(false);
  const [answer, setAnswer] = useState("");
  const [cost, setCost] = useState(0.000);
  const [traces, setTraces] = useState<Trace[]>([]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setStatus("Investigating");
    setIsStreaming(true);
    setAnswer("");
    setTraces([]);
    setCost(0.000);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(Boolean);
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.type === 'status') setStatus(data.data);
            if (data.type === 'trace') setTraces((prev) => [...prev, data.data]);
            if (data.type === 'cost') setCost((prev) => prev + data.data);
            if (data.type === 'chunk') setAnswer((prev) => prev + data.data);
          } catch (err) {
            console.error("Failed to parse event", err);
          }
        }
      }
    } catch (error) {
      console.error(error);
      setStatus("Healing"); // Example of an error state
    } finally {
      setIsStreaming(false);
      setStatus("Healthy");
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto min-h-screen flex flex-col font-sans">
      
      {/* Header & Input Section */}
      <header className="mb-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              AgentPulse
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Interactive Live Observability</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link 
              href="/login" 
              className="px-4 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary border border-border/50 rounded-full transition-colors"
            >
              Login
            </Link>
            <div className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium transition-colors duration-500",
              status === "Healthy" ? "bg-primary/10 border-primary/20 text-primary" :
              status === "Investigating" ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
              "bg-amber-500/10 border-amber-500/20 text-amber-400"
            )}>
              {status === "Investigating" ? <Loader2 className="h-4 w-4 animate-spin" /> : 
               status === "Healthy" ? <CheckCircle2 className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
              {status}
            </div>
          </div>
        </div>

        <form onSubmit={handleAsk} className="relative group">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask the agent anything (e.g. 'Fix my Next.js build error')"
            className="w-full h-16 pl-6 pr-32 rounded-2xl border-2 border-border bg-card text-foreground text-lg outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={isStreaming || !question.trim()}
            className="absolute right-2 top-2 bottom-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-6 rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            Ask <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </header>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        
        {/* Left Column: Traces */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Activity className="h-3 w-3" /> Live Telemetry
          </h2>
          
          <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden min-h-[400px]">
            <CardContent className="p-0">
              {traces.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground/50 text-sm">
                  <Terminal className="h-6 w-6 mb-2 opacity-20" />
                  No active traces.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {traces.map((trace, i) => (
                    <div key={i} className="p-4 animate-in slide-in-from-left-4 fade-in duration-300">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-2 w-2 rounded-full",
                          trace.status === "success" ? "bg-primary" : "bg-destructive"
                        )} />
                        <span className="font-mono text-sm text-foreground font-medium">{trace.name}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 ml-5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Terminal className="h-3 w-3" /> {trace.tool}</span>
                        <span className="font-mono">{trace.id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Center/Right Column: Agent Output & Cost */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-3 w-3" /> Agent Output
            </h2>
            
            {/* Cost Meter */}
            <div className="flex items-center gap-2 px-3 py-1 bg-card border border-border rounded-lg shadow-sm text-sm font-mono text-muted-foreground">
              <DollarSign className="h-3 w-3 text-muted-foreground/50" />
              {cost.toFixed(3)}
            </div>
          </div>

          <Card className="bg-card border-border shadow-sm rounded-2xl min-h-[400px]">
            <CardContent className="p-8 prose prose-invert max-w-none">
              {!answer && !isStreaming ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground/50">
                  <Sparkles className="h-8 w-8 mb-4 opacity-20" />
                  <p className="text-lg font-medium text-foreground/40">Ready to assist.</p>
                </div>
              ) : (
                <div className="text-lg leading-relaxed text-foreground whitespace-pre-wrap">
                  {answer}
                  {isStreaming && (
                    <span className="inline-block w-2 h-5 bg-primary ml-1 animate-pulse align-middle" />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
