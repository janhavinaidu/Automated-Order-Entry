import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendCreated, getPagination } from '../../shared/types';
import { BillingService } from './billing.service';
import { BadRequestError } from '../../shared/errors';

// ─── List Invoices ────────────────────────────────────────────────────────────

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit } = getPagination(req);
    const status = req.query.status as string | undefined;
    const orderId = req.query.orderId as string | undefined;

    const result = await BillingService.findAll({ page, limit, status, orderId });
    sendSuccess(res, result.data, undefined, 200, result.pagination);
  } catch (error) {
    next(error);
  }
};

// ─── Get Invoice by ID ────────────────────────────────────────────────────────

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const invoice = await BillingService.findById(id);
    sendSuccess(res, invoice);
  } catch (error) {
    next(error);
  }
};

// ─── Generate Invoice ─────────────────────────────────────────────────────────

export const generateInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orderId } = req.body as { orderId: string };
    if (!orderId) throw new BadRequestError('orderId is required');

    const invoice = await BillingService.generateInvoice(orderId);
    sendCreated(res, invoice);
  } catch (error) {
    next(error);
  }
};

// ─── Send Invoice ─────────────────────────────────────────────────────────────

export const sendInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const invoice = await BillingService.sendInvoice(id);
    sendSuccess(res, invoice, 'Invoice sent successfully');
  } catch (error) {
    next(error);
  }
};

// ─── Update Invoice Status ────────────────────────────────────────────────────

export const updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: 'PAID' | 'OVERDUE' | 'CANCELLED' };

    if (!status || !['PAID', 'OVERDUE', 'CANCELLED'].includes(status)) {
      throw new BadRequestError('status must be one of: PAID, OVERDUE, CANCELLED');
    }

    const invoice = await BillingService.updateStatus(id, status);
    sendSuccess(res, invoice, `Invoice marked as ${status}`);
  } catch (error) {
    next(error);
  }
};

// ─── Download Invoice PDF ─────────────────────────────────────────────────────

export const downloadPDF = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { pdfPath, invoiceNumber } = await BillingService.downloadInvoicePDF(id);

    res.download(pdfPath, `${invoiceNumber}.pdf`, (err) => {
      if (err) {
        next(err);
      }
    });
  } catch (error) {
    next(error);
  }
};
