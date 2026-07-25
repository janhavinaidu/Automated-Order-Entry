import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle, XCircle, Edit3, Package, User, Calendar,
  AlertTriangle, CheckCircle2, Clock, Zap, TrendingUp, Mail, RefreshCw
} from 'lucide-react';
import { api } from '../lib/api';
import type { ApiResponse } from '../lib/api';

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  amount: number;
  currency: string;
  progress: number;
  deliveryDate: string;
  createdAt: string;
  aiConfidence: number | null;
  customer: {
    id: string;
    name: string;
    company: string;
    email: string;
    avatar: string | null;
  };
  email: { id: string; subject: string } | null;
  items: Array<{
    id: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

interface TimelineEvent {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
  actor: { name: string } | null;
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING:       { label: 'Pending',       className: 'badge badge-amber' },
    PROCESSING:    { label: 'Processing',    className: 'badge badge-blue' },
    APPROVED:      { label: 'Approved',      className: 'badge badge-green' },
    MANUFACTURING: { label: 'Manufacturing', className: 'badge badge-purple' },
    INVOICED:      { label: 'Invoiced',      className: 'badge badge-blue' },
    DISPATCHED:    { label: 'Dispatched',    className: 'badge badge-green' },
    REJECTED:      { label: 'Rejected',      className: 'badge badge-red' },
  };
  const { label, className } = map[status] || { label: status, className: 'badge badge-muted' };
  return <span className={className}>{label}</span>;
}

