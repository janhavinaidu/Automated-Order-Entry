import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, TableProperties, Image as LucideImage, AlertTriangle, CheckCircle,
  Info, Zap, User, Package, TrendingUp, Clock,
  AlertCircle, Sparkles
} from 'lucide-react';
import { api } from '../lib/api';
import type { ApiResponse } from '../lib/api';

interface Email {
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
  priority: string | null;
  attachments: Array<{
    id: string;
    filename: string;
    contentType: string;
    size: number;
  }>;
  extractionJob: {
    id: string;
    status: string;
    confidence: number | null;
    summary: string | null;
    extractedProducts: Array<{
      id: string;
      name: string;
      sku: string;
      quantity: number;
      unitPrice: number;
    }> | null;
    error: string | null;
  } | null;
  orders: Array<{ id: string; orderNumber: string }> | null;
}

// ─── AI Processing Animation ──────────────────────────────────────────────────
function AIProcessingAnimation({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState(0);
  const stages = ['Reading email content...', 'Parsing attachments...', 'Extracting product details...', 'Validating order data...', 'Generating insights...', 'Complete!'];

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setStage(i);
      if (i >= stages.length - 1) { clearInterval(timer); setTimeout(onDone, 600); }
    }, 500);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={{ background: 'var(--bg-surface)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: 20, padding: '32px 24px', textAlign: 'center', marginBottom: 20, position: 'relative', overflow: 'hidden' }}
    >
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 200, height: 200, background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        style={{ width: 72, height: 72, margin: '0 auto 20px', background: 'conic-gradient(from 0deg, var(--purple-500), var(--blue-500), var(--purple-500))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 32px rgba(168,85,247,0.4)' }}
      >
        <div style={{ width: 56, height: 56, background: 'var(--bg-surface)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={24} color="var(--purple-400)" />
        </div>
      </motion.div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>AI Processing</div>
      <AnimatePresence mode="wait">
        <motion.div key={stage} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ fontSize: 13, color: 'var(--purple-400)', marginBottom: 20 }}>
          {stages[stage]}
        </motion.div>
      </AnimatePresence>
      <div style={{ background: 'var(--bg-overlay)', borderRadius: 99, height: 4, overflow: 'hidden', maxWidth: 240, margin: '0 auto' }}>
        <motion.div animate={{ width: `${(stage / (stages.length - 1)) * 100}%` }} transition={{ duration: 0.4 }} style={{ height: '100%', background: 'linear-gradient(90deg, var(--purple-600, #9333ea), var(--purple-400))', borderRadius: 99 }} />
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 20 }}>
        {stages.map((_, i) => (
          <motion.div key={i} animate={{ opacity: i <= stage ? 1 : 0.2, scale: i === stage ? 1.2 : 1 }} style={{ width: 6, height: 6, borderRadius: '50%', background: i <= stage ? 'var(--purple-500)' : 'var(--bg-overlay)' }} />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Confidence Meter ─────────────────────────────────────────────────────────
function ConfidenceMeter({ value }: { value: number }) {
  const color = value >= 90 ? 'var(--green-500)' : value >= 75 ? 'var(--amber-500)' : 'var(--red-500)';
  const label = value >= 90 ? 'High Confidence' : value >= 75 ? 'Medium Confidence' : 'Low Confidence';
  const circumference = 2 * Math.PI * 30;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <svg width={72} height={72} viewBox="0 0 72 72">
        <circle cx="36" cy="36" r="30" fill="none" stroke="var(--bg-overlay)" strokeWidth="6" />
        <motion.circle cx="36" cy="36" r="30" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }} transform="rotate(-90 36 36)" />
        <text x="36" y="40" textAnchor="middle" fill={color} fontSize="14" fontWeight="700" fontFamily="Inter, sans-serif">{value}%</text>
      </svg>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>AI extraction score</div>
      </div>
    </div>
  );
}

