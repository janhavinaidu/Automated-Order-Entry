import { Job } from 'bullmq';
import { logger } from '../config/logger';

export const processInvoiceSenderJob = async (job: Job): Promise<void> => {
  const { invoiceId } = job.data as { invoiceId: string };

  logger.info(`[Invoice Sender Job] Sending invoice: ${invoiceId}`);

  const { BillingService } = await import('../modules/billing/billing.service');
  await BillingService.sendInvoice(invoiceId);

  logger.info(`[Invoice Sender Job] Invoice sent: ${invoiceId}`);
};
