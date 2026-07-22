import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, ChevronRight, Clock, Box } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Mock span data showing a self-healing event
const spans = [
  { id: "sp_1", name: "agent.run", duration: "4.5s", status: "success", type: "root", depth: 0 },
  { id: "sp_2", name: "tool.web_search", duration: "2.1s", status: "error", type: "tool", depth: 1, attributes: { "error.type": "TimeoutError", "query": "Next.js build error fix" } },
  { id: "sp_3", name: "agent.heal", duration: "0.1s", status: "success", type: "internal", depth: 1, attributes: { "agent.healed": true, "fallback_reason": "web_search_failed", "strategy": "wikipedia_fallback" } },
  { id: "sp_4", name: "tool.wikipedia", duration: "1.2s", status: "success", type: "tool", depth: 1, attributes: { "query": "Next.js" } },
  { id: "sp_5", name: "llm.answer", duration: "1.1s", status: "success", type: "llm", depth: 1, attributes: { "llm.model": "gpt-4o-mini", "llm.cost_usd": 0.00045, "tokens": 450 } },
];

export default function TraceDetail({ params }: { params: { id: string } }) {
  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="space-y-4">
        <Link href="/trace" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to traces
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-medium tracking-tighter text-zinc-900 flex items-center gap-3">
              Trace <span className="text-zinc-400 font-mono text-xl">{params.id || "tr_3x10p9"}</span>
            </h1>
            <p className="text-zinc-500 mt-1 flex items-center gap-4">
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> 4.5s total duration</span>
              <span className="flex items-center gap-1.5 text-green-600"><CheckCircle2 className="h-4 w-4" /> Completed with fallback</span>
            </p>
          </div>
          <div className="px-3 py-1 rounded-full bg-zinc-100 text-zinc-600 text-xs font-mono">
            session_id: sess_99a8b2
          </div>
        </div>
      </header>

      <div className="space-y-4">
        <h2 className="text-sm font-medium text-zinc-900 uppercase tracking-widest mb-4">Span Hierarchy</h2>
        
        <div className="space-y-2">
          {spans.map((span) => (
            <Card key={span.id} className={cn(
              "overflow-hidden transition-colors border-l-4",
              span.status === "error" ? "border-l-red-500 bg-red-50/30" : 
              span.name === "agent.heal" ? "border-l-amber-500 bg-amber-50/30" : 
              "border-l-zinc-300 hover:border-l-zinc-400"
            )}>
              <CardContent className="p-4 flex items-start gap-4">
                <div style={{ paddingLeft: `${span.depth * 2}rem` }} className="flex items-center gap-3 w-64 shrink-0">
                  {span.depth > 0 && <ChevronRight className="h-4 w-4 text-zinc-300" />}
                  <Box className={cn("h-4 w-4", span.status === "error" ? "text-red-500" : "text-zinc-400")} />
                  <span className="font-mono text-sm font-medium text-zinc-900">{span.name}</span>
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 font-medium bg-white px-2 py-0.5 rounded border border-zinc-200 shadow-sm">
                      {span.duration}
                    </span>
                  </div>
                  
                  {span.attributes && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {Object.entries(span.attributes).map(([key, value]) => (
                        <div key={key} className="flex flex-col bg-white/50 rounded-md p-2 border border-zinc-100">
                          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">{key}</span>
                          <span className="text-sm text-zinc-900 mt-0.5 font-medium">
                            {typeof value === 'boolean' ? (value ? 'true' : 'false') : value}
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
