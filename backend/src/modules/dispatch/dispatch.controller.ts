import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendCreated, getPagination } from '../../shared/types';
import { DispatchService } from './dispatch.service';
import { BadRequestError } from '../../shared/errors';

// ─── List Shipments ───────────────────────────────────────────────────────────

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit } = getPagination(req);
    const status = req.query.status as string | undefined;

    const result = await DispatchService.findAll({ page, limit, status });
    sendSuccess(res, result.data, undefined, 200, result.pagination);
  } catch (error) {
    next(error);
  }
};

// ─── Get Dispatch Stats ───────────────────────────────────────────────────────

export const stats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await DispatchService.getStats();
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

// ─── Get Shipment by ID ───────────────────────────────────────────────────────

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const shipment = await DispatchService.findById(id);
    sendSuccess(res, shipment);
  } catch (error) {
    next(error);
  }
};

// ─── Create Shipment ──────────────────────────────────────────────────────────

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orderId, carrier, awbNumber, shippingAddress, trackingUrl, notes } = req.body as {
      orderId: string;
      carrier?: string;
      awbNumber?: string;
      shippingAddress?: string;
      trackingUrl?: string;
      notes?: string;
    };

    if (!orderId) throw new BadRequestError('orderId is required');

    const shipment = await DispatchService.create({
      orderId,
      carrier,
      awbNumber,
      shippingAddress,
      trackingUrl,
      notes,
    });

    sendCreated(res, shipment);
  } catch (error) {
    next(error);
  }
};

// ─── Update Shipment ──────────────────────────────────────────────────────────

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { carrier, awbNumber, status, trackingUrl, notes, shippingAddress } = req.body as {
      carrier?: string;
      awbNumber?: string;
      status?: string;
      trackingUrl?: string;
      notes?: string;
      shippingAddress?: string;
    };

    const shipment = await DispatchService.update(id, {
      carrier,
      awbNumber,
      status,
      trackingUrl,
      notes,
      shippingAddress,
    });

    sendSuccess(res, shipment, 'Shipment updated');
  } catch (error) {
    next(error);
  }
};

// ─── Mark as Delivered ────────────────────────────────────────────────────────

export const markDelivered = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const shipment = await DispatchService.markDelivered(id);
    sendSuccess(res, shipment, 'Order marked as delivered');
  } catch (error) {
    next(error);
  }
};
