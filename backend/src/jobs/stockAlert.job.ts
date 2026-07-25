import { Job } from 'bullmq';
import { logger } from '../config/logger';
import prisma from '../config/database';
import { NotificationService } from '../modules/notifications/notification.service';
import { emitLowStockAlert } from '../sockets/socket.server';

export const processStockAlertJob = async (_job: Job): Promise<void> => {
  logger.info('[Stock Alert Job] Checking inventory levels...');

  const criticalItems = await prisma.inventoryItem.findMany({
    where: { status: { in: ['CRITICAL', 'LOW'] } },
    orderBy: [{ status: 'asc' }, { availableQty: 'asc' }],
  });

  if (criticalItems.length === 0) {
    logger.info('[Stock Alert Job] All inventory levels healthy');
    return;
  }

  // Only create DB notifications for CRITICAL items to avoid notification spam
  const critical = criticalItems.filter((i) => i.status === 'CRITICAL');

  for (const item of critical) {
    await NotificationService.create({
      type: 'INVENTORY',
      title: 'Critical Stock Alert',
      message: `${item.name} (${item.sku}) — Only ${item.availableQty} units available, ${item.reservedQty} reserved`,
      metadata: { inventoryItemId: item.id, sku: item.sku, status: item.status },
    });
  }

  // Emit socket event with full low-stock list for dashboard
  emitLowStockAlert({
    critical: critical.map((i) => ({
      id: i.id,
      name: i.name,
      sku: i.sku,
      availableQty: i.availableQty,
      reservedQty: i.reservedQty,
      reorderLevel: i.reorderLevel,
    })),
    low: criticalItems
      .filter((i) => i.status === 'LOW')
      .map((i) => ({ id: i.id, name: i.name, sku: i.sku, availableQty: i.availableQty })),
    checkedAt: new Date().toISOString(),
  });

  logger.info(
    `[Stock Alert Job] Alerts: ${critical.length} critical, ${criticalItems.length - critical.length} low`,
  );
};
