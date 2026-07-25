import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../shared/types';
import { ReportsService } from './reports.service';

// ─── GET /reports/summary ─────────────────────────────────────────────────────
export const getSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await ReportsService.getSummary();
    sendSuccess(res, data, 'Reports summary retrieved');
  } catch (error) {
    next(error);
  }
};

// ─── GET /reports/export/orders.csv ──────────────────────────────────────────
export const exportOrdersCsv = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const csv = await ReportsService.exportOrdersCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  } catch (error) {
    next(error);
  }
};
