import React, { useState } from 'react';
import { X, Mail, Lock, User, KeyRound, MapPin, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { authApi, setAuthToken } from '../services/apiClient';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = 'login', defaultLocation = 'New Delhi, India' }) {
  const [mode, setMode] = useState(initialMode); // login | register | forgot | reset
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState(defaultLocation);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  if (!isOpen) return null;

  const clearFeedback = () => {
    setError('');
    setInfoMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearFeedback();
    setBusy(true);

    try {
      if (mode === 'login') {
        const res = await authApi.login({ email, password });
        setAuthToken(res.token);
        onAuthSuccess(res);
        onClose();
      } else if (mode === 'register') {
        const res = await authApi.register({ name, email, password, location });
        setAuthToken(res.token);
        onAuthSuccess(res);
        onClose();
      } else if (mode === 'forgot') {
        const res = await authApi.forgotPassword(email);
        setInfoMsg(
          res.resetCodePreview
            ? `${res.message} Demo reset code: ${res.resetCodePreview}`
            : res.message
        );
        if (res.resetCodePreview) setResetToken(res.resetCodePreview);
        setMode('reset');
      } else if (mode === 'reset') {
        const res = await authApi.resetPassword({ token: resetToken, newPassword });
        setInfoMsg(res.message);
        setMode('login');
      }
    } catch (err) {
      setError(err?.message || 'Authentication failed. Ensure the API server is running.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.58)', backdropFilter: 'blur(6px)' }}>
      <div
        className="w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-4 relative animate-fade-in-up"
        style={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--border-subtle)' }}
      >
        <button
          onClick={onClose}
          aria-label="Close authentication modal"
          className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-slate-500/10"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={18} />
        </button>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent-teal)' }}>
            BreatheBetter Account
          </span>
          <h2 className="text-xl font-extrabold mt-0.5" style={{ color: 'var(--text-primary)' }}>
            {mode === 'login' && 'Sign in to your account'}
            {mode === 'register' && 'Create your free account'}
            {mode === 'forgot' && 'Recover your password'}
            {mode === 'reset' && 'Set a new password'}
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Sync saved cities, custom AQI alerts, daily planner activities, and community posts securely.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl text-xs flex items-start gap-2 bg-red-500/10 text-red-500 border border-red-500/25">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {infoMsg && (
          <div className="p-3 rounded-xl text-xs flex items-start gap-2 bg-emerald-500/10 text-emerald-600 border border-emerald-500/25">
            <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" />
            <span>{infoMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
                <div className="flex items-center gap-2 px-3 py-2.5 saas-input">
                  <User size={14} style={{ color: 'var(--text-faint)' }} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Arjun Sharma"
                    className="w-full text-xs bg-transparent outline-none"
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Home City</label>
                <div className="flex items-center gap-2 px-3 py-2.5 saas-input">
                  <MapPin size={14} style={{ color: 'var(--text-faint)' }} />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="New Delhi, India"
                    className="w-full text-xs bg-transparent outline-none"
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            </>
          )}

          {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Email Address</label>
              <div className="flex items-center gap-2 px-3 py-2.5 saas-input">
                <Mail size={14} style={{ color: 'var(--text-faint)' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full text-xs bg-transparent outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Password</label>
              <div className="flex items-center gap-2 px-3 py-2.5 saas-input">
                <Lock size={14} style={{ color: 'var(--text-faint)' }} />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full text-xs bg-transparent outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          )}

          {mode === 'reset' && (
            <>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Reset Code</label>
                <div className="flex items-center gap-2 px-3 py-2.5 saas-input">
                  <KeyRound size={14} style={{ color: 'var(--text-faint)' }} />
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="8-character reset code"
                    className="w-full text-xs bg-transparent outline-none"
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>New Password</label>
                <div className="flex items-center gap-2 px-3 py-2.5 saas-input">
                  <Lock size={14} style={{ color: 'var(--text-faint)' }} />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (6+ chars)"
                    className="w-full text-xs bg-transparent outline-none"
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            </>
          )}

          <button type="submit" disabled={busy} className="btn-brand w-full py-2.5 text-xs flex items-center justify-center gap-2">
            {busy && <Loader2 size={14} className="animate-spin" />}
            {mode === 'login' && 'Sign In'}
            {mode === 'register' && 'Create Account'}
            {mode === 'forgot' && 'Generate Reset Code'}
            {mode === 'reset' && 'Update Password'}
          </button>
        </form>

        <div className="flex items-center justify-between pt-2 border-t text-xs" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
          {mode === 'login' ? (
            <>
              <button onClick={() => { clearFeedback(); setMode('register'); }} className="font-semibold hover:underline" style={{ color: 'var(--accent-teal)' }}>
                Create account
              </button>
              <button onClick={() => { clearFeedback(); setMode('forgot'); }} className="hover:underline">
                Forgot password?
              </button>
            </>
          ) : (
            <button onClick={() => { clearFeedback(); setMode('login'); }} className="font-semibold hover:underline" style={{ color: 'var(--accent-teal)' }}>
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
