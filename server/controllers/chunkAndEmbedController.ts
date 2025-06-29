import fs from 'fs';
import { RequestHandler } from 'express';
import { exec } from 'child_process';
import util from 'util';
const execAsync = util.promisify(exec);

// expects req.body.filePath (e.g., './uploads/legal.docx')
export const chunkAndEmbed: RequestHandler = async (req, res, next): Promise<void> => {
  const filePath = req.body.filePath;
  if (!filePath || !fs.existsSync(filePath)) {
    res.status(400).json({ err: 'Invalid or missing file path' });
  }

  try {
    const { stdout } = await execAsync(`python3 chunker.py "${filePath}"`);
    const parsedChunks = JSON.parse(stdout);

    // Optionally: push to Pinecone
    res.status(200).json({
      message: 'File chunked successfully',
      chunks: parsedChunks,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ err: 'Error running Python chunker' });
  }
};