import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Job } from 'bullmq';
import { ImapFlow, MailboxLockObject } from 'imapflow';
import { env } from '../config/env';
import { logger } from '../config/logger';
import prisma from '../config/database';
import { getAiExtractionQueue, safeEnqueue } from './queues';
import { simpleParser } from 'mailparser';
import { UPLOAD_PATHS } from '../middleware/upload.middleware';

export const processEmailIngestionJob = async (_job: Job): Promise<void> => {
  if (!env.IMAP_ENABLED) {
    logger.debug('[IMAP] Polling disabled — IMAP credentials not configured');
    return;
  }

  logger.info('[IMAP] Starting inbox poll...');

  const client = new ImapFlow({
    host: env.IMAP_HOST!,
    port: env.IMAP_PORT as number,
    secure: true,
    auth: {
      user: env.IMAP_USER!,
      pass: env.IMAP_PASSWORD!,
    },
    logger: false,
  });

  await client.connect();

  let lock: MailboxLockObject | null = null;
  let newEmailCount = 0;

  try {
    lock = await client.getMailboxLock(env.IMAP_MAILBOX);

    // Fetch last 100 messages, newest first
    const messages = client.fetch('1:100', {
      uid: true,
      envelope: true,
      bodyStructure: true,
      source: true,
    });

    for await (const message of messages) {
      const messageId = message.envelope?.messageId;

      if (!messageId) continue;

      // Deduplicate: skip if already imported
      const existing = await prisma.email.findUnique({ where: { messageId } });
      if (existing) continue;

      const fromAddress = message.envelope?.from?.[0];
      const fromEmail = fromAddress?.address ?? 'unknown@unknown.com';
      const fromName = fromAddress?.name ?? null;
      const subject = message.envelope?.subject ?? '(No Subject)';
      const receivedAt = message.envelope?.date ?? new Date();

      // Get text body and attachments from source using mailparser
      let body = '';
      let mailAttachments: Array<{ filename?: string; content?: Buffer; contentType?: string; size?: number }> = [];
      try {
        const sourceBuffer = message.source;
        if (sourceBuffer) {
          const parsed = await simpleParser(sourceBuffer);
          body = parsed.text || parsed.html || '';
          body = body.slice(0, 10000);
          mailAttachments = parsed.attachments ?? [];
        }
      } catch {
        body = '(Could not parse email body)';
      }

      const preview = body.replace(/\s+/g, ' ').slice(0, 200);
      const hasAttachments = mailAttachments.length > 0;

      // Check if customer exists in master data
      const customer = await prisma.customer.findFirst({
        where: { email: { equals: fromEmail, mode: 'insensitive' } },
      });

      // Create email record
      const email = await prisma.email.create({
        data: {
          fromEmail,
          fromName,
          company: customer?.company ?? fromName ?? null,
          avatar: customer?.avatar ?? null,
          subject,
          preview,
          body,
          receivedAt: new Date(receivedAt),
          isRead: false,
          hasAttachments,
          status: 'PENDING',
          customerId: customer?.id ?? null,
          messageId,
        },
      });

      for (const att of mailAttachments) {
        if (!att.content?.length) continue;
        const originalName = att.filename || 'attachment';
        const ext = path.extname(originalName) || '.bin';
        const storedName = `${uuidv4()}${ext}`;
        const absolutePath = path.join(UPLOAD_PATHS.attachments, storedName);
        fs.writeFileSync(absolutePath, att.content);
        await prisma.attachment.create({
          data: {
            emailId: email.id,
            filename: originalName,
            fileType: ext.replace('.', '').toLowerCase() || 'unknown',
            fileSizeBytes: att.size ?? att.content.length,
            storagePath: absolutePath,
            mimeType: att.contentType ?? null,
          },
        });
      }

      // Create AI extraction job record
      await prisma.aIExtractionJob.create({
        data: {
          emailId: email.id,
          status: 'QUEUED',
        },
      });

      // Enqueue for AI extraction (no-op if Redis version is incompatible)
      await safeEnqueue(
        getAiExtractionQueue(),
        'extract-email',
        { emailId: email.id },
        { jobId: `extraction-${email.id}` },
      );

      newEmailCount++;
      logger.info(`[IMAP] New email ingested: "${subject}" from ${fromEmail}`);
    }
  } finally {
    lock?.release();
    await client.logout();
  }

  logger.info(`[IMAP] Poll complete. ${newEmailCount} new emails ingested.`);
};
