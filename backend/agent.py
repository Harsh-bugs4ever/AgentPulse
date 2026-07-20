import sys
import uuid
import time
from opentelemetry import trace
from instrumentation import setup_telemetry, get_tracer
from search import search_tool
from llm import llm_answer, extract_query

def run_agent(question: str) -> str:
    # Initialize OTel and get tracer
    tracer = setup_telemetry()
    
    session_id = str(uuid.uuid4())
    request_id = str(uuid.uuid4())
    start_time_ms = int(time.time() * 1000)
    
    with tracer.start_as_current_span("agent.run") as root_span:
        root_span.set_attribute("agent.name", "research-agent")
        root_span.set_attribute("agent.version", "1.0")
        root_span.set_attribute("session.id", session_id)
        root_span.set_attribute("request.id", request_id)
        root_span.set_attribute("user.question", question)
        root_span.set_attribute("start.timestamp", start_time_ms)
        
        try:
            print(f"\nExtracting search query...")
            search_query = extract_query(question, session_id)
            
            print(f"Searching for: {search_query}...")
            search_results = search_tool(search_query)
            
            print(f"Generating answer...")
            answer = llm_answer(question, search_results, session_id)
            
            with tracer.start_as_current_span("agent.finish") as finish_span:
                finish_span.set_attribute("agent.success", True)
                finish_span.set_attribute("response.length", len(answer))
                finish_span.set_attribute("response.characters", len(answer))
                finish_span.set_attribute("response.words", len(answer.split()))
                
                execution_time_ms = int(time.time() * 1000) - start_time_ms
                finish_span.set_attribute("execution.time_ms", execution_time_ms)
            
            return answer
            
        except Exception as e:
            root_span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            root_span.record_exception(e)
            
            with tracer.start_as_current_span("agent.finish") as finish_span:
                finish_span.set_attribute("agent.success", False)
                execution_time_ms = int(time.time() * 1000) - start_time_ms
                finish_span.set_attribute("execution.time_ms", execution_time_ms)
            
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
