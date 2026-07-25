import { Notification } from '@prisma/client';
import { prisma } from '../../config/database';
import { emitNewNotification } from '../../sockets/socket.server';
import { logger } from '../../config/logger';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { buildPagination } from '../../shared/types';

// ─── Notification Service ─────────────────────────────────────────────────────

export const NotificationService = {
  /**
   * Create a notification in DB and emit via socket.
   * userId = null means broadcast to all connected users.
   */
  async create(data: {
    type: 'ORDER' | 'INVENTORY' | 'AI' | 'DISPATCH' | 'INVOICE';
    title: string;
    message: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Notification> {
    const notification = await prisma.notification.create({
      data: {
        type: data.type,
        title: data.title,
        message: data.message,
        userId: data.userId ?? null,
        metadata: data.metadata ? data.metadata as import('@prisma/client').Prisma.InputJsonValue : undefined,
        isRead: false,
      },
    });

    try {
      emitNewNotification(data.userId ?? null, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
        isRead: false,
      });
    } catch (err) {
      // Socket emission is best-effort; don't fail the request
      logger.warn('Failed to emit notification via socket', { err });
    }

    logger.debug(`Notification created: [${data.type}] ${data.title}`);
    return notification;
  },

  /**
   * Paginated list of notifications for a user (personal + broadcasts).
   */
  async findAll(
    userId: string,
    query: { page: number; limit: number; isRead?: boolean },
  ): Promise<{ data: Notification[]; pagination: ReturnType<typeof buildPagination> }> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const where = {
      OR: [{ userId }, { userId: null }],
      ...(query.isRead !== undefined && { isRead: query.isRead }),
    };

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return { data, pagination: buildPagination(page, limit, total) };
  },

  /**
   * Mark a single notification as read.
   * Validates the notification belongs to the user or is a broadcast.
   */
  async markAsRead(id: string, userId: string): Promise<void> {
    const notification = await prisma.notification.findUnique({ where: { id } });

    if (!notification) {
      throw new NotFoundError('Notification');
    }

    // Must be a broadcast notification OR belong to this user
    if (notification.userId !== null && notification.userId !== userId) {
      throw new BadRequestError('You cannot mark this notification as read');
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  },

  /**
   * Mark all unread notifications as read for a user (personal + broadcasts).
   */
  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        OR: [{ userId }, { userId: null }],
        isRead: false,
      },
      data: { isRead: true },
    });
  },

  /**
   * Count of unread notifications for a user (personal + broadcasts).
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        OR: [{ userId }, { userId: null }],
        isRead: false,
      },
    });
  },
};
