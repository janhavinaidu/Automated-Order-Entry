import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Mail, ShoppingBag, Package, User } from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/orders',    icon: ShoppingBag,     label: 'Orders',   badge: 3 },
  { to: '/inbox',     icon: Mail,            label: 'AI Inbox', badge: 3 },
  { to: '/inventory', icon: Package,         label: 'Inventory' },
  { to: '/profile',   icon: User,            label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();
  return (
    <nav className="bottom-nav mobile-only">
      {navItems.map(({ to, icon: Icon, label, badge }) => {
        const isActive = location.pathname.startsWith(to);
        return (
          <NavLink key={to} to={to} className={`nav-item ${isActive ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
            {badge && <span className="nav-badge">{badge}</span>}
            <Icon
              size={19}
              color={isActive ? 'var(--indigo-400)' : 'var(--text-muted)'}
              strokeWidth={isActive ? 2.2 : 1.8}
            />
            <span className="nav-item-label">{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
