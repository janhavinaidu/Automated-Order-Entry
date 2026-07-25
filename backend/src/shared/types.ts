import { Request, Response } from 'express';

// ─── Standard API Response ────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: unknown;
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
  pagination?: Pagination,
): Response => {
  const body: ApiResponse<T> = { success: true, data };
  if (message) body.message = message;
  if (pagination) body.pagination = pagination;
  return res.status(statusCode).json(body);
};

export const sendCreated = <T>(res: Response, data: T, message?: string): Response => {
  return sendSuccess(res, data, message ?? 'Created successfully', 201);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  errors?: unknown,
): Response => {
  const body: ApiResponse = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

// ─── Pagination Helper ────────────────────────────────────────────────────────

export const getPagination = (req: Request): { skip: number; take: number; page: number; limit: number } => {
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
  return { page, limit, skip: (page - 1) * limit, take: limit };
};

export const buildPagination = (page: number, limit: number, total: number): Pagination => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1,
});

// ─── Extended Request Type ────────────────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}
