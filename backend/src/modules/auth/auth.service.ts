import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import { env } from '../../config/env';
import logger from '../../config/logger';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../shared/errors';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: 'ADMIN' | 'INVENTORY' | 'VIEWER';
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a duration string like "15m", "7d", "1h" into milliseconds.
 */
function parseDurationMs(duration: string): number {
  const unit = duration.slice(-1);
  const value = parseInt(duration.slice(0, -1), 10);
  switch (unit) {
    case 's':
      return value * 1_000;
    case 'm':
      return value * 60_000;
    case 'h':
      return value * 3_600_000;
    case 'd':
      return value * 86_400_000;
    default:
      throw new Error(`Unknown duration unit: ${unit}`);
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

async function generateRefreshToken(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN));

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return rawToken;
}

function omitPasswordHash<T extends { passwordHash: string }>(
  user: T,
): Omit<T, 'passwordHash'> {
  const { passwordHash: _pw, ...rest } = user;
  return rest;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const AuthService = {
  /**
   * Register a new user. Returns user without passwordHash.
   */
  async register(data: RegisterData) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictError(`A user with email '${data.email}' already exists`);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role: data.role ?? 'INVENTORY',
      },
    });

    logger.info(`New user registered: ${user.email} (${user.role})`);

    return omitPasswordHash(user);
  },

  /**
   * Authenticate a user and return user + token pair.
   */
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated. Please contact an administrator.');
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const accessToken = generateAccessToken(jwtPayload);
    const refreshToken = await generateRefreshToken(user.id);

    logger.info(`User logged in: ${user.email}`);

    return {
      user: omitPasswordHash(user),
      accessToken,
      refreshToken,
    };
  },

  /**
   * Rotate a refresh token — verify it, delete old record, issue new pair.
   */
  async refreshTokens(token: string): Promise<AuthTokens & { user: object }> {
    const tokenHash = hashToken(token);

    const stored = await prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedError('Invalid or already-used refresh token');
    }

    if (stored.expiresAt < new Date()) {
      // Clean up the expired token
      await prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedError('Refresh token has expired, please log in again');
    }

    if (!stored.user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Delete old token (rotation)
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const jwtPayload: JwtPayload = {
      sub: stored.user.id,
      email: stored.user.email,
      name: stored.user.name,
      role: stored.user.role,
    };

    const accessToken = generateAccessToken(jwtPayload);
    const newRefreshToken = await generateRefreshToken(stored.user.id);

    logger.debug(`Refresh tokens rotated for user: ${stored.user.email}`);

    return {
      user: omitPasswordHash(stored.user),
      accessToken,
      refreshToken: newRefreshToken,
    };
  },

  /**
   * Invalidate a refresh token (logout).
   */
  async logout(token: string): Promise<void> {
    const tokenHash = hashToken(token);

    const stored = await prisma.refreshToken.findFirst({ where: { tokenHash } });

    if (stored) {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
      logger.debug(`Refresh token invalidated for userId: ${stored.userId}`);
    }
    // Silently succeed even if the token isn't found (idempotent logout)
  },

  /**
   * Return the profile of the authenticated user (without passwordHash).
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User');
    }

    return omitPasswordHash(user);
  },

  /**
   * Update display name or avatar initials.
   */
  async updateProfile(userId: string, data: { name?: string; avatarInitials?: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.avatarInitials !== undefined && { avatarInitials: data.avatarInitials.trim() }),
      },
    });

    return omitPasswordHash(updated);
  },

  /**
   * Change the authenticated user's password.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User');
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordMatch) {
      throw new BadRequestError('Current password is incorrect');
    }

    if (currentPassword === newPassword) {
      throw new BadRequestError('New password must be different from current password');
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Invalidate all existing refresh tokens on password change (security best practice)
    await prisma.refreshToken.deleteMany({ where: { userId } });

    logger.info(`Password changed for user: ${user.email}`);
  },
};
