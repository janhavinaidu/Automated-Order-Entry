import { prisma } from '../../config/database';
import { logger } from '../../config/logger';

// ─── Dashboard Service ────────────────────────────────────────────────────────

export const DashboardService = {
  /**
   * Key Performance Indicators — all queries run in parallel.
   */
  async getKPIs(): Promise<{
    ordersToday: number;
    ordersProcessing: number;
    revenue: number;
    pendingOrders: number;
    inventoryHealth: number;
  }> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [ordersToday, ordersProcessing, revenueAgg, pendingOrders, inventoryGroups] =
      await Promise.all([
        prisma.order.count({
          where: { createdAt: { gte: startOfToday } },
        }),
        prisma.order.count({
          where: { status: { in: ['PROCESSING', 'APPROVED', 'MANUFACTURING'] } },
        }),
        prisma.order.aggregate({
          where: { status: { in: ['INVOICED', 'DISPATCHED', 'DELIVERED'] } },
          _sum: { amount: true },
        }),
        prisma.order.count({
          where: { status: 'PENDING' },
        }),
        prisma.inventoryItem.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
      ]);

    const totalInventory = inventoryGroups.reduce((acc, g) => acc + g._count._all, 0);
    const healthyCount =
      inventoryGroups.find((g) => g.status === 'HEALTHY')?._count._all ?? 0;
    const inventoryHealth =
      totalInventory > 0 ? Math.round((healthyCount / totalInventory) * 100) : 100;

    return {
      ordersToday,
      ordersProcessing,
      revenue: revenueAgg._sum.amount ?? 0,
      pendingOrders,
      inventoryHealth,
    };
  },

  /**
   * Recent AI extraction activity — last 20 events.
   */
  async getAIActivity(): Promise<
    Array<{
      id: string;
      type: string;
      message: string;
      timestamp: Date;
      confidence: number | null;
      status: string;
    }>
  > {
    const jobs = await prisma.aIExtractionJob.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        email: {
          select: {
            fromEmail: true,
            fromName: true,
            subject: true,
            company: true,
          },
        },
      },
    });

    return jobs.map((job) => ({
      id: job.id,
      type: 'AI_EXTRACTION',
      message:
        job.status === 'COMPLETED'
          ? `Extracted order from ${job.email.company ?? job.email.fromEmail} — ${job.summary ?? 'Processing complete'}`
          : job.status === 'FAILED'
          ? `Extraction failed for ${job.email.subject}`
          : `Processing email from ${job.email.fromEmail}`,
      timestamp: job.completedAt ?? job.startedAt ?? job.createdAt,
      confidence: job.confidence,
      status: job.status,
    }));
  },

  /**
   * Daily order counts for the last N days.
   */
  async getOrderTrends(days = 30): Promise<Array<{ date: string; count: number }>> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    // Use raw query for date truncation across PostgreSQL
    const rows = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT
        TO_CHAR(DATE_TRUNC('day', "created_at"), 'YYYY-MM-DD') AS date,
        COUNT(*) AS count
      FROM orders
      WHERE "created_at" >= ${since}
      GROUP BY DATE_TRUNC('day', "created_at")
      ORDER BY DATE_TRUNC('day', "created_at") ASC
    `;

    // Fill in zero-count days for a continuous series
    const resultMap = new Map<string, number>();
    for (const row of rows) {
      resultMap.set(row.date, Number(row.count));
    }

    const result: Array<{ date: string; count: number }> = [];
    const current = new Date(since);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    while (current <= today) {
      const dateStr = current.toISOString().slice(0, 10);
      result.push({ date: dateStr, count: resultMap.get(dateStr) ?? 0 });
      current.setDate(current.getDate() + 1);
    }

    return result;
  },

  /**
   * Daily revenue chart for the last N days.
   */
  async getRevenueChart(days = 30): Promise<Array<{ date: string; revenue: number }>> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const rows = await prisma.$queryRaw<Array<{ date: string; revenue: number | null }>>`
      SELECT
        TO_CHAR(DATE_TRUNC('day', "created_at"), 'YYYY-MM-DD') AS date,
        SUM(amount) AS revenue
      FROM orders
      WHERE "created_at" >= ${since}
        AND status IN ('INVOICED', 'DISPATCHED', 'DELIVERED')
      GROUP BY DATE_TRUNC('day', "created_at")
      ORDER BY DATE_TRUNC('day', "created_at") ASC
    `;

    const resultMap = new Map<string, number>();
    for (const row of rows) {
      resultMap.set(row.date, Number(row.revenue ?? 0));
    }

    const result: Array<{ date: string; revenue: number }> = [];
    const current = new Date(since);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    while (current <= today) {
      const dateStr = current.toISOString().slice(0, 10);
      result.push({ date: dateStr, revenue: resultMap.get(dateStr) ?? 0 });
      current.setDate(current.getDate() + 1);
    }

    return result;
  },

  /**
   * Inventory items with LOW or CRITICAL stock, ordered most critical first.
   */
  async getLowStockItems() {
    return prisma.inventoryItem.findMany({
      where: { status: { in: ['LOW', 'CRITICAL'] } },
      orderBy: [{ status: 'asc' }, { availableQty: 'asc' }],
      take: 10,
    });
  },

  /**
   * Most recent orders with customer info.
   */
  async getRecentOrders(limit = 5) {
    return prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            company: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  },
};
