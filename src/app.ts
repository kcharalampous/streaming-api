import 'reflect-metadata';

import path from 'node:path';
import { apiReference } from '@scalar/express-api-reference';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { RegisterRoutes } from './generated/routes';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

const app = express();

const isDev = process.env.NODE_ENV !== 'production';

app.use(helmet({ contentSecurityPolicy: !isDev }));
app.use(cors());
app.use(express.json());

app.post(
  '/*path',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  })
);

RegisterRoutes(app);

if (isDev) {
  app.get('/openapi.json', (_req, res) => {
    res.sendFile(path.join(__dirname, 'generated', 'swagger.json'));
  });

  app.use('/docs', apiReference({ spec: { url: '/openapi.json' } }));
}

app.use(notFound);
app.use(errorHandler);

export default app;
