import { NextResponse } from 'next/server';

function getRelativeTime(timestamp: any): string {
  if (!timestamp) return 'just now';

  let ms = 0;
  if (typeof timestamp === 'string') {
    ms = Date.parse(timestamp);
  } else {
    const num = Number(timestamp);
    if (num > 1e15) {
      ms = Math.floor(num / 1e6); // nanoseconds → ms
    } else if (num > 1e12) {
      ms = Math.floor(num / 1e3); // microseconds → ms
    } else if (num > 1e9) {
      ms = num * 1000;             // Unix seconds → ms
    } else {
      ms = num;
    }
  }

  if (isNaN(ms) || ms <= 0) return 'recently';

  const diff = Date.now() - ms;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(ms).toLocaleDateString();
}

export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  try {
    const res = await fetch(`${backendUrl}/traces?limit=30`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const backendTraces: any[] = data.traces || [];

      const mappedTraces = backendTraces.map((t: any) => ({
        // Identity
        id:       t.traceID   || t.trace_id || '',
        // Content — Supabase store fields come through directly
        query:    t.question  || t.operationName || 'Research query',
        status:   t.hasError  ? 'error' : (t.status || 'success'),
        duration: t.duration_ms != null
                    ? `${(t.duration_ms / 1000).toFixed(1)}s`
                    : t.duration != null
                      ? `${(t.duration / 1000).toFixed(1)}s`
                      : '—',
        time:     getRelativeTime(t.timestamp || t.created_at),
        tool:     t.strategy  || t.tags?.['agent.strategy'] || t.tags?.['tool.name'] || 'agent.run',
        healed:   t.healed ?? (t.tags?.['agent.healed'] === 'true'),
        cost:     t.total_cost_usd != null ? `$${t.total_cost_usd.toFixed(6)}` : null,
      }));

      return NextResponse.json({ traces: mappedTraces });
    }
  } catch (err) {
    console.error('Failed to fetch traces from backend:', err);
  }

  return NextResponse.json({ traces: [] });
}
