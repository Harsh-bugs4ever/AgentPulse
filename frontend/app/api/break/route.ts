import { NextResponse } from 'next/server';

export async function POST() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  try {
    const res = await fetch(`${backendUrl}/break`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    console.error("Failed to break agent:", err);
  }
  return NextResponse.json({ message: "Failed to connect to backend" }, { status: 500 });
}
