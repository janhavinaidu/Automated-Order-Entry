import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Mail, Sparkles, FileText, TableProperties, Image as LucideImage } from 'lucide-react';
import { api } from '../lib/api';
import type { ApiResponse } from '../lib/api';

type FilterType = 'all' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

const filterOptions: { key: FilterType; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'PENDING',    label: 'Pending' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'COMPLETED',  label: 'Processed' },
  { key: 'FAILED',     label: 'Failed' },
];

interface EmailItem {
  id: string;
  fromEmail: string;
  fromName: string | null;
  company: string | null;
  subject: string;
  body: string;
  isRead: boolean;
  status: string;
  hasAttachments: boolean;
  receivedAt: string;
  attachments: Array<{ id: string; filename: string; contentType: string; size: number }>;
  extractionJob: { status: string; confidence: number | null } | null;
}

interface EmailStats {
  total: number;
  byStatus: Record<string, number>;
  unread: number;
}

function AttachmentIcon({ contentType = '' }: { contentType?: string }) {
  let icon = FileText;
  let color = 'var(--red-400)';
  let bg = 'var(--red-dim)';
  const lowerType = (contentType || '').toLowerCase();
  if (lowerType.includes('excel') || lowerType.includes('spreadsheet') || lowerType.includes('sheet') || lowerType.includes('xls')) {
    icon = TableProperties; color = 'var(--green-400)'; bg = 'var(--green-dim)';
  } else if (lowerType.includes('image')) {
    icon = LucideImage; color = 'var(--blue-400)'; bg = 'var(--blue-dim)';
  }
  const Icon = icon;
  return (
    <div style={{ width: 18, height: 18, background: bg, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={10} color={color} />
    </div>
  );
}

const statusMap: Record<string, { label: string; cls: string }> = {
  PENDING:    { label: 'Pending',    cls: 'badge badge-amber' },
  PROCESSING: { label: 'Processing', cls: 'badge badge-indigo' },
  COMPLETED:  { label: 'Processed',  cls: 'badge badge-green' },
  PROCESSED:  { label: 'Processed',  cls: 'badge badge-green' },
  FAILED:     { label: 'Failed',     cls: 'badge badge-red' },
};

function EmailRow({ email, index }: { email: EmailItem; index: number }) {
  const navigate = useNavigate();
  const timeStr = new Date(email.receivedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const { label, cls } = statusMap[email.status] ?? { label: email.status, cls: 'badge badge-muted' };
  const initials = (email.company || email.fromName || email.fromEmail).slice(0, 2).toUpperCase();
  const confidence = email.extractionJob?.confidence;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => navigate(`/inbox/${email.id}`)}
      style={{ cursor: 'pointer' }}
    >
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!email.isRead && (
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--indigo-500)', flexShrink: 0 }} />
          )}
          <div className="avatar avatar-sm" style={{
            background: `hsl(${email.id.charCodeAt(0) * 40}, 40%, 20%)`,
            color: `hsl(${email.id.charCodeAt(0) * 40}, 70%, 65%)`,
            fontWeight: 700,
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: email.isRead ? 500 : 700, color: 'var(--text-primary)' }}>
              {email.company || email.fromName || email.fromEmail}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{email.fromEmail}</div>
          </div>
        </div>
      </td>
      <td>
        <div style={{ fontSize: 13, fontWeight: email.isRead ? 400 : 600, color: email.isRead ? 'var(--text-secondary)' : 'var(--text-primary)', marginBottom: 2 }}>
          {email.subject}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
          {email.body?.slice(0, 80)}
        </div>
      </td>
      <td>
        {email.hasAttachments && email.attachments && (
          <div style={{ display: 'flex', gap: 3 }}>
            {email.attachments.slice(0, 3).map(att => (
              <AttachmentIcon key={att.id} contentType={att.contentType || (att as any).mimeType || ''} />
            ))}
          </div>
        )}
      </td>
      <td><span className={cls}>{label}</span></td>
      <td>
        {confidence != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div className="progress-track" style={{ width: 50, height: 3 }}>
              <div className="progress-fill progress-indigo" style={{ width: `${confidence}%` }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--indigo-400)', fontWeight: 600 }}>
              {confidence.toFixed(0)}%
            </span>
          </div>
        )}
      </td>
      <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>{timeStr}</td>
    </motion.tr>
  );
}

