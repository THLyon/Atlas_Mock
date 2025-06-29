import { RequestHandler } from 'express';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

const openai = new OpenAI();
const pinecone = new Pinecone();
const index = pinecone.index('legal-cases');

export const ingestChunks: RequestHandler = async (req, res, next) => {
    const { chunks, documentId } = req.body;
  
    try {
      const enrichedChunks = await Promise.all(
        chunks.map(async (chunk: any) => {
          const embedding = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: chunk.text,
          });
          return {
            ...chunk,
            embedding: embedding.data[0].embedding,
          };
        })
      );
  
      const pineconeVectors = enrichedChunks.map((chunk: any) => ({
        id: chunk.id,
        values: chunk.embedding,
        metadata: {
          ...chunk,
          embedding: undefined,
        },
      }));
  
      await index.namespace(documentId).upsert(pineconeVectors);
  
      res.status(200).json({ message: 'Chunks embedded & stored' }); 
    } catch (err) {
      console.error('Error ingesting chunks:', err);
      res.status(500).json({ error: 'Failed to ingest' });
    }
  };
  
