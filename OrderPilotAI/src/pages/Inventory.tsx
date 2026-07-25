import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package, AlertTriangle, Sparkles, Warehouse, TrendingDown,
  Plus, Pencil, Flag, X, CheckCircle, RefreshCw
} from 'lucide-react';
import { api } from '../lib/api';
import type { ApiResponse } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string | null;
  totalQty: number;
  availableQty: number;
  reservedQty: number;
  reorderLevel: number;
  status: string;
  warehouse: string | null;
  unit: string;
}

interface InventoryStats {
  total: number;
  healthy: number;
  low: number;
  critical: number;
  totalValue: number;
}

const warehouses = [
  { id: 'WH-01', capacity: 82, color: 'var(--amber-400)' },
  { id: 'WH-02', capacity: 64, color: 'var(--indigo-400)' },
  { id: 'WH-03', capacity: 48, color: 'var(--green-400)' },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    HEALTHY: 'badge badge-green', healthy: 'badge badge-green',
    LOW: 'badge badge-amber', low: 'badge badge-amber',
    CRITICAL: 'badge badge-red', critical: 'badge badge-red',
  };
  const labels: Record<string, string> = {
    HEALTHY: 'healthy', healthy: 'healthy',
    LOW: 'low', low: 'low',
    CRITICAL: 'critical', critical: 'critical',
  };
  return <span className={map[status] || 'badge badge-muted'}>{labels[status] || status}</span>;
}

function LevelBar({ item }: { item: InventoryItem }) {
  const pct = item.totalQty > 0 ? (item.availableQty / item.totalQty) * 100 : 0;
  const color = item.status === 'HEALTHY' || item.status === 'healthy' ? 'progress-green'
    : item.status === 'LOW' || item.status === 'low' ? 'progress-amber' : 'progress-red';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="progress-track" style={{ width: 80, height: 4 }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`progress-fill ${color}`}
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
}

