import { Pinecone, QueryOptions } from '@pinecone-database/pinecone';
import { RequestHandler } from 'express';
import { ServerError, LegalMetadata } from '../../types/types';

const TOP_K = 3;

type Filter = {
  jurisdiction?: string;
  legalTopic?: string;
  courtLevel?: string;
  type?: 'sentence' | 'paragraph' | 'section';
};

const pinecone = new Pinecone();
const index = pinecone.index<LegalMetadata>('legal-cases');

// Determines what granularity to search based on query length
function selectGranularity(query: string): 'sentence' | 'paragraph' | 'section' {
  if (query.length < 50) return 'sentence';
  if (query.length < 200) return 'paragraph';
  return 'section';
}

export const queryPineconeDatabase: RequestHandler = async (_req, res, next) => {
  const { embedding, structuredQuery, userQuery } = res.locals;

  if (!embedding) {
    const error: ServerError = {
      log: 'queryPineconeDatabase: Missing embedding',
      status: 500,
      message: { err: 'Embedding not found in request context' },
    };
    return next(error);
  }

  const queryText = structuredQuery?.summaryToEmbed || userQuery || '';
  const granularity = selectGranularity(queryText);

  const filter: Filter = { type: granularity };

  // Add structured filters if present
  if (structuredQuery?.filters) {
    const { jurisdiction, legalTopic, courtLevel } = structuredQuery.filters;
    if (jurisdiction) filter.jurisdiction = jurisdiction;
    if (legalTopic) filter.legalTopic = legalTopic;
    if (courtLevel) filter.courtLevel = courtLevel;
  }

  const queryOptions: QueryOptions = {
    vector: embedding,
    topK: TOP_K,
    includeMetadata: true,
    filter,
  };

  try {
    const result = await index.query(queryOptions);

    const matches = result.matches.filter((match) => {
      const { titleToFind } = structuredQuery || {};
      if (!titleToFind) return true;
      return match.metadata?.caseTitle?.toLowerCase() !== titleToFind.toLowerCase();
    });

    res.locals.pineconeQueryResult = matches;
    return next();
  } catch (err) {
    const error: ServerError = {
      log: `queryPineconeDatabase: ${err}`,
      status: 500,
      message: { err: 'An error occurred while querying Pinecone' },
    };
    return next(error);
  }
};
