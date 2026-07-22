import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCheck, ShieldAlert, Clock, Search, Terminal } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const traces = [
  { id: "tr_8f92j1", query: "What is the capital of France?", status: "success", duration: "1.2s", time: "2 min ago", tool: "web_search" },
  { id: "tr_3x10p9", query: "How to fix Next.js build error?", status: "error", duration: "4.5s", time: "15 min ago", tool: "web_search" },
  { id: "tr_9m44v2", query: "Latest Apple stock price", status: "success", duration: "0.8s", time: "1 hr ago", tool: "finance_api" },
  { id: "tr_5c88b1", query: "Who won the super bowl 2024?", status: "success", duration: "2.1s", time: "2 hrs ago", tool: "wikipedia" },
  { id: "tr_1z99k4", query: "Explain quantum computing", status: "success", duration: "5.4s", time: "3 hrs ago", tool: "llm_only" },
];

export default function TraceList() {
  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="space-y-2">
        <h1 className="text-3xl font-medium tracking-tighter text-foreground">Agent Traces</h1>
        <p className="text-muted-foreground max-w-[65ch]">
          Live stream of all agent executions, tool calls, and LLM responses.
        </p>
      </header>

      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Executions</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Filter traces..." 
                  className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary transition-colors text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {traces.map((trace) => (
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
                      <span className="font-mono text-xs text-muted-foreground">{trace.id}</span>
                      <span className="text-sm font-medium text-foreground group-hover:underline decoration-muted-foreground underline-offset-2">{trace.query}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Terminal className="h-3 w-3" />
                        {trace.tool}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {trace.duration}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {trace.time}
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
