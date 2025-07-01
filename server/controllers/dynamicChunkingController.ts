import { Request, Response } from 'express';
import { getRawSectionById } from '../services/mongoService.ts';
import { dynamicChunkText } from '../services/dynamicChunker.ts';
import { classifyQueryIntent } from '../services/queryClassifier.ts';
import { embedChunksAndSearch } from '../services/vectorSearchService.ts';

export const handleQueryWithDynamicChunking = async (req: Request, res: Response) => {
  try {
    const { query, sectionId } = req.body;
    const intent = classifyQueryIntent(query);

    if (intent === 'definition' || intent === 'fact') {
      // Use standard vector retrieval (sentence/paragraph)
      const results = await embedChunksAndSearch(query, 'sentence');
      return res.json({ intent, results });
    }

    if (!sectionId) {
      return res.status(400).json({ error: 'sectionId is required for dynamic chunking.' });
    }

    const sectionText = await getRawSectionById(sectionId);
    const dynamicChunks = await dynamicChunkText(sectionText, query);

    const results = await embedChunksAndSearch(query, 'custom', dynamicChunks);

    return res.json({ intent, dynamicChunks, results });
  } catch (err) {
    console.error('Dynamic chunking error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
