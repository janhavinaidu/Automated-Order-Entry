import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { InventoryService } from './inventory.service';
import { sendSuccess, sendCreated, getPagination } from '../../shared/types';
import { BadRequestError } from '../../shared/errors';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const createInventorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  totalQty: z.number().int().nonnegative('Total quantity must be 0 or more'),
  availableQty: z.number().int().nonnegative('Available quantity must be 0 or more'),
  reorderLevel: z.number().int().nonnegative('Reorder level must be 0 or more'),
  unit: z.string().min(1, 'Unit is required'),
});

const updateInventorySchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  totalQty: z.number().int().nonnegative().optional(),
  availableQty: z.number().int().nonnegative().optional(),
  reorderLevel: z.number().int().nonnegative().optional(),
  unit: z.string().min(1).optional(),
});

const reserveReleaseSchema = z.object({
  quantity: z.number().int().positive('Quantity must be a positive integer'),
});

const adjustStockSchema = z.object({
  totalQty: z.number().int().nonnegative().optional(),
  availableQty: z.number().int().nonnegative().optional(),
  reservedQty: z.number().int().nonnegative().optional(),
});

// ─── Inventory Controller ──────────────────────────────────────────────────────

/**
 * GET /inventory
 */
export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit } = getPagination(req);
    const { status, category, search } = req.query;
    const lowStock = req.query.lowStock === 'true';

    const result = await InventoryService.findAll({
      page,
      limit,
      status: status as string | undefined,
      category: category as string | undefined,
      search: search as string | undefined,
      lowStock,
    });

    sendSuccess(res, result.items, undefined, 200, result.pagination);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /inventory/alerts
 */
export const getAlerts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const alerts = await InventoryService.getAlerts();
    sendSuccess(res, alerts, 'Low stock alerts retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /inventory/stats
 */
export const stats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await InventoryService.getStats();
    sendSuccess(res, data, 'Inventory statistics retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /inventory/:id
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const item = await InventoryService.findById(req.params.id);
    sendSuccess(res, item);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /inventory
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createInventorySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const item = await InventoryService.create(parsed.data);
    sendCreated(res, item, 'Inventory item created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /inventory/:id
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateInventorySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const item = await InventoryService.update(req.params.id, parsed.data);
    sendSuccess(res, item, 'Inventory item updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /inventory/:id/reserve
 */
export const reserve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = reserveReleaseSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const item = await InventoryService.reserve(req.params.id, parsed.data.quantity);
    sendSuccess(res, item, `Reserved ${parsed.data.quantity} units successfully`);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /inventory/:id/release
 */
export const release = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = reserveReleaseSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const item = await InventoryService.release(req.params.id, parsed.data.quantity);
    sendSuccess(res, item, `Released ${parsed.data.quantity} units successfully`);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /inventory/:id/adjust
 */
export const adjustStock = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = adjustStockSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    if (
      parsed.data.totalQty === undefined &&
      parsed.data.availableQty === undefined &&
      parsed.data.reservedQty === undefined
    ) {
      throw new BadRequestError('At least one quantity field must be provided for adjustment');
    }

    const item = await InventoryService.adjustStock(req.params.id, parsed.data);
    sendSuccess(res, item, 'Stock adjusted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /inventory/:id
 */
export const deleteItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await InventoryService.delete(req.params.id);
    sendSuccess(res, result, `Inventory item '${result.name}' deleted successfully`);
  } catch (error) {
    next(error);
  }
};

const reportIssueSchema = z.object({
  message: z.string().min(1, 'Issue message is required'),
});

/**
 * POST /inventory/:id/report-issue
 */
export const reportIssue = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = reportIssueSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const { prisma } = await import('../../config/database');
    const { NotificationService } = await import('../notifications/notification.service');

    const item = await InventoryService.findById(req.params.id);
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    const reporterName = (req as any).user?.name ?? 'Inventory Staff';

    for (const admin of admins) {
      await NotificationService.create({
        type: 'INVENTORY',
        title: `Stock Concern: ${item.sku}`,
        message: `${reporterName}: ${parsed.data.message}`,
        userId: admin.id,
        metadata: { itemId: item.id, sku: item.sku, itemName: item.name },
      });
    }

    sendSuccess(res, null, 'Issue reported to admin successfully');
  } catch (error) {
    next(error);
  }
};
