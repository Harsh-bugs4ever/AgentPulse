import { NextResponse } from 'next/server';

export async function GET() {
  const now = new Date();
  const seconds = now.getSeconds();
  
  let status = "Healthy";
  
  // Cycle every minute to simulate states for demo:
  // 0-29s: Healthy
  // 30-44s: Healing
  // 45-59s: Recovered
  if (seconds >= 30 && seconds < 45) {
    status = "Healing";
  } else if (seconds >= 45 && seconds < 60) {
    status = "Recovered";
  }
  
  return NextResponse.json({ status });
}
