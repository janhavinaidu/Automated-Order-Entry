import { ManufacturingJob } from '@prisma/client';
import { prisma } from '../../config/database';
import {
  NotFoundError,
  BadRequestError,
  InvalidTransitionError,
} from '../../shared/errors';
import { buildPagination } from '../../shared/types';
import { addBusinessDays } from '../../shared/utils';
import { NotificationService } from '../notifications/notification.service';
import { logger } from '../../config/logger';

// ─── Valid Status Transitions ─────────────────────────────────────────────────
const MFG_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

// ─── Manufacturing Service ────────────────────────────────────────────────────

export const ManufacturingService = {
  /**
   * Paginated list of manufacturing jobs with order and item context.
   */
  async findAll(query: {
    page: number;
    limit: number;
    status?: string;
    orderId?: string;
  }): Promise<{ data: ManufacturingJob[]; pagination: ReturnType<typeof buildPagination> }> {
    const { page, limit, status, orderId } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (orderId) where.orderId = orderId;

    const [data, total] = await Promise.all([
      prisma.manufacturingJob.findMany({
        where,
        include: {
          order: { include: { customer: true } },
          orderItem: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.manufacturingJob.count({ where }),
    ]);

    return { data, pagination: buildPagination(page, limit, total) };
  },

  /**
   * Get a single manufacturing job by ID.
   */
  async findById(id: string): Promise<ManufacturingJob> {
    const job = await prisma.manufacturingJob.findUnique({
      where: { id },
      include: {
        order: { include: { customer: true } },
        orderItem: true,
      },
    });

    if (!job) throw new NotFoundError('Manufacturing job');
    return job;
  },

  /**
   * Manually create a manufacturing job for an approved or in-manufacturing order.
   */
  async create(data: {
    orderId: string;
    orderItemId?: string;
    description: string;
    quantityRequired: number;
    estimatedCompletion?: Date;
    notes?: string;
  }): Promise<ManufacturingJob> {
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      select: { id: true, status: true, orderNumber: true },
    });

    if (!order) throw new NotFoundError('Order');

    if (!['APPROVED', 'MANUFACTURING'].includes(order.status)) {
      throw new BadRequestError(
        `Order must be in APPROVED or MANUFACTURING status to create a manufacturing job. Current status: ${order.status}`,
      );
    }

    const job = await prisma.manufacturingJob.create({
      data: {
        orderId: data.orderId,
        orderItemId: data.orderItemId ?? null,
        description: data.description,
        quantityRequired: data.quantityRequired,
        estimatedCompletion: data.estimatedCompletion ?? addBusinessDays(new Date(), 5),
        notes: data.notes ?? null,
        status: 'PENDING',
      },
      include: {
        order: { include: { customer: true } },
        orderItem: true,
      },
    });

    await NotificationService.create({
      type: 'ORDER',
      title: 'Manufacturing Job Created',
      message: `Manufacturing started for ${data.quantityRequired} units — Order ${order.orderNumber}`,
      metadata: { jobId: job.id, orderId: data.orderId, orderNumber: order.orderNumber },
    });

    logger.info(`Manufacturing job created: ${job.id} for order ${order.orderNumber}`);
    return job;
  },

  /**
   * Auto-create manufacturing jobs for all items with insufficient inventory on order approval.
   * Called when order transitions to APPROVED status.
   */
  async autoCreateForOrder(orderId: string): Promise<ManufacturingJob[]> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new NotFoundError('Order');

    const createdJobs: ManufacturingJob[] = [];

    for (const item of order.items) {
      if (!['PARTIAL', 'UNAVAILABLE'].includes(item.inventoryStatus)) continue;

      const shortfall = Math.max(0, item.quantity - item.availableQty);
      if (shortfall <= 0) continue;

      const job = await prisma.manufacturingJob.create({
        data: {
          orderId: order.id,
          orderItemId: item.id,
          description: `Manufacture ${shortfall}x ${item.name} for order ${order.orderNumber}`,
          quantityRequired: shortfall,
          estimatedCompletion: addBusinessDays(new Date(), 5),
          status: 'PENDING',
        },
        include: {
          order: { include: { customer: true } },
          orderItem: true,
        },
      });

      createdJobs.push(job);
      logger.info(`Auto-created manufacturing job ${job.id}: ${shortfall}x ${item.name}`);
    }

    if (createdJobs.length > 0) {
      // Update order to MANUFACTURING status
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'MANUFACTURING', progress: 62 },
      });

      await NotificationService.create({
        type: 'ORDER',
        title: 'Manufacturing Started',
        message: `${createdJobs.length} manufacturing job(s) created for order ${order.orderNumber}`,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          jobCount: createdJobs.length,
        },
      });
    }

    return createdJobs;
  },

  /**
   * Update the status of a manufacturing job with valid state machine transitions.
   */
  async updateStatus(
    id: string,
    data: {
      status: string;
      quantityCompleted?: number;
      notes?: string;
    },
  ): Promise<ManufacturingJob> {
    const job = await prisma.manufacturingJob.findUnique({
      where: { id },
      include: { order: { include: { customer: true } }, orderItem: true },
    });

    if (!job) throw new NotFoundError('Manufacturing job');

    const allowed = MFG_TRANSITIONS[job.status] ?? [];
    if (!allowed.includes(data.status)) {
      throw new InvalidTransitionError(job.status, data.status);
    }

    const updateData: Record<string, unknown> = {
      status: data.status,
      ...(data.notes !== undefined && { notes: data.notes }),
    };

    if (data.status === 'IN_PROGRESS') {
      updateData.startedAt = new Date();
    }

    if (data.status === 'COMPLETED') {
      const qty = data.quantityCompleted ?? job.quantityRequired;
      updateData.quantityCompleted = qty;
      updateData.completedAt = new Date();

      // Update linked inventory item if present
      if (job.orderItemId) {
        const orderItem = await prisma.orderItem.findUnique({
          where: { id: job.orderItemId },
          select: { inventoryItemId: true },
        });

        if (orderItem?.inventoryItemId) {
          await prisma.inventoryItem.update({
            where: { id: orderItem.inventoryItemId },
            data: {
              availableQty: { increment: qty },
              totalQty: { increment: qty },
            },
          });
        }
      }

      // Check if all jobs for the order are completed
      const [allJobs, completedCount] = await Promise.all([
        prisma.manufacturingJob.count({ where: { orderId: job.orderId } }),
        prisma.manufacturingJob.count({
          where: {
            orderId: job.orderId,
            status: { in: ['COMPLETED', 'CANCELLED'] },
          },
        }),
      ]);

      // completedCount + 1 because current job update hasn't persisted yet
      if (completedCount + 1 >= allJobs) {
        await NotificationService.create({
          type: 'ORDER',
          title: 'All Manufacturing Jobs Completed',
          message: `All manufacturing jobs for order ${job.order.orderNumber} are complete. Ready to invoice.`,
          metadata: { orderId: job.orderId, orderNumber: job.order.orderNumber },
        });
      }

      await NotificationService.create({
        type: 'ORDER',
        title: 'Manufacturing Job Completed',
        message: `Manufacturing job completed: ${qty} units of ${job.description}`,
        metadata: { jobId: job.id, orderId: job.orderId },
      });
    }

    const updated = await prisma.manufacturingJob.update({
      where: { id },
      data: updateData,
      include: {
        order: { include: { customer: true } },
        orderItem: true,
      },
    });

    logger.info(`Manufacturing job ${id} status updated: ${job.status} → ${data.status}`);
    return updated;
  },

  /**
   * Aggregate statistics for manufacturing dashboard.
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    avgCompletionDays: number;
  }> {
    const [total, statusGroups, completedJobs] = await Promise.all([
      prisma.manufacturingJob.count(),
      prisma.manufacturingJob.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.manufacturingJob.findMany({
        where: {
          status: 'COMPLETED',
          startedAt: { not: null },
          completedAt: { not: null },
        },
        select: { startedAt: true, completedAt: true },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const g of statusGroups) {
      byStatus[g.status] = g._count._all;
    }

    let avgCompletionDays = 0;
    if (completedJobs.length > 0) {
      const totalMs = completedJobs.reduce((acc, j) => {
        const ms = j.completedAt!.getTime() - j.startedAt!.getTime();
        return acc + ms;
      }, 0);
      avgCompletionDays = Math.round(totalMs / completedJobs.length / 86_400_000);
    }

    return { total, byStatus, avgCompletionDays };
  },
};
