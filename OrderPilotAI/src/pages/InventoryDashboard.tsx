import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Package, AlertTriangle, TrendingDown, Warehouse,
  CheckCircle, Clock, Flag, Sparkles, BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { ApiResponse } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

interface InventoryStats {
  total: number;
  healthy: number;
  low: number;
  critical: number;
  totalValue: number;
}

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  availableQty: number;
  reorderLevel: number;
  status: string;
}

interface FulfillmentOrder {
  id: string;
  orderNumber: string;
  status: string;
  customer: {
    id: string;
    name: string;
    company: string;
    avatar: string | null;
  };
  items: Array<{
    id: string;
    name: string;
    sku: string;
    quantity: number;
  }>;
  isPackedReady: boolean;
}

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: 'easeOut', delay },
});

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    HEALTHY: 'badge badge-green', LOW: 'badge badge-amber', CRITICAL: 'badge badge-red',
    healthy: 'badge badge-green', low: 'badge badge-amber', critical: 'badge badge-red',
  };
  const labels: Record<string, string> = {
    HEALTHY: 'healthy', LOW: 'low', CRITICAL: 'critical',
    healthy: 'healthy', low: 'low', critical: 'critical',
  };
  return <span className={map[status] || 'badge badge-muted'}>{labels[status] || status}</span>;
}