function OrderTimeline({ events }: { events: TimelineEvent[] }) {
  const stateLabels: Record<string, string> = {
    PENDING: 'Order Received', PROCESSING: 'AI Processing', APPROVED: 'Approved',
    MANUFACTURING: 'Manufacturing', INVOICED: 'Invoiced', DISPATCHED: 'Dispatched',
    REJECTED: 'Rejected', DELIVERED: 'Delivered',
  };

  return (
    <div className="timeline" style={{ paddingLeft: 28 }}>
      <div className="timeline-line" />
      {events.map((event, i) => (
        <motion.div
          key={event.id}
          className="timeline-item"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08, duration: 0.35 }}
        >
          <div className={`timeline-dot completed`} style={{ left: -18 }} />
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={14} color="var(--green-500)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {stateLabels[event.status] ?? event.status}
                </span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {new Date(event.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {event.note && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, marginLeft: 22 }}>{event.note}</div>
            )}
            {event.actor && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, marginLeft: 22 }}>by {event.actor.name}</div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [actionDone, setActionDone] = useState<string | null>(null);

  const { data: orderData, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get<ApiResponse<OrderDetail>>(`/orders/${id}`),
    enabled: !!id,
  });

  const { data: timelineData } = useQuery({
    queryKey: ['order-timeline', id],
    queryFn: () => api.get<ApiResponse<TimelineEvent[]>>(`/orders/${id}/timeline`),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/orders/${id}/status`, { status }),
    onSuccess: (_data, status) => {
      setShowConfirm(null);
      setActionDone(status);
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['order-timeline', id] });
    },
    onError: (error) => {
      console.error('Status update failed:', error);
      alert(`Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const markPackedMutation = useMutation({
    mutationFn: () => api.post(`/orders/${id}/mark-packed`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['order-timeline', id] });
      alert('Order marked as packed and ready for dispatch!');
    },
    onError: (error) => {
      console.error('Mark packed failed:', error);
      alert(`Failed to mark as packed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const order = orderData?.data;
  const timeline = timelineData?.data ?? [];

  if (isLoading) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 120, background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-subtle)', animation: 'shimmer 1.5s infinite' }} />
        ))}
      </div>
    );
  }

  if (!order) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Order not found.</div>;

  const totalAmount = order.items.reduce((s, p) => s + p.total, 0);
  const initials = order.customer?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '??';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Order Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(168,85,247,0.06) 100%)',
        border: '1px solid rgba(59,130,246,0.15)', borderRadius: 16, padding: '18px 20px', marginBottom: 14,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--blue-400)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>Order</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{order.orderNumber}</div>
          </div>
          <StatusChip status={order.status} />
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Total Value</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green-400)' }}>
              ₹{(totalAmount / 100000).toFixed(2)}L
            </div>
          </div>
          {order.deliveryDate && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Delivery</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Created</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </div>
          </div>
          {order.aiConfidence !== null && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>AI Confidence</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: (order.aiConfidence ?? 0) >= 85 ? 'var(--green-400)' : 'var(--amber-400)' }}>
                {order.aiConfidence?.toFixed(0)}%
              </div>
            </div>
          )}
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Overall Progress</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: order.progress === 100 ? 'var(--green-400)' : 'var(--blue-400)' }}>{order.progress}%</span>
          </div>
          <div className="progress-track progress-thick">
            <motion.div
              className={`progress-fill ${order.progress === 100 ? 'progress-green' : 'progress-blue'}`}
              initial={{ width: 0 }}
              animate={{ width: `${order.progress}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              style={{ height: '100%', borderRadius: 99 }}
            />
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 18, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <User size={15} color="var(--blue-400)" />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Customer</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="avatar avatar-lg" style={{
            background: 'linear-gradient(135deg, #6366F1, #A855F7)',
            color: '#fff', fontWeight: 700, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{order.customer?.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{order.customer?.company}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.customer?.email}</div>
            {order.email && (
              <button
                onClick={() => navigate(`/inbox/${order.email!.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, marginTop: 8,
                  background: 'var(--blue-dim)', border: 'none', borderRadius: 8,
                  padding: '5px 10px', cursor: 'pointer', color: 'var(--blue-400)', fontSize: 12, fontWeight: 500,
                }}
              >
                <Mail size={12} />
                View source email
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 18, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Package size={15} color="var(--blue-400)" />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Products ({order.items.length})</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {order.items.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: '12px 14px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{p.productName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.sku}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Qty', value: `×${p.quantity}` },
                  { label: 'Unit Price', value: `₹${p.unitPrice.toLocaleString()}` },
                  { label: 'Total', value: `₹${(p.total / 1000).toFixed(0)}K`, bold: true },
                ].map(({ label, value, bold }) => (
                  <div key={label} style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: bold ? 700 : 600, color: bold ? 'var(--green-400)' : 'var(--text-primary)' }}>{value}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--blue-dim)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Order Total</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--blue-400)' }}>
            ₹{(totalAmount / 100000).toFixed(2)}L
          </span>
        </div>
      </div>

      {/* Timeline */}
      {timeline.length > 0 && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 18, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <TrendingUp size={15} color="var(--blue-400)" />
            <span style={{ fontSize: 13, fontWeight: 700 }}>Workflow Timeline</span>
          </div>
          <OrderTimeline events={timeline} />
        </div>
      )}

      {/* Action Buttons */}
      {actionDone ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            padding: 16, borderRadius: 14, marginBottom: 24,
            background: actionDone === 'APPROVED' ? 'var(--green-dim)' : 'var(--red-dim)',
            border: `1px solid ${actionDone === 'APPROVED' ? 'var(--green-500)' : 'var(--red-500)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          {actionDone === 'APPROVED'
            ? <><CheckCircle size={20} color="var(--green-400)" /><span style={{ color: 'var(--green-400)', fontWeight: 700 }}>Order Approved!</span></>
            : <><XCircle size={20} color="var(--red-400)" /><span style={{ color: 'var(--red-400)', fontWeight: 700 }}>Order Rejected</span></>
          }
        </motion.div>
      ) : order.status === 'PENDING' || order.status === 'PROCESSING' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowConfirm('APPROVED')}
            className="btn btn-success"
            style={{ borderRadius: 12, padding: '12px 8px' }}
          >
            <CheckCircle size={16} />
            Approve
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowConfirm('REJECTED')}
            className="btn btn-danger"
            style={{ borderRadius: 12, padding: '12px 8px' }}
          >
            <XCircle size={16} />
            Reject
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            className="btn btn-ghost"
            style={{ borderRadius: 12, padding: '12px 8px' }}
          >
            <Edit3 size={16} />
            Edit
          </motion.button>
        </div>
      ) : ['APPROVED', 'MANUFACTURING', 'INVOICED'].includes(order.status) ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginBottom: 24 }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => markPackedMutation.mutate()}
            disabled={markPackedMutation.isPending}
            className="btn btn-primary"
            style={{ borderRadius: 12, padding: '14px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', border: 'none' }}
          >
            <Package size={16} />
            {markPackedMutation.isPending ? 'Marking...' : 'Mark as Packed & Ready for Dispatch'}
          </motion.button>
        </div>
      ) : null}

      {/* Confirm Dialog */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              zIndex: 1000, padding: 16,
            }}
            onClick={() => setShowConfirm(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--bg-elevated)', borderRadius: 20,
                padding: '24px', width: '100%', maxWidth: 400,
                border: '1px solid var(--border-default)',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                {showConfirm === 'APPROVED' ? 'Approve Order?' : 'Reject Order?'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                {showConfirm === 'APPROVED'
                  ? `This will approve ${order.orderNumber} and trigger inventory and billing workflows.`
                  : `This will reject ${order.orderNumber}. The customer will be notified.`
                }
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowConfirm(null)}>Cancel</button>
                <button
                  className={`btn ${showConfirm === 'APPROVED' ? 'btn-success' : 'btn-danger'}`}
                  style={{ flex: 1 }}
                  onClick={() => statusMutation.mutate(showConfirm)}
                  disabled={statusMutation.isPending}
                >
                  {statusMutation.isPending ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : (showConfirm === 'APPROVED' ? 'Approve' : 'Reject')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
