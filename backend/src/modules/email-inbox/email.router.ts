import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import * as emailController from './email.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ─── Email Routes ─────────────────────────────────────────────────────────────

// GET /emails - List all emails (paginated, filterable)
router.get('/', emailController.list);

// GET /emails/stats - Aggregate stats by status + unread count
router.get('/stats', emailController.stats);

// GET /emails/:id - Get a single email with full details
router.get('/:id', emailController.getById);

// PATCH /emails/:id/read - Mark email as read
router.patch('/:id/read', emailController.markAsRead);

// POST /emails/:id/process - Trigger AI extraction (ADMIN / OPERATOR only)
router.post(
  '/:id/process',
  authorize('ADMIN', 'OPERATOR'),
  emailController.triggerExtraction,
);

// GET /emails/:id/attachments/:attachmentId/download - Download attachment file
router.get(
  '/:id/attachments/:attachmentId/download',
  emailController.downloadAttachment,
);

// POST /emails - Manually create an email record (ADMIN / OPERATOR only)
router.post(
  '/',
  authorize('ADMIN', 'OPERATOR'),
  emailController.createManually,
);

export default router;
