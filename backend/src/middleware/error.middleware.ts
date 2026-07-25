import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../shared/errors';
import { logger } from '../config/logger';
import { env } from '../config/env';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  // ─── Operational Errors (expected) ─────────────────────────────────────────
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('Operational error', {
        message: err.message,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method,
        stack: err.stack,
      });
    } else {
      logger.warn('Client error', {
        message: err.message,
        statusCode: err.statusCode,
        path: req.path,
      });
    }

    const body: Record<string, unknown> = {
      success: false,
      message: err.message,
    };
    if (err.errors) body.errors = err.errors;
    if (env.IS_DEVELOPMENT) body.stack = err.stack;
    res.status(err.statusCode).json(body);
    return;
  }

  // ─── Zod Validation Errors ─────────────────────────────────────────────────
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: err.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
    return;
  }

  // ─── Prisma Errors ─────────────────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') ?? 'field';
      res.status(409).json({
        success: false,
        message: `Duplicate value for unique field: ${target}`,
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Record not found' });
      return;
    }

    if (err.code === 'P2003') {
      res.status(409).json({
        success: false,
        message: 'Operation failed: referenced record does not exist',
      });
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error('Prisma validation error:', err);
    res.status(400).json({ success: false, message: 'Invalid data provided to database' });
    return;
  }

  // ─── Multer Errors ─────────────────────────────────────────────────────────
  if (err.name === 'MulterError') {
    const multerErr = err as unknown as { code: string };
    if (multerErr.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ success: false, message: 'File size exceeds maximum limit' });
      return;
    }
    res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    return;
  }

  // ─── Unexpected Errors ─────────────────────────────────────────────────────
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const body: Record<string, unknown> = {
    success: false,
    message: env.IS_PRODUCTION ? 'An internal server error occurred' : err.message,
  };
  if (env.IS_DEVELOPMENT) body.stack = err.stack;
  res.status(500).json(body);
};

// ─── 404 Handler ───────────────────────────────────────────────────────────────
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
};
