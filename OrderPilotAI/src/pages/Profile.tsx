import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Settings, Moon, Bell, Info, LogOut, Shield,
  ChevronRight, Building2, Mail, Award, Zap
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

function SettingsRow({
  icon: Icon, label, sublabel, rightContent, onClick, color, delay,
}: {
  icon: React.ElementType; label: string; sublabel?: string; rightContent?: React.ReactNode;
  onClick?: () => void; color?: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay || 0 }}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '13px 16px', borderRadius: 12,
        cursor: onClick ? 'pointer' : 'default',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        transition: 'all 0.15s',
        marginBottom: 6,
      }}
      whileHover={onClick ? { backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' } as Record<string, string> : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
    >
      <div style={{
        width: 36, height: 36,
        background: color ? `${color}18` : 'var(--bg-elevated)',
        borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={17} color={color || 'var(--text-secondary)'} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: color && color.includes('red') ? color : 'var(--text-primary)' }}>{label}</div>
        {sublabel && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{sublabel}</div>}
      </div>
      {rightContent || <ChevronRight size={16} color="var(--text-muted)" />}
    </motion.div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: value ? 'var(--blue-600)' : 'var(--bg-overlay)',
        position: 'relative', cursor: 'pointer',
        transition: 'background 0.25s',
        flexShrink: 0,
        border: `1px solid ${value ? 'var(--blue-500)' : 'var(--border-default)'}`,
      }}
    >
      <motion.div
        animate={{ x: value ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          position: 'absolute', top: 2,
          width: 18, height: 18, borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  );
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrator',
  INVENTORY: 'Inventory Manager',
  VIEWER: 'Viewer',
};

export default function Profile() {
  const { user, logout, isLoading } = useAuthStore();
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const initials = user?.avatarInitials
    || user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    || 'OP';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(168,85,247,0.08) 100%)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 20, padding: '24px 20px', marginBottom: 20,
          position: 'relative', overflow: 'hidden', textAlign: 'center',
        }}
      >
        <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />

        {/* Avatar */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
          style={{
            width: 80, height: 80, borderRadius: 22,
            background: 'linear-gradient(135deg, var(--blue-600), var(--purple-500))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 28, fontWeight: 800, color: '#fff',
            boxShadow: '0 8px 32px rgba(37,99,235,0.4)',
          }}
        >
          {initials}
        </motion.div>

        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{user?.name}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          {roleLabels[user?.role ?? ''] ?? user?.role}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--blue-400)', background: 'var(--blue-dim)', padding: '5px 12px', borderRadius: 8 }}>
            <Building2 size={13} /> OrderPilot AI
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--purple-400)', background: 'var(--purple-dim)', padding: '5px 12px', borderRadius: 8 }}>
            <Award size={13} /> {user?.role === 'ADMIN' ? 'Enterprise' : user?.role === 'INVENTORY' ? 'Inventory Pro' : 'Standard'}
          </span>
        </div>
      </motion.div>

      {/* Contact Info */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4 }}>Contact</div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px' }}>
            <div style={{ width: 36, height: 36, background: 'var(--bg-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={16} color="var(--text-muted)" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{user?.email}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Work Email</div>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4 }}>Preferences</div>
        <SettingsRow icon={Moon} label="Dark Mode" sublabel="Always on for enterprise UI" delay={0.1}
          rightContent={<Toggle value={true} onChange={() => {}} />} />
        <SettingsRow icon={Bell} label="Push Notifications" sublabel="Order & inventory alerts" delay={0.15}
          rightContent={<Toggle value={notificationsOn} onChange={setNotificationsOn} />} />
      </div>

      {/* Account */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4 }}>Account</div>
        <SettingsRow icon={Shield}   label="Security & Privacy" sublabel="Password, 2FA"         delay={0.2} onClick={() => {}} />
        <SettingsRow icon={Settings} label="App Settings"       sublabel="Workflows, integrations" delay={0.25} onClick={() => {}} />
        <SettingsRow icon={Info}     label="About OrderPilot AI" sublabel="v1.0.0 · Enterprise"  delay={0.30} onClick={() => {}} />
      </div>

      {/* App info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
          borderRadius: 14, padding: '14px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, var(--blue-600), var(--purple-500))', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={18} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>OrderPilot AI Platform</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Version 1.0.0 · AI-Powered Order Entry</div>
        </div>
      </motion.div>

      {/* Logout */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setLogoutConfirm(true)}
        style={{
          width: '100%', padding: '14px', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 14, cursor: 'pointer',
          background: 'rgba(239,68,68,0.06)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: 8,
          marginBottom: 24, transition: 'all 0.2s', fontFamily: 'inherit',
        }}
        whileHover={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' } as Record<string, string>}
      >
        <LogOut size={16} color="var(--red-400)" />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--red-400)' }}>Sign Out</span>
      </motion.button>

      {/* Logout Confirm */}
      <AnimatePresence>
        {logoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              zIndex: 1000, padding: 16,
            }}
            onClick={() => setLogoutConfirm(false)}
          >
            <motion.div
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--bg-elevated)', borderRadius: 20, padding: 24,
                width: '100%', maxWidth: 400, border: '1px solid var(--border-default)',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 56, height: 56, background: 'var(--red-dim)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <LogOut size={24} color="var(--red-400)" />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Sign Out?</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>You'll need to sign in again to access OrderPilot AI.</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setLogoutConfirm(false)}>Cancel</button>
                <button
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                  onClick={() => logout()}
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