/* ─── Add / Edit Modal ─────────────────────────────────────────────────────── */
function ItemModal({
  item,
  onClose,
  onSave,
}: {
  item: InventoryItem | null;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
}) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    name: item?.name ?? '',
    sku: item?.sku ?? '',
    category: item?.category ?? '',
    totalQty: item?.totalQty ?? 0,
    availableQty: item?.availableQty ?? 0,
    reorderLevel: item?.reorderLevel ?? 0,
    unit: item?.unit ?? 'units',
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }));

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border-default)',
    borderRadius: 10, color: 'var(--text-primary)',
    fontSize: 13, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600,
    color: 'var(--text-muted)',
    display: 'block', marginBottom: 5,
    textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 40, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
          borderRadius: 20, padding: 28, width: '100%', maxWidth: 480,
          boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: 'var(--blue-dim)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isEdit ? <Pencil size={16} color="var(--indigo-400)" /> : <Plus size={16} color="var(--indigo-400)" />}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{isEdit ? 'Edit Item' : 'Add New Item'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{isEdit ? `SKU: ${item.sku}` : 'Enter product details'}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Product Name</label>
            <input style={inputStyle} value={form.name} onChange={set('name')} placeholder="X200 Servo Motor" />
          </div>
          <div>
            <label style={labelStyle}>SKU</label>
            <input style={inputStyle} value={form.sku} onChange={set('sku')} placeholder="SRV-X200" disabled={isEdit} />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <input style={inputStyle} value={form.category} onChange={set('category')} placeholder="Motors" />
          </div>
          <div>
            <label style={labelStyle}>Total Quantity</label>
            <input style={inputStyle} type="number" value={form.totalQty} onChange={set('totalQty')} min={0} />
          </div>
          <div>
            <label style={labelStyle}>Available Quantity</label>
            <input style={inputStyle} type="number" value={form.availableQty} onChange={set('availableQty')} min={0} />
          </div>
          <div>
            <label style={labelStyle}>Reorder Level</label>
            <input style={inputStyle} type="number" value={form.reorderLevel} onChange={set('reorderLevel')} min={0} />
          </div>
          <div>
            <label style={labelStyle}>Unit</label>
            <input style={inputStyle} value={form.unit} onChange={set('unit')} placeholder="units" />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => onSave(form)}
          >
            {isEdit ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Report Issue Modal ───────────────────────────────────────────────────── */
function ReportModal({
  item,
  onClose,
  onReport,
}: {
  item: InventoryItem;
  onClose: () => void;
  onReport: (msg: string) => void;
}) {
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!message.trim()) return;
    onReport(message.trim());
    setSent(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
      onClick={!sent ? onClose : undefined}
    >
      <motion.div
        initial={{ y: 40, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 40, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
          borderRadius: 20, padding: 28, width: '100%', maxWidth: 440,
          boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
        }}
      >
        {sent ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              style={{ width: 64, height: 64, background: 'rgba(16,185,129,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}
            >
              <CheckCircle size={32} color="var(--green-400)" />
            </motion.div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Issue Reported!</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Admin has been notified about <strong style={{ color: 'var(--amber-400)' }}>{item.sku}</strong>. They will review and respond.
            </div>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, background: 'rgba(239,68,68,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Flag size={16} color="var(--red-400)" />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Report Stock Issue</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Notifies admin immediately</div>
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Item card */}
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--indigo-400)', fontWeight: 700 }}>{item.sku}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.name}</div>
              </div>
              <StatusBadge status={item.status} />
            </div>

            {/* Textarea */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Issue Description
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={`e.g. "Stock count mismatch — physical count shows 45 units but system shows ${item.availableQty}. Needs urgent audit."`}
                rows={4}
                style={{
                  width: '100%', padding: '10px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 10, color: 'var(--text-primary)',
                  fontSize: 13, fontFamily: 'inherit',
                  outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button
                onClick={handleSend}
                disabled={!message.trim()}
                style={{
                  flex: 1, padding: '10px 16px',
                  background: message.trim() ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.05)',
                  border: `1px solid ${message.trim() ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.1)'}`,
                  borderRadius: 10, cursor: message.trim() ? 'pointer' : 'not-allowed',
                  color: 'var(--red-400)', fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontFamily: 'inherit', transition: 'all 0.2s',
                }}
              >
                <Flag size={14} /> Report to Admin
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─── Toast ────────────────────────────────────────────────────────────────── */
function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  React.useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
      style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
        borderRadius: 12, padding: '12px 20px', zIndex: 2000,
        display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <CheckCircle size={16} color="var(--green-400)" />
      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{msg}</span>
    </motion.div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────────────── */
export default function Inventory() {
  const { user } = useAuthStore();
  const role = user?.role ?? 'VIEWER';
  const queryClient = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [reportItem, setReportItem] = useState<InventoryItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get<ApiResponse<InventoryItem[]>>('/inventory?limit=50'),
    refetchInterval: 60_000,
  });

  const { data: statsData } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: () => api.get<ApiResponse<InventoryStats>>('/inventory/stats'),
    refetchInterval: 60_000,
  });

  const { data: alertsData } = useQuery({
    queryKey: ['inventory-alerts'],
    queryFn: () => api.get<ApiResponse<InventoryItem[]>>('/inventory/alerts'),
    refetchInterval: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, any>) => api.post<ApiResponse<InventoryItem>>('/inventory', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      setAddOpen(false);
      setToast('Item added successfully');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      api.patch<ApiResponse<InventoryItem>>(`/inventory/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      setEditItem(null);
      setToast('Item updated successfully');
    },
  });

  const reportMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      api.post<ApiResponse<null>>(`/inventory/${id}/report-issue`, { message }),
    onSuccess: () => {
      // Keep modal open for the success state
    },
    onError: () => {
      setToast('Failed to send report. Please try again.');
      setReportItem(null);
    },
  });

  const inventory = itemsData?.data ?? [];
  const stats = statsData?.data;
  const alerts = alertsData?.data ?? [];

  const criticalCount = stats?.critical ?? 0;
  const lowCount = stats?.low ?? 0;
  const totalValue = stats?.totalValue ?? 0;

  const canEdit = role === 'ADMIN' || role === 'INVENTORY';
  const canReport = role === 'INVENTORY';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="breadcrumb">
              <div className="breadcrumb-dot" />
              <span className="breadcrumb-text">Workflow</span>
              <span className="breadcrumb-sep">·</span>
              <span className="breadcrumb-text">Inventory</span>
            </div>
            <h1 className="page-title">Inventory Intelligence</h1>
            <p className="page-subtitle">Live stock, warehouse capacity, and AI-driven replenishment forecasts.</p>
          </div>
          {canEdit && (
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setAddOpen(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
            >
              <Plus size={15} />
              Add Product
            </motion.button>
          )}
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
          <div className="stat-card-label">Total SKUs</div>
          <div className="stat-card-value">{(stats?.total ?? 0).toLocaleString()}</div>
          <div className="stat-card-sub" style={{ color: 'var(--green-400)', fontSize: 11, fontWeight: 600 }}>in catalog</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-surface)' }}>
          <div className="stat-card-label">Low Stock</div>
          <div className="stat-card-value" style={{ color: lowCount > 0 ? 'var(--amber-400)' : 'var(--text-primary)' }}>{lowCount}</div>
          <div className="stat-card-sub" style={{ color: 'var(--text-muted)', fontSize: 11 }}>reorder recommended</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-surface)' }}>
          <div className="stat-card-label">Critical</div>
          <div className="stat-card-value" style={{ color: criticalCount > 0 ? 'var(--red-400)' : 'var(--text-primary)' }}>{criticalCount}</div>
          <div className="stat-card-sub" style={{ color: 'var(--text-muted)', fontSize: 11 }}>action needed</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-surface)' }}>
          <div className="stat-card-label">Inventory Value</div>
          <div className="stat-card-value">₹{(totalValue / 1000000).toFixed(1)}M</div>
          <div className="stat-card-sub"><span style={{ color: 'var(--green-400)', fontWeight: 600 }}>+3.1%</span></div>
        </div>
      </motion.div>

      {/* Body */}
      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
          {/* Stock Levels Table */}
          <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="card-header">
              <div>
                <div className="card-title">Stock Levels</div>
                <div className="card-subtitle">Sorted by risk</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--purple-dim)', color: 'var(--purple-400)', padding: '4px 10px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(168,85,247,0.2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sparkles size={10} />
                AI-monitored
              </span>
            </div>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU / Product</th>
                    <th>Warehouse</th>
                    <th>Stock</th>
                    <th>Level</th>
                    <th>Status</th>
                    {canEdit && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: canEdit ? 6 : 5 }).map((_, j) => (
                          <td key={j}><div style={{ height: 14, background: 'var(--bg-elevated)', borderRadius: 4, animation: 'shimmer 1.5s infinite' }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : inventory.map((item, i) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 + 0.2 }}
                    >
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--indigo-400)', marginBottom: 1 }}>{item.sku}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.name}</div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                        {item.warehouse || warehouses[i % 3].id}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{item.availableQty}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>reorder @ {item.reorderLevel}</span>
                      </td>
                      <td style={{ minWidth: 90 }}>
                        <LevelBar item={item} />
                      </td>
                      <td><StatusBadge status={item.status} /></td>
                      {canEdit && (
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => setEditItem(item)}
                              title="Edit item"
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '4px 10px',
                                background: 'var(--blue-dim)',
                                border: '1px solid rgba(99,102,241,0.2)',
                                borderRadius: 7, cursor: 'pointer',
                                color: 'var(--indigo-400)', fontSize: 11, fontWeight: 600,
                                fontFamily: 'inherit',
                              }}
                            >
                              <Pencil size={11} /> Edit
                            </button>
                            {canReport && (
                              <button
                                onClick={() => setReportItem(item)}
                                title="Report issue to admin"
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  padding: '4px 10px',
                                  background: 'rgba(239,68,68,0.08)',
                                  border: '1px solid rgba(239,68,68,0.18)',
                                  borderRadius: 7, cursor: 'pointer',
                                  color: 'var(--red-400)', fontSize: 11, fontWeight: 600,
                                  fontFamily: 'inherit',
                                }}
                              >
                                <Flag size={11} /> Report
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Warehouse Capacity */}
            <motion.div className="card" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
              <div className="card-header">
                <div>
                  <div className="card-title">Warehouse Capacity</div>
                  <div className="card-subtitle">Real-time utilization</div>
                </div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {warehouses.map(wh => (
                  <div key={wh.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Warehouse size={13} color="var(--text-muted)" />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{wh.id}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: wh.color }}>{wh.capacity}%</span>
                    </div>
                    <div className="progress-track">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${wh.capacity}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                        style={{ height: '100%', borderRadius: 99, background: wh.color, boxShadow: `0 0 8px ${wh.color}40` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Critical Alerts */}
            <motion.div className="card" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }} style={{ flex: 1 }}>
              <div className="card-header">
                <div>
                  <div className="card-title">Critical Alerts</div>
                  <div className="card-subtitle">Low &amp; critical items</div>
                </div>
                <div style={{ width: 26, height: 26, background: 'var(--red-dim)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={12} color="var(--red-400)" />
                </div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {alerts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--green-400)', fontSize: 13, fontWeight: 600 }}>
                    ✓ All stock levels healthy
                  </div>
                ) : alerts.slice(0, 5).map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 + 0.4 }}
                    style={{
                      padding: '10px 12px',
                      background: item.status === 'CRITICAL' ? 'rgba(239,68,68,0.05)' : 'var(--bg-elevated)',
                      border: `1px solid ${item.status === 'CRITICAL' ? 'rgba(239,68,68,0.15)' : 'var(--border-subtle)'}`,
                      borderRadius: 10,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--indigo-400)', fontWeight: 600, marginBottom: 1 }}>{item.sku}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.name}</div>
                      </div>
                      <TrendingDown size={14} color={item.status === 'CRITICAL' ? 'var(--red-400)' : 'var(--amber-400)'} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 11, color: item.status === 'CRITICAL' ? 'var(--red-400)' : 'var(--amber-400)', fontWeight: 600 }}>
                        {item.status === 'CRITICAL' ? '⚠ ' : ''}Available: {item.availableQty}
                      </div>
                    {canReport && (
                        <button
                          onClick={() => setReportItem(item)}
                          style={{
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                            borderRadius: 6, padding: '2px 8px', cursor: 'pointer',
                            fontSize: 10, color: 'var(--red-400)', fontWeight: 700,
                            fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3,
                          }}
                        >
                          <Flag size={9} /> Report
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {addOpen && (
          <ItemModal
            item={null}
            onClose={() => setAddOpen(false)}
            onSave={data => createMutation.mutate(data)}
          />
        )}
        {editItem && (
          <ItemModal
            item={editItem}
            onClose={() => setEditItem(null)}
            onSave={data => updateMutation.mutate({ id: editItem.id, data })}
          />
        )}
        {reportItem && (
          <ReportModal
            item={reportItem}
            onClose={() => setReportItem(null)}
            onReport={msg => reportMutation.mutate({ id: reportItem.id, message: msg })}
          />
        )}
        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}
