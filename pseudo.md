//! MONGO SERVICE

// import { getDb } from '../models/mongoModel.ts';

// // ------------------------
// // Types
// // ------------------------

// interface RawSection {
//   id: string;
//   documentId: string;
//   title?: string;
//   text: string;
//   type: 'section';
//   tokens?: number;
// }

// interface Chunk {
//   id: string;
//   documentId: string;
//   text: string;
//   tokens: number;
//   type: 'sentence' | 'paragraph' | 'section';
//   embedding: number[];
//   parentSectionId?: string;
//   parentParagraphId?: string;
//   prevChunkId?: string;
//   nextChunkId?: string;
// }

// // ------------------------
// // Get a raw section by ID
// // ------------------------

// export const getRawSectionById = async (sectionId: string): Promise<string> => {
//   const db = await getDb();
//   const doc = await db.collection('rawSections').findOne({ id: sectionId });
//   return doc?.text || '';
// };

// // ------------------------
// // Upsert Chunks to MongoDB
// // ------------------------

// export async function upsertChunksToMongo(documentId: string, chunks: Chunk[]) {
//   const db = await getDb();
//   const collection = db.collection('chunks');

//   const operations = chunks.map(chunk => ({
//     updateOne: {
//       filter: { id: chunk.id, documentId },
//       update: { $set: { ...chunk, documentId } },
//       upsert: true,
//     }
//   }));

//   const result = await collection.bulkWrite(operations);
//   console.log(`[mongoService] ✅ Upserted ${result.upsertedCount + result.modifiedCount} chunks into MongoDB`);
// }

// // ------------------------
// // Upsert Raw Sections to MongoDB
// // ------------------------

// export async function upsertRawSectionsToMongo(documentId: string, sections: RawSection[]) {
//   if (!sections || sections.length === 0) {
//     console.log('[mongoService] ⚠️ No raw sections to upsert');
//     return;
//   }

//   const db = await getDb();
//   const collection = db.collection('rawSections');

//   const operations = sections.map(section => ({
//     updateOne: {
//       filter: { id: section.id, documentId },
//       update: { $set: { ...section, documentId } },
//       upsert: true,
//     }
//   }));

//   const result = await collection.bulkWrite(operations);
//   console.log(`[mongoService] ✅ Upserted ${result.upsertedCount + result.modifiedCount} raw sections into MongoDB`);
// }





INGESTCONTROLLER.TS

// import { Request, Response } from 'express';
// import { getEmbeddingForText } from '../services/embeddingService.ts';
// import { upsertChunks } from '../services/pineconeService.ts';

// export const ingestChunks = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const chunks = req.body.chunks;

//     const embeddedChunks = await Promise.all(
//       chunks.map(async (chunk: any) => {
//         const embedding = await getEmbeddingForText(chunk.text);
//         return {
//           id: chunk.id,
//           values: embedding,
//           metadata: chunk.metadata,
//         };
//       })
//     );

//     await upsertChunks(req.body.documentId, embeddedChunks);


//     res.status(200).json({
//       message: 'Chunks embedded and ingested into Pinecone successfully',
//     });
//     return; 
//   } catch (error) {
//     console.error('Error during chunk ingestion:', error);
//     res.status(500).json({ error: 'Chunk ingestion failed' });
//     return; 
//   }
// };


DYNAMIC_CHUNKER.PY

# import sys
# import json
# from dynamic_chunker_core import dynamic_chunk_on_query  # import your core logic

# def main():
#     try:
#         input_data = sys.stdin.read()
#         parsed = json.loads(input_data)

#         text = parsed.get("text", "")
#         query = parsed.get("query", "")

#         result = dynamic_chunk_on_query(text, query)

#         print(json.dumps(result))  # MUST be a valid JSON object
#         sys.stdout.flush()

#     except Exception as e:
#         print(f"[dynamic_chunker] Error: {e}", file=sys.stderr)
#         sys.exit(1)

# if __name__ == '__main__':
#     main()


DYNAMIC_CHUNKER_CORE.py

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





Streaming/real-time chunking during long-running ingest jobs (e.g. for huge documents) is a logical next step, but your current pipeline is per-file not per-stream.
