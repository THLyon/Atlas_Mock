import { RequestHandler } from 'express';
import { queryBM25 } from './mongoController.ts';
import { queryPineconeDatabase } from './pineconeController.ts';

export const hybridQueryController: RequestHandler = async (req, res, next) => {
  const { userQuery } = res.locals;
  if (!userQuery) {
    return next({
      log: 'hybridQueryController: userQuery missing',
      status: 400,
      message: { err: 'User query required for hybrid retrieval' },
    });
  }

  try {
    const [bm25Results, pineconeResults] = await Promise.all([
      queryBM25(userQuery),
      (async () => {
        await queryPineconeDatabase(req, res, () => {});
        return res.locals.pineconeQueryResult || [];
      })(),
    ]);

    // Normalize and merge results (you can deduplicate if needed)
    const combinedResults = [...bm25Results, ...pineconeResults];

    // Optional: sort or re-rank
    const sorted = combinedResults.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    res.locals.hybridResults = sorted;
    return next();
  } catch (err) {
    return next({
      log: `hybridQueryController: ${err}`,
      status: 500,
      message: { err: 'Hybrid retrieval failed' },
    });
  }
};
