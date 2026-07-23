import { NextResponse } from 'next/server';

export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  try {
    const res = await fetch(`${backendUrl}/health`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      let status = 'Healthy';

      // Map backend statuses to frontend expected statuses
      if (data.status === 'idle') {
        status = 'Healthy';
      } else if (data.status === 'degraded') {
        status = 'Investigating';
      } else if (data.status === 'healing') {
        status = 'Healing';
      } else if (data.status === 'recovered') {
        status = 'Recovered';
      }

      return NextResponse.json({ status });
    }
  } catch (err) {
    console.error("Failed to fetch health status from backend:", err);
  }

  // Graceful fallback to Healthy if backend is unreachable
  return NextResponse.json({ status: 'Healthy' });
}
