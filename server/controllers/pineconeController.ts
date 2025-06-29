import { Pinecone, QueryOptions } from '@pinecone-database/pinecone';

import { RequestHandler } from 'express';
import { ServerError, LegalMetadata } from '../../types/types';

// define TOP_K for Pinecone query
const TOP_K = 3;

type Filter = {
  jurisdiction: string;
  legalTopic: string;
  courtLevel: string;
};

//! ==========================
//!          FIX          
//! ==========================

const pinecone = new Pinecone();
const index = pinecone.index<LegalMetadata>('legal-cases');

export const queryPineconeDatabase: RequestHandler = async (
  _req,
  res,
  next
) => {
  // retrieve embedding from res.locals
  const { embedding, structuredQuery } = res.locals;

  if (!embedding) {
    const error: ServerError = {
      log: 'Database query middleware did not receive embedding',
      status: 500,
      message: { err: 'An error occurred before querying the database' },
    };
    return next(error);
  }

  let jurisdictionFilter, topicFilter, courtLevelFilter;

  if (structuredQuery?.filters) {
    const { jurisdiction, legalTopic, courtLevel } = structuredQuery.filters;
    if (jurisdiction) jurisdictionFilter = jurisdiction;
    if (legalTopic) topicFilter = legalTopic;
    if (courtLevel) courtLevelFilter = courtLevel;
  }

    const filter: Partial<Filter> = {};
    if (jurisdictionFilter) filter.jurisdiction = jurisdictionFilter;
    if (topicFilter) filter.legalTopic = topicFilter;
    if (courtLevelFilter) filter.courtLevel = courtLevelFilter;

  const databaseQuery: QueryOptions = {
    vector: embedding,
    topK: TOP_K,
    includeMetadata: true,
  };

  if (Object.keys(filter).length > 0) {
    databaseQuery.filter = filter;
  }

  try {
    const databaseQueryResult = await index.query(databaseQuery);

    databaseQueryResult.matches.forEach(match => console.log(match));

    // store TOP_K matches in res.locals.pineconeQueryResult
    // if the search was based on a title, filter out that title
    res.locals.pineconeQueryResult = databaseQueryResult.matches.filter(match => {
      const { structuredQuery } = res.locals;
      const { titleToFind } = structuredQuery;

      return !titleToFind || 
  (titleToFind.toLowerCase() !== match.metadata?.caseTitle.toLowerCase());

    });

    return next();
  } catch (err) {
    const error: ServerError = {
      log: `queryPineconeDatabase: ${err}`,
      status: 500,
      message: { err: 'An error occurred while querying database' },
    };
    return next(error);
  }
};
