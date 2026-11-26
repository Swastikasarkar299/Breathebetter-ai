import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function EmptyState({ title, description, onRetry, retryLabel = 'Retry', Icon = AlertCircle }) {
  return (
    <div className="surface-card p-8 text-center space-y-3" role="status">
      <div
        className="w-11 h-11 rounded-2xl mx-auto flex items-center justify-center"
        style={{ background: 'var(--bg-subtle)', color: 'var(--accent-teal)' }}
        aria-hidden="true"
      >
        <Icon size={20} />
      </div>
      <div>
        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
        {description && (
          <p className="text-xs mt-1 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
            {description}
          </p>
        )}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-brand px-4 py-2 text-xs inline-flex items-center gap-1.5"
        >
          <RefreshCw size={13} aria-hidden="true" /> {retryLabel}
        </button>
      )}
    </div>
  );
}
