import { Pinecone } from '@pinecone-database/pinecone';
const pinecone = new Pinecone();
const index = pinecone.index('atlas-mock');

export const searchByEmbedding = async (
  embedding: number[],
  topK: number = 5
) => {
  const result = await index.query({
    vector: embedding,
    topK,
    includeMetadata: true,
  });
  return result.matches || [];
};
