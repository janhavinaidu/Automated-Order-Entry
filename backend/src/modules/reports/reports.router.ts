import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as reportsController from './reports.controller';

const router = Router();

router.use(authenticate);

// GET /reports/summary
router.get('/summary', reportsController.getSummary);

// GET /reports/export/orders.csv
router.get('/export/orders.csv', reportsController.exportOrdersCsv);

export default router;
