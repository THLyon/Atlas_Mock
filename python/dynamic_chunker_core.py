from sentence_transformers import SentenceTransformer
from typing import List, Dict
import re

model = SentenceTransformer('all-MiniLM-L6-v2')

def classify_query_intent(query: str) -> str:
    query = query.lower()
    if any(word in query for word in ["define", "what is", "who is"]):
        return "definition"
    elif any(word in query for word in ["summarize", "overview", "key points"]):
        return "summary"
    elif any(word in query for word in ["exceptions", "unless", "termination", "restrictions"]):
        return "clause"
    return "general"

def semantic_chunk(text: str, max_tokens: int = 100) -> List[str]:
    # Simple sentence-based chunking (could upgrade to LLM-based)
    from nltk.tokenize import sent_tokenize
    sentences = sent_tokenize(text)
    
    chunks = []
    current_chunk = []
    current_tokens = 0
    
    for sentence in sentences:
        token_est = len(sentence.split())  # crude estimate
        if current_tokens + token_est > max_tokens:
            chunks.append(" ".join(current_chunk))
            current_chunk = [sentence]
            current_tokens = token_est
        else:
            current_chunk.append(sentence)
            current_tokens += token_est
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    
    return chunks

def dynamic_chunk_on_query(text: str, query: str) -> Dict:
    intent = classify_query_intent(query)
    
    if intent == "definition":
        chunks = semantic_chunk(text, max_tokens=40)
    elif intent == "summary":
        chunks = semantic_chunk(text, max_tokens=150)
    else:  # clause/general
        chunks = semantic_chunk(text, max_tokens=75)
    
    # Optionally rank by semantic similarity to query
    query_emb = model.encode(query)
    chunk_embs = model.encode(chunks)

    from numpy import dot
    from numpy.linalg import norm

    similarities = [
        (chunk, dot(query_emb, chunk_emb) / (norm(query_emb) * norm(chunk_emb)))
        for chunk, chunk_emb in zip(chunks, chunk_embs)
    ]

    ranked_chunks = sorted(similarities, key=lambda x: x[1], reverse=True)
    
    return {
        "intent": intent,
        "chunks": [c[0] for c in ranked_chunks[:3]]  # return top 3
    }
