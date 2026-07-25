import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import {
  list,
  getById,
  getOrderHistory,
  create,
  update,
  softDelete,
} from './customer.controller';

const router = Router();

// ─── All routes require authentication ───────────────────────────────────────
router.use(authenticate);

// ─── Read routes (any authenticated role) ────────────────────────────────────
router.get('/', list);
router.get('/:id', getById);
router.get('/:id/orders', getOrderHistory);

// ─── Write routes (ADMIN or OPERATOR) ────────────────────────────────────────
router.post('/', authorize('ADMIN', 'OPERATOR'), create);
router.patch('/:id', authorize('ADMIN', 'OPERATOR'), update);

// ─── Destructive routes (ADMIN only) ─────────────────────────────────────────
router.delete('/:id', authorize('ADMIN'), softDelete);

export default router;
