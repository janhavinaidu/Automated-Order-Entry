import { z } from 'zod';
import path from 'path';

// ─── Environment Schema ───────────────────────────────────────────────────────
const envSchema = z.object({
  // Server
  PORT: z.string().default('3001').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Groq AI
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  GROQ_VISION_MODEL: z.string().default('llama-3.2-11b-vision-preview'),

  // IMAP (optional)
  IMAP_HOST: z.string().optional(),
  IMAP_PORT: z.string().optional().transform((v) => (v ? Number(v) : 993)),
  IMAP_USER: z.string().optional(),
  IMAP_PASSWORD: z.string().optional(),
  IMAP_MAILBOX: z.string().default('INBOX'),
  IMAP_POLL_INTERVAL_SECONDS: z.string().default('60').transform(Number),

  // SMTP
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587').transform(Number),
  SMTP_SECURE: z.string().default('false').transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_NAME: z.string().default('OrderPilotai'),
  SMTP_FROM_EMAIL: z.string().default('noreply@orderpilot.ai'),

  // File Storage
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.string().default('25').transform(Number),

  // App
  APP_NAME: z.string().default('OrderPilotai'),
  INVOICE_PREFIX: z.string().default('INV'),
  ORDER_PREFIX: z.string().default('OP'),
  DEFAULT_CURRENCY: z.string().default('INR'),
  DEFAULT_TAX_RATE: z.string().default('18').transform(Number),
  LOW_STOCK_ALERT_ENABLED: z.string().default('true').transform((v) => v === 'true'),
});

// ─── Parse & Validate ─────────────────────────────────────────────────────────
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  parsed.error.issues.forEach((issue) => {
    console.error(`   ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = {
  ...parsed.data,
  UPLOAD_DIR: path.resolve(parsed.data.UPLOAD_DIR),
  IS_PRODUCTION: parsed.data.NODE_ENV === 'production',
  IS_DEVELOPMENT: parsed.data.NODE_ENV === 'development',
  IS_TEST: parsed.data.NODE_ENV === 'test',
  MAX_FILE_SIZE_BYTES: parsed.data.MAX_FILE_SIZE_MB * 1024 * 1024,
  IMAP_ENABLED: !!(parsed.data.IMAP_HOST && parsed.data.IMAP_USER && parsed.data.IMAP_PASSWORD),
  SMTP_ENABLED: !!(parsed.data.SMTP_USER && parsed.data.SMTP_PASSWORD),
};

export type Env = typeof env;
