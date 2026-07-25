import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { INVENTORY_STATUS_THRESHOLDS } from '../../shared/constants';
import { buildPagination } from '../../shared/types';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../shared/errors';
import {
  emitLowStockAlert,
  emitToDashboard,
} from '../../sockets/socket.server';
import { NotificationService } from '../notifications/notification.service';
import { SOCKET_EVENTS } from '../../shared/constants';

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface CreateInventoryItemInput {
  name: string;
  sku: string;
  category: string;
  totalQty: number;
  availableQty: number;
  reorderLevel: number;
  unit: string;
}

export interface UpdateInventoryItemInput {
  name?: string;
  category?: string;
  totalQty?: number;
  availableQty?: number;
  reorderLevel?: number;
  unit?: string;
}

export interface AdjustStockInput {
  totalQty?: number;
  availableQty?: number;
  reservedQty?: number;
}

export interface ListInventoryQuery {
  page: number;
  limit: number;
  status?: string;
  category?: string;
  search?: string;
  lowStock?: boolean;
}

// ─── Status Recalculator ──────────────────────────────────────────────────────

export function recalculateStatus(item: {
  totalQty: number;
  availableQty: number;
}): 'HEALTHY' | 'LOW' | 'CRITICAL' {
  const { totalQty, availableQty } = item;

  if (totalQty === 0 || availableQty <= 0) {
    return 'CRITICAL';
  }

  const ratio = availableQty / totalQty;

  if (ratio < INVENTORY_STATUS_THRESHOLDS.CRITICAL_RATIO) {
    return 'CRITICAL';
  }

  if (ratio < INVENTORY_STATUS_THRESHOLDS.LOW_RATIO) {
    return 'LOW';
  }

  return 'HEALTHY';
}

// ─── Low Stock Alert Helper ───────────────────────────────────────────────────

async function emitAndNotifyLowStock(item: {
  id: string;
  name: string;
  sku: string;
  availableQty: number;
  totalQty: number;
  status: string;
}) {
  try {
    emitLowStockAlert({
      itemId: item.id,
      name: item.name,
      sku: item.sku,
      availableQty: item.availableQty,
      totalQty: item.totalQty,
      status: item.status,
    });
  } catch (err) {
    logger.warn('Failed to emit low stock alert via socket', { err });
  }

  await NotificationService.create({
    type: 'INVENTORY',
    title: item.status === 'CRITICAL' ? '🔴 Critical Stock Level' : '🟡 Low Stock Alert',
    message: `${item.name} (${item.sku}): ${item.availableQty} units remaining`,
    metadata: {
      inventoryItemId: item.id,
      sku: item.sku,
      availableQty: item.availableQty,
      status: item.status,
    },
  });
}

// ─── Inventory Service ─────────────────────────────────────────────────────────

