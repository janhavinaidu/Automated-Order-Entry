import { Router } from 'express';
import { authLimiter } from '../../middleware/rateLimit.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
} from './auth.controller';

const router = Router();

// ─── Public Routes (rate-limited) ────────────────────────────────────────────
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// ─── Token Refresh (public — the refresh token IS the credential) ─────────────
router.post('/refresh', refreshToken);

// ─── Protected Routes ────────────────────────────────────────────────────────
router.post('/logout', authenticate, logout);
router.get('/profile', authenticate, getProfile);
router.patch('/profile', authenticate, updateProfile);
router.patch('/change-password', authenticate, changePassword);

export default router;
