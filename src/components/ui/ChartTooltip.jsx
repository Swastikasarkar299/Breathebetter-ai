import React from 'react';

export default function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="p-2.5 rounded-xl text-xs shadow-lg"
      style={{
        background: 'var(--bg-surface-solid)',
        border: '1px solid var(--border-subtle)',
        color: 'var(--text-primary)',
      }}
    >
      <div className="font-bold mb-1">{label}</div>
      {payload.map((p, idx) => (
        <div
          key={idx}
          className="flex items-center gap-2 font-medium"
          style={{ color: p.color || 'var(--accent-teal)' }}
        >
          <span>{p.name}:</span>
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}
