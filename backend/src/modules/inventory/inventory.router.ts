import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import {
  list,
  getAlerts,
  stats,
  getById,
  create,
  update,
  reserve,
  release,
  adjustStock,
  deleteItem,
  reportIssue,
} from './inventory.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ─── Read-only (all authenticated users) ──────────────────────────────────────
// Static routes must come before /:id to avoid param collisions
router.get('/', list);
router.get('/alerts', getAlerts);
router.get('/stats', stats);
router.get('/:id', getById);

// ─── Create / Update (ADMIN + INVENTORY) ─────────────────────────────────────
router.post('/', authorize('ADMIN', 'INVENTORY'), create);
router.patch('/:id', authorize('ADMIN', 'INVENTORY'), update);
router.post('/:id/reserve', authorize('ADMIN', 'INVENTORY'), reserve);
router.post('/:id/release', authorize('ADMIN', 'INVENTORY'), release);
router.post('/:id/report-issue', authorize('ADMIN', 'INVENTORY'), reportIssue);

// ─── Stock Adjustment + Delete (ADMIN only) ───────────────────────────────────
router.post('/:id/adjust', authorize('ADMIN'), adjustStock);
router.delete('/:id', authorize('ADMIN'), deleteItem);

export default router;
