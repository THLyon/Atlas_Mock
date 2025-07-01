import { spawn } from 'child_process';
import path from 'path';

export const dynamicChunkText = (text: string, query: string): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../../python/dynamic_chunker.py');

    const pythonProcess = spawn('python3', [scriptPath, '--text', text, '--query', query]);

    let output = '';
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error('[dynamicChunker] stderr:', data.toString());
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) return reject(new Error(`Python exited with code ${code}`));
      try {
        const parsed = JSON.parse(output);
        resolve(parsed.chunks || []);
      } catch (e) {
        reject(new Error('Failed to parse Python JSON output: ' + output));
      }
    });
  });
};
