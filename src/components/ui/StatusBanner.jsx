import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

const STYLES = {
  error: {
    Icon: AlertCircle,
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.28)',
    color: '#dc2626',
    role: 'alert',
  },
  warning: {
    Icon: AlertTriangle,
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)',
    color: '#d97706',
    role: 'status',
  },
  success: {
    Icon: CheckCircle2,
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.28)',
    color: '#059669',
    role: 'status',
  },
  info: {
    Icon: Info,
    bg: 'rgba(6, 182, 212, 0.1)',
    border: 'rgba(6, 182, 212, 0.26)',
    color: '#0891b2',
    role: 'status',
  },
};

export default function StatusBanner({ variant = 'info', title, message, action }) {
  const cfg = STYLES[variant] || STYLES.info;
  const Icon = cfg.Icon;
  return (
    <div
      role={cfg.role}
      aria-live={cfg.role === 'alert' ? 'assertive' : 'polite'}
      className="p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <div className="flex items-start sm:items-center gap-2.5">
        <Icon size={16} className="flex-shrink-0 mt-0.5 sm:mt-0" style={{ color: cfg.color }} aria-hidden="true" />
        <div style={{ color: 'var(--text-primary)' }}>
          {title && <strong className="mr-1.5" style={{ color: cfg.color }}>{title}</strong>}
          <span>{message}</span>
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
