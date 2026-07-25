import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../shared/types';
import { DashboardService } from './dashboard.service';

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export const getKPIs = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await DashboardService.getKPIs();
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

// ─── AI Activity ──────────────────────────────────────────────────────────────

export const getAIActivity = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await DashboardService.getAIActivity();
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

// ─── Order Trends ─────────────────────────────────────────────────────────────

export const getOrderTrends = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const days = parseInt((req.query.days as string) || '30', 10);
    const data = await DashboardService.getOrderTrends(Math.min(365, Math.max(7, days)));
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

// ─── Revenue Chart ────────────────────────────────────────────────────────────

export const getRevenueChart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const days = parseInt((req.query.days as string) || '30', 10);
    const data = await DashboardService.getRevenueChart(Math.min(365, Math.max(7, days)));
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

// ─── Low Stock ────────────────────────────────────────────────────────────────

export const getLowStock = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await DashboardService.getLowStockItems();
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

// ─── Recent Orders ────────────────────────────────────────────────────────────

export const getRecentOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = parseInt((req.query.limit as string) || '5', 10);
    const data = await DashboardService.getRecentOrders(Math.min(20, Math.max(1, limit)));
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};
