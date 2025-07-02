import { Request, Response, NextFunction } from 'express';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { upsertChunksToMongo, upsertRawSectionsToMongo } from '../services/mongoService.ts';

const openai = new OpenAI();
const pinecone = new Pinecone();
const index = pinecone.index('atlas-mock'); // 🔥 Updated namespace

const BATCH_SIZE = 200;

export const ingestChunks = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  const { documentId, chunks, rawSections = [] } = req.body;

  console.log('[ingestChunks] Start');
  console.log('[ingestChunks] Document ID:', documentId);
  console.log('[ingestChunks] Chunks:', chunks?.length);
  console.log('[ingestChunks] RawSections:', rawSections?.length);

  if (!Array.isArray(chunks) || chunks.length === 0) {
    console.error('[ingestChunks] No chunks provided');
    res.status(400).json({ error: 'No chunks to ingest' });
    return;
  }

  try {
    // 🔹 Embed chunks using OpenAI
    const enrichedChunks = await Promise.all(
      chunks.map(async (chunk: any, i: number) => {
        if (!chunk?.text) {
          console.warn(`[ingestChunks] Skipping chunk ${i}: no text`);
          return null;
        }

        try {
          console.log(`[ingestChunks] ⏳ Embedding chunk ${i} (id: ${chunk.id})...`);
          const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: chunk.text,
          });

          console.log(`[ingestChunks] ✅ Embedded chunk ${i}`);

          return {
            ...chunk,
            embedding: embeddingResponse.data[0].embedding,
          };
        } catch (embedErr) {
          const e = embedErr as any;
          console.error(`[ingestChunks] ❌ Embedding error (chunk ${i}):`, e?.response?.data || e?.message || e);
          return null;
        }
      })
    );

    const validChunks = enrichedChunks.filter(c => c !== null);
    console.log(`[ingestChunks] Valid chunks for upsert: ${validChunks.length}`);

    if (validChunks.length === 0) {
      res.status(500).json({ error: 'All chunks failed to embed' });
      return;
    }

    // 🔹 Format Pinecone vectors
    const pineconeVectors = validChunks.map(chunk => ({
      id: chunk.id,
      values: chunk.embedding,
      metadata: {
        id: chunk.id,
        type: chunk.type,
        text: chunk.text,
        tokens: chunk.tokens,
        parentParagraphId: chunk.parentParagraphId ?? '',
        parentSectionId: chunk.parentSectionId ?? '',
        prevChunkId: chunk.prevChunkId ?? '',
        nextChunkId: chunk.nextChunkId ?? '',
        documentId,
      },
    }));

    const batches = [];
    for (let i = 0; i < pineconeVectors.length; i += BATCH_SIZE) {
      batches.push(pineconeVectors.slice(i, i + BATCH_SIZE));
    }

    // 🔹 Upsert vectors to Pinecone
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`[ingestChunks] 🚀 Upserting batch ${i + 1}/${batches.length} (${batch.length} items)...`);

      try {
        await index.namespace('sample_LPA').upsert(batch); // 👈 Save under 'chunks' namespace
        console.log(`[ingestChunks] ✅ Batch ${i + 1} upserted.`);
      } catch (upsertErr) {
        const e = upsertErr as any;
        console.error(`[ingestChunks] ❌ Pinecone upsert failed:`, e?.response?.data || e?.message || e);
        res.status(500).json({
          error: 'Upsert to Pinecone failed',
          detail: e?.response?.data || e?.message || e,
        });
        return;
      }
    }

    // 🔹 Upsert both chunks and raw sections to MongoDB
    await upsertRawSectionsToMongo(documentId, rawSections);
    await upsertChunksToMongo(documentId, validChunks);
    console.log('[ingestChunks] ✅ Chunks also upserted into MongoDB');

    if (Array.isArray(rawSections) && rawSections.length > 0) {
      await upsertRawSectionsToMongo(documentId, rawSections);
      console.log('[ingestChunks] ✅ Raw sections upserted into MongoDB');
    }

    res.status(200).json({ message: 'Chunks embedded & stored' });
  } catch (fatalErr) {
    const e = fatalErr as any;
    console.error('[ingestChunks] ❌ Fatal error:', e?.message || e);
    res.status(500).json({
      error: 'Fatal error in ingestChunks',
      detail: e?.message || e,
    });
  }
};


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
