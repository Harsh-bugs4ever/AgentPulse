import { NextResponse } from 'next/server';

function formatTimeframe(created_at?: string): string {
  if (!created_at) return 'Recently';
  const date = new Date(created_at);
  if (isNaN(date.getTime())) return 'Recently';

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) {
    return timeStr;
  }
  const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
  return `${dateStr} ${timeStr}`;
}

/**
 * Proxy for GET /costs
 *
 * Backend (store.get_cost_summary) returns:
 *   { total_cost, today_cost, request_count, average_cost, per_session, series }
 */
export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  try {
    const res = await fetch(`${backendUrl}/costs`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();

      const totalCost: number    = Number(data.total_cost    ?? 0);
      const todayCost: number    = Number(data.today_cost    ?? 0);
      const avgCost: number      = Number(data.average_cost  ?? 0);
      const reqCount: number     = Number(data.request_count ?? 0);
      const perSession: Record<string, number> = data.per_session ?? {};
      const series: Array<{ trace_id?: string; session_id: string; question?: string; cost_usd: number; created_at: string }> = data.series ?? [];

      let costData = [];

      if (series.length > 0) {
        // Use chronological timeline from series
        costData = series.map((item, idx) => ({
          timeframe:     formatTimeframe(item.created_at),
          session:       (item.trace_id || item.session_id).substring(0, 8),
          fullSessionId: item.trace_id || item.session_id,
          question:      item.question || '',
          cost:          Number(item.cost_usd),
          timestamp:     item.created_at,
          index:         idx + 1,
        }));
      } else {
        // Fallback to per_session map
        costData = Object.entries(perSession).map(([session, cost], idx) => ({
          timeframe:     `Session ${idx + 1}`,
          session:       session.substring(0, 8),
          fullSessionId: session,
          question:      '',
          cost:          Number(cost),
          timestamp:     '',
          index:         idx + 1,
        }));
      }

      // Find most expensive session
      let mostExpensiveSession = { session: 'none', cost: 0 };
      if (costData.length > 0) {
        const sortedByCost = [...costData].sort((a, b) => b.cost - a.cost);
        mostExpensiveSession = {
          session: sortedByCost[0].fullSessionId,
          cost:    sortedByCost[0].cost,
        };
      }

      return NextResponse.json({
        costData,
        totalSpend:           totalCost,
        todaySpend:           todayCost,
        averageCost:          avgCost,
        requestCount:         reqCount,
        mostExpensiveSession,
      });
    }
  } catch (err) {
    console.error('Failed to fetch costs from backend:', err);
  }

  return NextResponse.json({
    costData:             [],
    totalSpend:           0,
    todaySpend:           0,
    averageCost:          0,
    requestCount:         0,
    mostExpensiveSession: { session: 'none', cost: 0 },
  });
}
