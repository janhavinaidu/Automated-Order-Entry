import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Send, ArrowUpRight, ArrowDownRight,
  FileText, CheckCircle2, AlertCircle, Clock, Sparkles, ChevronRight
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ApiResponse } from '../lib/api';

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  amount: number;
  issuedAt: string | null;
  dueDate: string | null;
  order: {
    id: string;
    orderNumber: string;
    customer: { name: string; company: string };
  } | null;
  items?: Array<{ description: string; amount: number }>;
}

interface PendingOrder {
  id: string;
  orderNumber: string;
  amount: number;
  customer: { name: string; company: string; email?: string };
  invoice?: { id: string } | null;
}

// ─── SVG Line Chart (with static revenue data placeholder) ───────────────────
function RevenueChart() {
  const data = [18000, 22000, 19500, 24000, 21000, 26000, 28000, 25000, 30000, 27000, 32000, 29000, 34000, 31000, 33000, 30000, 28000, 31000, 29000, 27000, 30000, 28000, 32000, 29000, 31000, 28000, 30000, 29000, 31000, 28000];
  const w = 600; const h = 180;
  const pad = { top: 12, right: 8, bottom: 24, left: 44 };
  const max = Math.max(...data); const min = Math.min(...data); const range = max - min || 1;
  const xS = (i: number) => pad.left + (i / (data.length - 1)) * (w - pad.left - pad.right);
  const yS = (v: number) => pad.top + (1 - (v - min) / range) * (h - pad.top - pad.bottom);
  const line = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xS(i).toFixed(1)} ${yS(v).toFixed(1)}`).join(' ');
  const area = `${line} L ${xS(data.length - 1).toFixed(1)} ${h - pad.bottom} L ${xS(0).toFixed(1)} ${h - pad.bottom} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="greenFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#greenFill)" />
      <path d={line} fill="none" stroke="#10B981" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xS(data.length - 1)} cy={yS(data[data.length - 1])} r={3.5} fill="#10B981" style={{ filter: 'drop-shadow(0 0 5px #10B981)' }} />
    </svg>
  );
}

function InvoiceStatus({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    PAID:    { cls: 'badge badge-green',  label: 'paid' },
    SENT:    { cls: 'badge badge-indigo', label: 'sent' },
    OVERDUE: { cls: 'badge badge-red',    label: 'overdue' },
    DRAFT:   { cls: 'badge badge-muted',  label: 'draft' },
    paid:    { cls: 'badge badge-green',  label: 'paid' },
    sent:    { cls: 'badge badge-indigo', label: 'sent' },
    overdue: { cls: 'badge badge-red',    label: 'overdue' },
    draft:   { cls: 'badge badge-muted',  label: 'draft' },
  };
  const { cls, label } = map[status] || { cls: 'badge badge-muted', label: status };
  return <span className={cls}>{label}</span>;
}

function InvoicePreview({ 
  invoice, 
  onSend, 
  onDownload, 
  isSending 
}: { 
  invoice: Invoice; 
  onSend: (id: string) => void; 
  onDownload: (id: string) => void; 
  isSending: boolean;
}) {
  const isDraft = invoice.status === 'DRAFT' || invoice.status === 'draft';
  const isPaid = invoice.status === 'PAID' || invoice.status === 'paid';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Invoice Preview</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--indigo-400)' }}>{invoice.invoiceNumber}</div>
      </div>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>OrderPilot AI</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>contact@orderpilot.ai</div>
          </div>
          <InvoiceStatus status={invoice.status} />
        </div>
      </div>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Bill To</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{invoice.order?.customer?.company}</div>
      </div>
      <div style={{ padding: '14px 20px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Subtotal</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>₹{invoice.amount.toLocaleString('en-IN')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>GST (18%)</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>₹{Math.round(invoice.amount * 0.18).toLocaleString('en-IN')}</span>
        </div>
        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '14px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Total</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>₹{Math.round(invoice.amount * 1.18).toLocaleString('en-IN')}</span>
        </div>
      </div>
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 8 }}>
        <button 
          className="btn btn-ghost btn-sm" 
          style={{ flex: 1, gap: 6 }}
          onClick={() => onDownload(invoice.id)}
        >
          <Download size={12} />
          PDF
        </button>
        <button 
          className="btn btn-primary btn-sm" 
          style={{ flex: 1, gap: 6 }}
          onClick={() => onSend(invoice.id)}
          disabled={isSending || isPaid}
        >
          <Send size={12} />
          {isSending ? 'Sending...' : isDraft ? 'Email to Customer' : isPaid ? 'Paid' : 'Resend Email'}
        </button>
      </div>
    </div>
  );
}

