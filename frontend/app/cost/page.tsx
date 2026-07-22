"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Flame, LineChart as ChartIcon } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const costData = [
  { session: "sess_1a2b", cost: 0.045 },
  { session: "sess_3c4d", cost: 0.120 },
  { session: "sess_5e6f", cost: 0.085 },
  { session: "sess_7g8h", cost: 0.450 }, // Expensive query
  { session: "sess_9i0j", cost: 0.065 },
  { session: "sess_1k2l", cost: 0.020 },
];

export default function CostWatchdogPage() {
  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="space-y-2">
        <h1 className="text-3xl font-medium tracking-tighter text-foreground flex items-center gap-3">
          Cost Watchdog
        </h1>
        <p className="text-muted-foreground max-w-[65ch]">
          Track LLM spend down to the span level. Automatically halt agents that exceed budget thresholds.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card text-card-foreground border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spend Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-medium tracking-tight flex items-center gap-2">
              $42.50
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Well within $100.00 daily budget limit.
            </p>
          </CardContent>
        </Card>

        <Card className="border-destructive/20 bg-destructive/10">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <Flame className="h-4 w-4" /> Most Expensive Session
            </CardTitle>
            <span className="text-xs font-mono text-muted-foreground">sess_7g8h</span>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-medium tracking-tight text-foreground">
              $0.45
            </div>
            <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
              Query: "Write a comprehensive 5,000 word guide on React..."
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
            <ChartIcon className="h-4 w-4 text-muted-foreground" />
            Cost per Session (USD)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="session" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                  itemStyle={{ color: 'hsl(var(--foreground))', fontSize: '14px', fontWeight: 500 }}
                  formatter={(value: number) => [`$${value.toFixed(3)}`, 'Cost']}
                  labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px', marginBottom: '4px' }}
                />
                <Bar 
                  dataKey="cost" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
