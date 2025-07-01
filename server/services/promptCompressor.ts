import { openai } from '../utils/openaiClient.ts';

export const compressChunks = async (chunks: string[]): Promise<string> => {
  const joined = chunks.join('\n\n');

  const prompt = `
You are a summarization assistant.
Compress the following legal text into a concise and relevant summary for the original query.

TEXT:
${joined}
  `;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });

  return completion.choices[0].message.content || '';
};
