import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import 'dotenv/config';

// import { addReqId } from './logger.js';

import { parseUserQuery } from './controllers/userQueryController.js';
import {
  queryOpenAIParse,
  queryOpenAIEmbedding,
  queryOpenAIChat,
} from './controllers/openaiController.js';
import { queryPineconeDatabase } from './controllers/pineconeController.js';
import { queryByTitle } from './controllers/mongoController.js';
// import { logQuery } from './controllers/loggingController.js';
import { ingestChunks } from './controllers/ingestController';

import { ServerError } from '../types/types.js';

const app = express();

// app.use(addReqId);

app.use(cors());
app.use(express.json());

app.post(
  '/api',
  parseUserQuery,
  queryOpenAIParse,
  queryByTitle,
  queryOpenAIEmbedding,
  queryPineconeDatabase,
  queryOpenAIChat,
  (_req, res) => {
    res.status(200).json({
      legalAnswer: res.locals.legalAnswer,
    });
  }
);

app.post('/api/ingest', ingestChunks);

const errorHandler: ErrorRequestHandler = (
  err: ServerError,
  _req,
  res,
  _next
) => {
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
