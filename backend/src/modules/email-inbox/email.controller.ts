import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendCreated } from '../../shared/types';
import * as emailService from './email.service';
import path from 'path';
import fs from 'fs';
import { BadRequestError, NotFoundError } from '../../shared/errors';

// ─── List emails ──────────────────────────────────────────────────────────────
export const list = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { emails, pagination } = await emailService.findAll(req.query);
    sendSuccess(res, emails, undefined, 200, pagination);
  } catch (error) {
    next(error);
  }
};

// ─── Get email stats ──────────────────────────────────────────────────────────
export const stats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await emailService.getStats();
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

// ─── Get single email ─────────────────────────────────────────────────────────
export const getById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const email = await emailService.findById(req.params.id);
    sendSuccess(res, email);
  } catch (error) {
    next(error);
  }
};

// ─── Mark email as read ───────────────────────────────────────────────────────
export const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const email = await emailService.markAsRead(req.params.id);
    sendSuccess(res, email, 'Email marked as read');
  } catch (error) {
    next(error);
  }
};

// ─── Trigger AI extraction ────────────────────────────────────────────────────
export const triggerExtraction = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await emailService.triggerExtraction(req.params.id);
    sendSuccess(res, result, 'Extraction job enqueued successfully');
  } catch (error) {
    next(error);
  }
};

// ─── Download attachment ──────────────────────────────────────────────────────
export const downloadAttachment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { attachmentId } = req.params;
    const attachment = await emailService.downloadAttachment(attachmentId);

    const storagePath = attachment.storagePath as string;
    const filename = attachment.filename;

    if (!fs.existsSync(storagePath)) {
      throw new NotFoundError('Attachment file on disk');
    }

    res.download(storagePath, filename, (err) => {
      if (err) {
        next(new BadRequestError(`Failed to download attachment: ${err.message}`));
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── Create email manually ────────────────────────────────────────────────────
export const createManually = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const email = await emailService.createManually(req.body);
    sendCreated(res, email);
  } catch (error) {
    next(error);
  }
};
