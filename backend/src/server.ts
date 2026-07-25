import 'dotenv/config';
import http from 'http';
import app from './app';
import { initSocketServer } from './sockets/socket.server';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { startWorkers } from './jobs/queues';

// ─── Create HTTP Server ───────────────────────────────────────────────────────
const httpServer = http.createServer(app);

// ─── Attach Socket.IO ─────────────────────────────────────────────────────────
initSocketServer(httpServer);

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  httpServer.close(async () => {
    logger.info('HTTP server closed');

    try {
      await prisma.$disconnect();
      logger.info('Database disconnected');

      redis.disconnect();
      logger.info('Redis disconnected');

      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }
  });

  // Force exit after 30s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30_000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Promise Rejection:', reason);
  if (env.IS_PRODUCTION) process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const start = async (): Promise<void> => {
  try {
    // Verify database connection
    await prisma.$connect();
    logger.info('✅ Database connected');

    // Attempt Redis connection (non-blocking)
    try {
      await redis.connect();
      logger.info('✅ Redis connected');

      // Start BullMQ background workers
      await startWorkers();
      logger.info('✅ Background workers started');
    } catch (redisErr) {
      logger.warn('⚠️  Redis unavailable — background jobs disabled', redisErr);
    }

    // Start listening
    httpServer.listen(env.PORT, () => {
      logger.info(`\n🚀 ${env.APP_NAME} backend running`);
      logger.info(`   Environment : ${env.NODE_ENV}`);
      logger.info(`   Port        : ${env.PORT}`);
      logger.info(`   API Base    : http://localhost:${env.PORT}/api/v1`);
      logger.info(`   Health      : http://localhost:${env.PORT}/health`);
      logger.info(`   IMAP        : ${env.IMAP_ENABLED ? 'enabled' : 'disabled'}\n`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
