import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Eye, EyeOff, AlertCircle, Sparkles, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const QUICK_FILL = [
  { label: 'Admin', email: 'admin@orderpilot.ai', password: 'Admin@123', color: '#6366F1', role: 'ADMIN' },
  { label: 'Inventory', email: 'inventory@orderpilot.ai', password: 'Inventory@123', color: '#F59E0B', role: 'INVENTORY' },
];

export default function Login() {
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [filled, setFilled] = useState<string | null>(null);

  const handleQuickFill = (preset: typeof QUICK_FILL[0]) => {
    setEmail(preset.email);
    setPassword(preset.password);
    setFilled(preset.label);
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #090b11 0%, #0d1020 40%, #0f1226 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background orbs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '10%', left: '15%',
          width: 480, height: 480,
          background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '10%',
          width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: '100%', maxWidth: 440,
          background: 'rgba(16, 18, 28, 0.85)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 24,
          boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.08)',
          padding: '40px 36px',
          position: 'relative', zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
          <div style={{
            width: 42, height: 42,
            background: 'linear-gradient(135deg, #6366F1, #A855F7)',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
            flexShrink: 0,
          }}>
            <Zap size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              OrderPilot <span style={{ color: 'rgba(99,102,241,0.9)' }}>AI</span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
              Enterprise Order Intelligence
            </div>
          </div>
          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 20, padding: '4px 10px',
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', animation: 'livePulse 2s infinite' }} />
            <span style={{ fontSize: 11, color: '#10B981', fontWeight: 700 }}>LIVE</span>
          </div>
        </div>

        {/* Heading */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 6 }}>
            Sign in to continue
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)' }}>
            AI-powered order management — sign in to start
          </p>
        </div>

        {/* Quick fill preset buttons */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Quick sign-in
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {QUICK_FILL.map(preset => (
              <motion.button
                key={preset.label}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleQuickFill(preset)}
                style={{
                  flex: 1, padding: '10px 14px',
                  background: filled === preset.label ? `${preset.color}18` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${filled === preset.label ? preset.color + '40' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: preset.color, flexShrink: 0,
                }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: filled === preset.label ? preset.color : 'rgba(255,255,255,0.75)' }}>
                    {preset.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{preset.role}</div>
                </div>
                <ChevronRight size={12} color={filled === preset.label ? preset.color : 'rgba(255,255,255,0.2)'} style={{ marginLeft: 'auto' }} />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>or enter manually</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.50)', display: 'block', marginBottom: 6 }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@orderpilot.ai"
              required
              style={{
                width: '100%', padding: '12px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 12, color: '#fff',
                fontSize: 14, fontFamily: 'inherit',
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.50)', display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', padding: '12px 42px 12px 14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 12, color: '#fff',
                  fontSize: 14, fontFamily: 'inherit',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.35)', padding: 4,
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(239,68,68,0.10)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 10, padding: '10px 12px', marginBottom: 16,
                }}
              >
                <AlertCircle size={15} color="#EF4444" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#FCA5A5' }}>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={isLoading ? {} : { scale: 1.01 }}
            whileTap={isLoading ? {} : { scale: 0.98 }}
            style={{
              width: '100%', padding: '14px',
              background: isLoading
                ? 'rgba(99,102,241,0.5)'
                : 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)',
              border: 'none', borderRadius: 12, cursor: isLoading ? 'not-allowed' : 'pointer',
              color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: isLoading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
              transition: 'all 0.2s',
            }}
          >
            {isLoading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  style={{
                    width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                  }}
                />
                Signing in...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Sign in to OrderPilot AI
              </>
            )}
          </motion.button>
        </form>

        {/* Footer */}
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
          Powered by AI · Secured with JWT · © 2026 OrderPilot
        </div>
      </motion.div>
    </div>
  );
}
