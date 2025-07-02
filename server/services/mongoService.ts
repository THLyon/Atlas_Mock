import { getDb } from '../models/mongoModel.ts';

// ------------------------
// Types
// ------------------------

interface RawSection {
  id: string;
  documentId: string;
  title?: string;
  text: string;
  type: 'section';
  tokens?: number;
  embedding?: number[];
}

interface Chunk {
  id: string;
  documentId: string;
  text: string;
  tokens: number;
  type: 'sentence' | 'paragraph' | 'section';
  embedding: number[];
  parentSectionId?: string;
  parentParagraphId?: string;
  prevChunkId?: string;
  nextChunkId?: string;
}

// ------------------------
// Get a raw section by ID
// ------------------------

export const getRawSectionById = async (sectionId: string): Promise<string> => {
  const db = await getDb();
  const doc = await db.collection('rawSections').findOne({ id: sectionId });
  return doc?.text || '';
};

// ------------------------
// Upsert Chunks to MongoDB
// ------------------------

export async function upsertChunksToMongo(documentId: string, chunks: Chunk[]) {
  if (!chunks || chunks.length === 0) {
    console.log('[mongoService] ⚠️ No chunks to upsert');
    return;
  }

  const db = await getDb();
  const collection = db.collection('chunks');

  const operations = chunks.map(chunk => ({
    updateOne: {
      filter: { id: chunk.id, documentId },
      update: { $set: { ...chunk, documentId } },
      upsert: true,
    }
  }));

  const result = await collection.bulkWrite(operations);
  console.log(`[mongoService] Upserted ${result.upsertedCount + result.modifiedCount} chunks into MongoDB`);
}

// ------------------------
// Upsert Raw Sections to MongoDB
// ------------------------

export async function upsertRawSectionsToMongo(documentId: string, sections: RawSection[]) {
  if (!sections || sections.length === 0) {
    console.log('[mongoService] ⚠️ No raw sections to upsert');
    return;
  }

  const db = await getDb();
  const collection = db.collection('rawSections');

  const operations = sections.map(section => ({
    updateOne: {
      filter: { id: section.id, documentId },
      update: { $set: { ...section, documentId } },
      upsert: true,
    }
  }));

  const result = await collection.bulkWrite(operations);
  console.log(`[mongoService] Upserted ${result.upsertedCount + result.modifiedCount} raw sections into MongoDB`);
}

// ------------------------
// Upsert Embedded Sections to MongoDB
// ------------------------

export async function upsertEmbeddedSectionsToMongo(documentId: string, sections: RawSection[]) {
  const enrichedSections = sections.filter(s => s.embedding && Array.isArray(s.embedding));

  if (enrichedSections.length === 0) {
    console.log('[mongoService] ⚠️ No embedded sections to upsert');
    return;
  }

  const db = await getDb();
  const collection = db.collection('sections');

  const operations = enrichedSections.map(section => ({
    updateOne: {
      filter: { id: section.id, documentId },
      update: { $set: { ...section, documentId } },
      upsert: true,
    }
  }));

  const result = await collection.bulkWrite(operations);
  console.log(`[mongoService] Upserted ${result.upsertedCount + result.modifiedCount} embedded sections into MongoDB`);
}
