import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

const createRedisClient = (): Redis => {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  client.on('connect', () => logger.info('Redis connected'));
  client.on('error', (err) => logger.error('Redis error:', err));
  client.on('close', () => logger.warn('Redis connection closed'));

  return client;
};

// ioredis instance used by the application (caching, pub/sub, etc.)
export const redis = global.__redis ?? createRedisClient();

if (env.NODE_ENV !== 'production') {
  global.__redis = redis;
}

// BullMQ connection options — uses URL string to avoid ioredis version type conflicts.
// BullMQ bundles its own ioredis internally, so we pass the URL and let it manage its own client.
export const bullMQConnection = { url: env.REDIS_URL };

export default redis;
