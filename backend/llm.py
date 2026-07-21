import time
from groq import Groq
from opentelemetry import trace
from instrumentation import get_tracer
from config import GROQ_API_KEY, GROQ_MODEL
from cost import calculate_cost

def llm_answer(question: str, context: str, session_id: str) -> str:
    """
    Generate an answer using Groq LLM based on the search context.
    Instruments an 'llm.answer' span.
    """
    tracer = get_tracer()
    start_time = time.time()
    
    with tracer.start_as_current_span("llm.answer") as span:
        span.set_attribute("llm.provider", "Groq")
        span.set_attribute("llm.model", GROQ_MODEL)
        span.set_attribute("llm.session_id", session_id)
        
        # We'll set temperature to a default value, e.g., 0.0 for factual answers
        temperature = 0.0
        span.set_attribute("llm.temperature", temperature)
        
        try:
            client = Groq(api_key=GROQ_API_KEY)
            
            prompt = f"Answer the user's question using ONLY the provided context.\n\nContext: {context}\n\nQuestion: {question}"
            
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": "You are a helpful research assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
            )
            
            answer = response.choices[0].message.content
            
            # Extract token usage
            usage = response.usage
            prompt_tokens = usage.prompt_tokens if usage else 0
            completion_tokens = usage.completion_tokens if usage else 0
            total_tokens = usage.total_tokens if usage else 0
            
            span.set_attribute("llm.prompt_tokens", prompt_tokens)
            span.set_attribute("llm.completion_tokens", completion_tokens)
            span.set_attribute("llm.total_tokens", total_tokens)
            
            # Calculate cost
            cost = calculate_cost(GROQ_MODEL, prompt_tokens, completion_tokens)
            span.set_attribute("llm.cost_usd", cost)
            
            span.set_attribute("llm.latency_ms", int((time.time() - start_time) * 1000))
            
            return answer
            
        except Exception as e:
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            span.record_exception(e)
            span.set_attribute("error.type", type(e).__name__)
            span.set_attribute("error.message", str(e))
            import traceback
            span.set_attribute("error.stacktrace", traceback.format_exc())
            raise

def extract_query(question: str, session_id: str) -> str:
    """
    Extract a Wikipedia search query from the user's question using Groq LLM.
    Instruments an 'llm.extract_query' span.
    """
    tracer = get_tracer()
    start_time = time.time()
    
    with tracer.start_as_current_span("llm.extract_query") as span:
        span.set_attribute("llm.provider", "Groq")
        span.set_attribute("llm.model", GROQ_MODEL)
        span.set_attribute("llm.session_id", session_id)
        
        temperature = 0.0
        span.set_attribute("llm.temperature", temperature)
        
        try:
            client = Groq(api_key=GROQ_API_KEY)
            
            prompt = f"Extract the core subject or entity from the following question to use as a Wikipedia search query. Return ONLY the search query, nothing else.\n\nQuestion: {question}"
            
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": "You are a helpful research assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
            )
            
            query = response.choices[0].message.content.strip()
            span.set_attribute("search.extracted_query", query)
            
            # Extract token usage
            usage = response.usage
            prompt_tokens = usage.prompt_tokens if usage else 0
            completion_tokens = usage.completion_tokens if usage else 0
            total_tokens = usage.total_tokens if usage else 0
            
            span.set_attribute("llm.prompt_tokens", prompt_tokens)
            span.set_attribute("llm.completion_tokens", completion_tokens)
            span.set_attribute("llm.total_tokens", total_tokens)
            
            # Calculate cost
            cost = calculate_cost(GROQ_MODEL, prompt_tokens, completion_tokens)
            span.set_attribute("llm.cost_usd", cost)
            
            span.set_attribute("llm.latency_ms", int((time.time() - start_time) * 1000))
            
            return query
            
        except Exception as e:
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            span.record_exception(e)
            span.set_attribute("error.type", type(e).__name__)
            span.set_attribute("error.message", str(e))
            import traceback
            span.set_attribute("error.stacktrace", traceback.format_exc())
            raise
