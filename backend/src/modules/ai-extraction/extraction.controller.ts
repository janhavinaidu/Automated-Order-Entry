import { Request, Response, NextFunction } from 'express';
import { sendSuccess, AuthenticatedRequest } from '../../shared/types';
import * as extractionService from './extraction.service';

// ─── Get extraction job by ID ─────────────────────────────────────────────────
export const getJobById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const job = await extractionService.findJobById(req.params.jobId);
    sendSuccess(res, job);
  } catch (error) {
    next(error);
  }
};

// ─── Get extraction job by email ──────────────────────────────────────────────
export const getByEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const job = await extractionService.findByEmailId(req.params.emailId);
    sendSuccess(res, job);
  } catch (error) {
    next(error);
  }
};

// ─── Retry a failed extraction job ───────────────────────────────────────────
export const retryJob = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await extractionService.retryJob(req.params.jobId);
    sendSuccess(res, result, 'Extraction job queued for retry');
  } catch (error) {
    next(error);
  }
};

// ─── Manually approve extraction and create order ─────────────────────────────
export const approveJob = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const result = await extractionService.approveJob(
      req.params.jobId,
      authReq.user?.id,
    );
    sendSuccess(res, result, `Order ${result.order.orderNumber} created successfully`);
  } catch (error) {
    next(error);
  }
};
