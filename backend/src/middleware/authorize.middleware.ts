import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../shared/errors';
import { AuthenticatedRequest } from '../shared/types';

/**
 * Role-based access control middleware.
 * Must be used AFTER the `authenticate` middleware.
 *
 * Usage: router.get('/admin-route', authenticate, authorize('ADMIN'), handler)
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError(
        `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${user.role}`,
      );
    }

    next();
  };
};
