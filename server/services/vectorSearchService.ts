import { searchByEmbedding } from './pineconeService.ts';
import { getEmbeddingForText } from './embeddingService.ts';

export const embedChunksAndSearch = async (
  query: string,
  mode: 'sentence' | 'custom',
  customChunks?: string[]
) => {
  if (mode === 'custom' && customChunks) {
    const embeddedChunks = await Promise.all(
      customChunks.map(async (text) => ({
        text,
        embedding: await getEmbeddingForText(text),
      }))
    );

    const results = await Promise.all(
      embeddedChunks.map(async ({ text, embedding }) => {
        const result = await searchByEmbedding(embedding);
        return { text, result };
      })
    );

    return results;
  }

  const queryEmbedding = await getEmbeddingForText(query);
  return await searchByEmbedding(queryEmbedding);
};
