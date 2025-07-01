import express, { ErrorRequestHandler, Request, Response  } from 'express';
import cors from 'cors';
import 'dotenv/config';
import fs from 'fs';

// import { addReqId } from './logger.js';

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


import { ServerError } from '../types/types';

const app = express();

// app.use(addReqId);

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.send('Server is running');
});

app.post(
  '/api',
  parseUserQuery,
  queryOpenAIParse,
  queryByTitle,
  queryOpenAIEmbedding,
  hybridQueryController,
  queryOpenAIChat,  
  (_req, res) => {
    res.status(200).json({
      legalAnswer: res.locals.legalAnswer,
    });
  }
);

app.post('/dynamic-query', async (req: Request, res: Response, next) => {
  try {
    await handleQueryWithDynamicChunking(req, res);
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
    const chunks = JSON.parse(raw);
    const fakeReq = { body: { chunks, documentId: 'sample_LPA' } } as Request;
    const fakeRes = {
      status: (code: number) => ({
        json: (payload: any) => res.status(code).json(payload),
      }),
    } as unknown as Response;
    const next = () => {};
    await ingestChunks(fakeReq, fakeRes);
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










// // server/app.ts
// import express from 'express';
// import cors from 'cors';
// import bodyParser from 'body-parser';
// import {chunkAndEmbed} from './controllers/chunkAndEmbedController.js';
// import { ingestChunks } from './controllers/ingestController.js';

// const app = express();
// app.use(cors());
// app.use(bodyParser.json());

// app.post('/api/ingest', chunkAndEmbed, ingestChunks);

// // debug-ingest route (optional)
// import fs from 'fs';
// import { Request, Response } from 'express';

// app.get('/debug-ingest', async (_req, res) => {
//   try {
//     const raw = fs.readFileSync('./flattened_chunks.json', 'utf-8');
//     const chunks = JSON.parse(raw);
//     const fakeReq = { body: { chunks, documentId: 'debug-123' } } as Request;
//     const fakeRes = {
//       status: (code: number) => ({
//         json: (payload: any) => res.status(code).json(payload),
//       }),
//     } as unknown as Response;
//     const next = () => {};
//     await ingestChunks(fakeReq, fakeRes, next);
//   } catch (err) {
//     console.error('Manual run failed:', err);
//     res.status(500).json({ error: 'Manual run failed' });
//   }
// });

// export default app;
