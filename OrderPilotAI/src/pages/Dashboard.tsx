import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cpu, Sparkles, ArrowUpRight, ArrowDownRight,
  AlertTriangle, CheckCircle, Flag, Package, Clock, ShieldCheck
} from 'lucide-react';
import { api } from '../lib/api';
import type { ApiResponse } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

// ─── Types ────────────────────────────────────────────────────────────────────
interface KPIs {
  ordersToday: number;
  ordersProcessing: number;
  revenue: number;
  pendingOrders: number;
  inventoryHealth: number;
}

interface AIActivity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  confidence: number | null;
  status: string;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  amount: number;
  currency: string;
  progress: number;
  customer: {
    id: string;
    name: string;
    company: string;
    avatar: string | null;
  };
  createdAt: string;
}

interface ChartPoint {
  date: string;
  revenue?: number;
  count?: number;
}

interface StockIssue {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
    metadata?: {
    issueKind?: 'MANUAL' | 'ITEM';
    itemId?: string;
    sku?: string;
    itemName?: string;
    reportedBy?: string;
    resolved?: boolean;
    resolvedAt?: string;
  };
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0, duration = 1400 }: {
  value: number; prefix?: string; suffix?: string; decimals?: number; duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const steps = 50;
    const step = value / steps;
    const interval = duration / steps;
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else { setDisplay(start); }
    }, interval);
    return () => clearInterval(timer);
  }, [value, duration]);

  const formatted = decimals > 0
    ? display.toFixed(decimals)
    : Math.floor(display).toLocaleString();

  return <span>{prefix}{formatted}{suffix}</span>;
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────
function LineChart({ data, color = '#6366F1' }: {
  data: number[]; color?: string;
}) {
  const width = 600; const height = 160;
  const padding = { top: 10, right: 10, bottom: 24, left: 40 };
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const xScale = (i: number) => padding.left + (i / (data.length - 1)) * (width - padding.left - padding.right);
  const yScale = (v: number) => padding.top + (1 - (v - min) / range) * (height - padding.top - padding.bottom);
  const linePath = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(v).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${xScale(data.length - 1).toFixed(1)} ${height - padding.bottom} L ${xScale(0).toFixed(1)} ${height - padding.bottom} Z`;
  const yTicks = [min, (min + max) / 2, max];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        <linearGradient id="chartFillDash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((tick, i) => {
        const y = yScale(tick);
        return (
          <g key={i}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
            <text x={padding.left - 6} y={y + 4} fontSize={9} fill="rgba(255,255,255,0.25)" textAnchor="end">
              {yTicks[i] >= 1000 ? `${(yTicks[i] / 1000).toFixed(0)}k` : yTicks[i].toFixed(0)}
            </text>
          </g>
        );
      })}
      {data.map((_, i) => {
        if (i % Math.max(1, Math.floor(data.length / 6)) !== 0 && i !== data.length - 1) return null;
        return <text key={i} x={xScale(i)} y={height - 4} fontSize={8.5} fill="rgba(255,255,255,0.25)" textAnchor="middle">{i + 1}</text>;
      })}
      <path d={areaPath} fill="url(#chartFillDash)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xScale(data.length - 1)} cy={yScale(data[data.length - 1])} r={3.5} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const cx = 60; const cy = 60; const r = 44; const stroke = 14;
  let offset = 0;
  const circum = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={120} height={120} viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} />
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const dash = pct * circum;
          const gap = circum - dash;
          const startAngle = (offset / total) * circum;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-startAngle + circum * 0.25}
              style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 3px ${seg.color}40)` }}
              strokeLinecap="round"
            />
          );
          offset += seg.value;
          return el;
        })}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {segments.map(seg => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{seg.label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
              {Math.round((seg.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, prefix = '', suffix = '', delta, deltaLabel, decimals = 0 }: {
  label: string; value: number; prefix?: string; suffix?: string;
  delta?: number; deltaLabel?: string; decimals?: number;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value" style={{ color: 'var(--text-primary)' }}>
        <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
      </div>
      {delta !== undefined && (
        <div className="stat-card-sub">
          {up ? <ArrowUpRight size={12} style={{ color: 'var(--green-400)' }} /> : <ArrowDownRight size={12} style={{ color: 'var(--red-400)' }} />}
          <span style={{ color: up ? 'var(--green-400)' : 'var(--red-400)', fontWeight: 600 }}>
            {up ? '+' : ''}{delta}%
          </span>
          <span>{deltaLabel}</span>
        </div>
      )}
    </div>
  );
}

// ─── Status Chip ──────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'badge badge-amber', pending: 'badge badge-amber',
    PROCESSING: 'badge badge-indigo', processing: 'badge badge-indigo',
    APPROVED: 'badge badge-green', approved: 'badge badge-green',
    MANUFACTURING: 'badge badge-purple', manufacturing: 'badge badge-purple',
    INVOICED: 'badge badge-blue', invoiced: 'badge badge-blue',
    DISPATCHED: 'badge badge-green', dispatched: 'badge badge-green',
    REJECTED: 'badge badge-red', rejected: 'badge badge-red',
  };
  const labels: Record<string, string> = {
    PENDING: 'Pending', pending: 'Pending',
    PROCESSING: 'Processing', processing: 'Processing',
    APPROVED: 'Approved', approved: 'Approved',
    MANUFACTURING: 'Manufacturing', manufacturing: 'Manufacturing',
    INVOICED: 'Invoiced', invoiced: 'Invoiced',
    DISPATCHED: 'Dispatched', dispatched: 'Dispatched',
    REJECTED: 'Rejected', rejected: 'Rejected',
  };
  return <span className={map[status] || 'badge badge-muted'}>{labels[status] || status}</span>;
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [chartRange, setChartRange] = useState<'7D' | '30D' | '90D'>('30D');

  // Fetch KPIs
  const { data: kpisData } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => api.get<ApiResponse<KPIs>>('/dashboard/kpis'),
    refetchInterval: 60_000,
  });

  // Fetch AI Activity
  const { data: aiActivityData } = useQuery({
    queryKey: ['dashboard-ai-activity'],
    queryFn: () => api.get<ApiResponse<AIActivity[]>>('/dashboard/ai-activity'),
    refetchInterval: 30_000,
  });

  // Fetch Revenue Chart
  const { data: revenueData } = useQuery({
    queryKey: ['dashboard-revenue', chartRange],
    queryFn: () => {
      const days = chartRange === '7D' ? 7 : chartRange === '90D' ? 90 : 30;
      return api.get<ApiResponse<ChartPoint[]>>(`/dashboard/revenue-chart?days=${days}`);
    },
  });

  // Fetch Recent Orders
  const { data: recentOrdersData } = useQuery({
    queryKey: ['dashboard-recent-orders'],
    queryFn: () => api.get<ApiResponse<RecentOrder[]>>('/dashboard/recent-orders'),
    refetchInterval: 60_000,
  });

  // Fetch Stock Issues (INVENTORY notifications for admin)
  const { data: issuesData, refetch: refetchIssues } = useQuery({
    queryKey: ['stock-issues'],
    queryFn: () => api.get<ApiResponse<StockIssue[]>>('/notifications?limit=50'),
    select: (d) => (d.data ?? []).filter((n: StockIssue) => {
      const meta = n.metadata;
      if (meta?.resolved) return false;
      return n.title?.startsWith('Stock Concern') || meta?.issueKind === 'MANUAL';
    }),
    refetchInterval: 15_000,
  });

  const queryClient = useQueryClient();
  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.patch<ApiResponse<null>>(`/notifications/${id}/resolve`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['stock-issues'] }); refetchIssues(); },
  });

  const stockIssues = issuesData ?? [];

  const kpis = kpisData?.data;
  const aiActivities = aiActivityData?.data ?? [];
  const recentOrders = recentOrdersData?.data ?? [];
  const chartValues = (revenueData?.data ?? []).map((p: ChartPoint) => p.revenue ?? 0);

  // Fallback chart data if empty
  const displayChart = chartValues.length > 0 ? chartValues : [0, 0, 0, 0, 0, 0, 0];

  const donutSegments = [
    { label: 'Delivered', value: 68, color: '#10B981' },
    { label: 'In Transit', value: 18, color: '#6366F1' },
    { label: 'Processing', value: 9,  color: '#F59E0B' },
    { label: 'Pending',    value: 5,  color: '#C084FC' },
  ];

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="breadcrumb">
              <div className="breadcrumb-dot" />
              <span className="breadcrumb-text">Operations Overview</span>
            </div>
            <h1 className="page-title" style={{ marginBottom: 6 }}>
              Good morning, {firstName}
            </h1>
            <p className="page-subtitle">
              Your autonomous operations are running. AI has processed{' '}
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{kpis?.ordersToday ?? 0} orders</span> today.
            </p>
          </div>
          <motion.button
            className="btn-ai"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/inbox')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
          >
            <Sparkles size={15} />
            Open AI Inbox
          </motion.button>
        </div>
      </div>

      <div className="page-body">
        {/* ── Stat Row ── */}
        <motion.div
          className="stat-row"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <StatCard label="Orders Today" value={kpis?.ordersToday ?? 0} delta={12.4} deltaLabel="vs yesterday" />
          <StatCard label="Revenue (Invoiced)" value={(kpis?.revenue ?? 0) / 100000} prefix="₹" suffix="L" decimals={1} delta={18.2} deltaLabel="MRR" />
          <StatCard label="Processing" value={kpis?.ordersProcessing ?? 0} delta={-8} deltaLabel="in queue" />
          <StatCard label="Pending Review" value={kpis?.pendingOrders ?? 0} />
          <StatCard label="Inventory Health" value={kpis?.inventoryHealth ?? 0} suffix="%" delta={-1.2} deltaLabel="optimal" />
        </motion.div>

        {/* ── Charts Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 24 }}>
          {/* Revenue Chart */}
          <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="card-header">
              <div>
                <div className="card-title">Revenue Chart</div>
                <div className="card-subtitle">Invoiced & dispatched orders</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['7D', '30D', '90D'] as const).map(r => (
                  <button key={r} onClick={() => setChartRange(r)} style={{
                    padding: '4px 9px', borderRadius: 6,
                    background: chartRange === r ? 'var(--indigo-dim)' : 'transparent',
                    color: chartRange === r ? 'var(--indigo-400)' : 'var(--text-muted)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    border: chartRange === r ? '1px solid var(--border-accent)' : '1px solid transparent',
                  } as React.CSSProperties}>{r}</button>
                ))}
              </div>
            </div>
            <div className="card-body" style={{ padding: '16px 20px' }}>
              <div style={{ height: 160 }}>
                <LineChart data={displayChart} color="#6366F1" />
              </div>
            </div>
          </motion.div>

          {/* Order Status Donut */}
          <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <div className="card-header">
              <div>
                <div className="card-title">Order Status</div>
                <div className="card-subtitle">Live distribution</div>
              </div>
            </div>
            <div className="card-body" style={{ padding: '20px' }}>
              <DonutChart segments={donutSegments} />
            </div>
          </motion.div>
        </div>

        {/* ── Recent Orders + AI Activity ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
          {/* Recent Orders */}
          <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="card-header">
              <div>
                <div className="card-title">Recent Orders</div>
                <div className="card-subtitle">Latest activity</div>
              </div>
              <button className="section-action" onClick={() => navigate('/orders')}>View all →</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length > 0 ? recentOrders.map((order, i) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.05 * i + 0.3 }}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td><span className="table-link">{order.orderNumber}</span></td>
                      <td><div style={{ fontWeight: 500, fontSize: 13 }}>{order.customer?.company ?? '—'}</div></td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--green-400)', fontSize: 13 }}>
                          ₹{(order.amount / 100000).toFixed(1)}L
                        </span>
                      </td>
                      <td><StatusChip status={order.status} /></td>
                      <td style={{ minWidth: 100 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-track" style={{ flex: 1 }}>
                            <div
                              className={`progress-fill ${order.progress === 100 ? 'progress-green' : 'progress-indigo'}`}
                              style={{ width: `${order.progress}%` }}
                            />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, minWidth: 28, textAlign: 'right' }}>
                            {order.progress}%
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  )) : (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No orders yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* AI Activity */}
          <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, background: 'var(--purple-dim)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Cpu size={12} color="var(--purple-400)" />
                </div>
                <div>
                  <div className="card-title">AI Activity</div>
                  <div className="card-subtitle">Real-time feed</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-full)', padding: '3px 9px' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green-400)', animation: 'livePulse 2s infinite' }} />
                <span style={{ fontSize: 10, color: 'var(--green-400)', fontWeight: 700, letterSpacing: '0.06em' }}>LIVE</span>
              </div>
            </div>
            <div className="card-body" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {aiActivities.length > 0 ? aiActivities.slice(0, 5).map((act, i) => (
                <motion.div key={act.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i + 0.4 }}
                  style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%', marginTop: 4, flexShrink: 0,
                    background: act.status === 'COMPLETED' ? 'var(--green-400)' : act.status === 'FAILED' ? 'var(--red-400)' : 'var(--amber-400)',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 4 }}>{act.message}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {new Date(act.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {act.confidence && (
                        <span style={{ fontSize: 10, color: act.confidence > 85 ? 'var(--green-400)' : 'var(--amber-400)', fontWeight: 600 }}>
                          {act.confidence.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: 13 }}>No AI activity yet</div>
              )}
            </div>
          </motion.div>
        </div>
        {/* ── Stock Issues from Inventory Manager ── */}
        {stockIssues.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card"
            style={{ marginTop: 20, border: '1px solid rgba(239,68,68,0.2)', background: 'linear-gradient(135deg, rgba(239,68,68,0.04) 0%, rgba(245,158,11,0.03) 100%)' }}
          >
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, background: 'rgba(239,68,68,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Flag size={14} color="var(--red-400)" />
                </div>
                <div>
                  <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Stock Issues Reported
                    <span style={{ background: 'var(--red-dim)', color: 'var(--red-400)', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 20, border: '1px solid rgba(239,68,68,0.2)' }}>
                      {stockIssues.length} pending
                    </span>
                  </div>
                  <div className="card-subtitle">Reported by Inventory Manager — requires your action</div>
                </div>
              </div>
              <button
                onClick={() => navigate('/inventory')}
                style={{ background: 'var(--blue-dim)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'var(--indigo-400)', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Package size={12} /> View Inventory
              </button>
            </div>
            <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
              <AnimatePresence>
                {stockIssues.map((issue, i) => (
                  <motion.div
                    key={issue.id}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, height: 0 }}
                    transition={{ delay: i * 0.06 }}
                    style={{
                      padding: '14px 16px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid rgba(239,68,68,0.15)',
                      borderRadius: 12,
                      borderLeft: '3px solid var(--red-400)',
                    }}
                  >
                    {/* Issue header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        {issue.metadata?.issueKind === 'MANUAL' ? (
                          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--amber-400)', marginBottom: 2 }}>
                            Manual Report · {issue.title}
                          </div>
                        ) : issue.metadata?.sku ? (
                          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--indigo-400)', marginBottom: 2 }}>
                            <Package size={9} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                            {issue.metadata.sku} · {issue.metadata.itemName}
                          </div>
                        ) : null}
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={9} />
                          {new Date(issue.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: issue.metadata?.issueKind === 'MANUAL' ? 'var(--amber-400)' : 'var(--red-400)', background: issue.metadata?.issueKind === 'MANUAL' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', padding: '2px 7px', borderRadius: 6 }}>
                        {issue.metadata?.issueKind === 'MANUAL' ? 'Manual Issue' : 'Stock Issue'}
                      </span>
                    </div>

                    {/* Message */}
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 12 }}>
                      {issue.message}
                    </p>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => resolveMutation.mutate(issue.id)}
                        disabled={resolveMutation.isPending}
                        style={{
                          flex: 1, padding: '8px 0',
                          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                          borderRadius: 8, cursor: 'pointer', color: 'var(--green-400)',
                          fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                          transition: 'all 0.2s',
                        }}
                      >
                        <ShieldCheck size={12} />
                        {resolveMutation.isPending ? 'Resolving…' : 'Mark Resolved'}
                      </button>
                      <button
                        onClick={() => navigate('/inventory')}
                        style={{
                          flex: 1, padding: '8px 0',
                          background: 'var(--blue-dim)', border: '1px solid rgba(99,102,241,0.2)',
                          borderRadius: 8, cursor: 'pointer', color: 'var(--indigo-400)',
                          fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        }}
                      >
                        <AlertTriangle size={12} /> Investigate
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