export const InventoryService = {
  // ───────────────────────────────────────────────────────────────────────────
  // findAll: Paginated inventory list with filters
  // ───────────────────────────────────────────────────────────────────────────
  async findAll(query: ListInventoryQuery) {
    const { page, limit, status, category, search, lowStock } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (lowStock) {
      where.status = { in: ['LOW', 'CRITICAL'] };
    } else if (status) {
      where.status = status;
    }

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          // CRITICAL first, then LOW, then HEALTHY
          {
            status: 'asc',
          },
          { name: 'asc' },
        ],
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    // Re-sort: CRITICAL → LOW → HEALTHY (since alphabetical asc gives CRITICAL, HEALTHY, LOW)
    const statusOrder: Record<string, number> = { CRITICAL: 0, LOW: 1, HEALTHY: 2 };
    const sorted = items.sort(
      (a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3),
    );

    return { items: sorted, pagination: buildPagination(page, limit, total) };
  },

  // ───────────────────────────────────────────────────────────────────────────
  // findById: Fetch single item or throw NotFoundError
  // ───────────────────────────────────────────────────────────────────────────
  async findById(id: string) {
    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Inventory Item');
    return item;
  },

  // ───────────────────────────────────────────────────────────────────────────
  // findBySku: Fetch by SKU or return null
  // ───────────────────────────────────────────────────────────────────────────
  async findBySku(sku: string) {
    return prisma.inventoryItem.findUnique({ where: { sku } });
  },

  // ───────────────────────────────────────────────────────────────────────────
  // create: Create a new inventory item
  // ───────────────────────────────────────────────────────────────────────────
  async create(data: CreateInventoryItemInput) {
    const existing = await prisma.inventoryItem.findUnique({ where: { sku: data.sku } });
    if (existing) {
      throw new ConflictError(`An inventory item with SKU '${data.sku}' already exists`);
    }

    const reservedQty = Math.max(0, data.totalQty - data.availableQty);
    const status = recalculateStatus({ totalQty: data.totalQty, availableQty: data.availableQty });

    const item = await prisma.inventoryItem.create({
      data: {
        name: data.name,
        sku: data.sku,
        category: data.category,
        totalQty: data.totalQty,
        availableQty: data.availableQty,
        reservedQty,
        reorderLevel: data.reorderLevel,
        unit: data.unit,
        status,
      },
    });

    logger.info(`Inventory item created: ${item.name} (${item.sku})`);
    return item;
  },

  // ───────────────────────────────────────────────────────────────────────────
  // update: Update item fields and recalculate status
  // ───────────────────────────────────────────────────────────────────────────
  async update(id: string, data: UpdateInventoryItemInput) {
    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Inventory Item');

    const newTotalQty = data.totalQty ?? existing.totalQty;
    const newAvailableQty = data.availableQty ?? existing.availableQty;
    const newStatus = recalculateStatus({ totalQty: newTotalQty, availableQty: newAvailableQty });

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.totalQty !== undefined ? { totalQty: data.totalQty } : {}),
        ...(data.availableQty !== undefined ? { availableQty: data.availableQty } : {}),
        ...(data.reorderLevel !== undefined ? { reorderLevel: data.reorderLevel } : {}),
        ...(data.unit !== undefined ? { unit: data.unit } : {}),
        status: newStatus,
      },
    });

    logger.info(`Inventory item updated: ${updated.name} (${updated.sku})`);
    return updated;
  },

  // ───────────────────────────────────────────────────────────────────────────
  // reserve: Deduct available qty, add to reserved (within transaction)
  // ───────────────────────────────────────────────────────────────────────────
  async reserve(id: string, quantity: number) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id } });
      if (!item) throw new NotFoundError('Inventory Item');

      if (item.availableQty < quantity) {
        throw new BadRequestError(
          `Insufficient stock for '${item.name}' (${item.sku}). Requested: ${quantity}, Available: ${item.availableQty}`,
        );
      }

      const newAvailableQty = item.availableQty - quantity;
      const newReservedQty = item.reservedQty + quantity;
      const newStatus = recalculateStatus({ totalQty: item.totalQty, availableQty: newAvailableQty });

      const updated = await tx.inventoryItem.update({
        where: { id },
        data: {
          availableQty: newAvailableQty,
          reservedQty: newReservedQty,
          status: newStatus,
        },
      });

      // Emit alert if newly LOW or CRITICAL
      if (
        (newStatus === 'LOW' || newStatus === 'CRITICAL') &&
        item.status !== newStatus
      ) {
        // Run outside transaction to avoid blocking
        setImmediate(() => {
          emitAndNotifyLowStock({
            id: updated.id,
            name: updated.name,
            sku: updated.sku,
            availableQty: updated.availableQty,
            totalQty: updated.totalQty,
            status: updated.status,
          }).catch((err) => logger.error('Failed to emit low stock notification', { err }));
        });
      }

      logger.info(`Reserved ${quantity} units of ${item.name} (${item.sku})`);
      return updated;
    });
  },

  // ───────────────────────────────────────────────────────────────────────────
  // release: Return reserved qty back to available
  // ───────────────────────────────────────────────────────────────────────────
  async release(id: string, quantity: number) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id } });
      if (!item) throw new NotFoundError('Inventory Item');

      const releaseQty = Math.min(quantity, item.reservedQty);
      const newAvailableQty = item.availableQty + releaseQty;
      const newReservedQty = Math.max(0, item.reservedQty - releaseQty);
      const newStatus = recalculateStatus({ totalQty: item.totalQty, availableQty: newAvailableQty });

      const updated = await tx.inventoryItem.update({
        where: { id },
        data: {
          availableQty: newAvailableQty,
          reservedQty: newReservedQty,
          status: newStatus,
        },
      });

      logger.info(`Released ${releaseQty} units of ${item.name} (${item.sku})`);
      return updated;
    });
  },

  // ───────────────────────────────────────────────────────────────────────────
  // adjustStock: Direct quantity override with status recalculation
  // ───────────────────────────────────────────────────────────────────────────
  async adjustStock(id: string, data: AdjustStockInput) {
    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Inventory Item');

    const newTotalQty = data.totalQty ?? existing.totalQty;
    const newAvailableQty = data.availableQty ?? existing.availableQty;
    const newReservedQty = data.reservedQty ?? existing.reservedQty;
    const newStatus = recalculateStatus({ totalQty: newTotalQty, availableQty: newAvailableQty });

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(data.totalQty !== undefined ? { totalQty: newTotalQty } : {}),
        ...(data.availableQty !== undefined ? { availableQty: newAvailableQty } : {}),
        ...(data.reservedQty !== undefined ? { reservedQty: newReservedQty } : {}),
        status: newStatus,
      },
    });

    // Emit if status changed to LOW or CRITICAL
    if (
      (newStatus === 'LOW' || newStatus === 'CRITICAL') &&
      existing.status !== newStatus
    ) {
      setImmediate(() => {
        emitAndNotifyLowStock({
          id: updated.id,
          name: updated.name,
          sku: updated.sku,
          availableQty: updated.availableQty,
          totalQty: updated.totalQty,
          status: updated.status,
        }).catch((err) => logger.error('Failed to emit low stock notification on adjust', { err }));
      });
    }

    logger.info(
      `Stock adjusted for ${updated.name} (${updated.sku}): total=${newTotalQty}, available=${newAvailableQty}, reserved=${newReservedQty}`,
    );

    return updated;
  },

  // ───────────────────────────────────────────────────────────────────────────
  // getAlerts: Items with LOW or CRITICAL status
  // ───────────────────────────────────────────────────────────────────────────
  async getAlerts() {
    const items = await prisma.inventoryItem.findMany({
      where: { status: { in: ['LOW', 'CRITICAL'] } },
      orderBy: [{ status: 'desc' }, { availableQty: 'asc' }],
    });

    // Sort CRITICAL before LOW (desc alphabetical gives LOW, CRITICAL — reverse)
    const statusOrder: Record<string, number> = { CRITICAL: 0, LOW: 1 };
    return items.sort(
      (a, b) => (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2),
    );
  },

  // ───────────────────────────────────────────────────────────────────────────
  // getStats: Aggregate statistics for inventory
  // ───────────────────────────────────────────────────────────────────────────
  async getStats() {
    const [total, grouped, categories] = await Promise.all([
      prisma.inventoryItem.count(),
      prisma.inventoryItem.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.inventoryItem.findMany({
        distinct: ['category'],
        select: { category: true },
        orderBy: { category: 'asc' },
      }),
    ]);

    const countMap: Record<string, number> = {};
    for (const row of grouped) {
      countMap[row.status] = row._count.status;
    }

    const healthy = countMap['HEALTHY'] ?? 0;
    const low = countMap['LOW'] ?? 0;
    const critical = countMap['CRITICAL'] ?? 0;

    return {
      total,
      healthy,
      low,
      critical,
      lowStockCount: low + critical,
      categories: categories.map((c) => c.category),
    };
  },

  // ───────────────────────────────────────────────────────────────────────────
  // delete: Hard delete (only if no reservations)
  // ───────────────────────────────────────────────────────────────────────────
  async delete(id: string) {
    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundError('Inventory Item');

    if (item.reservedQty > 0) {
      throw new BadRequestError(
        `Cannot delete '${item.name}' — it has ${item.reservedQty} units currently reserved by active orders`,
      );
    }

    await prisma.inventoryItem.delete({ where: { id } });

    logger.info(`Inventory item deleted: ${item.name} (${item.sku})`);
    return { deleted: true, name: item.name, sku: item.sku };
  },
};
