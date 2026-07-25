import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as controller from './dashboard.controller';

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

router.get('/kpis', controller.getKPIs);
router.get('/ai-activity', controller.getAIActivity);
router.get('/order-trends', controller.getOrderTrends);
router.get('/revenue-chart', controller.getRevenueChart);
router.get('/low-stock', controller.getLowStock);
router.get('/recent-orders', controller.getRecentOrders);

export default router;
