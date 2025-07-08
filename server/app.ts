import express, { ErrorRequestHandler, Request, Response  } from 'express';
import cors from 'cors';
import 'dotenv/config';
import fs from 'fs';

// import { addReqId } from './logger.js';
import 'dotenv/config';
import { parseUserQuery } from './controllers/userQueryController.ts';
import {
  queryOpenAIParse,
  queryOpenAIEmbedding,
  queryOpenAIChat,
} from './controllers/openaiController.ts';
import { queryPineconeDatabase } from './controllers/pineconeController.ts';
import { queryByTitle } from './controllers/mongoController.ts';
// import { logQuery } from './controllers/loggingController.js';
import { ingestChunks } from './controllers/ingestController.ts';
import {chunkAndEmbed} from './controllers/chunkAndEmbedController.ts'
import {hybridQueryController} from './controllers/hybridQueryController.ts'
import { handleQueryWithDynamicChunking } from './controllers/dynamicChunkingController.ts'
import { ensureTextIndexOnChunks } from './models/mongoModel.ts';
import { maybeDynamicChunking } from './controllers/dynamicChunkingMiddleware.ts';



import { ServerError } from '../types/types';

const app = express();
ensureTextIndexOnChunks().catch(console.error);

// app.use(addReqId);

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.send('Server is running');
});

app.post(
  '/api',
  parseUserQuery,        // <-- Extracts user query
  queryOpenAIParse,      // <-- Classifies: parses query intent (summary vs. title) + filters, extracts filter metadata and resolves (e.g., parties, clauses)
  queryByTitle,          // <-- Pulls case summaries if title exists; fetches from MongoDB via BM25
  queryOpenAIEmbedding,  // <-- generates embedding for sentence/para/section based on query length, Intelligent embedding level based on input length
  maybeDynamicChunking,  // <-- Dynamic chunking happens here if needed
  hybridQueryController, // <-- combines BM25 + Pinecone (dense + sparse)
  queryOpenAIChat,       // <-- runs GPT-4o with compressed prompt for final response, compressChunks() summarizes top-k chunks before chat completion
  (_req, res) => {
    res.status(200).json({
      legalAnswer: res.locals.legalAnswer,
    });
  }
);

app.post('/dynamic-query', async (req: Request, res: Response, next) => {
  try {
    await handleQueryWithDynamicChunking(req, res); // <-- dynamically chunks section based on query & intent, / <-- routes based on `definition` | `summary` | `broad`
  } catch (err) {
    next(err);
  }
});

app.post('/api/ingest', chunkAndEmbed, ingestChunks, (_req, res) => {
  res.status(200).json({ msg: 'Made it through all middlewares' });
});



app.get('/debug-ingest', async (_req, res) => {
  try {
    const raw = fs.readFileSync('./flattened_chunks.json', 'utf-8');
    const { chunks, rawSections, documentId } = JSON.parse(raw);
    
    const fakeReq = {
      body: { chunks, rawSections, documentId },
    } as Request;

    const fakeRes = {
      status: (code: number) => ({
        json: (payload: any) => res.status(code).json(payload),
      }),
    } as unknown as Response;

    await ingestChunks(fakeReq, fakeRes, () => {});
  } catch (err) {
    console.error('Manual run failed:', err);
    res.status(500).json({ error: 'Manual run failed' });
  }
});

const errorHandler: ErrorRequestHandler = (
  err: ServerError,
  _req,
  res,
  _next
) => {
  console.error('Caught in errorHandler:', err); 
  const defaultErr: ServerError = {
    log: 'Express error handler caught unknown middleware error',
    status: 500,
    message: { err: 'An error occurred' },
  };
  const errorObj: ServerError = { ...defaultErr, ...err };
  console.log(errorObj.log);
  res.status(errorObj.status).json(errorObj.message);
};

app.use(errorHandler);

export default app;