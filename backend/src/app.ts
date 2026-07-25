import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env } from './config/env';
import { generalLimiter } from './middleware/rateLimit.middleware';
import { requestLogger } from './middleware/requestLogger.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

// ─── Route Imports ────────────────────────────────────────────────────────────
import authRouter from './modules/auth/auth.router';
import customerRouter from './modules/customers/customer.router';
import emailRouter from './modules/email-inbox/email.router';
import extractionRouter from './modules/ai-extraction/extraction.router';
import validationRouter from './modules/validation/validation.router';
import orderRouter from './modules/orders/order.router';
import inventoryRouter from './modules/inventory/inventory.router';
import manufacturingRouter from './modules/manufacturing/manufacturing.router';
import billingRouter from './modules/billing/billing.router';
import dispatchRouter from './modules/dispatch/dispatch.router';
import notificationRouter from './modules/notifications/notification.router';
import dashboardRouter from './modules/dashboard/dashboard.router';
import assistantRouter from './modules/ai-assistant/assistant.router';
import reportsRouter from './modules/reports/reports.router';

// ─── App Setup ────────────────────────────────────────────────────────────────
const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ─── Performance ──────────────────────────────────────────────────────────────
app.use(compression());

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static File Serving (Invoices) ───────────────────────────────────────────
app.use('/uploads', express.static(env.UPLOAD_DIR));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api/', generalLimiter);

// ─── Request Logging ──────────────────────────────────────────────────────────
app.use(requestLogger);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: env.APP_NAME,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}/customers`, customerRouter);
app.use(`${API_PREFIX}/emails`, emailRouter);
app.use(`${API_PREFIX}/extraction`, extractionRouter);
app.use(`${API_PREFIX}/validation`, validationRouter);
app.use(`${API_PREFIX}/orders`, orderRouter);
app.use(`${API_PREFIX}/inventory`, inventoryRouter);
app.use(`${API_PREFIX}/manufacturing`, manufacturingRouter);
app.use(`${API_PREFIX}/billing`, billingRouter);
app.use(`${API_PREFIX}/dispatch`, dispatchRouter);
app.use(`${API_PREFIX}/notifications`, notificationRouter);
app.use(`${API_PREFIX}/dashboard`, dashboardRouter);
app.use(`${API_PREFIX}/ai-assistant`, assistantRouter);
app.use(`${API_PREFIX}/reports`, reportsRouter);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
