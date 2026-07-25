import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import * as controller from './notification.controller';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

router.post('/', authorize('ADMIN', 'INVENTORY'), controller.create);
router.get('/', controller.list);
router.get('/unread-count', controller.unreadCount);
router.patch('/read-all', controller.markAllAsRead);
router.patch('/:id/read', controller.markAsRead);
router.patch('/:id/resolve', authorize('ADMIN'), controller.resolveIssue);

export default router;
