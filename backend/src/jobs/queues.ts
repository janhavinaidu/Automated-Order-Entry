import { Queue, Worker, QueueEvents, ConnectionOptions } from 'bullmq';
import { bullMQConnection } from '../config/redis';
import { redis } from '../config/redis';
import { logger } from '../config/logger';
import { QUEUES } from '../shared/constants';
import { env } from '../config/env';

// ─── Lazy Queue Registry ──────────────────────────────────────────────────────
// Queues are NOT created at module load time.
// They are created lazily after BullMQ compatibility is verified.
// This prevents the Redis version error from crashing the server on startup.

let _queuesInitialized = false;
let _aiExtractionQueue: Queue | null = null;
let _emailIngestionQueue: Queue | null = null;
let _invoiceSenderQueue: Queue | null = null;
let _stockAlertQueue: Queue | null = null;

/** Whether BullMQ is available (Redis ≥ 5.0 connected). */
export let jobsEnabled = false;

// ─── Getters ──────────────────────────────────────────────────────────────────

export const getAiExtractionQueue = (): Queue | null => _aiExtractionQueue;
export const getEmailIngestionQueue = (): Queue | null => _emailIngestionQueue;
export const getInvoiceSenderQueue = (): Queue | null => _invoiceSenderQueue;
export const getStockAlertQueue = (): Queue | null => _stockAlertQueue;

// ─── Safe Enqueue Helper ──────────────────────────────────────────────────────

/**
 * Enqueue a job safely. If BullMQ is not available, logs a warning and no-ops.
 * Returns the job id if enqueued, null otherwise.
 */
export const safeEnqueue = async (
  queue: Queue | null,
  name: string,
  data: Record<string, unknown>,
  opts?: { jobId?: string },
): Promise<string | null> => {
  if (!queue || !jobsEnabled) {
    logger.debug(`[Jobs] Queue unavailable — skipped job "${name}"`);
    return null;
  }
  try {
    const job = await queue.add(name, data, opts);
    return job.id ?? null;
  } catch (err) {
    logger.warn(`[Jobs] Failed to enqueue "${name}":`, err);
    return null;
  }
};

// ─── Initialize Queues ────────────────────────────────────────────────────────

const createQueues = (conn: ConnectionOptions) => {
  _aiExtractionQueue = new Queue(QUEUES.AI_EXTRACTION, {
    connection: conn,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  });

  _emailIngestionQueue = new Queue(QUEUES.EMAIL_INGESTION, {
    connection: conn,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 10000 },
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 100 },
    },
  });

  _invoiceSenderQueue = new Queue(QUEUES.INVOICE_SENDER, {
    connection: conn,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 100 },
    },
  });

  _stockAlertQueue = new Queue(QUEUES.STOCK_ALERT, {
    connection: conn,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 10 },
    },
  });
};

// ─── Start All Workers ────────────────────────────────────────────────────────

export const startWorkers = async (): Promise<void> => {
  if (_queuesInitialized) return;

  // Verify Redis version before creating any BullMQ resources
  try {
    const info = await redis.info('server');
    const match = info.match(/redis_version:(\S+)/);
    const version = match?.[1] ?? '0.0.0';
    const [major] = version.split('.').map(Number);

    if (major < 5) {
      logger.warn(
        `⚠️  BullMQ requires Redis ≥ 5.0.0 (found ${version}). ` +
        `Background jobs are DISABLED. All API endpoints work normally.\n` +
        `   → To enable jobs: upgrade Redis to v5+ or v7+.\n` +
        `   → Windows users: install from https://github.com/tporadowski/redis/releases`,
      );
      return; // Exit without creating queues or workers
    }

    logger.info(`Redis ${version} detected — initializing BullMQ queues`);
  } catch (err) {
    logger.warn('⚠️  Could not verify Redis version — background jobs disabled', err);
    return;
  }

  // Redis is compatible — create queues
  const conn = bullMQConnection;
  createQueues(conn);
  _queuesInitialized = true;
  jobsEnabled = true;

  // ─── Dynamic imports avoid circular deps ──────────────────────────────────
  const { processAIExtractionJob } = await import('./aiExtraction.job');
  const { processInvoiceSenderJob } = await import('./invoiceSender.job');
  const { processStockAlertJob } = await import('./stockAlert.job');

  // ─── AI Extraction Worker ────────────────────────────────────────────────
  const aiWorker = new Worker(QUEUES.AI_EXTRACTION, processAIExtractionJob, {
    connection: conn,
    concurrency: 3,
  });
  aiWorker.on('completed', (job) => logger.info(`AI extraction job ${job.id} completed`));
  aiWorker.on('failed', (job, err) => logger.error(`AI extraction job ${job?.id} failed:`, err));

  // ─── Invoice Sender Worker ───────────────────────────────────────────────
  const invoiceWorker = new Worker(QUEUES.INVOICE_SENDER, processInvoiceSenderJob, {
    connection: conn,
    concurrency: 5,
  });
  invoiceWorker.on('completed', (job) => logger.info(`Invoice sender job ${job.id} completed`));
  invoiceWorker.on('failed', (job, err) => logger.error(`Invoice sender job ${job?.id} failed:`, err));

  // ─── Stock Alert Worker ──────────────────────────────────────────────────
  const stockWorker = new Worker(QUEUES.STOCK_ALERT, processStockAlertJob, {
    connection: conn,
    concurrency: 1,
  });
  stockWorker.on('completed', (job) => logger.info(`Stock alert job ${job.id} completed`));
  stockWorker.on('failed', (job, err) => logger.error(`Stock alert job ${job?.id} failed:`, err));

  // ─── IMAP Recurring Poll ─────────────────────────────────────────────────
  if (env.IMAP_ENABLED) {
    const { processEmailIngestionJob } = await import('./emailIngestion.job');
    const imapWorker = new Worker(QUEUES.EMAIL_INGESTION, processEmailIngestionJob, {
      connection: conn,
      concurrency: 1,
    });
    imapWorker.on('failed', (job, err) =>
      logger.error(`Email ingestion job ${job?.id} failed:`, err),
    );

    await _emailIngestionQueue!.add(
      'poll-inbox',
      {},
      { repeat: { every: env.IMAP_POLL_INTERVAL_SECONDS * 1000 }, jobId: 'recurring-imap-poll' },
    );
    logger.info(`📬 IMAP polling every ${env.IMAP_POLL_INTERVAL_SECONDS}s`);
  }

  // ─── Stock Alert Recurring Check ─────────────────────────────────────────
  await _stockAlertQueue!.add(
    'check-stock-levels',
    {},
    { repeat: { every: 15 * 60 * 1000 }, jobId: 'recurring-stock-check' },
  );

  logger.info('✅ Background workers started');

  // Queue events for monitoring
  new QueueEvents(QUEUES.AI_EXTRACTION, { connection: conn });
};
