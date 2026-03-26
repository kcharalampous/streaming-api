import type { NextFunction, Request, Response } from 'express';
import logger from '../lib/logger';

interface HttpError extends Error {
  statusCode?: number;
  status?: number;
  fields?: Record<string, unknown>;
}

export const errorHandler = (err: HttpError, req: Request, res: Response, _next: NextFunction) => {
  if (err.name === 'ValidateError' && err.fields) {
    return res.status(422).json({ error: 'Validation failed', fields: err.fields });
  }

  const statusCode = err.statusCode ?? err.status ?? 500;
  if (statusCode >= 500) {
    logger.error({ err }, err.message);
  }
  res.status(statusCode).json({ error: err.message || 'Internal server error' });
};
