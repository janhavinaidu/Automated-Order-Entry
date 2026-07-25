import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { VALIDATION } from '../../shared/constants';
import { NotFoundError } from '../../shared/errors';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  recommendation?: string;
}

export interface ValidationReport {
  overallStatus: 'PASS' | 'WARNING' | 'FAIL';
  issues: ValidationIssue[];
  canAutoApprove: boolean;
  checkedAt: string;
}

// ─── Helper: count business days between two dates ───────────────────────────

function countBusinessDays(from: Date, to: Date): number {
  let count = 0;
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

// ─── Validation Service ───────────────────────────────────────────────────────

export const ValidationService = {
  // ───────────────────────────────────────────────────────────────────────────
  // runValidation: Run all checks and persist result
  // ───────────────────────────────────────────────────────────────────────────
  async runValidation(jobId: string): Promise<ValidationReport> {
    // Load the extraction job with its products
    const job = await prisma.aIExtractionJob.findUnique({
      where: { id: jobId },
      include: {
        extractedProducts: true,
      },
    });

    if (!job) {
      throw new NotFoundError('AI Extraction Job');
    }

    const issues: ValidationIssue[] = [];

    // ── 1. Customer Exists Check ─────────────────────────────────────────────
    let matchedCustomer: { id: string; company: string } | null = null;
    if (job.customerName) {
      matchedCustomer = await prisma.customer.findFirst({
        where: {
          company: {
            contains: job.customerName,
            mode: 'insensitive',
          },
        },
        select: { id: true, company: true },
      });

      if (!matchedCustomer) {
        issues.push({
          type: 'warning',
          message: 'Customer not in master data — manual verification needed',
          recommendation: `Search for "${job.customerName}" in the customer list or create a new customer record`,
        });
      }
    } else {
      issues.push({
        type: 'warning',
        message: 'No customer name could be extracted from the document',
        recommendation: 'Manually identify and assign the customer before approving',
      });
    }

    // ── 2. Products Present Check ────────────────────────────────────────────
    if (!job.extractedProducts || job.extractedProducts.length === 0) {
      issues.push({
        type: 'error',
        message: 'No products could be extracted from the document',
        recommendation: 'Manually enter order line items before proceeding',
      });
    }

    // ── 3-5. Per-Product Checks ──────────────────────────────────────────────
    for (const product of job.extractedProducts) {
      const name = product.name ?? 'Unknown Product';
      const sku = product.sku ?? '';
      const quantity = product.quantity ?? 0;

      // ── 3. SKU Recognition ─────────────────────────────────────────────────
      let inventoryItem: { availableQty: number; totalQty: number } | null = null;
      if (sku) {
        inventoryItem = await prisma.inventoryItem.findUnique({
          where: { sku },
          select: { availableQty: true, totalQty: true },
        });

        if (!inventoryItem) {
          issues.push({
            type: 'warning',
            message: `SKU '${sku}' not found in inventory — new product or typo`,
            recommendation: `Verify the SKU against the product catalog. If new, add it to inventory first`,
          });
        }
      }

      // ── 4. Quantity Sanity Check ───────────────────────────────────────────
      if (quantity <= 0) {
        issues.push({
          type: 'error',
          message: `${name}: Quantity must be greater than 0`,
          recommendation: 'Correct the quantity before approving the order',
        });
      } else if (quantity > VALIDATION.MAX_QUANTITY_SANITY_CHECK) {
        issues.push({
          type: 'warning',
          message: `${name}: Unusually large quantity (${quantity}) — please verify`,
          recommendation: 'Confirm with the customer that this quantity is intentional',
        });
      }

      // ── 5. Inventory Availability Check ───────────────────────────────────
      if (inventoryItem && quantity > 0) {
        if (inventoryItem.availableQty < quantity) {
          if (inventoryItem.availableQty === 0) {
            issues.push({
              type: 'error',
              message: `${name}: No stock available (0 units in inventory)`,
              recommendation: `Raise a manufacturing job to produce all ${quantity} units of '${sku}'`,
            });
          } else {
            issues.push({
              type: 'warning',
              message: `${name}: Only ${inventoryItem.availableQty} of ${quantity} units available`,
              recommendation: `Split dispatch: ship ${inventoryItem.availableQty} now and manufacture the remaining ${quantity - inventoryItem.availableQty} units`,
            });
          }
        }
      }
    }

    // ── 6. Delivery Date Check ───────────────────────────────────────────────
    if (!job.deliveryDate) {
      issues.push({
        type: 'warning',
        message: 'No delivery date specified',
        recommendation: 'Confirm a delivery date with the customer before dispatching',
      });
    } else {
      const deliveryDate = new Date(job.deliveryDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      if (deliveryDate < now) {
        issues.push({
          type: 'error',
          message: 'Delivery date is in the past',
          recommendation: 'Contact the customer to update the delivery date',
        });
      } else {
        const businessDaysAvailable = countBusinessDays(new Date(), deliveryDate);
        if (businessDaysAvailable < VALIDATION.MIN_DELIVERY_LEAD_DAYS) {
          issues.push({
            type: 'warning',
            message: `Very short delivery window — confirm with production`,
            recommendation: `Only ${businessDaysAvailable} business day(s) available. Minimum recommended is ${VALIDATION.MIN_DELIVERY_LEAD_DAYS} days`,
          });
        }
      }
    }

    // ── 7. Duplicate Order Check ─────────────────────────────────────────────
    if (matchedCustomer && job.extractedProducts.length > 0) {
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - VALIDATION.DUPLICATE_ORDER_WINDOW_DAYS);

      const skus = job.extractedProducts
        .map((p) => p.sku)
        .filter((s): s is string => Boolean(s));

      if (skus.length > 0) {
        const recentOrders = await prisma.order.findMany({
          where: {
            customerId: matchedCustomer.id,
            createdAt: { gte: windowStart },
            status: { notIn: ['REJECTED'] },
          },
          include: {
            items: { select: { sku: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        for (const recentOrder of recentOrders) {
          const recentSkus = recentOrder.items.map((i) => i.sku);
          const overlap = skus.filter((s) => recentSkus.includes(s));
          if (overlap.length > 0) {
            const daysAgo = Math.round(
              (Date.now() - recentOrder.createdAt.getTime()) / (1000 * 60 * 60 * 24),
            );
            issues.push({
              type: 'warning',
              message: `Possible duplicate order detected — order ${recentOrder.orderNumber} placed ${daysAgo} day(s) ago had similar products`,
              recommendation: `Review order ${recentOrder.orderNumber} before proceeding to avoid duplicate fulfilment`,
            });
            break; // Report only the first duplicate
          }
        }
      }
    }

    // ── 8. Confidence Check ──────────────────────────────────────────────────
    const confidence = job.confidence ?? 0;
    if (confidence < VALIDATION.MIN_CONFIDENCE_PROCESS) {
      issues.push({
        type: 'error',
        message: 'Low AI confidence — manual review required before processing',
        recommendation: `Confidence is ${confidence}%. Re-run extraction after verifying the source document`,
      });
    } else if (confidence < VALIDATION.MIN_CONFIDENCE_AUTO_APPROVE) {
      issues.push({
        type: 'warning',
        message: 'Moderate confidence — review extracted data before approving',
        recommendation: `Confidence is ${confidence}%. Verify all extracted fields match the original document`,
      });
    }

    // ── Determine overall status ─────────────────────────────────────────────
    const hasError = issues.some((i) => i.type === 'error');
    const hasWarning = issues.some((i) => i.type === 'warning');

    let overallStatus: 'PASS' | 'WARNING' | 'FAIL';
    if (hasError) {
      overallStatus = 'FAIL';
    } else if (hasWarning) {
      overallStatus = 'WARNING';
    } else {
      overallStatus = 'PASS';
    }

    // canAutoApprove: PASS always, WARNING only if no inventory-related errors
    const hasInventoryError = issues.some(
      (i) => i.type === 'error' && i.message.includes('stock available'),
    );
    const canAutoApprove =
      overallStatus === 'PASS' || (overallStatus === 'WARNING' && !hasInventoryError);

    const checkedAt = new Date().toISOString();

    const report: ValidationReport = {
      overallStatus,
      issues,
      canAutoApprove,
      checkedAt,
    };

    // ── Persist to DB ─────────────────────────────────────────────────────────
    await prisma.validationResult.upsert({
      where: { jobId },
      update: {
        overallStatus,
        issues: issues as object[],
      },
      create: {
        jobId,
        overallStatus,
        issues: issues as object[],
      },
    });

    logger.info(`Validation complete for job ${jobId}: ${overallStatus} (${issues.length} issues)`);

    return report;
  },

  // ───────────────────────────────────────────────────────────────────────────
  // getValidationResult: Fetch persisted result by jobId
  // ───────────────────────────────────────────────────────────────────────────
  async getValidationResult(jobId: string) {
    const result = await prisma.validationResult.findUnique({
      where: { jobId },
      include: {
        job: {
          select: {
            id: true,
            status: true,
            confidence: true,
            customerName: true,
            deliveryDate: true,
            priority: true,
            summary: true,
            modelUsed: true,
            completedAt: true,
          },
        },
      },
    });

    if (!result) {
      throw new NotFoundError('Validation Result');
    }

    return result;
  },

  // ───────────────────────────────────────────────────────────────────────────
  // getValidationForEmail: Fetch validation via emailId → job → result
  // ───────────────────────────────────────────────────────────────────────────
  async getValidationForEmail(emailId: string) {
    const job = await prisma.aIExtractionJob.findFirst({
      where: { emailId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (!job) {
      throw new NotFoundError('AI Extraction Job for this email');
    }

    return this.getValidationResult(job.id);
  },
};
