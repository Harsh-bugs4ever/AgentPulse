"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bot,
  LineChart as ChartIcon,
  ShieldAlert,
  Zap,
  CheckCircle2,
  XCircle,
  Activity,
  RefreshCw,
  HeartPulse,
  AlertTriangle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────

interface ErrorPoint {
  time: string;
  rate: number;
  total: number;
  errors: number;
}

interface Investigation {
  trace_id: string;
  question: string;
  status: string;
  strategy: string;
  healed: boolean;
  severity: "error" | "healed";
  title: string;
  summary: string;
  recommendation: string;
  time: string;
  duration_ms: number;
  cost_usd: number;
}

interface Stats {
  total_traces: number;
  error_count: number;
  healed_count: number;
  error_rate_pct: number;
  healthy_pct: number;
}

interface SidekickData {
  error_rate_series: ErrorPoint[];
  investigations: Investigation[];
  stats: Stats;
}

const EMPTY: SidekickData = {
  error_rate_series: [],
  investigations: [],
  stats: {
    total_traces: 0,
    error_count: 0,
    healed_count: 0,
    error_rate_pct: 0,
    healthy_pct: 100,
  },
};

const POLL_MS = Number(process.env.NEXT_PUBLIC_HEALTH_POLL_MS ?? 8000);

// ── Helpers ───────────────────────────────────────────────────────────────────

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "error")
    return <XCircle className="h-4 w-4 text-destructive" />;
  return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5 flex items-center gap-4">
        <div
          className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${accent ?? "bg-primary/10 text-primary border border-primary/20"}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            {label}
          </p>
          <p className="text-2xl font-semibold text-foreground leading-tight">
            {value}
          </p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SidekickPage() {
  const [data, setData] = useState<SidekickData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/sidekick", { cache: "no-store" });
      if (res.ok) {
        const json: SidekickData = await res.json();
        setData(json);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Sidekick fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLL_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  const { stats, error_rate_series, investigations } = data;

  // Pad series to at least 2 points so the chart renders
  const chartData =
    error_rate_series.length > 0
      ? error_rate_series
      : [
          { time: "—", rate: 0, total: 0, errors: 0 },
          { time: "—", rate: 0, total: 0, errors: 0 },
        ];

  const currentRate =
    error_rate_series.length > 0
      ? error_rate_series[error_rate_series.length - 1].rate
      : 0;

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-medium tracking-tighter text-foreground flex items-center gap-3">
            SRE Sidekick <Bot className="h-6 w-6 text-primary" />
          </h1>
          <p className="text-muted-foreground max-w-[65ch]">
            Autonomous error investigation. Monitors Supabase telemetry and
            explains failures in plain English.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
          <RefreshCw className="h-3 w-3" />
          {lastUpdated
            ? `Updated ${lastUpdated.toLocaleTimeString()}`
            : "Loading…"}
        </div>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Traces"
          value={loading ? "—" : stats.total_traces}
          sub="last 50 requests"
          icon={Activity}
        />
        <StatCard
          label="Error Rate"
          value={loading ? "—" : `${stats.error_rate_pct}%`}
          sub={`${stats.error_count} failed`}
          icon={AlertTriangle}
          accent={
            stats.error_rate_pct > 20
              ? "bg-destructive/10 text-destructive border border-destructive/20"
              : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
          }
        />
        <StatCard
          label="Self-Healed"
          value={loading ? "—" : stats.healed_count}
          sub="auto-recovered"
          icon={HeartPulse}
          accent="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
        />
        <StatCard
          label="Healthy"
          value={loading ? "—" : `${stats.healthy_pct}%`}
          sub="success rate"
          icon={CheckCircle2}
          accent="bg-primary/10 text-primary border border-primary/20"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base font-medium flex items-center gap-2 text-foreground">
                <ChartIcon className="h-4 w-4 text-muted-foreground" />
                Live Error Rate
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      currentRate > 0 ? "bg-destructive" : "bg-emerald-500"
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      currentRate > 0 ? "bg-destructive" : "bg-emerald-500"
                    }`}
                  />
                </span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {currentRate > 0 ? `${currentRate}% errors` : "Healthy"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  Loading telemetry…
                </div>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorRate"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="hsl(var(--destructive))"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="hsl(var(--destructive))"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="time"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "hsl(var(--muted-foreground))",
                          fontSize: 12,
                        }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "hsl(var(--muted-foreground))",
                          fontSize: 12,
                        }}
                        tickFormatter={(val) => `${val}%`}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid hsl(var(--border))",
                          backgroundColor: "hsl(var(--background))",
                          color: "hsl(var(--foreground))",
                          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                        }}
                        itemStyle={{
                          color: "hsl(var(--foreground))",
                          fontSize: "14px",
                          fontWeight: 500,
                        }}
                        formatter={(val: number, _name: string, entry: any) => [
                          `${val}%  (${entry.payload.errors}/${entry.payload.total} requests)`,
                          "Error rate",
                        ]}
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
              )}
            </CardContent>
          </Card>
        </div>

        {/* Investigations */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Active Investigations
          </h2>

          {loading ? (
            <Card className="bg-card border-border">
              <CardContent className="p-6 text-sm text-muted-foreground">
                Scanning traces…
              </CardContent>
            </Card>
          ) : investigations.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-6 flex items-center gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                No errors or incidents detected. All traces are healthy.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
              {investigations.map((inv) => (
                <Card
                  key={inv.trace_id}
                  className={`relative overflow-hidden bg-card ${
                    inv.severity === "error"
                      ? "border-destructive/30"
                      : "border-emerald-500/30"
                  }`}
                >
                  <div
                    className={`absolute top-0 left-0 w-1 h-full ${
                      inv.severity === "error"
                        ? "bg-destructive"
                        : "bg-emerald-500"
                    }`}
                  />
                  <CardContent className="p-5 pl-6">
                    {/* Title row */}
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className={`h-7 w-7 rounded flex items-center justify-center border shrink-0 ${
                          inv.severity === "error"
                            ? "bg-destructive/10 border-destructive/20"
                            : "bg-emerald-500/10 border-emerald-500/20"
                        }`}
                      >
                        {inv.severity === "error" ? (
                          <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <HeartPulse className="h-3.5 w-3.5 text-emerald-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground text-sm leading-tight">
                          {inv.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {inv.time} •{" "}
                          {inv.strategy.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-muted/30 rounded-lg border border-border p-3 space-y-2 text-xs text-muted-foreground leading-relaxed">
                      <p className="text-foreground/80">{inv.summary}</p>
                      <p>
                        <span className="font-medium text-foreground">
                          Recommendation:
                        </span>{" "}
                        {inv.recommendation}
                      </p>
                    </div>

                    {/* Meta */}
                    <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                      <span>
                        {(inv.duration_ms / 1000).toFixed(1)}s duration
                      </span>
                      {inv.cost_usd != null && inv.cost_usd > 0 && (
                        <span>${inv.cost_usd.toFixed(6)}</span>
                      )}
                      <span className="font-mono truncate text-foreground/40">
                        {inv.trace_id.substring(0, 8)}…
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
