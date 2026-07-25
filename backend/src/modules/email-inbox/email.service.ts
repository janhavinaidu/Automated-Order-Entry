import prisma from '../../config/database';
import { Prisma } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { buildPagination } from '../../shared/types';
import { getAiExtractionQueue, safeEnqueue } from '../../jobs/queues';
import { logger } from '../../config/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmailListQuery {
  page?: string | number;
  limit?: string | number;
  status?: string;
  search?: string;
  hasAttachments?: string | boolean;
}

export interface CreateEmailData {
  fromEmail: string;
  fromName?: string;
  company?: string;
  subject: string;
  body: string;
  receivedAt?: Date | string;
}

// ─── Email Service ────────────────────────────────────────────────────────────

/**
 * Paginated list of emails with attachment count, ordered by receivedAt DESC.
 */
export const findAll = async (query: EmailListQuery) => {
  const page = Math.max(1, parseInt(String(query.page ?? 1), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? 20), 10)));
  const skip = (page - 1) * limit;

  // Build WHERE clause
  const where: Record<string, unknown> = {};

  if (query.status) {
    where.status = query.status.toUpperCase();
  }

  if (query.search) {
    where.OR = [
      { fromEmail: { contains: query.search, mode: 'insensitive' } },
      { fromName: { contains: query.search, mode: 'insensitive' } },
      { company: { contains: query.search, mode: 'insensitive' } },
      { subject: { contains: query.search, mode: 'insensitive' } },
      { preview: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.hasAttachments !== undefined) {
    const flag =
      query.hasAttachments === 'true' || query.hasAttachments === true;
    where.hasAttachments = flag;
  }

  const [emails, total] = await Promise.all([
    prisma.email.findMany({
      where,
      skip,
      take: limit,
      orderBy: { receivedAt: 'desc' },
      include: {
        _count: { select: { attachments: true } },
        customer: {
          select: { id: true, name: true, company: true, avatar: true },
        },
        extractionJob: {
          select: {
            id: true,
            status: true,
            confidence: true,
            customerName: true,
            completedAt: true,
          },
        },
      },
    }),
    prisma.email.count({ where }),
  ]);

  const pagination = buildPagination(page, limit, total);

  return { emails, pagination };
};

/**
 * Full email detail with attachments and extraction job (including extracted products).
 */
export const findById = async (id: string) => {
  const email = await prisma.email.findUnique({
    where: { id },
    include: {
      attachments: true,
      customer: {
        select: {
          id: true,
          name: true,
          company: true,
          email: true,
          phone: true,
          avatar: true,
        },
      },
      extractionJob: {
        include: {
          extractedProducts: true,
          validationResult: true,
        },
      },
      orders: {
        select: {
          id: true,
          orderNumber: true,
        },
      },
    },
  });

  if (!email) {
    throw new NotFoundError('Email');
  }

  return email;
};

/**
 * Mark an email as read.
 */
export const markAsRead = async (id: string) => {
  const email = await prisma.email.findUnique({ where: { id } });
  if (!email) {
    throw new NotFoundError('Email');
  }

  return prisma.email.update({
    where: { id },
    data: { isRead: true },
  });
};

/**
 * Trigger AI extraction for a PENDING or FAILED email.
 * Creates / updates AIExtractionJob record and enqueues to BullMQ.
 */
export const triggerExtraction = async (emailId: string) => {
  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: { extractionJob: true },
  });

  if (!email) {
    throw new NotFoundError('Email');
  }

  // Allow re-parsing of PENDING, FAILED, and PROCESSED (completed) emails
  if (email.status !== 'PENDING' && email.status !== 'FAILED' && email.status !== 'PROCESSED') {
    throw new BadRequestError(
      `Cannot trigger extraction for email with status '${email.status}'. Only PENDING, FAILED, or PROCESSED emails can be re-parsed.`,
    );
  }

  // Update email status to PROCESSING
  await prisma.email.update({
    where: { id: emailId },
    data: { status: 'PROCESSING' },
  });

  let extractionJob;

  if (email.extractionJob) {
    // Reset existing job to QUEUED (allows re-parsing)
    extractionJob = await prisma.aIExtractionJob.update({
      where: { id: email.extractionJob.id },
      data: {
        status: 'QUEUED',
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        rawResponse: Prisma.DbNull,
      },
    });
  } else {
    // Create a new extraction job record
    extractionJob = await prisma.aIExtractionJob.create({
      data: {
        emailId,
        status: 'QUEUED',
      },
    });
  }

  // Enqueue into BullMQ (no-op if Redis version is incompatible)
  const bullJobId = await safeEnqueue(
    getAiExtractionQueue(),
    'extract-order',
    { emailId },
    { jobId: `extraction-${extractionJob.id}` },
  );

  logger.info(
    `Enqueued AI extraction for emailId=${emailId}, jobId=${extractionJob.id}, bullJobId=${bullJobId ?? 'N/A (jobs disabled)'}`,
  );

  return { extractionJob, bullJobId };
};

/**
 * Manually create an email record with status PENDING.
 */
export const createManually = async (data: CreateEmailData) => {
  const { fromEmail, fromName, company, subject, body, receivedAt } = data;

  if (!fromEmail || !subject || !body) {
    throw new BadRequestError('fromEmail, subject, and body are required');
  }

  const preview = body.slice(0, 200).replace(/\s+/g, ' ').trim();

  const email = await prisma.email.create({
    data: {
      fromEmail,
      fromName: fromName ?? null,
      company: company ?? null,
      subject,
      body,
      preview,
      receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
      status: 'PENDING',
      isRead: false,
      hasAttachments: false,
    },
  });

  logger.info(`Manually created email id=${email.id} from ${fromEmail}`);

  return email;
};

/**
 * Aggregate counts by status and total unread count.
 */
export const getStats = async () => {
  const [statusCounts, unreadCount] = await Promise.all([
    prisma.email.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.email.count({ where: { isRead: false } }),
  ]);

  const byStatus = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count._all]),
  );

  const total = Object.values(byStatus).reduce(
    (sum: number, count) => sum + (count as number),
    0,
  );

  return {
    total,
    unread: unreadCount,
    byStatus: {
      PENDING: byStatus['PENDING'] ?? 0,
      PROCESSING: byStatus['PROCESSING'] ?? 0,
      PROCESSED: byStatus['PROCESSED'] ?? 0,
      FAILED: byStatus['FAILED'] ?? 0,
    },
  };
};

/**
 * Return attachment record with storagePath for streaming / download.
 */
export const downloadAttachment = async (attachmentId: string) => {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
  });

  if (!attachment) {
    throw new NotFoundError('Attachment');
  }

  if (!attachment.storagePath) {
    throw new BadRequestError('Attachment has no stored file path');
  }

  return attachment;
};
