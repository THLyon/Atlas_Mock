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
  
  You must:
  - Return EITHER a "titleToFind" (exact case title) OR a "summaryToEmbed" (summary of legal context), but not both.
  - Parse legal filters into "jurisdiction", "legalTopic", and "courtLevel" where applicable.
  - If a user provides only a general legal question, generate a hypothetical summary to embed.
  Ensure output is a strict JSON object matching the provided schema.
  `;
  
  // const systemMessage = `
	// You are an expert query parser.
  // Extract any information that should be used to filter the search -- the only valid filters are years, genre, and director.
  // - For "years", extract the start and end years as "startYear" and "endYear". If the user provides only one year, use it as both "startYear" and "endYear".
	// Given a user's query, determine whether they have provided a movie summary to embed, a title to find, or other.
  // - If the user provides a summary to embed, include it in your response as "summaryToEmbed" and do NOT include a "titleToFind".
  // - Else if the user provides a title to find, include it in your response as "titleToFind" and do NOT include a "summaryToEmbed".
  // - If the user provides "other", generate a hypothetical movie summary based on the user's query and include it in your response as "summaryToEmbed" and do NOT include a "titleToFind".
  // Be sure that your response includes EITHER "summaryToEmbed" OR "titleToFind", but not both.
	// `;

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
  const { userQuery, hybridResults } = res.locals;
  if (!userQuery) {
    const error: ServerError = {
      log: 'queryOpenAIChat did not receive a user query',
      status: 500,
      message: { err: 'An error occurred before querying OpenAI' },
    };
    return next(error);
  }
  if (!hybridResults) {
    const error: ServerError = {
      log: 'queryOpenAIChat did not receive pinecone query results',
      status: 500,
      message: { err: 'An error occurred before querying OpenAI' },
    };
    return next(error);
  }

  const caseOptions = hybridResults.map((doc: any, i: number) =>
  `'''Option ${i} (${doc.source}): ${doc.metadata?.caseTitle || 'Untitled'} - ${doc.text || doc.metadata?.summary}'''`
).join('\n');


  const instructRole = `
  You are a legal assistant that helps interpret legal queries using relevant case summaries.
  `;
  const instructGoal = `
  When given a user's query and a list of legal documents or information, respond appropriately to the information based off of the context, information, and context aware chunking.
  `;
  const instructFormat = `
  "[Case Name] - [One-sentence legal insight or relevance]"
  `;
  const systemMessage = instructRole + instructGoal + instructFormat;

  const userMessage = `
  User legal request: """${userQuery}"""
  Relevant legal context options: """${caseOptions}"""
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
    res.locals.legalAnswer = content;
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
