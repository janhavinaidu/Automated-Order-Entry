import { prisma } from '../../config/database';

// ─── Reports Service ──────────────────────────────────────────────────────────

export const ReportsService = {
  /**
   * Get full summary data for the reports page.
   */
  async getSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      totalOrders,
      ordersByStatus,
      thisMonthRevenue,
      lastMonthRevenue,
      totalRevenue,
      topCustomers,
      recentOrders,
      inventorySummary,
      invoiceStats,
      dispatchStats,
    ] = await Promise.all([
      // Total orders
      prisma.order.count(),

      // Orders grouped by status
      prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { amount: true },
      }),

      // This month revenue (INVOICED/DISPATCHED/DELIVERED orders)
      prisma.order.aggregate({
        _sum: { amount: true },
        where: {
          createdAt: { gte: startOfMonth },
          status: { in: ['INVOICED', 'DISPATCHED', 'DELIVERED'] },
        },
      }),

      // Last month revenue
      prisma.order.aggregate({
        _sum: { amount: true },
        where: {
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          status: { in: ['INVOICED', 'DISPATCHED', 'DELIVERED'] },
        },
      }),

      // Total all-time revenue
      prisma.order.aggregate({
        _sum: { amount: true },
        where: { status: { in: ['INVOICED', 'DISPATCHED', 'DELIVERED'] } },
      }),

      // Top 5 customers by order value
      prisma.order.groupBy({
        by: ['customerId'],
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      }),

      // Recent 20 orders
      prisma.order.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, company: true } },
          invoice: { select: { status: true, totalAmount: true } },
        },
      }),

      // Inventory summary
      prisma.inventoryItem.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      // Invoice stats
      prisma.invoice.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { totalAmount: true },
      }),

      // Dispatch stats
      prisma.shipment.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    // Enrich top customers with names
    const customerIds = topCustomers.map((c) => c.customerId);
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, company: true },
    });
    const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));

    const thisMonthVal = thisMonthRevenue._sum.amount ?? 0;
    const lastMonthVal = lastMonthRevenue._sum.amount ?? 0;
    const revenueGrowth =
      lastMonthVal === 0
        ? thisMonthVal > 0
          ? 100
          : 0
        : Math.round(((thisMonthVal - lastMonthVal) / lastMonthVal) * 100);

    return {
      summary: {
        totalOrders,
        totalRevenue: totalRevenue._sum.amount ?? 0,
        thisMonthRevenue: thisMonthVal,
        lastMonthRevenue: lastMonthVal,
        revenueGrowth,
      },
      ordersByStatus: ordersByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
        value: s._sum.amount ?? 0,
      })),
      topCustomers: topCustomers.map((c) => ({
        customer: customerMap[c.customerId] ?? { name: 'Unknown', company: 'Unknown' },
        orderCount: c._count.id,
        totalValue: c._sum.amount ?? 0,
      })),
      recentOrders,
      inventorySummary: inventorySummary.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      invoiceStats: invoiceStats.map((s) => ({
        status: s.status,
        count: s._count.id,
        total: s._sum.totalAmount ?? 0,
      })),
      dispatchStats: dispatchStats.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
    };
  },

  /**
   * Export orders as CSV string.
   */
  async exportOrdersCsv(): Promise<string> {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, company: true, email: true } },
        invoice: { select: { invoiceNumber: true, status: true, totalAmount: true } },
      },
    });

    const headers = [
      'Order Number',
      'Customer',
      'Company',
      'Email',
      'Status',
      'Priority',
      'Amount (INR)',
      'Invoice #',
      'Invoice Status',
      'Invoice Total',
      'Delivery Date',
      'Created At',
    ].join(',');

    const rows = orders.map((o) => {
      const deliveryDate = o.deliveryDate
        ? new Date(o.deliveryDate).toLocaleDateString('en-IN')
        : '';
      return [
        o.orderNumber,
        `"${o.customer.name}"`,
        `"${o.customer.company}"`,
        o.customer.email,
        o.status,
        o.priority,
        o.amount.toFixed(2),
        o.invoice?.invoiceNumber ?? '',
        o.invoice?.status ?? '',
        o.invoice?.totalAmount?.toFixed(2) ?? '',
        deliveryDate,
        new Date(o.createdAt).toLocaleDateString('en-IN'),
      ].join(',');
    });

    return [headers, ...rows].join('\n');
  },
};
