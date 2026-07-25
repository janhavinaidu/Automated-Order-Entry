import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { ApiResponse } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import ChatDrawer from './ChatDrawer';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function TopHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { user } = useAuthStore();

  const isDetail = location.pathname.split('/').length > 2;

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => api.get<ApiResponse<{ count: number }>>('/notifications/unread-count'),
    refetchInterval: 30_000,
  });

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<ApiResponse<Notification[]>>('/notifications?limit=10'),
    enabled: showNotifications,
  });

  const unreadCount = unreadData?.data?.count ?? 0;
  const notifications = notifData?.data ?? [];

  const initials = user?.avatarInitials
    || user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    || 'OP';

  return (
    <>
      <header className="top-header">
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '0 0 auto' }}>
          {isDetail ? (
            <button
              onClick={() => navigate(-1)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                color: 'var(--text-secondary)', padding: '4px 0',
                fontFamily: 'inherit', fontSize: 13,
              }}
            >
              <ChevronLeft size={16} />
              Back
            </button>
          ) : (
            <div className="mobile-only" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 26, height: 26,
                background: 'linear-gradient(135deg, #6366F1, #A855F7)',
                borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 12, color: '#fff' }}>⚡</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>OrderPilot</span>
            </div>
          )}
        </div>

        {/* Center – Search */}
        <div className="search-pill desktop-only" style={{ flex: '1 1 auto', maxWidth: 420 }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input placeholder="Search orders, customers, SKUs, invoices..." readOnly />
          <span className="kbd-hint">⌘K</span>
        </div>

        {/* Right */}
        <div className="header-right">
          {/* AI Agents status */}
          <div className="ai-status-pill desktop-only">
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green-400)', animation: 'livePulse 2s infinite', flexShrink: 0 }} />
            AI Agents
            <span style={{ fontWeight: 700, color: 'var(--green-400)' }}>· 3 Online</span>
          </div>

          {/* Ask AI button */}
          <button className="ask-ai-btn desktop-only" onClick={() => setIsChatOpen(true)}>
            <Sparkles size={13} />
            Ask AI
          </button>

          {/* Bell */}
          <div style={{ position: 'relative' }}>
            <button
              className="header-icon-btn"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell size={15} color="var(--text-secondary)" />
              {unreadCount > 0 && <span className="header-notif-dot" />}
            </button>

            {showNotifications && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                  onClick={() => setShowNotifications(false)}
                />
                <div style={{
                  position: 'absolute', top: '110%', right: 0,
                  width: 320, maxHeight: 420, overflowY: 'auto',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 999,
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Notifications</span>
                    {unreadCount > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--indigo-400)', cursor: 'pointer', fontWeight: 500 }}>
                        Mark all read
                      </span>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      No notifications
                    </div>
                  ) : notifications.map(n => (
                    <div key={n.id} style={{
                      padding: '11px 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                      background: !n.isRead ? 'rgba(99,102,241,0.04)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background var(--t-fast)',
                    }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{
                          width: 6, height: 6, borderRadius: '50%', marginTop: 5,
                          background: !n.isRead ? 'var(--indigo-500)' : 'transparent',
                          flexShrink: 0,
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2, color: 'var(--text-primary)' }}>{n.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.message}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                            {new Date(n.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* User – desktop */}
          <div className="header-user desktop-only" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
            <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg, #6366F1, #A855F7)', color: '#fff' }}>
              {initials}
            </div>
            <div>
              <div className="header-user-name">{user?.name ?? 'User'}</div>
              <div className="header-user-role">{user?.role ?? 'Viewer'}</div>
            </div>
          </div>

          {/* Mobile avatar */}
          <div className="avatar avatar-sm mobile-only" style={{ background: 'linear-gradient(135deg, #6366F1, #A855F7)', color: '#fff', cursor: 'pointer' }}
            onClick={() => navigate('/profile')}>
            {initials}
          </div>
        </div>
      </header>
      <ChatDrawer isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
}