export default function AIInbox() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: emailsData, isLoading } = useQuery({
    queryKey: ['emails', filter, search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filter !== 'all') params.set('status', filter);
      if (search) params.set('search', search);
      return api.get<ApiResponse<EmailItem[]>>(`/emails?${params}`);
    },
    staleTime: 15_000,
  });

  const { data: statsData } = useQuery({
    queryKey: ['email-stats'],
    queryFn: () => api.get<ApiResponse<EmailStats>>('/emails/stats'),
    refetchInterval: 30_000,
  });

  const emails = emailsData?.data ?? [];
  const stats = statsData?.data;
  const totalEmails = stats?.total ?? 0;
  const unreadCount = stats?.unread ?? 0;
  const processingCount = stats?.byStatus?.PROCESSING ?? 0;
  const processedCount = (stats?.byStatus?.COMPLETED ?? 0) + (stats?.byStatus?.PROCESSED ?? 0);

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
              <span className="breadcrumb-text">Email Inbox</span>
            </div>
            <h1 className="page-title">AI Email Inbox</h1>
            <p className="page-subtitle">Every incoming order email — intelligently parsed, extracted, and routed by AI.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--purple-dim)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 10, padding: '8px 14px', flexShrink: 0 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--purple-400)', animation: 'livePulse 2s infinite' }} />
            <Sparkles size={12} color="var(--purple-400)" />
            <span style={{ fontSize: 12, color: 'var(--purple-400)', fontWeight: 600 }}>AI Active</span>
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
          <div className="stat-card-label">Total Emails</div>
          <div className="stat-card-value">{totalEmails}</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-surface)' }}>
          <div className="stat-card-label">Unread</div>
          <div className="stat-card-value" style={{ color: unreadCount > 0 ? 'var(--indigo-400)' : 'var(--text-primary)' }}>{unreadCount}</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-surface)' }}>
          <div className="stat-card-label">Processing</div>
          <div className="stat-card-value" style={{ color: processingCount > 0 ? 'var(--amber-400)' : 'var(--text-primary)' }}>{processingCount}</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-surface)' }}>
          <div className="stat-card-label">Processed</div>
          <div className="stat-card-value" style={{ color: 'var(--green-400)' }}>{processedCount}</div>
        </div>
      </motion.div>

      {/* Filters */}
      <div style={{ padding: '14px 28px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', display: 'flex', gap: 12, alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            placeholder="Search emails, companies..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, lineHeight: 1 }}>✕</button>
          )}
        </div>
        <div className="filter-chips">
          {filterOptions.map(f => (
            <button
              key={f.key}
              className={`filter-chip ${filter === f.key ? 'active' : ''}`}
              onClick={() => { setFilter(f.key); setPage(1); }}
            >
              {f.label}
              {f.key === 'all' && totalEmails > 0 && <span style={{ opacity: 0.65 }}> ({totalEmails})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="page-body">
        <AnimatePresence mode="wait">
          <motion.div
            key={filter + search}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="card"
          >
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sender</th>
                    <th>Subject</th>
                    <th>Attachments</th>
                    <th>Status</th>
                    <th>AI Confidence</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j}><div style={{ height: 14, background: 'var(--bg-elevated)', borderRadius: 4, animation: 'shimmer 1.5s infinite' }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : emails.length > 0 ? emails.map((email, i) => (
                    <EmailRow key={email.id} email={email} index={i} />
                  )) : (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state">
                          <div className="empty-state-icon"><Mail size={22} color="var(--text-muted)" /></div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>No emails found</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Try adjusting your filters</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