function AttachmentPill({ name, contentType = '', size = 0 }: { name: string; contentType?: string; size?: number }) {
  let color = 'var(--red-400)'; let bg = 'var(--red-dim)'; let Icon: React.ElementType = FileText;
  const lowerType = (contentType || '').toLowerCase();
  if (lowerType.includes('excel') || lowerType.includes('spreadsheet') || lowerType.includes('sheet') || lowerType.includes('xls')) { color = 'var(--green-400)'; bg = 'var(--green-dim)'; Icon = TableProperties; }
  else if (lowerType.includes('image')) { color = 'var(--blue-400)'; bg = 'var(--blue-dim)'; Icon = LucideImage; }
  const kb = Math.round((size || 0) / 1024);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: bg, border: `1px solid ${color}30`, borderRadius: 10, padding: '8px 12px', cursor: 'pointer', transition: 'all 0.2s' }}>
      <Icon size={16} color={color} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{kb} KB</div>
      </div>
    </div>
  );
}

export default function EmailDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [orderGenerated, setOrderGenerated] = useState(false);

  const { data: emailData, isLoading } = useQuery({
    queryKey: ['email', id],
    queryFn: () => api.get<ApiResponse<Email>>(`/emails/${id}`),
    enabled: !!id,
  });

  const markReadMutation = useMutation({
    mutationFn: () => api.patch(`/emails/${id}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email', id] }),
  });

  const extractMutation = useMutation({
    mutationFn: () => api.post(`/emails/${id}/process`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email', id] });
      setIsProcessing(false);
      setShowAI(true);
    },
    onError: () => {
      setIsProcessing(false);
      setShowAI(true);
    },
  });

  const email = emailData?.data;

  // Mark as read when opened
  useEffect(() => {
    if (email && !email.isRead) {
      markReadMutation.mutate();
    }
  }, [email?.id]);

  const handleExtract = () => {
    setIsProcessing(true);
    setShowAI(false);
    extractMutation.mutate();
  };

  const generateOrderMutation = useMutation({
    mutationFn: () => api.post<ApiResponse<{order: {id: string, orderNumber: string}}>>(`/extraction/${email?.extractionJob?.id}/approve`, {}),
    onSuccess: (res) => {
      setOrderGenerated(true);
      queryClient.invalidateQueries({ queryKey: ['email', id] });
      setTimeout(() => navigate(`/orders/${res.data.order.id}`), 1500);
    },
  });

  const handleGenerateOrder = () => {
    generateOrderMutation.mutate();
  };

  if (isLoading) return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2].map(i => <div key={i} style={{ height: 140, background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-subtle)', animation: 'shimmer 1.5s infinite' }} />)}
    </div>
  );

  if (!email) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Email not found.</div>;

  const initials = (email.company || email.fromName || email.fromEmail).slice(0, 2).toUpperCase();
  const aiExtracted = email.extractionJob?.status === 'COMPLETED';
  const extractedData = email.extractionJob?.extractedData as Record<string, unknown> | null;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
      {/* Email Meta */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.3 }}>{email.subject}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <div className="avatar avatar-sm" style={{ background: `hsl(${email.id.charCodeAt(0) * 40}, 50%, 22%)`, color: `hsl(${email.id.charCodeAt(0) * 40}, 70%, 65%)` }}>
              {initials}
            </div>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{email.company || email.fromName}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>· {email.fromEmail}</span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {new Date(email.receivedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
          {email.body}
        </div>
      </div>

      {/* Attachments */}
      {email.hasAttachments && email.attachments && email.attachments.length > 0 && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Attachments ({email.attachments.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {email.attachments.map(att => (
              <AttachmentPill 
                key={att.id} 
                name={att.filename} 
                contentType={att.contentType || (att as any).mimeType || ''} 
                size={att.size !== undefined ? att.size : (att as any).fileSizeBytes} 
              />
            ))}
          </div>
        </div>
      )}

      {/* AI Processing animation */}
      <AnimatePresence>
        {isProcessing && <AIProcessingAnimation onDone={() => { setIsProcessing(false); setShowAI(true); }} />}
      </AnimatePresence>

      {/* Link to existing order */}
      {email.orders && email.orders.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: 'var(--green-dim)', border: '1px solid var(--green-500)', borderRadius: 14, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={16} color="var(--green-400)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green-400)' }}>Order Generated: {email.orders[0].orderNumber}</span>
          </div>
          <button onClick={() => navigate(`/orders/${email.orders[0].id}`)}
            style={{ background: 'none', border: '1px solid var(--green-500)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', color: 'var(--green-400)', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
            View Order →
          </button>
        </motion.div>
      )}

      {/* Trigger AI Button */}
      {!aiExtracted && !isProcessing && !showAI && (!email.orders || email.orders.length === 0) && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleExtract}
          disabled={extractMutation.isPending}
          style={{ width: '100%', padding: '14px', border: '1px dashed rgba(168,85,247,0.4)', background: 'var(--purple-dim)', borderRadius: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16, transition: 'all 0.2s', fontFamily: 'inherit' }}
        >
          <Sparkles size={18} color="var(--purple-400)" />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--purple-400)' }}>Run AI Extraction</span>
        </motion.button>
      )}

      {/* AI Results (from real extraction job) */}
      {(aiExtracted || showAI) && !isProcessing && (() => {
        const confidence = email.extractionJob?.confidence ?? 85;
        const summary = email.extractionJob?.summary ?? 'AI has successfully extracted order information from this email.';
        const products = email.extractionJob?.extractedProducts ?? [];

        return (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {/* AI Summary */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 16, padding: 18, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 30, height: 30, background: 'var(--purple-dim)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={15} color="var(--purple-400)" />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>AI Summary</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, background: 'var(--purple-dim)', color: 'var(--purple-400)', padding: '3px 8px', borderRadius: 6 }}>AI Generated</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>{summary}</p>
              
              {/* Extracted Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { icon: User, label: 'Customer Name', value: email.extractionJob?.customerName ?? email.company ?? '—' },
                  { icon: TrendingUp, label: 'Priority', value: email.extractionJob?.priority ?? 'MEDIUM' },
                  { icon: Package, label: 'Products Count', value: `${products.length} items` },
                  { icon: Clock, label: 'Delivery Date', value: email.extractionJob?.deliveryDate ? new Date(email.extractionJob.deliveryDate).toLocaleDateString('en-IN') : 'Not specified' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Icon size={12} color="var(--text-muted)" />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Extracted Products List */}
              {products.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Extracted Line Items</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {products.map((p, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>SKU: {p.sku || 'Unknown'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{p.quantity} units</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>₹{p.unitPrice.toLocaleString('en-IN')} / unit</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confidence */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Extraction Confidence</div>
              <ConfidenceMeter value={Math.round(confidence)} />
            </div>

            {/* Error case */}
            {email.extractionJob?.status === 'FAILED' && email.extractionJob.error && (
              <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, padding: '12px 16px', marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <AlertTriangle size={15} color="var(--red-400)" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--red-400)' }}>Extraction failed: {email.extractionJob.error}</span>
                </div>
              </div>
            )}

            {/* Generate Order CTA */}
            {(!email.orders || email.orders.length === 0) && (
              <AnimatePresence mode="wait">
                {!orderGenerated ? (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                    whileTap={{ scale: 0.97 }} onClick={handleGenerateOrder}
                    disabled={generateOrderMutation.isPending}
                    style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, var(--blue-600), var(--blue-700))', border: 'none', borderRadius: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 4px 24px rgba(37,99,235,0.4)', marginBottom: 24, transition: 'all 0.2s', fontFamily: 'inherit' }}
                    whileHover={{ boxShadow: '0 6px 32px rgba(59,130,246,0.5)', y: -2 }}
                  >
                    <Zap size={18} color="#fff" />
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                      {generateOrderMutation.isPending ? 'Validating & Reserving...' : 'Approve & Create Order'}
                    </span>
                  </motion.button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    style={{ width: '100%', padding: '16px', borderRadius: 16, background: 'var(--green-dim)', border: '1px solid var(--green-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 }}
                  >
                    <CheckCircle size={20} color="var(--green-400)" />
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--green-400)' }}>Order Created! Redirecting...</span>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </motion.div>
        );
      })()}
    </motion.div>
  );
}
