import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  try {
    const res = await fetch(`${backendUrl}/traces/${id}/spans`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const backendSpans = data.spans || [];

      // Find root span (agent.run or parent-less span)
      const rootSpan = backendSpans.find((s: any) => s.operationName === 'agent.run' || !s.parentSpanID);
      const durationMs = rootSpan ? rootSpan.duration : (backendSpans.length > 0 ? Math.max(...backendSpans.map((s: any) => s.duration)) : 0);
      
      const hasError = backendSpans.some((s: any) => s.hasError);

      // Map backend spans to frontend format and compute tree depth
      const mappedSpans = backendSpans.map((span: any) => {
        let depth = 0;
        let parentID = span.parentSpanID;
        // Trace back parents to calculate indentation/nesting depth
        while (parentID) {
          const parent = backendSpans.find((s: any) => s.spanID === parentID);
          if (!parent) break;
          depth++;
          parentID = parent.parentSpanID;
        }

        return {
          id: span.spanID,
          name: span.operationName,
          duration_ms: Math.round(span.duration),
          status: span.hasError ? 'error' : 'success',
          depth,
          attributes: span.tags || {}
        };
      });

      return NextResponse.json({
        trace_id: id,
        duration_ms: Math.round(durationMs),
        status: hasError ? 'error' : 'success',
        spans: mappedSpans
      });
    }
  } catch (err) {
    console.error(`Failed to fetch spans for trace ${id} from backend:`, err);
  }

  // Graceful fallback to empty trace details
  return NextResponse.json({
    trace_id: id,
    duration_ms: 0,
    status: 'error',
    spans: []
  });
}
