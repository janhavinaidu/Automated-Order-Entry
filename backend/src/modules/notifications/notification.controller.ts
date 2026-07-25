import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../shared/types';
import { sendSuccess } from '../../shared/types';
import { NotificationService } from './notification.service';
import { BadRequestError } from '../../shared/errors';
import { prisma } from '../../config/database';

const createNotificationSchema = z.object({
  type: z.enum(['ORDER', 'INVENTORY', 'AI', 'DISPATCH', 'INVOICE']).default('INVENTORY'),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  metadata: z.record(z.unknown()).optional(),
});

// ─── Create Notification (report issue to admin) ──────────────────────────────

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createNotificationSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const reporter = (req as AuthenticatedRequest).user!;
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    const metadata = {
      ...parsed.data.metadata,
      issueKind: 'MANUAL' as const,
      reportedBy: reporter.name,
      reportedById: reporter.id,
    };

    for (const admin of admins) {
      await NotificationService.create({
        type: parsed.data.type,
        title: parsed.data.title,
        message: parsed.data.message,
        userId: admin.id,
        metadata,
      });
    }

    sendSuccess(res, null, 'Issue reported to admin successfully');
  } catch (error) {
    next(error);
  }
};

// ─── List Notifications ───────────────────────────────────────────────────────

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
    const isReadParam = req.query.isRead as string | undefined;
    const isRead = isReadParam === 'true' ? true : isReadParam === 'false' ? false : undefined;

    const result = await NotificationService.findAll(userId, { page, limit, isRead });
    sendSuccess(res, result.data, undefined, 200, result.pagination);
  } catch (error) {
    next(error);
  }
};

// ─── Get Unread Count ─────────────────────────────────────────────────────────

export const unreadCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const count = await NotificationService.getUnreadCount(userId);
    sendSuccess(res, { count });
  } catch (error) {
    next(error);
  }
};

// ─── Mark Single Notification as Read ────────────────────────────────────────

export const markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const { id } = req.params;
    if (!id) throw new BadRequestError('Notification ID is required');
    await NotificationService.markAsRead(id, userId);
    sendSuccess(res, null, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
};

// ─── Mark All Notifications as Read ──────────────────────────────────────────

export const markAllAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    await NotificationService.markAllAsRead(userId);
    sendSuccess(res, null, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};

// ─── Resolve Inventory Issue (ADMIN only) ────────────────────────────────────

export const resolveIssue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { prisma } = await import('../../config/database');
    const { id } = req.params;
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }
    await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        metadata: {
          ...(notification.metadata as Record<string, unknown> ?? {}),
          resolved: true,
          resolvedAt: new Date().toISOString(),
        } as import('@prisma/client').Prisma.InputJsonValue,
      },
    });
    sendSuccess(res, null, 'Issue marked as resolved');
  } catch (error) {
    next(error);
  }
};
