import path from 'path';
import fs from 'fs';
import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import {
  extractOrderFromText,
  extractOrderFromImage,
  ExtractedOrderData,
} from './groq.client';
import { extractTextFromPDF } from './parsers/pdf.parser';
import { extractTextFromExcel } from './parsers/excel.parser';
import { encodeImageToBase64 } from './parsers/image.parser';
import {
  emitExtractionComplete,
  emitExtractionFailed,
} from '../../sockets/socket.server';
import { logger } from '../../config/logger';
import { AI_MODELS } from '../../config/ai';
import { getAiExtractionQueue, safeEnqueue } from '../../jobs/queues';
import { OrderService } from '../orders/order.service';
import { NotificationService } from '../notifications/notification.service';
import { UPLOAD_PATHS } from '../../middleware/upload.middleware';

// ─── File-type helpers ────────────────────────────────────────────────────────

const PDF_EXTENSIONS = ['.pdf'];
const EXCEL_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.ods'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif'];
const WORD_EXTENSIONS = ['.doc', '.docx', '.rtf', '.txt'];

type FileCategory = 'pdf' | 'excel' | 'image' | 'word' | 'unsupported';

const categoriseFile = (filename: string): FileCategory => {
  const ext = path.extname(filename).toLowerCase();
  if (PDF_EXTENSIONS.includes(ext)) return 'pdf';
  if (EXCEL_EXTENSIONS.includes(ext)) return 'excel';
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (WORD_EXTENSIONS.includes(ext)) return 'word';
  return 'unsupported';
};

// ─── Auto-approve threshold ───────────────────────────────────────────────────
const AUTO_APPROVE_THRESHOLD = 80;

