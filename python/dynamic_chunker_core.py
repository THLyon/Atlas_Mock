#################################### 
#    Query Time Chunking Layer
####################################
from sentence_transformers import SentenceTransformer, util
import nltk
from typing import List, Dict
nltk.download('punkt')

model = SentenceTransformer('all-MiniLM-L6-v2')  # Small and fast

def dynamic_chunk_on_query(text: str, query: str) -> Dict:
    sentences = nltk.sent_tokenize(text)
    query_embedding = model.encode(query, convert_to_tensor=True)
    sentence_embeddings = model.encode(sentences, convert_to_tensor=True)

    similarities = util.pytorch_cos_sim(query_embedding, sentence_embeddings)[0]
    top_indices = similarities.argsort(descending=True)[:5]  # top 5 relevant sentences

    chunks = [sentences[i] for i in top_indices]
    return {
        "intent": query,
        "chunks": chunks
    }




# from sentence_transformers import SentenceTransformer
# from typing import List, Dict
# import re
# from nltk.tokenize import sent_tokenize
# from numpy import dot
# from numpy.linalg import norm

# # Load lightweight embedding model
# model = SentenceTransformer('all-MiniLM-L6-v2')

# def classify_query_intent(query: str) -> str:
#     query = query.lower()
#     if any(keyword in query for keyword in ["define", "what is", "who is"]):
#         return "definition"
#     elif any(keyword in query for keyword in ["summarize", "overview", "key points"]):
#         return "summary"
#     elif any(keyword in query for keyword in ["exceptions", "unless", "termination", "restrictions"]):
#         return "clause"
#     return "general"

# def semantic_chunk(text: str, max_tokens: int = 100) -> List[str]:
#     sentences = sent_tokenize(text)
#     chunks = []
#     current_chunk = []
#     current_tokens = 0

#     for sentence in sentences:
#         token_est = len(sentence.split())
#         if current_tokens + token_est > max_tokens:
#             chunks.append(" ".join(current_chunk))
#             current_chunk = [sentence]
#             current_tokens = token_est
#         else:
#             current_chunk.append(sentence)
#             current_tokens += token_est
#     if current_chunk:
#         chunks.append(" ".join(current_chunk))
#     return chunks

# def cosine_sim(a, b):
#     return dot(a, b) / (norm(a) * norm(b))

# def dynamic_chunk_on_query(text: str, query: str, top_k: int = 3) -> Dict:
#     intent = classify_query_intent(query)

#     if intent == "definition":
#         chunks = semantic_chunk(text, max_tokens=40)
#     elif intent == "summary":
#         chunks = semantic_chunk(text, max_tokens=150)
#     else:  # clause/general
#         chunks = semantic_chunk(text, max_tokens=75)

#     query_emb = model.encode(query)
#     chunk_embs = model.encode(chunks)

#     similarities = [cosine_sim(query_emb, c_emb) for c_emb in chunk_embs]
#     ranked = sorted(enumerate(zip(chunks, chunk_embs, similarities)), key=lambda x: x[1][2], reverse=True)

#     top_chunks = []
#     for i, (chunk, emb, sim) in ranked[:top_k]:
#         top_chunks.append({
#             "id": f"dynamic-{i}",
#             "text": chunk,
#             "type": "dynamic",
#             "tokens": len(chunk.split()),
#             "similarity": float(sim),
#             "embedding": emb.tolist(),  # <- useful if storing in Pinecone
#             "parentSectionId": None,
#             "parentParagraphId": None,
#             "prevChunkId": f"dynamic-{i-1}" if i > 0 else None,
#             "nextChunkId": f"dynamic-{i+1}" if i + 1 < len(chunks) else None
#         })

#     return {
#         "intent": intent,
#         "chunks": top_chunks
#     }