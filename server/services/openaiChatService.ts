// server/services/openaiChatService.ts
import { openai } from '../utils/openaiClient.ts';

interface ChatParams {
  systemPrompt: string;
  userPrompt: string;
  responseFormat?: any;
  n?: number;
}

export const chatWithOpenAI = async ({
  systemPrompt,
  userPrompt,
  responseFormat,
  n = 1,
}: ChatParams) => {
  return openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    n,
    ...(responseFormat ? { response_format: responseFormat } : {}),
  });
};
