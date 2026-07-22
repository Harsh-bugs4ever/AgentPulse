import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, RefreshCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const healingEvents = [
  { 
    id: "tr_3x10p9", 
    time: "14:32", 
    failedTool: "web_search", 
    fallbackTool: "wikipedia_fallback", 
    reason: "TimeoutError on upstream search API",
    status: "recovered"
  },
  { 
    id: "tr_9m44v2", 
    time: "11:15", 
    failedTool: "db_query", 
    fallbackTool: "cache_read", 
    reason: "Connection reset by peer",
    status: "recovered"
  },
  { 
    id: "tr_1z99k4", 
    time: "09:45", 
    failedTool: "web_search", 
    fallbackTool: "wikipedia_fallback", 
    reason: "Rate limit exceeded (HTTP 429)",
    status: "recovered"
  }
];

export default function HealingPage() {
  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="space-y-2">
        <h1 className="text-3xl font-medium tracking-tighter text-foreground flex items-center gap-3">
          Self-Healing Events <Sparkles className="h-6 w-6 text-primary" />
        </h1>
        <p className="text-muted-foreground max-w-[65ch]">
          Traces where the agent encountered a tool failure and successfully recovered using a fallback strategy.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-primary/10 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary/80">Total Healing Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-medium tracking-tight text-primary">
              34
            </div>
            <p className="text-xs text-primary/60 mt-2">
              In the last 7 days
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recovery Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-medium tracking-tight text-foreground">
              92.4%
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Of tool failures were successfully caught.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base font-medium text-foreground">Recent Recoveries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
                      <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/30">
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
        </CardContent>
      </Card>
    </div>
  );
}
