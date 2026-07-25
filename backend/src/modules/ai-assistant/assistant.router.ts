import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as controller from './assistant.controller';

const router = Router();

// Protect all AI assistant routes with JWT authentication
router.use(authenticate);

router.post('/chat', controller.handleChat);

export default router;
