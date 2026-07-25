import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import * as controller from './billing.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/invoices', controller.list);
router.get('/invoices/:id', controller.getById);
router.get('/invoices/:id/pdf', controller.downloadPDF);
router.post('/invoices', authorize('ADMIN', 'OPERATOR'), controller.generateInvoice);
router.post('/invoices/:id/send', authorize('ADMIN', 'OPERATOR'), controller.sendInvoice);
router.patch('/invoices/:id/status', authorize('ADMIN', 'OPERATOR'), controller.updateStatus);

export default router;