export default function Billing() {
  const queryClient = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'PAID' | 'SENT' | 'OVERDUE' | 'DRAFT'>('all');

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post<ApiResponse<Invoice>>(`/billing/invoices/${id}/send`, {}),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setSelectedInvoice(res.data);
      alert('Invoice emailed to customer successfully!');
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Failed to send invoice'),
  });

  const approveMutation = useMutation({
    mutationFn: (orderId: string) => api.patch<ApiResponse<unknown>>(`/orders/${orderId}/status`, { status: 'APPROVED' }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['billing-pending-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      const refreshed = await queryClient.fetchQuery({
        queryKey: ['invoices', activeFilter],
        queryFn: () => {
          const params = new URLSearchParams({ limit: '20' });
          if (activeFilter !== 'all') params.set('status', activeFilter);
          return api.get<ApiResponse<Invoice[]>>(`/billing/invoices?${params}`);
        },
      });
      if (refreshed.data?.[0]) setSelectedInvoice(refreshed.data[0]);
      alert('Order approved — invoice created and ready for download/email.');
    },
    onError: (err) => alert(err instanceof Error ? err.message : 'Failed to approve order'),
  });

  const handleDownload = async (id: string) => {
    try {
      const raw = localStorage.getItem('orderpilot_auth');
      const token = raw ? JSON.parse(raw)?.state?.accessToken : null;
      const res = await fetch(`http://localhost:3001/api/v1/billing/invoices/${id}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download invoice PDF');
    }
  };

  const { data: pendingData } = useQuery({
    queryKey: ['billing-pending-orders'],
    queryFn: async () => {
      const [pending, processing] = await Promise.all([
        api.get<ApiResponse<PendingOrder[]>>('/orders?status=PENDING&limit=10'),
        api.get<ApiResponse<PendingOrder[]>>('/orders?status=PROCESSING&limit=10'),
      ]);
      return { success: true, data: [...(pending.data ?? []), ...(processing.data ?? [])] };
    },
    refetchInterval: 30_000,
  });
  const pendingOrders = (pendingData?.data ?? []).filter(o => !o.invoice);

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', activeFilter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '20' });
      if (activeFilter !== 'all') params.set('status', activeFilter);
      return api.get<ApiResponse<Invoice[]>>(`/billing/invoices?${params}`);
    },
  });

  const invoices = invoicesData?.data ?? [];

  // Set default selected invoice
  React.useEffect(() => {
    if (invoices.length > 0 && !selectedInvoice) {
      setSelectedInvoice(invoices[0]);
    }
  }, [invoices.length]);

  const outstanding = invoices.filter(i => i.status === 'SENT' || i.status === 'DRAFT').reduce((s, i) => s + i.amount, 0);
  const collected   = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.amount, 0);
  const overdue     = invoices.filter(i => i.status === 'OVERDUE').reduce((s, i) => s + i.amount, 0);
  const overdueCount = invoices.filter(i => i.status === 'OVERDUE').length;

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
              <span className="breadcrumb-text">Billing</span>
            </div>
            <h1 className="page-title">Billing &amp; Invoices</h1>
            <p className="page-subtitle">Autonomous invoicing, payment tracking, and revenue analytics.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn btn-ghost btn-sm" style={{ gap: 6 }}><Download size={13} />Export</button>
            <button className="btn btn-primary" style={{ gap: 6 }}><FileText size={14} />New Invoice</button>
          </div>
        </div>
      </div>

      {/* Stat Row */}
      <motion.div className="stat-row" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ borderRadius: 0, border: 'none', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <div className="stat-card" style={{ background: 'var(--bg-surface)' }}>
          <div className="stat-card-label">Outstanding</div>
          <div className="stat-card-value">₹{(outstanding / 100000).toFixed(1)}L</div>
          <div className="stat-card-sub" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
            {invoices.filter(i => i.status === 'SENT' || i.status === 'DRAFT').length} invoices
          </div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-surface)' }}>
          <div className="stat-card-label">Collected</div>
          <div className="stat-card-value" style={{ color: 'var(--green-400)' }}>₹{(collected / 100000).toFixed(1)}L</div>
          <div className="stat-card-sub">
            <ArrowUpRight size={11} style={{ color: 'var(--green-400)' }} />
            <span style={{ color: 'var(--green-400)', fontWeight: 600 }}>+18%</span>
          </div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-surface)' }}>
          <div className="stat-card-label">Overdue</div>
          <div className="stat-card-value" style={{ color: overdue > 0 ? 'var(--red-400)' : 'var(--text-primary)' }}>₹{(overdue / 100000).toFixed(1)}L</div>
          <div className="stat-card-sub" style={{ color: 'var(--text-muted)', fontSize: 11 }}>{overdueCount} invoices</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-surface)' }}>
          <div className="stat-card-label">Avg DSO</div>
          <div className="stat-card-value">12 days</div>
          <div className="stat-card-sub"><ArrowDownRight size={11} style={{ color: 'var(--green-400)' }} /><span style={{ color: 'var(--green-400)', fontWeight: 600 }}>-3 vs Q1</span></div>
        </div>
      </motion.div>

      {/* Body */}
      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 20 }}>
          {/* Revenue Chart */}
          <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="card-header">
              <div><div className="card-title">Revenue</div><div className="card-subtitle">Last 30 days</div></div>
            </div>
            <div className="card-body" style={{ padding: '12px 20px 16px' }}>
              <div style={{ height: 180 }}><RevenueChart /></div>
            </div>
          </motion.div>

          {/* Invoice Preview */}
          <motion.div className="card" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} style={{ overflow: 'hidden' }}>
            <AnimatePresence mode="wait">
              <motion.div key={selectedInvoice?.id ?? 'none'} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} style={{ height: '100%' }}>
                {selectedInvoice ? (
                  <InvoicePreview 
                    invoice={selectedInvoice} 
                    onSend={sendMutation.mutate}
                    onDownload={handleDownload}
                    isSending={sendMutation.isPending}
                  />
                ) : (
                  <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>Select an invoice</div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Pending Orders for Approval */}
        {pendingOrders.length > 0 && (
          <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div>
                <div className="card-title">Orders Awaiting Approval</div>
                <div className="card-subtitle">Approve to auto-generate invoice for the customer</div>
              </div>
            </div>
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingOrders.map(order => (
                <div key={order.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--indigo-400)' }}>{order.orderNumber}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{order.customer.company} · ₹{order.amount.toLocaleString('en-IN')}</div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ gap: 6 }}
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate(order.id)}
                  >
                    <CheckCircle2 size={13} />
                    {approveMutation.isPending ? 'Approving...' : 'Approve & Invoice'}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Invoices Table */}
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="card-header">
            <div><div className="card-title">All Invoices</div><div className="card-subtitle">Auto-generated by AI · aged view</div></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['all', 'PAID', 'SENT', 'OVERDUE', 'DRAFT'] as const).map(f => (
                  <button key={f} onClick={() => setActiveFilter(f)} style={{
                    padding: '4px 10px', borderRadius: 6, fontFamily: 'inherit',
                    border: activeFilter === f ? '1px solid var(--border-accent)' : '1px solid transparent',
                    background: activeFilter === f ? 'var(--indigo-dim)' : 'transparent',
                    color: activeFilter === f ? 'var(--indigo-400)' : 'var(--text-muted)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                  }}>
                    {f.toLowerCase()}
                  </button>
                ))}
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, background: 'var(--purple-dim)', color: 'var(--purple-400)', padding: '4px 10px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(168,85,247,0.2)' }}>
                <Sparkles size={10} />
                AI billing on
              </span>
            </div>
          </div>

          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th><th>Customer</th><th>Amount</th><th>Status</th><th>Issued</th><th>Due</th><th></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j}><div style={{ height: 14, background: 'var(--bg-elevated)', borderRadius: 4 }} /></td>)}</tr>
                )) : invoices.length > 0 ? invoices.map((inv, i) => (
                  <motion.tr key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    onClick={() => setSelectedInvoice(inv)}
                    style={{ cursor: 'pointer', background: selectedInvoice?.id === inv.id ? 'rgba(99,102,241,0.04)' : undefined }}>
                    <td><span className="table-link">{inv.invoiceNumber}</span></td>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{inv.order?.customer?.company ?? '—'}</td>
                    <td><span style={{ fontWeight: 700, fontSize: 13 }}>₹{inv.amount.toLocaleString()}</span></td>
                    <td><InvoiceStatus status={inv.status} /></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                    </td>
                    <td style={{ color: inv.status === 'OVERDUE' ? 'var(--red-400)' : 'var(--text-muted)', fontSize: 12, fontWeight: inv.status === 'OVERDUE' ? 600 : 400 }}>
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                    </td>
                    <td><ChevronRight size={13} color="var(--text-muted)" /></td>
                  </motion.tr>
                )) : (
                  <tr><td colSpan={7}><div className="empty-state"><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>No invoices found</div></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
