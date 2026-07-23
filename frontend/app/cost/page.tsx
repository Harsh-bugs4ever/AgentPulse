"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Flame, LineChart as ChartIcon, RefreshCw, AlertCircle, TrendingUp, Hash } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

type CostItem = {
  timeframe: string;
  session: string;
  fullSessionId: string;
  cost: number;
};

export default function CostWatchdogPage() {
  const [costData, setCostData]               = useState<CostItem[]>([]);
  const [totalSpend, setTotalSpend]           = useState<number>(0);
  const [todaySpend, setTodaySpend]           = useState<number>(0);
  const [averageCost, setAverageCost]         = useState<number>(0);
  const [requestCount, setRequestCount]       = useState<number>(0);
  const [mostExpensive, setMostExpensive]     = useState({ session: 'none', cost: 0 });
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);

  const fetchCosts = async () => {
    try {
      const res = await fetch("/api/costs");
      if (res.ok) {
        const data = await res.json();
        setCostData(data.costData || []);
        setTotalSpend(data.totalSpend || 0);
        setTodaySpend(data.todaySpend || 0);
        setAverageCost(data.averageCost || 0);
        setRequestCount(data.requestCount || 0);
        setMostExpensive(data.mostExpensiveSession || { session: 'none', cost: 0 });
        setError(null);
      } else {
        throw new Error("Failed to fetch costs");
      }
    } catch (err: any) {
      console.error(err);
      setError("Unable to connect to cost tracker API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCosts();
    const interval = setInterval(fetchCosts, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="space-y-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-medium tracking-tighter text-foreground flex items-center gap-3">
            Cost Watchdog
          </h1>
          <p className="text-muted-foreground max-w-[65ch]">
            Track LLM spend down to the session level. Costs are recorded locally on every agent run.
          </p>
        </div>
        <button
          onClick={fetchCosts}
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
        <div className="flex items-center justify-center p-12 text-sm text-zinc-500">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading cost dashboard...
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card text-card-foreground border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5" /> Total Spend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tracking-tight">
                  ${totalSpend.toFixed(4)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>

            <Card className="bg-card text-card-foreground border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5" /> Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tracking-tight">
                  ${todaySpend.toFixed(4)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Daily budget: $1.00</p>
              </CardContent>
            </Card>

            <Card className="bg-card text-card-foreground border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5" /> LLM Calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tracking-tight">
                  {requestCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg ${averageCost.toFixed(5)} each
                </p>
              </CardContent>
            </Card>

            <Card className="border-destructive/20 bg-destructive/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-destructive uppercase tracking-wide flex items-center gap-2">
                  <Flame className="h-3.5 w-3.5" /> Most Expensive
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tracking-tight text-foreground">
                  ${mostExpensive.cost.toFixed(4)}
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                  {mostExpensive.session === 'none' ? '—' : mostExpensive.session.slice(0, 12) + '…'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Line Chart */}
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
                <ChartIcon className="h-4 w-4 text-muted-foreground" />
                Cost Trend per Session (USD)
              </CardTitle>
              <span className="text-xs text-muted-foreground">{costData.length} sessions</span>
            </CardHeader>
            <CardContent className="p-6">
              {costData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground/50 text-sm">
                  No LLM cost metrics logged yet. Ask the agent a question first.
                </div>
              ) : (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={costData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} vertical={false} />
                      <XAxis
                        dataKey="timeframe"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        tickFormatter={(val) => `$${val}`}
                      />
                      <Tooltip
                        cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3' }}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid hsl(var(--border))',
                          backgroundColor: 'hsl(var(--background))',
                          color: 'hsl(var(--foreground))',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        }}
                        formatter={(value: number) => [`$${value.toFixed(6)}`, 'Cost']}
                        labelFormatter={(label, payload) => {
                          const item = payload?.[0]?.payload;
                          if (item?.question) {
                            const q = item.question.length > 32 ? item.question.slice(0, 32) + '…' : item.question;
                            return `${label} — "${q}"`;
                          }
                          if (item?.session) {
                            return `${label} (${item.session}…)`;
                          }
                          return label;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cost"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#costGradient)"
                        dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                        activeDot={{ r: 6, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--foreground))' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
