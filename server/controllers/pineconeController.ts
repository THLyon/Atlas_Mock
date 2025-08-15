import { Pinecone } from '@pinecone-database/pinecone';
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
const index = pinecone.index<LegalMetadata>('atlas-mock');

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

  const queryText = res.locals.rawQueryText || userQuery;

  // Use classified intent-based granularity if available
  const intentOverride = res.locals.chunkingStrategy as 'sentence' | 'paragraph' | 'section' | undefined;
  const granularity = intentOverride || selectGranularity(queryText);
  console.log('queryText', queryText)
  console.log(`[Granularity Selection] Using: ${granularity}-level embeddings for query length: ${queryText.length}`);

  const filter: Filter = { type: granularity };

  try {
    const namespace = structuredQuery?.documentNamespace || 'sample_LPA';
    //console.log('[Debug] Embedding vector length:', embedding?.length);

    const result = await index.namespace(namespace).query({
      vector: embedding,
      topK: TOP_K,
      includeMetadata: true,
      filter,
    });
    console.log('[Sample Match Metadata]', result.matches?.[0]?.metadata);
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