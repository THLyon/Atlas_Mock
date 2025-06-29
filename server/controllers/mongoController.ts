import { findLegalCaseByTitle } from '../models/mongoModel.js';
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
    // console.log('res.locals.structuredQuery', res.locals.structuredQuery);
    return next();
  } catch (err) {
    const error: ServerError = {
      log: `queryMongoDatabase: ${err}`,
      status: 500,
      message: { err: 'An error occurred while querying Mongo database' },
    };
    return next(error);
  }
};