export default function InventoryDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportIssue, setReportIssue] = useState({ title: '', message: '' });

  const { data: statsData } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: () => api.get<ApiResponse<InventoryStats>>('/inventory/stats'),
    refetchInterval: 30_000,
  });

  const { data: itemsData } = useQuery({
    queryKey: ['inventory', 'all'],
    queryFn: () => api.get<ApiResponse<InventoryItem[]>>('/inventory?limit=50'),
    refetchInterval: 30_000,
  });

  const { data: alertsData } = useQuery({
    queryKey: ['inventory-alerts'],
    queryFn: () => api.get<ApiResponse<InventoryItem[]>>('/inventory/alerts'),
    refetchInterval: 20_000,
  });

  const { data: fulfillmentData } = useQuery({
    queryKey: ['fulfillment-queue'],
    queryFn: () => api.get<ApiResponse<FulfillmentOrder[]>>('/orders/fulfillment-queue'),
    refetchInterval: 30_000,
  });

  const stats = statsData?.data;
  const alerts = alertsData?.data ?? [];
  const items = itemsData?.data ?? [];
  const fulfillmentOrders = fulfillmentData?.data ?? [];

  const reportMutation = useMutation({
    mutationFn: (data: { title: string; message: string }) => 
      api.post<ApiResponse<null>>('/notifications', {
        type: 'INVENTORY',
        title: data.title,
        message: data.message,
        metadata: { issueKind: 'MANUAL', reportedBy: user?.name },
      }),
    onSuccess: () => {
      setShowReportModal(false);
      setReportIssue({ title: '', message: '' });
      alert('Issue reported to admin successfully!');
    },
    onError: (error) => {
      alert(`Failed to report issue: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const critical = alerts.filter(a => a.status === 'CRITICAL' || a.status === 'critical');
  const low = alerts.filter(a => a.status === 'LOW' || a.status === 'low');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] ?? 'Manager';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Hero Greeting */}
      <div style={{
        padding: '32px 28px 28px',
        background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(239,68,68,0.05) 100%)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <motion.div {...fade(0)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B' }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Inventory Dashboard
            </span>
          </div>
          <h1 style={{
            fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em',
            color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.2,
          }}>
            {greeting}, <span style={{ color: '#F59E0B' }}>{firstName}</span> 👋
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
            Here's your inventory snapshot for today. You can add, edit stock and report issues to admin.
          </p>

          {/* Quick CTA */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/inventory')}
              style={{
                padding: '9px 18px',
                background: '#F59E0B', border: 'none', borderRadius: 10,
                color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
                boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
              }}
            >
              <Package size={14} /> Manage Inventory
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              style={{
                padding: '9px 18px',
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 10, color: 'var(--red-400)', fontWeight: 700, fontSize: 13,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
              }}
            >
              <Flag size={14} /> Report Issue
            </button>
            {critical.length > 0 && (
              <button
                onClick={() => navigate('/inventory')}
                style={{
                  padding: '9px 18px',
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 10, color: 'var(--red-400)', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
                }}
              >
                <AlertTriangle size={14} /> {critical.length} Critical Item{critical.length > 1 ? 's' : ''} — Action Needed
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Stats Row */}
      <motion.div
        {...fade(0.08)}
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
        }}
      >
        {[
          { label: 'Total SKUs', value: stats?.total ?? '—', sub: 'in catalog', color: 'var(--text-primary)' },
          { label: 'Healthy', value: stats?.healthy ?? '—', sub: 'within target', color: 'var(--green-400)' },
          { label: 'Low Stock', value: stats?.low ?? '—', sub: 'reorder recommended', color: '#F59E0B' },
          { label: 'Critical', value: stats?.critical ?? '—', sub: 'urgent action', color: 'var(--red-400)' },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{
              padding: '20px 24px',
              borderRight: i < 3 ? '1px solid var(--border-subtle)' : 'none',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </motion.div>

      {/* Fulfillment Queue - Orders needing packing */}
      {fulfillmentOrders.length > 0 && (
        <motion.div
          {...fade(0.1)}
          style={{
            padding: '20px 28px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(168,85,247,0.04) 100%)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, background: 'var(--blue-dim)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Warehouse size={16} color="var(--blue-400)" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Orders Ready for Packing</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fulfillmentOrders.length} order{fulfillmentOrders.length > 1 ? 's' : ''} awaiting your action</div>
              </div>
            </div>
            <span style={{ background: 'var(--blue-dim)', color: 'var(--blue-400)', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(99,102,241,0.2)' }}>
              {fulfillmentOrders.filter(o => !o.isPackedReady).length} pending
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {fulfillmentOrders.slice(0, 4).map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 + 0.12 }}
                style={{
                  padding: '14px 16px',
                  background: 'var(--bg-surface)',
                  border: order.isPackedReady ? '1px solid var(--green-500)' : '1px solid var(--border-subtle)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{order.orderNumber}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{order.customer.company}</div>
                  </div>
                  {order.isPackedReady ? (
                    <CheckCircle size={16} color="var(--green-400)" />
                  ) : (
                    <Clock size={16} color="#F59E0B" />
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                  {order.items.length} item{order.items.length > 1 ? 's' : ''} · {order.status}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {order.items.slice(0, 3).map(item => (
                    <span key={item.id} style={{ fontSize: 10, background: 'var(--bg-elevated)', padding: '3px 8px', borderRadius: 6, color: 'var(--text-muted)' }}>
                      {item.sku}
                    </span>
                  ))}
                  {order.items.length > 3 && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{order.items.length - 3} more</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Body */}
      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

          {/* Recent Inventory Items */}
          <motion.div className="card" {...fade(0.12)}>
            <div className="card-header">
              <div>
                <div className="card-title">Your Stock Catalog</div>
                <div className="card-subtitle">All inventory items — click Manage to add or edit</div>
              </div>
              <button
                onClick={() => navigate('/inventory')}
                style={{
                  background: 'var(--blue-dim)', border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                  color: 'var(--indigo-400)', fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
                }}
              >
                <BarChart3 size={12} /> Manage Inventory
              </button>
            </div>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Available</th>
                    <th>Reorder At</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, 8).map((item, i) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 + 0.15 }}
                    >
                      <td style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo-400)' }}>{item.sku}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.name}</td>
                      <td style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{item.availableQty}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.reorderLevel}</td>
                      <td><StatusBadge status={item.status} /></td>
                    </motion.tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>No inventory items yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Report Issue Quick Panel */}
            <motion.div
              className="card"
              {...fade(0.16)}
              style={{ border: '1px solid rgba(245,158,11,0.2)', background: 'linear-gradient(135deg, rgba(245,158,11,0.04) 0%, rgba(239,68,68,0.03) 100%)' }}
            >
              <div className="card-header">
                <div>
                  <div className="card-title">Report Stock Issue</div>
                  <div className="card-subtitle">Flag a problem to admin instantly</div>
                </div>
                <Flag size={15} color="#F59E0B" />
              </div>
              <div className="card-body">
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 14 }}>
                  Found a discrepancy, damaged goods, or miscount? Use the <strong style={{ color: 'var(--text-secondary)' }}>Report button</strong> on any item in the Inventory page to alert admin immediately.
                </p>
                <button
                  onClick={() => navigate('/inventory')}
                  style={{
                    width: '100%', padding: '10px 0',
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                    borderRadius: 10, cursor: 'pointer', color: '#F59E0B',
                    fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Flag size={14} /> Go to Inventory
                </button>
              </div>
            </motion.div>

            {/* Critical & Low Alerts */}
            <motion.div className="card" {...fade(0.22)} style={{ flex: 1 }}>
              <div className="card-header">
                <div>
                  <div className="card-title">Alerts</div>
                  <div className="card-subtitle">Items needing attention</div>
                </div>
                <span style={{ width: 24, height: 24, background: 'var(--red-dim)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={12} color="var(--red-400)" />
                </span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {alerts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <CheckCircle size={28} color="var(--green-400)" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green-400)' }}>All stock levels healthy</div>
                  </div>
                ) : alerts.slice(0, 6).map((item, i) => {
                  const isCritical = item.status === 'CRITICAL' || item.status === 'critical';
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07 + 0.25 }}
                      style={{
                        padding: '10px 12px',
                        background: isCritical ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.04)',
                        border: `1px solid ${isCritical ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}`,
                        borderRadius: 10,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--indigo-400)' }}>{item.sku}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {isCritical ? '⚠ ' : ''}{item.availableQty} remaining
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <StatusBadge status={item.status} />
                        <TrendingDown size={12} color={isCritical ? 'var(--red-400)' : '#F59E0B'} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Tips */}
            <motion.div
              className="card"
              {...fade(0.28)}
              style={{ border: '1px solid rgba(99,102,241,0.15)', background: 'linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(168,85,247,0.03) 100%)' }}
            >
              <div className="card-header">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={13} color="var(--purple-400)" /> AI Tips
                </div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  'Items below reorder level need to be restocked within 48 hrs to avoid disruption.',
                  'Always report damaged or missing stock to admin — helps audit accuracy.',
                  `You have ${critical.length} critical item${critical.length !== 1 ? 's' : ''} — prioritize these first.`,
                ].map((tip, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ marginTop: 2, width: 5, height: 5, borderRadius: '50%', background: 'var(--purple-400)', flexShrink: 0, marginLeft: 2 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>{tip}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Report Issue Modal */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1000, padding: 16,
            }}
            onClick={() => setShowReportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-elevated)', borderRadius: 20,
                padding: '24px', width: '100%', maxWidth: 450,
                border: '1px solid var(--border-default)',
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Flag size={18} color="#F59E0B" />
                Report Issue to Admin
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                    Issue Title
                  </label>
                  <input
                    type="text"
                    value={reportIssue.title}
                    onChange={(e) => setReportIssue({ ...reportIssue, title: e.target.value })}
                    placeholder="e.g., Damaged goods, Missing stock, Equipment issue"
                    style={{
                      width: '100%', padding: '10px 12px',
                      background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                      borderRadius: 8, color: 'var(--text-primary)', fontSize: 13,
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                    Description
                  </label>
                  <textarea
                    value={reportIssue.message}
                    onChange={(e) => setReportIssue({ ...reportIssue, message: e.target.value })}
                    placeholder="Describe the issue in detail..."
                    rows={4}
                    style={{
                      width: '100%', padding: '10px 12px',
                      background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                      borderRadius: 8, color: 'var(--text-primary)', fontSize: 13,
                      fontFamily: 'inherit', resize: 'vertical',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    onClick={() => setShowReportModal(false)}
                    style={{
                      flex: 1, padding: '10px',
                      background: 'transparent', border: '1px solid var(--border-subtle)',
                      borderRadius: 8, color: 'var(--text-muted)', fontWeight: 600,
                      fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => reportMutation.mutate(reportIssue)}
                    disabled={reportMutation.isPending || !reportIssue.title || !reportIssue.message}
                    style={{
                      flex: 1, padding: '10px',
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                      borderRadius: 8, color: 'var(--red-400)', fontWeight: 700,
                      fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                      opacity: (reportMutation.isPending || !reportIssue.title || !reportIssue.message) ? 0.5 : 1,
                    }}
                  >
                    {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
