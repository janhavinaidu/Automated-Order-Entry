import { Shipment } from '@prisma/client';
import { prisma } from '../../config/database';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../shared/errors';
import { buildPagination } from '../../shared/types';
import { ORDER_PROGRESS } from '../../shared/constants';
import { NotificationService } from '../notifications/notification.service';
import { logger } from '../../config/logger';

// ─── Dispatch Service ─────────────────────────────────────────────────────────

export const DispatchService = {
  /**
   * Paginated list of shipments with order and customer context.
   */
  async findAll(query: {
    page: number;
    limit: number;
    status?: string;
  }): Promise<{ data: Shipment[]; pagination: ReturnType<typeof buildPagination> }> {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        include: {
          order: { include: { customer: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.shipment.count({ where }),
    ]);

    return { data, pagination: buildPagination(page, limit, total) };
  },

  /**
   * Get a single shipment by ID with full order, items, and customer details.
   */
  async findById(id: string): Promise<Shipment> {
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: true,
            customer: true,
          },
        },
      },
    });

    if (!shipment) throw new NotFoundError('Shipment');
    return shipment;
  },

  /**
   * Create a new shipment for an invoiced order.
   */
  async create(data: {
    orderId: string;
    carrier?: string;
    awbNumber?: string;
    shippingAddress?: string;
    trackingUrl?: string;
    notes?: string;
  }): Promise<Shipment> {
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: { customer: true, shipment: true },
    });

    if (!order) throw new NotFoundError('Order');

    if (order.status !== 'INVOICED') {
      throw new BadRequestError(
        `Order must be in INVOICED status to create a shipment. Current status: ${order.status}`,
      );
    }

    if (order.shipment) {
      throw new ConflictError(`A shipment already exists for order ${order.orderNumber}`);
    }

    const now = new Date();

    const [shipment] = await prisma.$transaction([
      prisma.shipment.create({
        data: {
          orderId: data.orderId,
          carrier: data.carrier ?? null,
          awbNumber: data.awbNumber ?? null,
          shippingAddress: data.shippingAddress ?? null,
          trackingUrl: data.trackingUrl ?? null,
          notes: data.notes ?? null,
          status: 'PENDING',
          dispatchedAt: now,
        },
        include: {
          order: { include: { customer: true } },
        },
      }),
      prisma.order.update({
        where: { id: data.orderId },
        data: {
          status: 'DISPATCHED',
          progress: ORDER_PROGRESS['DISPATCHED'],
        },
      }),
    ]);

    const carrier = data.carrier ?? 'courier';
    const awb = data.awbNumber ?? 'N/A';

    await NotificationService.create({
      type: 'DISPATCH',
      title: 'Order Dispatched',
      message: `Order ${order.orderNumber} dispatched via ${carrier}. AWB: ${awb}`,
      metadata: {
        shipmentId: shipment.id,
        orderId: data.orderId,
        orderNumber: order.orderNumber,
        carrier,
        awbNumber: awb,
      },
    });

    logger.info(`Shipment created for order ${order.orderNumber} via ${carrier}`);
    return shipment;
  },

  /**
   * Update shipment details (carrier, AWB, tracking URL, etc.).
   */
  async update(
    id: string,
    data: {
      carrier?: string;
      awbNumber?: string;
      status?: string;
      trackingUrl?: string;
      notes?: string;
      shippingAddress?: string;
    },
  ): Promise<Shipment> {
    const shipment = await prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundError('Shipment');

    const updated = await prisma.shipment.update({
      where: { id },
      data: {
        ...(data.carrier !== undefined && { carrier: data.carrier }),
        ...(data.awbNumber !== undefined && { awbNumber: data.awbNumber }),
        ...(data.status !== undefined && { status: data.status as 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED' }),
        ...(data.trackingUrl !== undefined && { trackingUrl: data.trackingUrl }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.shippingAddress !== undefined && { shippingAddress: data.shippingAddress }),
      },
      include: {
        order: { include: { customer: true } },
      },
    });

    return updated;
  },

  /**
   * Mark a shipment as delivered and update the parent order status.
   */
  async markDelivered(id: string): Promise<Shipment> {
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: { order: { include: { customer: true } } },
    });

    if (!shipment) throw new NotFoundError('Shipment');

    const now = new Date();

    const [updated] = await prisma.$transaction([
      prisma.shipment.update({
        where: { id },
        data: { status: 'DELIVERED', deliveredAt: now },
        include: { order: { include: { customer: true } } },
      }),
      prisma.order.update({
        where: { id: shipment.orderId },
        data: {
          status: 'DELIVERED',
          progress: ORDER_PROGRESS['DELIVERED'],
        },
      }),
    ]);

    await NotificationService.create({
      type: 'DISPATCH',
      title: 'Order Delivered',
      message: `Order ${shipment.order.orderNumber} delivered to ${shipment.order.customer.company}`,
      metadata: {
        shipmentId: id,
        orderId: shipment.orderId,
        orderNumber: shipment.order.orderNumber,
        customer: shipment.order.customer.company,
      },
    });

    logger.info(`Shipment ${id} marked as delivered for order ${shipment.order.orderNumber}`);
    return updated;
  },

  /**
   * Aggregate dispatch statistics.
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    avgDeliveryDays: number;
  }> {
    const [total, statusGroups, deliveredShipments] = await Promise.all([
      prisma.shipment.count(),
      prisma.shipment.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.shipment.findMany({
        where: {
          status: 'DELIVERED',
          dispatchedAt: { not: null },
          deliveredAt: { not: null },
        },
        select: { dispatchedAt: true, deliveredAt: true },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const g of statusGroups) {
      byStatus[g.status] = g._count._all;
    }

    let avgDeliveryDays = 0;
    if (deliveredShipments.length > 0) {
      const totalMs = deliveredShipments.reduce((acc, s) => {
        const ms = s.deliveredAt!.getTime() - s.dispatchedAt!.getTime();
        return acc + ms;
      }, 0);
      avgDeliveryDays = Math.round(totalMs / deliveredShipments.length / 86_400_000);
    }

    return { total, byStatus, avgDeliveryDays };
  },
};
