"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, LineChart as ChartIcon, ShieldAlert, Zap } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const errorData = [
  { time: "14:00", rate: 2 },
  { time: "14:10", rate: 3 },
  { time: "14:20", rate: 2 },
  { time: "14:30", rate: 22 }, // Spike
  { time: "14:40", rate: 24 },
  { time: "14:50", rate: 4 }, // Healed
  { time: "15:00", rate: 2 },
];

export default function SidekickPage() {
  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="space-y-2">
        <h1 className="text-3xl font-medium tracking-tighter text-foreground flex items-center gap-3">
          SRE Sidekick <Bot className="h-6 w-6 text-primary" />
        </h1>
        <p className="text-muted-foreground max-w-[65ch]">
          Autonomous error investigation. Claude monitors SigNoz telemetry and explains failures in plain English.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
                <ChartIcon className="h-4 w-4 text-muted-foreground" />
                Live Error Rate
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                </span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Monitoring</span>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={errorData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                      itemStyle={{ color: 'hsl(var(--foreground))', fontSize: '14px', fontWeight: 500 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="rate" 
                      stroke="hsl(var(--destructive))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorRate)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Active Investigations
          </h2>
          
          <Card className="border-primary/20 shadow-sm relative overflow-hidden bg-card">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground text-sm">Error Spike Detected</h3>
                  <p className="text-xs text-muted-foreground">14:32 • 24% failure rate</p>
                </div>
              </div>
              
              <div className="prose prose-sm prose-invert text-sm text-muted-foreground leading-relaxed bg-muted/30 p-4 rounded-lg border border-border">
                <p>
                  <strong>Root Cause Analysis:</strong> Tool <code>web_search</code> is failing consistently for queries containing "Next.js" or "React". 
                </p>
                <p>
                  8 of the last 10 calls to the search API returned a <code>TimeoutError</code>. This appears to be an upstream issue with the search provider, not a logic error in the agent.
                </p>
                <p className="mb-0">
                  <strong>Recommendation:</strong> Agent should fallback to Wikipedia tool until upstream recovers.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
