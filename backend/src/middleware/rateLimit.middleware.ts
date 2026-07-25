import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '../shared/constants';

// ─── General Rate Limiter ─────────────────────────────────────────────────────
export const generalLimiter = rateLimit({
  windowMs: RATE_LIMITS.GENERAL.windowMs,
  max: RATE_LIMITS.GENERAL.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  skip: (req) => req.ip === '127.0.0.1' && process.env.NODE_ENV === 'test',
});

// ─── Auth Rate Limiter ────────────────────────────────────────────────────────
export const authLimiter = rateLimit({
  windowMs: RATE_LIMITS.AUTH.windowMs,
  max: RATE_LIMITS.AUTH.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after a minute.',
  },
});

// ─── Upload Rate Limiter ──────────────────────────────────────────────────────
export const uploadLimiter = rateLimit({
  windowMs: RATE_LIMITS.UPLOAD.windowMs,
  max: RATE_LIMITS.UPLOAD.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many upload requests, please try again later.',
  },
});
