import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import {
  list,
  stats,
  getById,
  getTimeline,
  create,
  update,
  updateStatus,
  softDelete,
  fulfillmentQueue,
  markPacked,
} from './order.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ─── Read-only routes (all authenticated users) ───────────────────────────────
router.get('/fulfillment-queue', authorize('ADMIN', 'INVENTORY'), fulfillmentQueue);
router.get('/', list);
router.get('/stats', stats);
router.get('/:id', getById);
router.get('/:id/timeline', getTimeline);

// ─── Mutation routes (ADMIN) ─────────────────────────────────────────────────
router.post('/', authorize('ADMIN'), create);
router.patch('/:id', authorize('ADMIN'), update);
router.patch('/:id/status', authorize('ADMIN'), updateStatus);
router.post('/:id/mark-packed', authorize('ADMIN', 'INVENTORY'), markPacked);

// ─── Delete (ADMIN only) ──────────────────────────────────────────────────────
router.delete('/:id', authorize('ADMIN'), softDelete);

export default router;
