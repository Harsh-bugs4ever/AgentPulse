import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { question } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      // 1. Initial State: Agent is thinking/planning
      controller.enqueue(encoder.encode(JSON.stringify({ type: 'status', data: 'Investigating...' }) + '\n'));
      await wait(800);
      
      // 2. Mock Trace: agent.run
      controller.enqueue(encoder.encode(JSON.stringify({ 
        type: 'trace', 
        data: { id: `tr_${Math.random().toString(36).substring(7)}`, name: 'agent.run', tool: 'llm', status: 'success' } 
      }) + '\n'));
      
      await wait(1000);

      // 3. Mock Trace: tool.search
      controller.enqueue(encoder.encode(JSON.stringify({ 
        type: 'trace', 
        data: { id: `tr_${Math.random().toString(36).substring(7)}`, name: 'tool.web_search', tool: 'web_search', status: 'success' } 
      }) + '\n'));
      
      await wait(1000);
      
      // 4. Update Cost
      controller.enqueue(encoder.encode(JSON.stringify({ type: 'cost', data: 0.012 }) + '\n'));

      // 5. Stream Answer (character by character)
      const mockAnswer = `Based on my investigation into "${question}", I found that the current system state is stable. The relevant telemetry indicates that the web search tool completed successfully in 0.8s and returned 4 sources. The cost for this query processing was $0.012.`;
      
      const words = mockAnswer.split(' ');
      for (const word of words) {
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'chunk', data: word + ' ' }) + '\n'));
        await wait(50); // Typing speed
      }

      // 6. Final Status
      controller.enqueue(encoder.encode(JSON.stringify({ type: 'status', data: 'Healthy' }) + '\n'));
      
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
