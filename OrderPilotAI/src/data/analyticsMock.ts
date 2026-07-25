/**
 * Consistent mock analytics for visual polish only.
 * Used when live chart/metric data is empty — never overrides operational lists or mutations.
 */

export const ANALYTICS_MOCK = {
  statDeltas: {
    ordersToday: 12.4,
    revenue: 18.2,
    processing: -8,
    inventoryHealth: -1.2,
  },

  orderStatusDonut: [
    { label: 'Delivered', value: 68, color: '#10B981' },
    { label: 'In Transit', value: 18, color: '#6366F1' },
    { label: 'Processing', value: 9, color: '#F59E0B' },
    { label: 'Pending', value: 5, color: '#C084FC' },
  ],

  revenueChart: {
    '7D': [182000, 195000, 210000, 198000, 225000, 240000, 284750],
    '30D': [
      142000, 158000, 165000, 172000, 168000, 175000, 182000,
      190000, 185000, 192000, 198000, 205000, 210000, 198000,
      215000, 220000, 228000, 235000, 240000, 232000, 245000,
      250000, 255000, 248000, 260000, 265000, 270000, 275000,
      280000, 284750,
    ],
    '90D': Array.from({ length: 90 }, (_, i) =>
      120000 + Math.round(180000 * (i / 89) + Math.sin(i / 7) * 12000),
    ),
  },

  billingRevenue: [
    180000, 220000, 195000, 240000, 210000, 260000, 280000, 250000,
    300000, 270000, 320000, 290000, 340000, 310000, 330000, 300000,
    280000, 310000, 290000, 270000, 300000, 280000, 320000, 290000,
    310000, 280000, 300000, 290000, 310000, 284750,
  ],

  reportsSummary: {
    summary: {
      totalOrders: 24,
      totalRevenue: 2847500,
      thisMonthRevenue: 2847500,
      lastMonthRevenue: 2408000,
      revenueGrowth: 18.2,
    },
    ordersByStatus: [
      { status: 'DELIVERED', count: 8, value: 980000 },
      { status: 'DISPATCHED', count: 3, value: 420000 },
      { status: 'INVOICED', count: 4, value: 560000 },
      { status: 'MANUFACTURING', count: 2, value: 380000 },
      { status: 'APPROVED', count: 3, value: 310000 },
      { status: 'PROCESSING', count: 2, value: 145000 },
      { status: 'PENDING', count: 2, value: 52500 },
    ],
    topCustomers: [
      { customer: { name: 'Rajesh Sharma', company: 'ArcTech Industries' }, orderCount: 4, totalValue: 2285000 },
      { customer: { name: 'Priya Mehta', company: 'Nexus Manufacturing' }, orderCount: 3, totalValue: 1182000 },
      { customer: { name: 'Anand Krishnamurthy', company: 'Delta Forged Parts' }, orderCount: 2, totalValue: 1128000 },
    ],
    inventorySummary: [
      { status: 'HEALTHY', count: 9 },
      { status: 'LOW', count: 3 },
      { status: 'CRITICAL', count: 3 },
    ],
    invoiceStats: [
      { status: 'PAID', count: 6, total: 1420000 },
      { status: 'SENT', count: 4, total: 980000 },
      { status: 'DRAFT', count: 2, total: 447500 },
    ],
    dispatchStats: [
      { status: 'DELIVERED', count: 5 },
      { status: 'IN_TRANSIT', count: 3 },
      { status: 'PENDING', count: 2 },
    ],
  },
} as const;

export function isEmptyChartData(values: number[]): boolean {
  return values.length === 0 || values.every((v) => v === 0);
}

/** Use mock chart values only when live data is empty. */
export function chartWithMockFallback(real: number[], mock: number[]): number[] {
  return isEmptyChartData(real) ? mock : real;
}

/** Use mock report summary only when live data has no orders. */
export function reportsWithMockFallback<T extends { summary: { totalOrders: number } }>(
  real: T | undefined,
  mock: T,
): T {
  if (!real || real.summary.totalOrders === 0) return mock;
  return real;
}
