import fs from 'fs';
import path from 'path'; 
import { Request, Response, NextFunction } from 'express';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export const chunkAndEmbed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const filePath = req.body.filePath;
  const documentId = req.body.documentId;

  console.log('[chunkAndEmbed] Received filePath:', filePath);
  console.log('[chunkAndEmbed] Received documentId:', documentId);

  if (!filePath || !fs.existsSync(filePath)) {
    console.error('[chunkAndEmbed] File path invalid or file does not exist.');
    res.status(400).json({ err: 'Invalid or missing file path' });
    return;
  }

  try {
    const absolutePath = path.resolve(filePath);
    console.log(`[chunkAndEmbed] Resolved absolute path: ${absolutePath}`);

    console.log('[chunkAndEmbed] Running Python chunker...');

    try {
      const { stdout, stderr } = await execAsync(`python3 chunker.py "${absolutePath}"`);
      console.log('[chunkAndEmbed] Python stdout:', stdout);
      if (stderr) console.warn('[chunkAndEmbed] ⚠️ Python stderr:', stderr);
    } catch (execErr) {
      console.error('[chunkAndEmbed] Python process failed:', execErr);
      res.status(500).json({ err: 'Python chunker failed to run' });
      return;
    }

    const outputFile = 'flattened_chunks.json';

    if (!fs.existsSync(outputFile)) {
      console.error('[chunkAndEmbed] flattened_chunks.json not found after chunking.');
      res.status(500).json({ err: 'Flattened chunk file missing' });
      return;
    }

    const raw = fs.readFileSync(outputFile, 'utf-8');
    console.log(`[chunkAndEmbed] Read flattened_chunks.json (${raw.length} characters)`);

    let parsedChunks;
    try {
      parsedChunks = JSON.parse(raw);
    } catch (jsonErr) {
      console.error('[chunkAndEmbed] Failed to parse JSON:', jsonErr);
      res.status(500).json({ err: 'Failed to parse chunk JSON' });
      return;
    }

    if (!Array.isArray(parsedChunks)) {
      console.error('[chunkAndEmbed] Parsed chunks is not an array:', typeof parsedChunks);
      res.status(500).json({ err: 'Parsed chunks is not a valid array' });
      return;
    }

    console.log(`[chunkAndEmbed] Parsed ${parsedChunks.length} chunks`);
    console.log('[chunkAndEmbed] Sample chunk:', parsedChunks[0]);

    req.body.chunks = parsedChunks;
    req.body.documentId = documentId;

    console.log('[chunkAndEmbed] Passing to ingestChunks...');
    next();
  } catch (err) {
    console.error('Error in chunkAndEmbed:', err);
    res.status(500).json({ err: 'Chunking failed' });
  }
};
