import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OrderService } from './order.service';
import { AuthenticatedRequest, sendSuccess, sendCreated, getPagination } from '../../shared/types';
import { BadRequestError } from '../../shared/errors';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  emailId: z.string().uuid().optional(),
  deliveryDate: z.string().datetime().optional(),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        inventoryItemId: z.string().uuid().optional(),
        name: z.string().min(1),
        sku: z.string().min(1),
        quantity: z.number().int().positive(),
        unitPrice: z.number().positive(),
      }),
    )
    .min(1, 'At least one item is required'),
});

const updateOrderSchema = z.object({
  deliveryDate: z.string().datetime().optional().nullable(),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  notes: z.string().optional().nullable(),
});

const updateStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'PROCESSING',
    'APPROVED',
    'MANUFACTURING',
    'INVOICED',
    'DISPATCHED',
    'DELIVERED',
    'REJECTED',
  ]),
  note: z.string().optional(),
});

// ─── Order Controller ─────────────────────────────────────────────────────────

/**
 * GET /orders
 */
export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit } = getPagination(req);
    const { status, customerId, search, dateFrom, dateTo, priority } = req.query;

    const result = await OrderService.findAll({
      page,
      limit,
      status: status as string | undefined,
      customerId: customerId as string | undefined,
      search: search as string | undefined,
      dateFrom: dateFrom as string | undefined,
      dateTo: dateTo as string | undefined,
      priority: priority as string | undefined,
    });

    sendSuccess(res, result.orders, undefined, 200, result.pagination);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /orders/stats
 */
export const stats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await OrderService.getStats();
    sendSuccess(res, data, 'Order statistics retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /orders/:id
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await OrderService.findById(req.params.id);
    sendSuccess(res, order);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /orders/:id/timeline
 */
export const getTimeline = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const timeline = await OrderService.getTimeline(req.params.id);
    sendSuccess(res, timeline, 'Order timeline retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /orders
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const authReq = req as AuthenticatedRequest;
    const order = await OrderService.create({
      ...parsed.data,
      createdById: authReq.user?.id,
    });

    sendCreated(res, order, 'Order created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /orders/:id
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const order = await OrderService.update(req.params.id, {
      deliveryDate: parsed.data.deliveryDate ?? undefined,
      priority: parsed.data.priority,
      notes: parsed.data.notes ?? undefined,
    });

    sendSuccess(res, order, 'Order updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /orders/:id/status
 */
export const updateStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const authReq = req as AuthenticatedRequest;
    const order = await OrderService.updateStatus(
      req.params.id,
      parsed.data.status,
      parsed.data.note,
      authReq.user?.id,
    );

    sendSuccess(res, order, `Order status updated to ${parsed.data.status}`);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /orders/fulfillment-queue
 */
export const fulfillmentQueue = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const orders = await OrderService.getFulfillmentQueue();
    sendSuccess(res, orders, 'Fulfillment queue retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /orders/:id/mark-packed
 */
export const markPacked = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const order = await OrderService.markPackedReady(
      req.params.id,
      authReq.user?.id,
      authReq.user?.name,
    );
    sendSuccess(res, order, 'Order marked as packed and ready for dispatch');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /orders/:id
 */
export const softDelete = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await OrderService.softDelete(req.params.id);
    sendSuccess(res, result, `Order ${result.orderNumber} deleted successfully`);
  } catch (error) {
    next(error);
  }
};
