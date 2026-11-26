import React from 'react';

export default function ToggleSwitch({ checked, onChange, label, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={label}
      onClick={onChange}
      className="flex-shrink-0 transition-colors rounded-full"
      style={{
        width: 44,
        height: 24,
        background: checked ? '#0d9488' : 'var(--border-subtle)',
        position: 'relative',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          background: '#ffffff',
          position: 'absolute',
          top: 3,
          left: checked ? 23 : 3,
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        }}
      />
    </button>
  );
}
