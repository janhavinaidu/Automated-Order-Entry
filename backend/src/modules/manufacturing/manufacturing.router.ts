import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import * as controller from './manufacturing.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', controller.list);
router.get('/stats', controller.stats);
router.get('/:id', controller.getById);
router.post('/', authorize('ADMIN'), controller.create);
router.patch('/:id/status', authorize('ADMIN'), controller.updateStatus);

export default router;
