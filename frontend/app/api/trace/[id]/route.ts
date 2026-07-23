import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Mock a nested span tree for the trace detail panel
  const mockTrace = {
    trace_id: id,
    duration_ms: 1850,
    status: 'success',
    spans: [
      {
        name: 'agent.run',
        duration_ms: 1850,
        attributes: {
          'agent.strategy': 'search-and-answer',
          'session.id': 'sess_9a8b7c6d'
        }
      },
      {
        name: 'tool.web_search',
        duration_ms: 850,
        attributes: {
          'tool.name': 'wikipedia',
          'tool.success': 'true',
          'search.query': 'Next.js 14 features',
          'search.results_count': 4
        }
      },
      {
        name: 'llm',
        duration_ms: 950,
        attributes: {
          'llm.model': 'gpt-4o',
          'llm.provider': 'openai',
          'llm.prompt_tokens': 1542,
          'llm.completion_tokens': 240,
          'llm.total_tokens': 1782,
          'llm.cost_usd': 0.012
        }
      }
    ]
  };

  // simulate network latency
  await new Promise(r => setTimeout(r, 400));

  return NextResponse.json(mockTrace);
}
