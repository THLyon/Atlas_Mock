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
      queryBM25(userQuery), // returns objects with .source = 'sparse'
      (async () => {
        await queryPineconeDatabase(req, res, () => {});
        const pineconeRaw = res.locals.pineconeQueryResult || [];
        // console.log("PINECONE RAW", pineconeRaw)
        return pineconeRaw.map((r: any) => ({
          ...r,
          source: 'dense', //  normalize Pinecone results
        }));
      })(),
    ]);

    const combinedResults = [...bm25Results, ...pineconeResults];
    console.log(`[Hybrid Retrieval] BM25 results: ${bm25Results.length}, Pinecone results: ${pineconeResults.length}`);

    const sorted = combinedResults.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    console.log(`[Hybrid Retrieval] Top result sources:`, sorted.map(r => r.source || 'unknown').slice(0, 3));

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
