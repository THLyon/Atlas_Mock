import OpenAI from 'openai';

const openai = new OpenAI();

export const getEmbeddingForText = async (text: string): Promise<number[]> => {
  const embeddingResult = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return embeddingResult.data[0].embedding;
};
