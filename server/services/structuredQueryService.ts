import { StructuredQuery } from '../../types/types';
import { chatWithOpenAI } from './openaiChatService.ts';

export const extractStructuredQuery = async (userQuery: string): Promise<StructuredQuery> => {
  const systemMessage = `
You are a legal NLP assistant. Given a user's query, determine if they are referencing an existing legal case or providing a summary to embed.
- Return EITHER a "titleToFind" OR a "summaryToEmbed", not both.
- Extract filters like jurisdiction, legalTopic, and courtLevel where possible.
  `;

  const responseSchema = {
    name: 'parsedUserQuery',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        summaryToEmbed: { type: ['string', 'null'] },
        titleToFind: { type: ['string', 'null'] },
        filters: {
          type: ['object', 'null'],
          properties: {
            jurisdiction: { type: ['string', 'null'] },
            legalTopic: { type: ['string', 'null'] },
            courtLevel: { type: ['string', 'null'] },
          },
          additionalProperties: false,
          required: ['jurisdiction', 'legalTopic', 'courtLevel'],
        },
      },
      additionalProperties: false,
      required: ['summaryToEmbed', 'titleToFind', 'filters'],
    },
  };

  const result = await chatWithOpenAI({
    systemPrompt: systemMessage,
    userPrompt: userQuery,
    responseFormat: { type: 'json_schema', json_schema: responseSchema },
    n: 3,
  });

  const first = result.choices[0];
  if (!first.message.content) throw new Error('Structured query extraction failed');
  //console.log(`[OpenAI Chat Response] Final structured query:\n${first.message.content}`);
  return JSON.parse(first.message.content);
};
