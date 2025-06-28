import { Pinecone, QueryOptions } from '@pinecone-database/pinecone';

import { RequestHandler } from 'express';
import { ServerError, MovieMetadata } from '../../types/types';

// define TOP_K for Pinecone query
const TOP_K = 3;

type Filter = {
  year: { $gte: number; $lte: number };
  genre: string;
  director: string;
};

const pinecone = new Pinecone();
const index = pinecone.index<MovieMetadata>('movies');

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

  let yearFilter, genreFilter, directorFilter;

  if (structuredQuery?.filters) {
    const { years, genre, director } = structuredQuery.filters;
    if (years) {
      yearFilter = {
        $gte: years.startYear,
        $lte: years.endYear,
      };
    }
    if (genre) {
      genreFilter = genre;
    }
    if (director) {
      directorFilter = director;
    }
  }

  const filter: Partial<Filter> = {};
  if (yearFilter) filter.year = yearFilter;
  if (genreFilter) filter.genre = genreFilter;
  if (directorFilter) filter.director = directorFilter;

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
        (titleToFind.toLowerCase() !== match.metadata?.title.toLowerCase());
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
