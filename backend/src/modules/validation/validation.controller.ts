import { Request, Response, NextFunction } from 'express';
import { ValidationService } from './validation.service';
import { sendSuccess } from '../../shared/types';

// ─── Validation Controller ─────────────────────────────────────────────────────

/**
 * GET /validation/:jobId
 * Retrieve a persisted validation result for a given extraction job.
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { jobId } = req.params;
    const result = await ValidationService.getValidationResult(jobId);
    sendSuccess(res, result, 'Validation result retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /validation/email/:emailId
 * Retrieve validation result via the email's extraction job.
 */
export const getByEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { emailId } = req.params;
    const result = await ValidationService.getValidationForEmail(emailId);
    sendSuccess(res, result, 'Validation result retrieved for email');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /validation/run/:jobId
 * Run the full validation pipeline against an extraction job and persist the report.
 */
export const runValidation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { jobId } = req.params;
    const report = await ValidationService.runValidation(jobId);
    sendSuccess(res, report, 'Validation complete');
  } catch (error) {
    next(error);
  }
};
