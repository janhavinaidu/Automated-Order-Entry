import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, sendSuccess, sendCreated, getPagination } from '../../shared/types';
import { ManufacturingService } from './manufacturing.service';
import { BadRequestError } from '../../shared/errors';

// ─── List Manufacturing Jobs ──────────────────────────────────────────────────

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit } = getPagination(req);
    const status = req.query.status as string | undefined;
    const orderId = req.query.orderId as string | undefined;

    const result = await ManufacturingService.findAll({ page, limit, status, orderId });
    sendSuccess(res, result.data, undefined, 200, result.pagination);
  } catch (error) {
    next(error);
  }
};

// ─── Get Manufacturing Stats ──────────────────────────────────────────────────

export const stats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await ManufacturingService.getStats();
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

// ─── Get Manufacturing Job by ID ──────────────────────────────────────────────

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const job = await ManufacturingService.findById(id);
    sendSuccess(res, job);
  } catch (error) {
    next(error);
  }
};

// ─── Create Manufacturing Job ─────────────────────────────────────────────────

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orderId, orderItemId, description, quantityRequired, estimatedCompletion, notes } =
      req.body as {
        orderId: string;
        orderItemId?: string;
        description: string;
        quantityRequired: number;
        estimatedCompletion?: string;
        notes?: string;
      };

    if (!orderId) throw new BadRequestError('orderId is required');
    if (!description) throw new BadRequestError('description is required');
    if (!quantityRequired || quantityRequired < 1)
      throw new BadRequestError('quantityRequired must be a positive integer');

    const job = await ManufacturingService.create({
      orderId,
      orderItemId,
      description,
      quantityRequired,
      estimatedCompletion: estimatedCompletion ? new Date(estimatedCompletion) : undefined,
      notes,
    });

    sendCreated(res, job);
  } catch (error) {
    next(error);
  }
};

// ─── Update Manufacturing Job Status ─────────────────────────────────────────

export const updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, quantityCompleted, notes } = req.body as {
      status: string;
      quantityCompleted?: number;
      notes?: string;
    };

    if (!status) throw new BadRequestError('status is required');

    const job = await ManufacturingService.updateStatus(id, { status, quantityCompleted, notes });
    sendSuccess(res, job, `Manufacturing job status updated to ${status}`);
  } catch (error) {
    next(error);
  }
};
