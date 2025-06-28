import OpenAI from 'openai';

import { RequestHandler } from 'express';
import { ServerError, StructuredQuery } from '../../types/types';

const openai = new OpenAI();

export const queryOpenAIEmbedding: RequestHandler = async (_req, res, next) => {
  // if (res.locals.embedding) return next();

  const { userQuery, structuredQuery } = res.locals;
  if (!structuredQuery) {
    const error: ServerError = {
      log: 'queryOpenAIEmbedding did not receive a structuredQuery',
      status: 500,
      message: { err: 'An error occurred before querying OpenAI' },
    };
    return next(error);
  }

  const summaryToEmbed = structuredQuery.summaryToEmbed || userQuery;

  if (!summaryToEmbed) {
    const error: ServerError = {
      log: 'queryOpenAIEmbedding did not receive input summary',
      status: 500,
      message: { err: 'An error occurred before querying embedding' },
    };
    return next(error);
  }

  try {
    const embeddingResult = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: summaryToEmbed,
    });

    res.locals.embedding = embeddingResult.data[0].embedding;
    return next();
  } catch (err) {
    const error: ServerError = {
      log: `queryOpenAI: ${err}`,
      status: 500,
      message: { err: 'An error occurred while querying OpenAI' },
    };
    return next(error);
  }
};

export const queryOpenAIParse: RequestHandler = async (_req, res, next) => {
  const { userQuery } = res.locals;
  if (!userQuery) {
    const error: ServerError = {
      log: 'queryOpenAIParse did not receive a user query',
      status: 500,
      message: { err: 'An error occurred before querying OpenAI' },
    };
    return next(error);
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
            years: {
              type: ['object', 'null'],
              properties: {
                startYear: { type: ['number', 'null'] },
                endYear: { type: ['number', 'null'] },
              },
              additionalProperties: false,
              required: ['startYear', 'endYear'],
            },
            genre: { type: ['string', 'null'] },
            director: { type: ['string', 'null'] },
          },
          additionalProperties: false,
          required: ['years', 'genre', 'director'],
        },
      },
      additionalProperties: false,
      required: ['summaryToEmbed', 'titleToFind', 'filters'],
    },
  };

  const systemMessage = `
	You are an expert query parser.
  Extract any information that should be used to filter the search -- the only valid filters are years, genre, and director.
  - For "years", extract the start and end years as "startYear" and "endYear". If the user provides only one year, use it as both "startYear" and "endYear".
	Given a user's query, determine whether they have provided a movie summary to embed, a title to find, or other.
  - If the user provides a summary to embed, include it in your response as "summaryToEmbed" and do NOT include a "titleToFind".
  - Else if the user provides a title to find, include it in your response as "titleToFind" and do NOT include a "summaryToEmbed".
  - If the user provides "other", generate a hypothetical movie summary based on the user's query and include it in your response as "summaryToEmbed" and do NOT include a "titleToFind".
  Be sure that your response includes EITHER "summaryToEmbed" OR "titleToFind", but not both.
	`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: userQuery,
        },
      ],
      temperature: 0.7,
      response_format: {
        type: 'json_schema',
        json_schema: responseSchema,
      },
     n: 3,
    });

    if (completion.choices[0].finish_reason === 'length') {
      throw new Error('Incomplete response');
    }
    if (completion.choices[0].message.refusal) {
      throw new Error('Refused response');
    }

    const { content } = completion.choices[0].message;
    if (!content) {
      const error: ServerError = {
        log: 'OpenAIParse did not return a completion',
        status: 500,
        message: { err: 'An error occurred while querying OpenAI' },
      };
      return next(error);
    }

    const structuredQuery: StructuredQuery = JSON.parse(content);

    // debug:
    console.log('Structured Query =======>', structuredQuery);

    res.locals.structuredQuery = structuredQuery;
    res.locals.allStructuredQueries = completion.choices.map((choice) =>
      JSON.parse(choice.message.content || '')
    );
    return next();
  } catch (err) {
    const error: ServerError = {
      log: `queryOpenAIParse: ${err}`,
      status: 500,
      message: { err: 'An error occurred while querying OpenAI' },
    };
    return next(error);
  }
};

export const queryOpenAIChat: RequestHandler = async (_req, res, next) => {
  const { userQuery, pineconeQueryResult } = res.locals;
  if (!userQuery) {
    const error: ServerError = {
      log: 'queryOpenAIChat did not receive a user query',
      status: 500,
      message: { err: 'An error occurred before querying OpenAI' },
    };
    return next(error);
  }
  if (!pineconeQueryResult) {
    const error: ServerError = {
      log: 'queryOpenAIChat did not receive pinecone query results',
      status: 500,
      message: { err: 'An error occurred before querying OpenAI' },
    };
    return next(error);
  }

  const movieOptions = pineconeQueryResult
    .map(
      (movie, i) =>
        `'''Option ${i}: ${movie.metadata?.title}: ${movie.metadata?.plot}'''`
    )
    .join(', ');

  const instructRole = `
  You are a helpful assistant that recommends movies to users based on their interests.
  `;
  const instructGoal = `
  When given a user's query and a list of movies, recommend a single movie to the user and include a brief one-sentence description without spoilers.
  `;
  const instructFormat = `
  Your response should be in the format:
	"[Movie Title] - [One-sentence description]"
  `;
  const systemMessage = instructRole + instructGoal + instructFormat;

  const userMessage = `
	User request: """I want to watch a movie about: ${userQuery}"""
	Movie options: """${movieOptions}"""
	`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.7,
    });

    const { content } = completion.choices[0].message;
    if (!content) {
      const error: ServerError = {
        log: 'OpenAI did not return a completion',
        status: 500,
        message: { err: 'An error occurred while querying OpenAI' },
      };
      return next(error);
    }

    // set the response on res.locals
    res.locals.movieRecommendation = content;
    return next();
  } catch (err) {
    const error: ServerError = {
      log: `queryOpenAI: ${err}`,
      status: 500,
      message: { err: 'An error occurred while querying OpenAI' },
    };
    return next(error);
  }
};
