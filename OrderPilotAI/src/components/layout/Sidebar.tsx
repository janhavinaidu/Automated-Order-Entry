import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Mail, ShoppingBag, Package,
  CreditCard, Truck,
  FileText, ChevronLeft, ChevronRight, Zap
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface NavItem {
  to: string;
  icon: React.ComponentType<any>;
  label: string;
  badge?: number;
  live?: boolean;
  roles?: string[]; // if undefined, visible to all
}

interface NavGroup {
  label: string;
  items: NavItem[];
  roles?: string[]; // if undefined, group is shown to all
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Workflow',
    items: [
      { to: '/inbox',     icon: Mail,        label: 'Email Inbox', badge: 3, roles: ['ADMIN'] },
      { to: '/orders',    icon: ShoppingBag, label: 'Orders',                roles: ['ADMIN'] },
      { to: '/inventory', icon: Package,     label: 'Inventory' }, // all roles
      { to: '/billing',   icon: CreditCard,  label: 'Billing',               roles: ['ADMIN'] },
      { to: '/dispatch',  icon: Truck,       label: 'Dispatch',              roles: ['ADMIN'] },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/reports', icon: FileText, label: 'Reports', roles: ['ADMIN'] },
    ],
  },
];

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrator',
  INVENTORY: 'Inventory Manager',
  VIEWER: 'Viewer',
};

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuthStore();
  const role = user?.role ?? 'VIEWER';
  const initials = user?.avatarInitials
    || user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    || 'OP';

  const isVisible = (item: NavItem) => {
    if (!item.roles) return true; // no restriction
    return item.roles.includes(role);
  };

  return (
    <aside
      className="sidebar desktop-only"
      style={{ width: collapsed ? 60 : 'var(--sidebar-width)', transition: 'width 0.3s ease' }}
    >
      {/* Logo */}
      <div className="sidebar-logo" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #6366F1, #A855F7)',
            borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(99,102,241,0.4)',
            flexShrink: 0,
          }}>
            <Zap size={16} color="#fff" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, whiteSpace: 'nowrap' }}>OrderPilot</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.04em' }}>AI · V2.4</div>
            </div>
          )}
        </div>
      </div>

      {/* Role badge for INVENTORY */}
      {!collapsed && role === 'INVENTORY' && (
        <div style={{
          margin: '0 12px 8px',
          padding: '6px 10px',
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Package size={12} color="#F59E0B" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B' }}>Inventory Manager</span>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navGroups.map(group => {
          const visibleItems = group.items.filter(isVisible);
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label}>
              {!collapsed && (
                <div className="sidebar-section-label">{group.label}</div>
              )}
              {visibleItems.map(({ to, icon: Icon, label, badge, live }) => {
                const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
                return (
                  <NavLink
                    key={to}
                    to={to}
                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                    style={{ textDecoration: 'none', justifyContent: collapsed ? 'center' : 'flex-start' }}
                    title={collapsed ? label : undefined}
                  >
                    <Icon
                      size={16}
                      color={isActive ? 'var(--indigo-400)' : 'var(--text-muted)'}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      style={{ flexShrink: 0 }}
                    />
                    {!collapsed && (
                      <>
                        <span style={{
                          flex: 1,
                          fontSize: 13.5,
                          fontWeight: isActive ? 600 : 400,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>{label}</span>
                        {live && (
                          <span className="sidebar-badge-live">
                            <span className="sidebar-live-dot" />
                            LIVE
                          </span>
                        )}
                        {badge && !live && (
                          <span className="sidebar-badge">{badge}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                className="avatar avatar-sm"
                style={{
                  background: role === 'ADMIN'
                    ? 'linear-gradient(135deg, #6366F1, #A855F7)'
                    : role === 'INVENTORY'
                    ? 'linear-gradient(135deg, #F59E0B, #EF4444)'
                    : 'linear-gradient(135deg, #374151, #6B7280)',
                  color: '#fff',
                  flexShrink: 0,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
                  {user?.name ?? 'User'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{roleLabels[role] ?? role}</div>
              </div>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}
              title="Collapse"
            >
              <ChevronLeft size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCollapsed(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}
            title="Expand"
          >
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </aside>
  );
}
