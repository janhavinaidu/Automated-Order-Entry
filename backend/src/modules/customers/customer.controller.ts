import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CustomerService } from './customer.service';
import { sendSuccess, sendCreated, AuthenticatedRequest } from '../../shared/types';
import { BadRequestError } from '../../shared/errors';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const customerCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  company: z.string().min(1, 'Company is required').max(200),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(20).optional(),
  paymentTerms: z.string().max(200).optional(),
  contractRef: z.string().max(100).optional(),
  avatar: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

const customerUpdateSchema = customerCreateSchema.partial();

// ─── Controllers ──────────────────────────────────────────────────────────────

export const list = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const search = (req.query.search as string) || undefined;

    let isActive: boolean | undefined;
    if (req.query.isActive !== undefined) {
      isActive = req.query.isActive === 'true';
    }

    const result = await CustomerService.findAll({ page, limit, search, isActive });
    sendSuccess(res, result.customers, undefined, 200, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const getById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const customer = await CustomerService.findById(req.params.id);
    sendSuccess(res, customer);
  } catch (error) {
    next(error);
  }
};

export const getOrderHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);

    const result = await CustomerService.getOrderHistory(req.params.id, { page, limit });
    sendSuccess(res, result, undefined, 200, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const create = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = customerCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const customer = await CustomerService.create(parsed.data);
    sendCreated(res, customer, 'Customer created successfully');
  } catch (error) {
    next(error);
  }
};

export const update = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = customerUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const customer = await CustomerService.update(req.params.id, parsed.data);
    sendSuccess(res, customer, 'Customer updated successfully');
  } catch (error) {
    next(error);
  }
};

export const softDelete = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await CustomerService.delete(req.params.id);
    sendSuccess(res, null, 'Customer deactivated successfully');
  } catch (error) {
    next(error);
  }
};