function resolveStoragePath(storagePath: string): string {
  if (path.isAbsolute(storagePath)) return storagePath;
  return path.join(UPLOAD_PATHS.attachments, path.basename(storagePath));
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Find an AIExtractionJob by its primary key, including products and validation.
 */
export const findJobById = async (jobId: string) => {
  const job = await prisma.aIExtractionJob.findUnique({
    where: { id: jobId },
    include: {
      extractedProducts: true,
      validationResult: true,
      email: {
        select: {
          id: true,
          fromEmail: true,
          fromName: true,
          subject: true,
          status: true,
          receivedAt: true,
        },
      },
    },
  });

  if (!job) {
    throw new NotFoundError('AI Extraction Job');
  }

  return job;
};

/**
 * Find the extraction job associated with an email.
 */
export const findByEmailId = async (emailId: string) => {
  const email = await prisma.email.findUnique({
    where: { id: emailId },
    select: { id: true },
  });

  if (!email) {
    throw new NotFoundError('Email');
  }

  const job = await prisma.aIExtractionJob.findUnique({
    where: { emailId },
    include: {
      extractedProducts: true,
      validationResult: true,
    },
  });

  if (!job) {
    throw new NotFoundError('AI Extraction Job for this email');
  }

  return job;
};

/**
 * Retry a FAILED extraction job — reset it to QUEUED and re-enqueue.
 */
export const retryJob = async (jobId: string) => {
  const job = await prisma.aIExtractionJob.findUnique({
    where: { id: jobId },
    include: { email: true },
  });

  if (!job) {
    throw new NotFoundError('AI Extraction Job');
  }

  if (job.status !== 'FAILED') {
    throw new BadRequestError(
      `Cannot retry a job with status '${job.status}'. Only FAILED jobs can be retried.`,
    );
  }

  const updatedJob = await prisma.aIExtractionJob.update({
    where: { id: jobId },
    data: {
      status: 'QUEUED',
      errorMessage: null,
      startedAt: null,
      completedAt: null,
      rawResponse: Prisma.DbNull,
      confidence: null,
      customerName: null,
      deliveryDate: null,
      priority: null,
      summary: null,
      modelUsed: null,
    },
  });

  await prisma.email.update({
    where: { id: job.emailId },
    data: { status: 'PROCESSING' },
  });

  const bullJobId = await safeEnqueue(
    getAiExtractionQueue(),
    'extract-order',
    { emailId: job.emailId },
    { jobId: `retry-extraction-${jobId}-${Date.now()}` },
  );

  logger.info(
    `Retrying extraction job=${jobId}, emailId=${job.emailId}, bullJobId=${bullJobId ?? 'N/A'}`,
  );

  return { job: updatedJob, bullJobId };
};

/**
 * Manually approve a COMPLETED extraction job and create an order from it.
 * Used when confidence < AUTO_APPROVE_THRESHOLD and human reviews.
 */
export const approveJob = async (jobId: string, userId?: string) => {
  const job = await prisma.aIExtractionJob.findUnique({
    where: { id: jobId },
    include: {
      extractedProducts: true,
      email: {
        select: {
          id: true,
          fromEmail: true,
          customerId: true,
          customer: {
            select: {
              id: true,
              name: true,
              company: true,
            },
          },
        },
      },
    },
  });

  if (!job) throw new NotFoundError('AI Extraction Job');
  if (job.status !== 'COMPLETED') {
    throw new BadRequestError('Only COMPLETED jobs can be approved');
  }

  const order = await createOrderFromJob(job, userId);
  return { order };
};

// ─── Internal: Create order from a completed extraction job ──────────────────

async function createOrderFromJob(
  job: {
    id: string;
    emailId: string;
    customerName: string | null;
    deliveryDate: string | null;
    priority: import('@prisma/client').Priority | null;
    extractedProducts: Array<{ name: string; sku: string; quantity: number; unitPrice: number }>;
    email: {
      id: string;
      fromEmail: string;
      customerId: string | null;
      customer: { id: string; name: string; company: string } | null;
    };
  },
  userId?: string,
) {
  let customerId = job.email.customerId;

  if (!customerId && job.customerName) {
    const found = await prisma.customer.findFirst({
      where: { company: { contains: job.customerName, mode: 'insensitive' } },
      select: { id: true },
    });
    customerId = found?.id ?? null;
  }

  // Auto-create customer if not found
  if (!customerId && job.customerName) {
    const newCustomer = await prisma.customer.create({
      data: {
        name: job.customerName,
        company: job.customerName,
        email: job.email.fromEmail || 'unknown@example.com',
        isActive: true,
      },
    });
    customerId = newCustomer.id;
    logger.info(`[Extraction] Auto-created customer: ${job.customerName}`);
  }

  if (!customerId) {
    throw new BadRequestError(
      'Cannot create order: no customer name found in extraction. Please provide customer information.',
    );
  }

  const items = job.extractedProducts.map((p) => ({
    name: p.name,
    sku: p.sku || 'UNKNOWN',
    quantity: p.quantity || 1,
    unitPrice: p.unitPrice || 0,
  }));

  if (items.length === 0) {
    throw new BadRequestError('Cannot create order: no products were extracted.');
  }

  const order = await OrderService.create({
    customerId,
    emailId: job.emailId,
    items,
    deliveryDate: job.deliveryDate ?? undefined,
    priority: job.priority ?? 'MEDIUM',
    notes: `Created from AI extraction job ${job.id}`,
    createdById: userId,
  });

  logger.info(`[Extraction] Order ${order.orderNumber} created from job ${job.id}`);
  return order;
}

/**
 * Calibrate the extraction confidence score using real database checks.
 */
export const calibrateConfidence = async (
  result: ExtractedOrderData,
): Promise<number> => {
  if (result.confidence === 0) return 0;

  let score = result.confidence ?? 85;

  // 1. Check customer (reduced penalty - new customers are normal)
  if (result.customer) {
    const matchedCustomer = await prisma.customer.findFirst({
      where: { company: { contains: result.customer, mode: 'insensitive' } },
    });
    if (!matchedCustomer) score -= 5; // Reduced from 15
  } else {
    score -= 10; // Reduced from 25
  }

  // 2. Check products (reduced penalties - missing SKUs are common)
  if (!result.products || result.products.length === 0) {
    score -= 40;
  } else {
    let unmatchedSkus = 0;
    let zeroPriceProducts = 0;
    let invalidQtyProducts = 0;

    for (const p of result.products) {
      if (p.sku) {
        const item = await prisma.inventoryItem.findUnique({ where: { sku: p.sku } });
        if (!item) unmatchedSkus++;
      } else {
        unmatchedSkus++;
      }
      if (!p.unitPrice || p.unitPrice <= 0) zeroPriceProducts++;
      if (!p.quantity || p.quantity <= 0) invalidQtyProducts++;
    }

    score -= unmatchedSkus * 2; // Reduced from 10
    score -= zeroPriceProducts * 2; // Reduced from 5
    score -= invalidQtyProducts * 10; // Reduced from 15
  }

  // 3. Check delivery date
  if (!result.deliveryDate) {
    score -= 5;
  } else {
    const d = new Date(result.deliveryDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (isNaN(d.getTime()) || d < now) score -= 15;
  }

  // 4. Check errors
  const errors = result.issues?.filter((i) => i.type === 'error') || [];
  if (errors.length > 0) score -= 20;

  return Math.max(10, Math.min(100, score));
};

// ─── Main Extraction Pipeline ─────────────────────────────────────────────────

export const runExtractionPipeline = async (emailId: string): Promise<void> => {
  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: { attachments: true },
  });

  if (!email) throw new NotFoundError('Email');

  const existingJob = await prisma.aIExtractionJob.findUnique({ where: { emailId } });
  if (!existingJob) throw new NotFoundError('AI Extraction Job for this email');

  const jobId = existingJob.id;

  await prisma.aIExtractionJob.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', startedAt: new Date() },
  });

  try {
    const candidateResults: Array<{
      result: ExtractedOrderData;
      source: string;
      modelUsed: string;
    }> = [];

    // Process attachments
    for (const attachment of email.attachments) {
      const filename = attachment.filename;
      const storagePath = attachment.storagePath as string | null;

      if (!storagePath) {
        logger.warn(`Attachment ${attachment.id} (${filename}) has no storagePath — skipping`);
        continue;
      }

      const category = categoriseFile(filename);

      const filePath = resolveStoragePath(storagePath);

      try {
        if (category === 'pdf') {
          const text = await extractTextFromPDF(filePath);
          if (text.trim().length > 20) {
            candidateResults.push({
              result: await extractOrderFromText(text, `PDF: ${filename}`),
              source: `attachment:pdf:${filename}`,
              modelUsed: AI_MODELS.TEXT,
            });
          }
        } else if (category === 'excel') {
          const text = extractTextFromExcel(filePath);
          if (text.trim().length > 20) {
            candidateResults.push({
              result: await extractOrderFromText(text, `Spreadsheet: ${filename}`),
              source: `attachment:excel:${filename}`,
              modelUsed: AI_MODELS.TEXT,
            });
          }
        } else if (category === 'image') {
          const { base64, mimeType } = encodeImageToBase64(filePath);
          candidateResults.push({
            result: await extractOrderFromImage(base64, mimeType),
            source: `attachment:image:${filename}`,
            modelUsed: AI_MODELS.VISION,
          });
        } else if (category === 'word') {
          const rawText = fs.readFileSync(filePath, 'utf-8');
          if (rawText.trim().length > 20) {
            candidateResults.push({
              result: await extractOrderFromText(rawText, `Document: ${filename}`),
              source: `attachment:word:${filename}`,
              modelUsed: AI_MODELS.TEXT,
            });
          }
        }
      } catch (attachErr) {
        logger.warn(
          `Failed to process attachment ${filename}: ${attachErr instanceof Error ? attachErr.message : String(attachErr)}`,
        );
      }
    }

    // Extract from email body
    const bodyText = email.body?.trim() ?? '';
    if (bodyText.length > 50) {
      try {
        candidateResults.push({
          result: await extractOrderFromText(bodyText, 'Email body'),
          source: 'email:body',
          modelUsed: AI_MODELS.TEXT,
        });
      } catch (bodyErr) {
        logger.warn(
          `Failed to extract from email body: ${bodyErr instanceof Error ? bodyErr.message : String(bodyErr)}`,
        );
      }
    }

    if (candidateResults.length === 0) {
      throw new Error('No extractable content found in email body or attachments');
    }

    // Pick highest raw confidence
    const best = candidateResults.reduce((prev, curr) =>
      curr.result.confidence > prev.result.confidence ? curr : prev,
    );

    const { result: bestResult, source: bestSource, modelUsed } = best;

    logger.info(`Best source="${bestSource}", rawConfidence=${bestResult.confidence}`);

    // ── CALIBRATE CONFIDENCE ──────────────────────────────────────────────────
    const calibratedConfidence = await calibrateConfidence(bestResult);
    logger.info(`[Extraction] Calibrated: ${calibratedConfidence}% (raw: ${bestResult.confidence}%)`);

    // Persist results
    await prisma.extractedProduct.deleteMany({ where: { jobId } });

    await prisma.aIExtractionJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        confidence: calibratedConfidence,
        customerName: bestResult.customer || null,
        deliveryDate: bestResult.deliveryDate || null,
        priority: bestResult.priority
          ? (bestResult.priority.toUpperCase() as import('@prisma/client').Priority)
          : null,
        summary: bestResult.summary || null,
        modelUsed,
        rawResponse: JSON.stringify(bestResult),
        completedAt: new Date(),
      },
    });

    if (bestResult.products.length > 0) {
      await prisma.extractedProduct.createMany({
        data: bestResult.products.map((p) => ({
          jobId,
          name: p.name,
          sku: p.sku || '',
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          confidence: calibratedConfidence,
        })),
      });
    }

    if (bestResult.issues.length > 0) {
      await prisma.validationResult.upsert({
        where: { jobId },
        create: {
          jobId,
          overallStatus: bestResult.issues.some((i) => i.type === 'error')
            ? 'FAILED'
            : bestResult.issues.some((i) => i.type === 'warning')
            ? 'WARNING'
            : 'PASSED',
          issues: bestResult.issues as unknown as Prisma.JsonArray,
        },
        update: {
          overallStatus: bestResult.issues.some((i) => i.type === 'error')
            ? 'FAILED'
            : bestResult.issues.some((i) => i.type === 'warning')
            ? 'WARNING'
            : 'PASSED',
          issues: bestResult.issues as unknown as Prisma.JsonArray,
        },
      });
    }

    const hasPdfAttachment = email.attachments.some((a) => categoriseFile(a.filename) === 'pdf');

    // ── AUTO-APPROVE or HUMAN REVIEW ──────────────────────────────────────────
    let autoOrderId: string | null = null;
    const canAutoApprove =
      calibratedConfidence >= AUTO_APPROVE_THRESHOLD && !hasPdfAttachment;

    if (canAutoApprove) {
      try {
        const jobWithProducts = await prisma.aIExtractionJob.findUnique({
          where: { id: jobId },
          include: {
            extractedProducts: true,
            email: { include: { customer: true } },
          },
        });

        if (jobWithProducts) {
          const order = await createOrderFromJob(jobWithProducts);
          autoOrderId = order.id;

          await NotificationService.create({
            type: 'AI',
            title: '✅ Order Auto-Created',
            message: `AI extracted order with ${calibratedConfidence}% confidence — Order ${order.orderNumber} created automatically.`,
            metadata: { orderId: order.id, jobId, confidence: calibratedConfidence },
          });

          logger.info(
            `[Extraction] Auto-approved — Order ${order.orderNumber} (confidence ${calibratedConfidence}%)`,
          );
        }
      } catch (autoErr) {
        logger.warn(
          `[Extraction] Auto-approve failed: ${autoErr instanceof Error ? autoErr.message : String(autoErr)}`,
        );
      }
    } else {
      const reviewReason = hasPdfAttachment
        ? `Email "${email.subject}" includes a PDF attachment — manual approval is required before creating an order.`
        : `AI extracted order with only ${calibratedConfidence}% confidence from "${email.subject}". Please review and approve manually.`;

      await NotificationService.create({
        type: 'AI',
        title: hasPdfAttachment ? '📎 PDF — Human Review Required' : '👀 Human Review Required',
        message: reviewReason,
        metadata: { emailId, jobId, confidence: calibratedConfidence, hasPdfAttachment },
      });

      logger.info(
        hasPdfAttachment
          ? `[Extraction] PDF attachment present — human review required`
          : `[Extraction] Confidence ${calibratedConfidence}% < threshold — human review required`,
      );
    }

    await prisma.email.update({ where: { id: emailId }, data: { status: 'PROCESSED' } });

    emitExtractionComplete(emailId, {
      jobId,
      confidence: calibratedConfidence,
      customerName: bestResult.customer,
      productsCount: bestResult.products.length,
      autoOrderId,
    });

    logger.info(
      `Extraction pipeline complete: emailId=${emailId}, confidence=${calibratedConfidence}${autoOrderId ? `, orderId=${autoOrderId}` : ''}`,
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    logger.error(`Extraction pipeline failed for emailId=${emailId}: ${errorMessage}`, { err });

    await prisma.aIExtractionJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', errorMessage, completedAt: new Date() },
    });

    await prisma.email.update({ where: { id: emailId }, data: { status: 'FAILED' } });

    emitExtractionFailed(emailId, errorMessage);
    throw err;
  }
};
