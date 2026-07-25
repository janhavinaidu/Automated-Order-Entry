import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Filter, Download, Plus, ArrowRight, ArrowUpRight, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import type { ApiResponse } from '../lib/api';

type TabType = 'all' | 'PENDING' | 'PROCESSING' | 'APPROVED' | 'MANUFACTURING' | 'DISPATCHED' | 'INVOICED';

const tabs: { key: TabType; label: string }[] = [
  { key: 'all',           label: 'All Orders' },
  { key: 'PROCESSING',    label: 'Automated' },
  { key: 'PENDING',       label: 'Needs Review' },
  { key: 'MANUFACTURING', label: 'Manufacturing' },
  { key: 'DISPATCHED',    label: 'Dispatched' },
  { key: 'INVOICED',      label: 'Delivered' },
];

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  amount: number;
  currency: string;
  progress: number;
  createdAt: string;
  customer: { name: string; company: string; email: string };
  aiConfidence: number | null;
}

interface OrderStats {
  total: number;
  byStatus: Record<string, number>;
  averageAmount: number;
  autoProcessed: number;
  pendingReview: number;
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING:       { label: 'Pending',       cls: 'badge badge-amber' },
    PROCESSING:    { label: 'Processing',    cls: 'badge badge-indigo' },
    APPROVED:      { label: 'Validated',     cls: 'badge badge-green' },
    MANUFACTURING: { label: 'Manufacturing', cls: 'badge badge-purple' },
    INVOICED:      { label: 'Billing',       cls: 'badge badge-blue' },
    DISPATCHED:    { label: 'Dispatched',    cls: 'badge badge-cyan' },
    REJECTED:      { label: 'Rejected',      cls: 'badge badge-red' },
  };
  const { label, cls } = map[status] || { label: status, cls: 'badge badge-muted' };
  return <span className={cls}>{label}</span>;
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 95 ? 'var(--green-400)' : value >= 85 ? 'var(--indigo-400)' : 'var(--amber-400)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div className="progress-track" style={{ flex: 1, height: 4 }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 99, background: color, boxShadow: `0 0 6px ${color}60` }}
        />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, minWidth: 28, textAlign: 'right' }}>{value}%</span>
    </div>
  );
}

export default function Orders() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [page, setPage] = useState(1);

  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['orders', activeTab, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (activeTab !== 'all') params.set('status', activeTab);
      return api.get<ApiResponse<Order[]>>(`/orders?${params}`);
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ['order-stats'],
    queryFn: () => api.get<ApiResponse<OrderStats>>('/orders/stats'),
  });

  const orders = ordersData?.data ?? [];
  const stats = statsData?.data;
  const pagination = ordersData?.pagination;

  const totalOrders   = stats?.total ?? 0;
  const autoProcessed = stats?.autoProcessed ?? 0;
  const needsReview   = stats?.pendingReview ?? 0;
  const avgValue      = stats?.averageAmount ?? 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="breadcrumb">
              <div className="breadcrumb-dot" />
              <span className="breadcrumb-text">Workflow</span>
              <span className="breadcrumb-sep">·</span>
              <span className="breadcrumb-text">Orders</span>
            </div>
            <h1 className="page-title">Order Management</h1>
            <p className="page-subtitle">Every order — extracted, validated, and orchestrated by AI.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => refetch()} style={{ gap: 6 }}>
              <RefreshCw size={13} />
              Refresh
            </button>
            <button className="btn btn-ghost btn-sm" style={{ gap: 6 }}>
              <Filter size={13} />
              Filter
            </button>
            <button className="btn btn-ghost btn-sm" style={{ gap: 6 }}>
              <Download size={13} />
              Export
            </button>
            <motion.button whileTap={{ scale: 0.96 }} className="btn btn-primary" style={{ gap: 6 }}>
              <Plus size={14} />
              New Order
            </motion.button>
          </div>
        </div>
      </div>

      {/* Stat Row */}
      <motion.div
        className="stat-row"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ borderRadius: 0, border: 'none', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
      >
        <div className="stat-card" style={{ background: 'var(--bg-surface)' }}>
          <div className="stat-card-label">Total Orders</div>
          <div className="stat-card-value">{totalOrders.toLocaleString()}</div>
          <div className="stat-card-sub" style={{ color: 'var(--text-muted)', fontSize: 11 }}>all time</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-surface)' }}>
          <div className="stat-card-label">Auto-Processed</div>
          <div className="stat-card-value">
            {autoProcessed}
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 6 }}>
              {totalOrders > 0 ? Math.round(autoProcessed / totalOrders * 100) : 0}%
            </span>
          </div>
          <div className="stat-card-sub" style={{ color: 'var(--text-muted)', fontSize: 11 }}>avg 4 min</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-surface)' }}>
          <div className="stat-card-label">Needs Review</div>
          <div className="stat-card-value" style={{ color: needsReview > 0 ? 'var(--amber-400)' : 'var(--text-primary)' }}>
            {needsReview}
          </div>
          <div className="stat-card-sub" style={{ color: 'var(--text-muted)', fontSize: 11 }}>pending</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-surface)' }}>
          <div className="stat-card-label">Avg Value</div>
          <div className="stat-card-value">
            ₹{(avgValue / 100000).toFixed(1)}L
          </div>
          <div className="stat-card-sub">
            <ArrowUpRight size={11} style={{ color: 'var(--green-400)' }} />
            <span style={{ color: 'var(--green-400)', fontWeight: 600 }}>+9%</span>
          </div>
        </div>
      </motion.div>

      {/* Tab Bar */}
      <div className="tab-bar">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="page-body" style={{ paddingTop: 20 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="card"
          >
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th style={{ minWidth: 160 }}>AI Confidence</th>
                    <th>Received</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j}><div style={{ height: 16, background: 'var(--bg-elevated)', borderRadius: 4, animation: 'shimmer 1.5s infinite' }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : orders.length > 0 ? orders.map((order, i) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <td><span className="table-link">{order.orderNumber}</span></td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 1 }}>{order.customer?.company ?? '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{order.customer?.email ?? ''}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                          ₹{order.amount.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td><StatusChip status={order.status} /></td>
                      <td style={{ minWidth: 160 }}>
                        {order.aiConfidence !== null && order.aiConfidence !== undefined
                          ? <ConfidenceBar value={Math.round(order.aiConfidence)} />
                          : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                        }
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {new Date(order.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td><ArrowRight size={14} color="var(--text-muted)" /></td>
                    </motion.tr>
                  )) : (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty-state">
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>No orders found</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Try a different filter</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {page} of {pagination.totalPages}</span>
                <button className="btn btn-ghost btn-sm" disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
