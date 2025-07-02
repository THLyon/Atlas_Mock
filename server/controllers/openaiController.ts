import { RequestHandler, Request, Response, NextFunction } from 'express';
import { ServerError, StructuredQuery } from '../../types/types';
import { compressChunks } from '../services/promptCompressor.ts';
import { getEmbeddingForText } from '../services/embeddingService.ts';
import { extractStructuredQuery } from '../services/structuredQueryService.ts';
import { chatWithOpenAI } from '../services/openaiChatService.ts';


export const queryOpenAIEmbedding: RequestHandler = async (req, res, next) => {
  try {
    const userQuery = req.body.userQuery;
    const structuredQuery = await extractStructuredQuery(userQuery);
    const summaryToEmbed = structuredQuery.summaryToEmbed || userQuery;

    const embedding = await getEmbeddingForText(summaryToEmbed);

    res.locals.embedding = embedding;
    res.locals.structuredQuery = structuredQuery;

    next();
  } catch (error) {
    console.error('Error querying OpenAI embedding:', error);
    next({
      log: 'queryOpenAIEmbedding error: ' + error,
      status: 500,
      message: { err: 'Failed to generate embedding' },
    });
  }
};

export const queryOpenAIParse: RequestHandler = async (_req, res, next) => {
  const { userQuery } = res.locals;
  if (!userQuery) {
    return next({
      log: 'queryOpenAIParse did not receive a user query',
      status: 500,
      message: { err: 'User query missing' },
    });
  }

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

  const systemMessage = `
You are a legal NLP assistant. Given a user's query, determine if they are referencing an existing legal case or providing a summary to embed.
- Return EITHER a "titleToFind" OR a "summaryToEmbed", not both.
- Extract filters like jurisdiction, legalTopic, and courtLevel where possible.
  `;

  try {
    const completion = await chatWithOpenAI({
      systemPrompt: systemMessage,
      userPrompt: userQuery,
      responseFormat: { type: 'json_schema', json_schema: responseSchema },
      n: 3,
    });

    const first = completion.choices[0];
    if (!first.message.content) {
      return next({
        log: 'queryOpenAIParse: No content returned',
        status: 500,
        message: { err: 'OpenAI did not return a valid completion' },
      });
    }

    const structuredQuery: StructuredQuery = JSON.parse(first.message.content);

    res.locals.structuredQuery = structuredQuery;
    res.locals.allStructuredQueries = completion.choices.map((c) =>
      JSON.parse(c.message.content || '{}')
    );
    next();
  } catch (err) {
    return next({
      log: `queryOpenAIParse: ${err}`,
      status: 500,
      message: { err: 'An error occurred while querying OpenAI (parse)' },
    });
  }
};

export const queryOpenAIChat: RequestHandler = async (_req, res, next) => {
  const { userQuery, hybridResults } = res.locals;
  if (!userQuery || !hybridResults) {
    return next({
      log: 'queryOpenAIChat: Missing required context',
      status: 500,
      message: { err: 'Missing user query or retrieval results' },
    });
  }

  const texts = hybridResults.map((r: any) => r.text).filter(Boolean);
  let compressed = '';

  try {
    console.log(`[Prompt Compression] Compressing ${texts.length} chunks before chat completion...`);
    compressed = await compressChunks(texts);
  } catch (err) {
    return next({
      log: `queryOpenAIChat: compression failed: ${err}`,
      status: 500,
      message: { err: 'Failed to compress retrieved content' },
    });
  }

  const systemMessage = `
You are a legal assistant that helps interpret legal queries using relevant case summaries.
When given a user's query and a compressed legal summary, respond accurately with legal insight.
Format response as: "[Case Name] - [One-sentence legal insight or relevance]"
  `.trim();

  const userMessage = `
User legal request: """${userQuery}"""
Relevant legal summary: """${compressed}"""
  `.trim();

  try {
    const completion = await chatWithOpenAI({
      systemPrompt: systemMessage,
      userPrompt: userMessage,
    });

    const { content } = completion.choices[0].message;
    if (!content) {
      return next({
        log: 'queryOpenAIChat: No content returned',
        status: 500,
        message: { err: 'OpenAI did not return a valid chat response' },
      });
    }
    console.log(`[OpenAI Chat Response] Final legal insight:\n${content}`);
    res.locals.legalAnswer = content;
    return next();
  } catch (err) {
    return next({
      log: `queryOpenAIChat error: ${err}`,
      status: 500,
      message: { err: 'An error occurred during OpenAI chat completion' },
    });
  }
};

