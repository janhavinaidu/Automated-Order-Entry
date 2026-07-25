import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import * as extractionController from './extraction.controller';

const router = Router();

router.use(authenticate);

// GET /extraction/email/:emailId
router.get('/email/:emailId', extractionController.getByEmail);

// GET /extraction/:jobId
router.get('/:jobId', extractionController.getJobById);

// POST /extraction/:jobId/retry
router.post(
  '/:jobId/retry',
  authorize('ADMIN', 'OPERATOR'),
  extractionController.retryJob,
);

// POST /extraction/:jobId/approve  — human approval for low-confidence extractions
router.post(
  '/:jobId/approve',
  authorize('ADMIN', 'OPERATOR'),
  extractionController.approveJob,
);

export default router;
