import { RequestHandler } from 'express';
import { getRawSectionById } from '../services/mongoService.ts';
import { dynamicChunkText } from '../services/dynamicChunker.ts';
import { classifyQueryIntent } from '../services/queryClassifier.ts';
import { embedChunksAndSearch } from '../services/vectorSearchService.ts';

export const maybeDynamicChunking: RequestHandler = async (req, res, next) => {
  const userQuery = res.locals.userQuery as string | undefined;
  const sectionId = req.body.sectionId as string | undefined;

  if (!userQuery) {
    console.warn('[Dynamic Chunking] Skipping: missing userQuery');
    return next();
  }

  const intent = classifyQueryIntent(userQuery);
  console.log(`[Dynamic Routing] Query: "${userQuery}" ➝ Intent: "${intent}"`);

  if ((intent === 'summary' || intent === 'broad') && sectionId) {
    try {
      const sectionText = await getRawSectionById(sectionId);
      const dynamicChunks = await dynamicChunkText(sectionText, userQuery);
      const results = await embedChunksAndSearch(userQuery, 'custom', dynamicChunks);

      console.log(`[Dynamic Chunking] ${dynamicChunks.length} chunks created from section ${sectionId}`);
      res.locals.hybridResults = results;
    } catch (err) {
      console.error('[Dynamic Chunking] Error:', err);
    }
  }

  return next();
};
