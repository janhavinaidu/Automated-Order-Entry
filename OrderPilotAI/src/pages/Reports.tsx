import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Download,
  TrendingUp,
  RefreshCw,
  BarChart3,
  Users,
  DollarSign,
  ShoppingBag,
  ArrowUpRight,
  Package,
  Truck,
  CreditCard,
} from 'lucide-react';
import { api } from '../lib/api';
import type { ApiResponse } from '../lib/api';

interface ReportStats {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    thisMonthRevenue: number;
    lastMonthRevenue: number;
    revenueGrowth: number;
  };
  ordersByStatus: Array<{
    status: string;
    count: number;
    value: number;
  }>;
  topCustomers: Array<{
    customer: { name: string; company: string };
    orderCount: number;
    totalValue: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    amount: number;
    createdAt: string;
    customer: { name: string; company: string };
    invoice?: { status: string; totalAmount: number };
  }>;
  inventorySummary: Array<{
    status: string;
    count: number;
  }>;
  invoiceStats: Array<{
    status: string;
    count: number;
    total: number;
  }>;
  dispatchStats: Array<{
    status: string;
    count: number;
  }>;
}

export default function Reports() {
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: () => api.get<ApiResponse<ReportStats>>('/reports/summary'),
  });

  const handleExportCSV = () => {
    // Hits backend endpoint to download the CSV directly
    window.open('http://localhost:3001/api/v1/reports/export/orders.csv', '_blank');
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const stats = reportData?.data;

  // Custom status color mapping
  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'var(--amber-400)',
      PROCESSING: 'var(--indigo-400)',
      APPROVED: 'var(--green-400)',
      MANUFACTURING: 'var(--purple-400)',
      INVOICED: 'var(--blue-400)',
      DISPATCHED: 'var(--cyan-400)',
      DELIVERED: 'var(--green-500)',
      REJECTED: 'var(--red-400)',
      PAID: 'var(--green-400)',
      SENT: 'var(--blue-400)',
      DRAFT: 'var(--text-muted)',
    };
    return map[status] || 'var(--text-muted)';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="printable-container"
    >
      {/* Header */}
      <div className="page-header no-print">
        <div className="page-header-row">
          <div>
            <div className="breadcrumb">
              <div className="breadcrumb-dot" />
              <span className="breadcrumb-text">Insights</span>
              <span className="breadcrumb-sep">·</span>
              <span className="breadcrumb-text">Reports</span>
            </div>
            <h1 className="page-title">Executive Reports & Analytics</h1>
            <p className="page-subtitle">
              Comprehensive application metrics, financial reports, and system throughput.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => refetch()} style={{ gap: 6 }}>
              <RefreshCw size={13} />
              Refresh
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleExportCSV} style={{ gap: 6 }}>
              <Download size={13} />
              Export CSV
            </button>
            <button className="btn btn-primary btn-sm" onClick={handlePrintPDF} style={{ gap: 6 }}>
              <FileText size={13} />
              Print Report (PDF)
            </button>
          </div>
        </div>
      </div>

      {/* Print only header */}
      <div className="print-only-header" style={{ display: 'none' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>OrderPilot AI Report</h1>
        <p style={{ fontSize: 12, color: '#666', marginBottom: 20 }}>Generated on: {new Date().toLocaleDateString('en-IN')} | System Executive Summary</p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
          <div style={{ animation: 'spin 1s linear infinite' }}><RefreshCw size={24} color="var(--indigo-500)" /></div>
        </div>
      ) : stats ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
          {/* Key Metrics Grid */}
          <div className="stat-row">
            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="stat-card-label">Total Volume</span>
                <span className="stat-card-icon" style={{ background: 'var(--indigo-dim)' }}><DollarSign size={16} color="var(--indigo-400)" /></span>
              </div>
              <div className="stat-card-value">₹{(stats.summary.totalRevenue / 100000).toFixed(2)}L</div>
              <div className="stat-card-sub" style={{ color: 'var(--text-muted)', fontSize: 11 }}>Cumulative processed orders</div>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="stat-card-label">This Month Revenue</span>
                <span className="stat-card-icon" style={{ background: 'var(--green-dim)' }}><TrendingUp size={16} color="var(--green-400)" /></span>
              </div>
              <div className="stat-card-value">₹{(stats.summary.thisMonthRevenue / 100000).toFixed(2)}L</div>
              <div className="stat-card-sub">
                <span style={{ color: stats.summary.revenueGrowth >= 0 ? 'var(--green-400)' : 'var(--red-400)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ArrowUpRight size={12} /> {stats.summary.revenueGrowth >= 0 ? '+' : ''}{stats.summary.revenueGrowth}%
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}> vs last month (₹{(stats.summary.lastMonthRevenue / 100000).toFixed(2)}L)</span>
              </div>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="stat-card-label">Total Orders</span>
                <span className="stat-card-icon" style={{ background: 'var(--purple-dim)' }}><ShoppingBag size={16} color="var(--purple-400)" /></span>
              </div>
              <div className="stat-card-value">{stats.summary.totalOrders}</div>
              <div className="stat-card-sub" style={{ color: 'var(--text-muted)', fontSize: 11 }}>AI-assisted lifecycle</div>
            </div>
          </div>

          {/* Breakdown Sections */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Status Breakdown */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={16} color="var(--indigo-400)" /> Order Pipeline Status
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {stats.ordersByStatus.map((s) => {
                  const percent = stats.summary.totalOrders > 0 ? (s.count / stats.summary.totalOrders) * 100 : 0;
                  return (
                    <div key={s.status}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{s.status}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{s.count} orders · ₹{s.value.toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${percent}%`, background: getStatusColor(s.status), borderRadius: 99 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inventory Status Summary */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Package size={16} color="var(--amber-400)" /> Inventory Status Summary
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stats.inventorySummary.length > 0 ? (
                  stats.inventorySummary.map((s) => (
                    <div key={s.status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                      <span style={{ fontWeight: 600, textTransform: 'capitalize', color: s.status === 'CRITICAL' ? 'var(--red-400)' : s.status === 'LOW' ? 'var(--amber-400)' : 'var(--green-400)' }}>
                        {s.status.toLowerCase()} Stock items
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{s.count} SKUs</span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No inventory status found</div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Invoice Stats */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CreditCard size={16} color="var(--blue-400)" /> Billing & Receivables
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {stats.invoiceStats.map((inv) => (
                  <div key={inv.status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 13, marginRight: 8 }}>{inv.status}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({inv.count} invoices)</span>
                    </div>
                    <span style={{ fontWeight: 700, color: getStatusColor(inv.status) }}>₹{inv.total.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Customers */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={16} color="var(--purple-400)" /> Top Customers
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stats.topCustomers.map((tc, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{tc.customer.company}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tc.orderCount} orders placed</div>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--indigo-400)' }}>₹{tc.totalValue.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Orders Log */}
          <div className="card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} color="var(--indigo-400)" /> Recent Order Activity Log
              </h3>
            </div>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order No.</th>
                    <th>Customer Company</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Order Amount</th>
                    <th>Invoice Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td><span style={{ fontWeight: 600 }}>{o.orderNumber}</span></td>
                      <td>{o.customer.company}</td>
                      <td>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                      <td>
                        <span style={{ color: getStatusColor(o.status), fontWeight: 700, fontSize: 11 }}>
                          {o.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>₹{o.amount.toLocaleString('en-IN')}</td>
                      <td>
                        {o.invoice ? (
                          <span style={{ color: getStatusColor(o.invoice.status), fontWeight: 600, fontSize: 12 }}>
                            {o.invoice.status}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No Invoice</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
          <div style={{ color: 'var(--text-muted)' }}>Failed to load report summary.</div>
        </div>
      )}

      {/* Printing styles to make sure table prints beautifully */}
      <style>{`
        @media print {
          body {
            background: #white !important;
            color: #000 !important;
          }
          .sidebar, .top-header, .no-print, .btn, .breadcrumb, .sidebar-logo, .bottom-nav {
            display: none !important;
          }
          .main-content {
            margin-left: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .page-container {
            padding: 0 !important;
            margin: 0 !important;
          }
          .card {
            background: transparent !important;
            border: 1px solid #ccc !important;
            box-shadow: none !important;
            page-break-inside: avoid;
          }
          .print-only-header {
            display: block !important;
          }
          .printable-container {
            width: 100% !important;
          }
          .stat-row {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 15px !important;
            border-bottom: 2px solid #333 !important;
            padding-bottom: 20px !important;
            margin-bottom: 20px !important;
          }
          .stat-card {
            border: 1px solid #ddd !important;
            padding: 10px !important;
            background: #fafafa !important;
          }
          .stat-card-value {
            color: #000 !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #ddd !important;
            padding: 8px !important;
            color: #000 !important;
          }
        }
      `}</style>
    </motion.div>
  );
}
