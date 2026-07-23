import { NextResponse } from 'next/server';

/**
 * Proxy for GET /sidekick
 *
 * Backend (store.get_sidekick_data) returns:
 *   {
 *     error_rate_series: { time, rate, total, errors }[]
 *     investigations: { trace_id, title, summary, recommendation, severity, healed, time, ... }[]
 *     stats: { total_traces, error_count, healed_count, error_rate_pct, healthy_pct }
 *   }
 */
export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  try {
    const res = await fetch(`${backendUrl}/sidekick?limit=50`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    console.error('Failed to fetch sidekick data from backend:', err);
  }

  // Graceful fallback — empty state
  return NextResponse.json({
    error_rate_series: [],
    investigations: [],
    stats: {
      total_traces: 0,
      error_count: 0,
      healed_count: 0,
      error_rate_pct: 0,
      healthy_pct: 100,
    },
  });
}
