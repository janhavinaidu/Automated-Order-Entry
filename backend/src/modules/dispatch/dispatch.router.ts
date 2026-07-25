import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import * as controller from './dispatch.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/shipments', controller.list);
router.get('/shipments/stats', controller.stats);
router.get('/shipments/:id', controller.getById);
router.post('/shipments', authorize('ADMIN'), controller.create);
router.patch('/shipments/:id', authorize('ADMIN'), controller.update);
router.post('/shipments/:id/deliver', authorize('ADMIN'), controller.markDelivered);

export default router;
