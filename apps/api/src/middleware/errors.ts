import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

import { HttpError } from '@antigravity/db';
import { logger } from '../logger.js';

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof HttpError) {
    logger.warn({ err: error }, 'Request failed with HttpError');
    res.status(error.statusCode).json({
      success: false,
      error: error.errorCode,
      message: error.message,
    });
    return;
  }

  if (error instanceof ZodError) {
    logger.warn({ err: error }, 'Request validation failed');
    const issue = error.issues[0];
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: issue?.message ?? 'Validation failed.',
    });
    return;
  }

  if (error instanceof Error) {
    logger.error({ err: error }, 'Unexpected API error');
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message,
    });
    return;
  }

  logger.error({ err: error }, 'Unknown API error payload');
  res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'Unexpected server error.',
  });
}
