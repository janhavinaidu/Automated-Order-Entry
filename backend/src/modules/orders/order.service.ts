import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { OrderStatus } from '@prisma/client';
import {
  ORDER_STATUS_TRANSITIONS,
  ORDER_PROGRESS,
  ORDER_TIMELINE_STEPS,
  SOCKET_EVENTS,
} from '../../shared/constants';
import { buildPagination } from '../../shared/types';
import { generateOrderNumber } from '../../shared/utils';
import {
  NotFoundError,
  BadRequestError,
  InvalidTransitionError,
} from '../../shared/errors';
import {
  emitOrderUpdate,
  emitToDashboard,
} from '../../sockets/socket.server';
import { NotificationService } from '../notifications/notification.service';

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface CreateOrderItem {
  inventoryItemId?: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderInput {
  customerId: string;
  emailId?: string;
  items: CreateOrderItem[];
  deliveryDate?: string;
  priority?: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  notes?: string;
  createdById?: string;
}

export interface UpdateOrderInput {
  deliveryDate?: string;
  priority?: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  notes?: string;
}

export interface ListOrdersQuery {
  page: number;
  limit: number;
  status?: string;
  customerId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  priority?: string;
}

// ─── Inventory Status Helper ──────────────────────────────────────────────────

function resolveInventoryStatus(
  availableQty: number,
  requestedQty: number,
): { inventoryStatus: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE'; availableQty: number } {
  if (availableQty <= 0) {
    return { inventoryStatus: 'UNAVAILABLE', availableQty: 0 };
  }
  if (availableQty >= requestedQty) {
    return { inventoryStatus: 'AVAILABLE', availableQty };
  }
  return { inventoryStatus: 'PARTIAL', availableQty };
}

// ─── Inventory Item Status Recalculator ───────────────────────────────────────

function computeInventoryItemStatus(
  totalQty: number,
  availableQty: number,
): 'HEALTHY' | 'LOW' | 'CRITICAL' {
  if (totalQty === 0 || availableQty <= 0) return 'CRITICAL';
  const ratio = availableQty / totalQty;
  if (ratio < 0.1) return 'CRITICAL';
  if (ratio < 0.25) return 'LOW';
  return 'HEALTHY';
}

// ─── Build Notification Message by Status ────────────────────────────────────

function buildStatusNotification(
  status: string,
  orderNumber: string,
  customerCompany: string,
): { title: string; message: string } {
  const map: Record<string, { title: string; message: string }> = {
    PROCESSING: {
      title: 'Order Under Processing',
      message: `Order ${orderNumber} for ${customerCompany} is now being processed`,
    },
    APPROVED: {
      title: 'Order Approved',
      message: `Order ${orderNumber} for ${customerCompany} has been approved`,
    },
    MANUFACTURING: {
      title: 'Manufacturing Started',
      message: `Order ${orderNumber} has entered the manufacturing stage`,
    },
    INVOICED: {
      title: 'Invoice Generated',
      message: `Invoice has been generated for order ${orderNumber}`,
    },
    DISPATCHED: {
      title: 'Order Dispatched',
      message: `Order ${orderNumber} for ${customerCompany} has been dispatched`,
    },
    DELIVERED: {
      title: 'Order Delivered',
      message: `Order ${orderNumber} has been marked as delivered`,
    },
    REJECTED: {
      title: 'Order Rejected',
      message: `Order ${orderNumber} for ${customerCompany} has been rejected`,
    },
  };

  return map[status] ?? {
    title: 'Order Status Updated',
    message: `Order ${orderNumber} status changed to ${status}`,
  };
}

// ─── Map status → timeline step index (1-based) ──────────────────────────────

function statusToTimelineStep(status: string): number {
  const stepMap: Record<string, number> = {
    PENDING: 4,
    PROCESSING: 4,
    APPROVED: 5,
    MANUFACTURING: 6,
    INVOICED: 7,
    DISPATCHED: 8,
    DELIVERED: 8,
    REJECTED: 4,
  };
  return stepMap[status] ?? 4;
}

// ─── Order Service ─────────────────────────────────────────────────────────────

export const OrderService = {
  // ───────────────────────────────────────────────────────────────────────────
  // findAll: Paginated order list with filters
  // ───────────────────────────────────────────────────────────────────────────
  async findAll(query: ListOrdersQuery) {
    const { page, limit, status, customerId, search, dateFrom, dateTo, priority } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (priority) where.priority = priority;

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { company: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true, company: true, avatar: true, email: true },
          },
          _count: { select: { items: true } },
          invoice: { select: { id: true, status: true, invoiceNumber: true, totalAmount: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, pagination: buildPagination(page, limit, total) };
  },

  // ───────────────────────────────────────────────────────────────────────────
  // findById: Full order detail
  // ───────────────────────────────────────────────────────────────────────────
  async findById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            inventoryItem: {
              select: { id: true, name: true, sku: true, availableQty: true, unit: true, status: true },
            },
          },
        },
        timeline: { orderBy: { step: 'asc' } },
        invoice: true,
        shipment: true,
        manufacturingJobs: {
          include: {
            orderItem: { select: { id: true, name: true, sku: true } },
          },
        },
        email: {
          select: {
            id: true,
            subject: true,
            fromEmail: true,
            fromName: true,
            receivedAt: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    return order;
  },

  // ───────────────────────────────────────────────────────────────────────────
  // create: Create a new order with items, timeline, and inventory reservation
  // ───────────────────────────────────────────────────────────────────────────
  async create(data: CreateOrderInput) {
    // Validate customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
      select: { id: true, name: true, company: true },
    });
    if (!customer) {
      throw new NotFoundError('Customer');
    }

    // Validate email if provided
    if (data.emailId) {
      const email = await prisma.email.findUnique({ where: { id: data.emailId } });
      if (!email) throw new NotFoundError('Email');
    }

    // Resolve inventory status for each item
    const itemsWithStatus = await Promise.all(
      data.items.map(async (item) => {
        let inventoryItem: { id: string; availableQty: number } | null = null;

        if (item.inventoryItemId) {
          inventoryItem = await prisma.inventoryItem.findUnique({
            where: { id: item.inventoryItemId },
            select: { id: true, availableQty: true },
          });
        } else if (item.sku) {
          inventoryItem = await prisma.inventoryItem.findUnique({
            where: { sku: item.sku },
            select: { id: true, availableQty: true },
          });
        }

        const { inventoryStatus, availableQty } = inventoryItem
          ? resolveInventoryStatus(inventoryItem.availableQty, item.quantity)
          : { inventoryStatus: 'UNAVAILABLE' as const, availableQty: 0 };

        return {
          ...item,
          inventoryItemId: inventoryItem?.id ?? null,
          inventoryStatus,
          availableQty,
          total: item.quantity * item.unitPrice,
        };
      }),
    );

    // Calculate total order amount
    const amount = itemsWithStatus.reduce((sum, item) => sum + item.total, 0);

    const orderNumber = generateOrderNumber();

    // Build initial timeline — all 8 steps
    const timelineData = ORDER_TIMELINE_STEPS.map((t) => {
      const stepNum = parseInt(t.step, 10);
      let status: 'COMPLETED' | 'ACTIVE' | 'PENDING' = 'PENDING';
      let timestamp: Date | null = null;

      if (stepNum === 1 && data.emailId) {
        // Email received
        status = 'COMPLETED';
        timestamp = new Date();
      } else if (stepNum === 4) {
        // Order created — always completed at creation
        status = 'COMPLETED';
        timestamp = new Date();
      } else if (stepNum === 5) {
        // Inventory updated — mark active since we'll update inventory next
        status = 'ACTIVE';
        timestamp = new Date();
      }

      return {
        step: t.step,
        label: t.label,
        status,
        ...(timestamp ? { timestamp } : {}),
      };
    });

    // Create order inside a transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: data.customerId,
          emailId: data.emailId ?? null,
          status: 'PENDING',
          amount,
          currency: 'INR',
          progress: ORDER_PROGRESS['PENDING'],
          priority: data.priority ?? 'MEDIUM',
          deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
          notes: data.notes ?? null,
          createdById: data.createdById ?? null,
          items: {
            create: itemsWithStatus.map((item) => ({
              inventoryItemId: item.inventoryItemId,
              name: item.name,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
              inventoryStatus: item.inventoryStatus,
              availableQty: item.availableQty,
            })),
          },
          timeline: {
            create: timelineData,
          },
        },
        include: {
          customer: { select: { id: true, name: true, company: true } },
          items: true,
          timeline: { orderBy: { step: 'asc' } },
        },
      });

      // Reserve inventory for all items that have a matched inventory record
      for (const item of itemsWithStatus) {
        if (item.inventoryItemId) {
          const invItem = await tx.inventoryItem.findUnique({
            where: { id: item.inventoryItemId },
            select: { totalQty: true, availableQty: true, reservedQty: true },
          });

          if (!invItem) continue;

          const deductQty = Math.min(invItem.availableQty, item.quantity);
          const newAvailableQty = invItem.availableQty - deductQty;
          const newReservedQty = invItem.reservedQty + deductQty;
          const newStatus = computeInventoryItemStatus(invItem.totalQty, newAvailableQty);

          await tx.inventoryItem.update({
            where: { id: item.inventoryItemId },
            data: {
              availableQty: newAvailableQty,
              reservedQty: newReservedQty,
              status: newStatus,
            },
          });
        }
      }

      return newOrder;
    });

    // Emit real-time events
    try {
      emitToDashboard(SOCKET_EVENTS.ORDER_CREATED, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
      });
    } catch (err) {
      logger.warn('Failed to emit ORDER_CREATED socket event', { err });
    }

    // Create notification
    await NotificationService.create({
      type: 'ORDER',
      title: 'New Order Created',
      message: `Order ${orderNumber} created for ${customer.company}`,
      metadata: { orderId: order.id, orderNumber, customerId: customer.id },
    });

    logger.info(`Order created: ${orderNumber} for customer ${customer.company}`);

    return order;
  },

  // ───────────────────────────────────────────────────────────────────────────
  // updateStatus: Transition order to a new status (state machine enforced)
  // ───────────────────────────────────────────────────────────────────────────
  async updateStatus(orderId: string, newStatus: string, note?: string, userId?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { id: true, company: true, name: true, email: true } },
        invoice: { select: { id: true } },
      },
    });

    if (!order) throw new NotFoundError('Order');

    const allowedTransitions = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new InvalidTransitionError(order.status, newStatus);
    }

    // Guard: cannot dispatch without invoice
    if (newStatus === 'DISPATCHED' && !order.invoice) {
      throw new BadRequestError('An invoice must exist before dispatching an order');
    }

    const newProgress = ORDER_PROGRESS[newStatus] ?? order.progress;
    const activeStep = statusToTimelineStep(newStatus);

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update order status
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus as OrderStatus,
          progress: newProgress,
        },
        include: {
          customer: { select: { id: true, name: true, company: true } },
          timeline: { orderBy: { step: 'asc' } },
        },
      });

      // Update timeline: mark steps up to activeStep as COMPLETED, set activeStep as ACTIVE if not final
      const isFinalStatus = ['DELIVERED', 'REJECTED'].includes(newStatus);

      for (const timelineEntry of updated.timeline) {
        const stepNum = parseInt(timelineEntry.step, 10);

        let timelineStatus: 'COMPLETED' | 'ACTIVE' | 'PENDING';
        if (stepNum < activeStep) {
          timelineStatus = 'COMPLETED';
        } else if (stepNum === activeStep) {
          timelineStatus = isFinalStatus ? 'COMPLETED' : 'ACTIVE';
        } else {
          timelineStatus = 'PENDING';
        }

        await tx.orderTimeline.update({
          where: { id: timelineEntry.id },
          data: {
            status: timelineStatus,
            ...(timelineStatus === 'COMPLETED' || timelineStatus === 'ACTIVE'
              ? { timestamp: new Date() }
              : {}),
            ...(note && stepNum === activeStep ? { note } : {}),
          },
        });
      }

      return updated;
    });

    // Emit real-time event
    try {
      emitOrderUpdate(orderId, {
        orderId,
        orderNumber: order.orderNumber,
        oldStatus: order.status,
        newStatus,
        progress: newProgress,
        updatedBy: userId,
      });
    } catch (err) {
      logger.warn('Failed to emit ORDER_STATUS_CHANGED socket event', { err });
    }

    // Create notification
    const notifContent = buildStatusNotification(
      newStatus,
      order.orderNumber,
      order.customer.company,
    );

    await NotificationService.create({
      type: 'ORDER',
      title: notifContent.title,
      message: notifContent.message,
      metadata: {
        orderId,
        orderNumber: order.orderNumber,
        oldStatus: order.status,
        newStatus,
      },
    });

    // Special notification to inventory manager when order is approved
    if (newStatus === 'APPROVED') {
      const inventoryUsers = await prisma.user.findMany({ where: { role: 'INVENTORY' } });
      for (const invUser of inventoryUsers) {
        await NotificationService.create({
          type: 'ORDER',
          title: `Order Ready for Packing: ${order.orderNumber}`,
          message: `Order ${order.orderNumber} for ${order.customer.company} has been approved and is ready for packing.`,
          userId: invUser.id,
          metadata: { orderId, orderNumber: order.orderNumber },
        });
      }

      // Auto-generate invoice when order is approved
      try {
        const { BillingService } = await import('../billing/billing.service');
        await BillingService.generateInvoice(orderId);
        logger.info(`Invoice auto-generated for order ${order.orderNumber}`);
      } catch (err) {
        logger.error(`Failed to auto-generate invoice for order ${order.orderNumber}`, { err });
      }

      try {
        const { sendOrderConfirmationEmail } = await import('../../shared/mailer');
        const fullOrder = await prisma.order.findUnique({
          where: { id: orderId },
          include: { customer: true, items: true },
        });
        if (fullOrder?.customer?.email) {
          await sendOrderConfirmationEmail({
            customerEmail: fullOrder.customer.email,
            customerName: fullOrder.customer.name,
            company: fullOrder.customer.company,
            orderNumber: fullOrder.orderNumber,
            amount: fullOrder.amount,
            itemCount: fullOrder.items.length,
          });
        }
      } catch (err) {
        logger.error(`Failed to send confirmation email for order ${order.orderNumber}`, { err });
      }
    }

    logger.info(`Order ${order.orderNumber} transitioned: ${order.status} → ${newStatus}`);

    return updatedOrder;
  },

  // ───────────────────────────────────────────────────────────────────────────
  // update: Update editable fields (delivery date, priority, notes)
  // ───────────────────────────────────────────────────────────────────────────
  async update(orderId: string, data: UpdateOrderInput) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Order');

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        ...(data.deliveryDate !== undefined
          ? { deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null }
          : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, company: true } },
        items: true,
        timeline: { orderBy: { step: 'asc' } },
      },
    });

    logger.info(`Order ${order.orderNumber} fields updated`);
    return updated;
  },

  // ───────────────────────────────────────────────────────────────────────────
  // softDelete: Remove order (only PENDING or REJECTED), release inventory
  // ───────────────────────────────────────────────────────────────────────────
  async softDelete(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          where: { inventoryItemId: { not: null } },
          select: { inventoryItemId: true, quantity: true, availableQty: true },
        },
      },
    });

    if (!order) throw new NotFoundError('Order');

    if (!['PENDING', 'REJECTED'].includes(order.status)) {
      throw new BadRequestError(
        `Cannot delete an order with status '${order.status}'. Only PENDING or REJECTED orders can be deleted.`,
      );
    }

    await prisma.$transaction(async (tx) => {
      // Release reserved inventory for each item
      for (const item of order.items) {
        if (!item.inventoryItemId) continue;

        const invItem = await tx.inventoryItem.findUnique({
          where: { id: item.inventoryItemId },
          select: { totalQty: true, availableQty: true, reservedQty: true },
        });

        if (!invItem) continue;

        // The quantity actually reserved = min(item.quantity, what was deducted from available)
        const reservedQty = Math.min(item.quantity, invItem.reservedQty);
        const newReservedQty = Math.max(0, invItem.reservedQty - reservedQty);
        const newAvailableQty = invItem.availableQty + reservedQty;
        const newStatus = computeInventoryItemStatus(invItem.totalQty, newAvailableQty);

        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: {
            availableQty: newAvailableQty,
            reservedQty: newReservedQty,
            status: newStatus,
          },
        });
      }

      // Delete order (cascade handles items, timeline, etc.)
      await tx.order.delete({ where: { id: orderId } });
    });

    logger.info(`Order ${order.orderNumber} deleted (status was ${order.status})`);
    return { deleted: true, orderNumber: order.orderNumber };
  },

  // ───────────────────────────────────────────────────────────────────────────
  // getTimeline: Retrieve order timeline steps in order
  // ───────────────────────────────────────────────────────────────────────────
  async getTimeline(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true },
    });

    if (!order) throw new NotFoundError('Order');

    const timeline = await prisma.orderTimeline.findMany({
      where: { orderId },
      orderBy: { step: 'asc' },
    });

    return timeline;
  },

  // ───────────────────────────────────────────────────────────────────────────
  // getStats: Aggregate dashboard statistics for orders
  // ───────────────────────────────────────────────────────────────────────────
  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [total, groupedByStatus, todayCount, revenueTotal, revenueMonth] = await Promise.all([
      prisma.order.count(),
      prisma.order.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.order.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      prisma.order.aggregate({
        _sum: { amount: true },
        where: { status: { notIn: ['REJECTED'] } },
      }),
      prisma.order.aggregate({
        _sum: { amount: true },
        where: {
          status: { notIn: ['REJECTED'] },
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const row of groupedByStatus) {
      byStatus[row.status] = row._count.status;
    }

    return {
      total,
      byStatus,
      todayCount,
      revenue: {
        total: revenueTotal._sum.amount ?? 0,
        thisMonth: revenueMonth._sum.amount ?? 0,
      },
    };
  },

  // ───────────────────────────────────────────────────────────────────────────
  // getFulfillmentQueue: Orders awaiting warehouse packing confirmation
  // ───────────────────────────────────────────────────────────────────────────
  async getFulfillmentQueue() {
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ['APPROVED', 'MANUFACTURING', 'INVOICED'] },
        timeline: {
          some: { step: '8', status: { not: 'COMPLETED' } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        customer: { select: { id: true, name: true, company: true, avatar: true } },
        items: { select: { id: true, name: true, sku: true, quantity: true } },
        timeline: { where: { step: '8' }, take: 1 },
      },
    });

    return orders.map((o) => ({
      ...o,
      isPackedReady: o.timeline[0]?.status === 'COMPLETED',
    }));
  },

  // ───────────────────────────────────────────────────────────────────────────
  // markPackedReady: Inventory manager confirms order is packed for dispatch
  // ───────────────────────────────────────────────────────────────────────────
  async markPackedReady(orderId: string, userId?: string, packedByName?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { company: true } },
        timeline: { orderBy: { step: 'asc' } },
      },
    });

    if (!order) throw new NotFoundError('Order');

    const blocked = ['PENDING', 'PROCESSING', 'REJECTED', 'DISPATCHED', 'DELIVERED'];
    if (blocked.includes(order.status)) {
      throw new BadRequestError(`Cannot mark packing for order in ${order.status} status`);
    }

    const dispatchStep = order.timeline.find((t) => t.step === '8');
    if (!dispatchStep) throw new BadRequestError('Order timeline is incomplete');
    if (dispatchStep.status === 'COMPLETED') {
      throw new BadRequestError('Order is already marked as packed and ready for dispatch');
    }

    const inventoryStep = order.timeline.find((t) => t.step === '5');
    if (!inventoryStep || (inventoryStep.status !== 'COMPLETED' && inventoryStep.status !== 'ACTIVE')) {
      throw new BadRequestError('Inventory must be reserved before marking as packed');
    }

    const note = packedByName
      ? `Packed by ${packedByName} — ready for dispatch`
      : 'Packed and ready for dispatch';

    await prisma.orderTimeline.update({
      where: { id: dispatchStep.id },
      data: { status: 'COMPLETED', timestamp: new Date(), note },
    });

    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    for (const admin of admins) {
      await NotificationService.create({
        type: 'DISPATCH',
        title: `Order Packed: ${order.orderNumber}`,
        message: `${note}. Customer: ${order.customer.company}. Awaiting dispatch.`,
        userId: admin.id,
        metadata: { orderId, orderNumber: order.orderNumber, packedBy: userId },
      });
    }

    logger.info(`Order ${order.orderNumber} marked packed and ready by ${packedByName ?? userId}`);

    return this.findById(orderId);
  },
};
