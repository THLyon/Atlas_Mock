import { spawn } from 'child_process';
import path from 'path';

export const dynamicChunkText = (text: string, query: string): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../../python/dynamic_chunker.py'); //! Interface Layer
    const pythonProcess = spawn('python3', [scriptPath]);

    const payload = JSON.stringify({ text, query });

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

    pythonProcess.stdin.write(payload);
    pythonProcess.stdin.end();
  });
};
