import { findLegalCaseByTitle, getDb } from '../models/mongoModel.ts';
import { RequestHandler } from 'express';
import { ServerError } from '../../types/types';


export const queryByTitle: RequestHandler = async (_req, res, next) => {
  const { structuredQuery } = res.locals;

  if (!structuredQuery) {
    const error: ServerError = {
      log: 'mongoController.queryByTitle did not receive structuredQuery',
      status: 500,
      message: { err: 'An error occurred before querying the database' },
    };
    return next(error);
  }

  const { titleToFind } = structuredQuery;

  if (typeof titleToFind !== 'string') {
    return next();
  }

  try {
    const titleQueryResult = await findLegalCaseByTitle(titleToFind);
    if (!titleQueryResult) return next();

    res.locals.structuredQuery.summaryToEmbed = titleQueryResult.summary;
    console.log('titleQueryResult', titleQueryResult);
    next();
  } catch (err) {
    const error: ServerError = {
      log: `queryMongoDatabase: ${err}`,
      status: 500,
      message: { err: 'An error occurred while querying Mongo database' },
    };
    return next(error);
  }
};

export async function queryBM25(query: string) {
  const db = await getDb();
  const chunks = await db.collection('chunks')
    .find({ $text: { $search: query } }, { projection: { score: { $meta: 'textScore' } } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(10)
    .toArray();

    return chunks.map((c: any) => ({
      id: c._id.toString(),
      text: c.text,
      metadata: c.metadata || {},
      score: c.score,
      source: 'sparse',
    }));
    
}