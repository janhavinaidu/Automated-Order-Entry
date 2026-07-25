import { Job } from 'bullmq';
import { logger } from '../config/logger';

export const processAIExtractionJob = async (job: Job): Promise<void> => {
  const { emailId } = job.data as { emailId: string };

  logger.info(`[AI Extraction Job] Processing email: ${emailId}`);

  // Dynamic import avoids circular dependency at module load time
  const extractionModule = await import('../modules/ai-extraction/extraction.service');
  const validationModule = await import('../modules/validation/validation.service');

  // 1. Run extraction pipeline
  await extractionModule.runExtractionPipeline(emailId);

  // 2. Auto-run validation if extraction succeeded
  const extractionJob = await extractionModule.findByEmailId(emailId);

  if (extractionJob && extractionJob.status === 'COMPLETED') {
    logger.info(`[AI Extraction Job] Running validation for job: ${extractionJob.id}`);
    await validationModule.ValidationService.runValidation(extractionJob.id);
  }

  logger.info(`[AI Extraction Job] Complete for email: ${emailId}`);
};
