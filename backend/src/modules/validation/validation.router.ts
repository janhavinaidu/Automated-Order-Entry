import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { getById, getByEmail, runValidation } from './validation.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /validation/email/:emailId — fetch validation result via email
router.get('/email/:emailId', getByEmail);

// GET /validation/:jobId — fetch validation result by extraction job ID
router.get('/:jobId', getById);

// POST /validation/run/:jobId — run validation (ADMIN only)
router.post('/run/:jobId', authorize('ADMIN'), runValidation);

export default router;
