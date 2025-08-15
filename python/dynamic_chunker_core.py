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