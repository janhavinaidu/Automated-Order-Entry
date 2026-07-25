import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { AuthenticatedRequest } from '../shared/types';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const { method, path, ip } = req;
  const user = (req as AuthenticatedRequest).user;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;

    const logData = {
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      ip,
      userId: user?.id ?? 'anonymous',
    };

    if (statusCode >= 500) {
      logger.error('Request error', logData);
    } else if (statusCode >= 400) {
      logger.warn('Client error', logData);
    } else {
      logger.http('Request', logData);
    }
  });

  next();
};
