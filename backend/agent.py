"""
agent.py — Orchestrates the research agent pipeline.

Flow:
  1. Extract a search query from the user's question (LLM)
  2. Search for relevant content (primary: web search, fallback: Wikipedia)
  3. Generate an answer from the search results (LLM)

Self-healing: if the primary search fails consecutively, the agent
automatically falls back to Wikipedia and records agent.healed = True
and agent.strategy = "wikipedia_fallback" on the root span.

After every request, full trace + span metadata is persisted to Supabase
via store.py so that dashboard APIs work without querying SigNoz.
"""

import sys
import uuid
import time
from opentelemetry import trace
try:
    from .instrumentation import setup_telemetry
    from .search import search_tool
    from .llm import llm_answer, extract_query
    from . import store
    from .healing import is_healing_active, is_force_fail
except ImportError:  # direct execution from backend/
    from instrumentation import setup_telemetry
    from search import search_tool
    from llm import llm_answer, extract_query
    import store
    from healing import is_healing_active, is_force_fail

def run_agent(question: str) -> dict[str, object]:
    # Initialize OTel and get tracer
    tracer = setup_telemetry()
    
    session_id = str(uuid.uuid4())
    request_id = str(uuid.uuid4())
    start_time_ms = int(time.time() * 1000)
    
    with tracer.start_as_current_span("agent.run") as root_span:
        root_span.set_attribute("agent.name", "research-agent")
        root_span.set_attribute("agent.version", "1.0")
        root_span.set_attribute("session.id", session_id)
        root_span.set_attribute("session_id", session_id)
        root_span.set_attribute("request.id", request_id)
        root_span.set_attribute("user.question", question)
        root_span.set_attribute("start.timestamp", start_time_ms)
        
        try:
            print(f"\nExtracting search query...")
            search_query, planner_cost = extract_query(question, session_id)
            
            print(f"Searching for: {search_query}...")
            search_results = search_tool(search_query)
            
            print(f"Generating answer...")
            answer, answer_cost = llm_answer(question, search_results, session_id)
            total_cost = planner_cost + answer_cost
            strategy = "wikipedia_fallback" if (is_healing_active() or is_force_fail()) else "web_search"
            trace_id = format(root_span.get_span_context().trace_id, "032x")
            root_span.set_attribute("agent.strategy", strategy)
            root_span.set_attribute("agent.healed", strategy == "wikipedia_fallback")
            
            with tracer.start_as_current_span("agent.finish") as finish_span:
                finish_span.set_attribute("agent.success", True)
                finish_span.set_attribute("response.length", len(answer))
                finish_span.set_attribute("response.characters", len(answer))
                finish_span.set_attribute("response.words", len(answer.split()))
                
                execution_time_ms = int(time.time() * 1000) - start_time_ms
                finish_span.set_attribute("execution.time_ms", execution_time_ms)
            
            store.save_trace(trace_id=trace_id, session_id=session_id, request_id=request_id, question=question,
                answer=answer, status="success", strategy=strategy, healed=strategy == "wikipedia_fallback",
                total_cost_usd=total_cost, duration_ms=int(time.time() * 1000) - start_time_ms)
            return {"answer": answer, "trace_id": trace_id, "session_id": session_id,
                    "cost_usd": round(total_cost, 8), "strategy": strategy}
            
        except Exception as e:
            root_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            root_span.record_exception(e)
            
            with tracer.start_as_current_span("agent.finish") as finish_span:
                finish_span.set_attribute("agent.success", False)
                execution_time_ms = int(time.time() * 1000) - start_time_ms
                finish_span.set_attribute("execution.time_ms", execution_time_ms)
            
            trace_id = format(root_span.get_span_context().trace_id, "032x")
            store.save_trace(trace_id=trace_id, session_id=session_id, request_id=request_id, question=question,
                status="error", strategy="web_search", healed=False, total_cost_usd=0,
                duration_ms=int(time.time() * 1000) - start_time_ms)
            raise

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python agent.py <question>")
        sys.exit(1)
        
    user_question = " ".join(sys.argv[1:])
    
    print(f"Ask:\n{user_question}")
    
    try:
        final_answer = run_agent(user_question)
        print(f"\nAnswer:\n{final_answer}")
    except Exception as ex:
        print(f"\nFailed to answer: {ex}")
