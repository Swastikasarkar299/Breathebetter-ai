import React from 'react';
import { getAqiCategory } from '../data/mockData';
import { ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';

const SCALE_SEGMENTS = [
  { max: 50, color: '#10b981', label: 'Good' },
  { max: 100, color: '#84cc16', label: 'Moderate' },
  { max: 150, color: '#f59e0b', label: 'Sensitive' },
  { max: 200, color: '#f97316', label: 'Poor' },
  { max: 300, color: '#ef4444', label: 'Very Poor' },
  { max: 500, color: '#8b5cf6', label: 'Hazardous' },
];

export default function AQIGauge({ aqi = null }) {
  const isAvailable = aqi != null && !Number.isNaN(Number(aqi));
  const numericAqi = isAvailable ? Math.max(0, Math.round(Number(aqi))) : 0;
  const clamped = Math.min(numericAqi, 500);
  const percentage = isAvailable ? clamped / 500 : 0;
  const category = getAqiCategory(isAvailable ? numericAqi : null);

  const radius = 84;
  const cx = 120;
  const cy = 106;
  const startAngle = -210;
  const totalAngle = 240;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const getPoint = (angle, r = radius) => ({
    x: cx + r * Math.cos(toRad(angle)),
    y: cy + r * Math.sin(toRad(angle)),
  });

  const arcPath = (startDeg, endDeg, r = radius) => {
    const start = getPoint(startDeg, r);
    const end = getPoint(endDeg, r);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  const currentAngle = startAngle + totalAngle * Math.max(0.015, percentage);
  const needleTip = getPoint(currentAngle, radius - 4);
  const needleBase1 = {
    x: cx + 6 * Math.cos(toRad(currentAngle + 90)),
    y: cy + 6 * Math.sin(toRad(currentAngle + 90)),
  };
  const needleBase2 = {
    x: cx + 6 * Math.cos(toRad(currentAngle - 90)),
    y: cy + 6 * Math.sin(toRad(currentAngle - 90)),
  };

  const segmentAngles = SCALE_SEGMENTS.map((seg, idx) => ({
    start: startAngle + totalAngle * (idx === 0 ? 0 : SCALE_SEGMENTS[idx - 1].max / 500),
    end: startAngle + totalAngle * (seg.max / 500),
    color: seg.color,
  }));

  const StatusIcon = !isAvailable || numericAqi <= 100
    ? ShieldCheck
    : numericAqi <= 150
      ? AlertTriangle
      : ShieldAlert;

  return (
    <div
      className="flex flex-col items-center"
      role="img"
      aria-label={
        isAvailable
          ? `US Air Quality Index is ${numericAqi}, rated ${category.label}. ${category.description}`
          : 'Air quality measurement unavailable'
      }
    >
      <svg width="240" height="154" viewBox="0 0 240 154" className="overflow-visible" aria-hidden="true">
        <path
          d={arcPath(startAngle, startAngle + totalAngle)}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth="16"
          strokeLinecap="round"
        />

        {segmentAngles.map((seg, i) => (
          <path
            key={i}
            d={arcPath(seg.start, seg.end)}
            fill="none"
            stroke={seg.color}
            strokeWidth="14"
            opacity="0.24"
            strokeLinecap={i === 0 ? 'round' : i === segmentAngles.length - 1 ? 'round' : 'butt'}
          />
        ))}

        {isAvailable && (
          <>
            <path
              d={arcPath(startAngle, currentAngle)}
              fill="none"
              stroke={category.color}
              strokeWidth="14"
              strokeLinecap="round"
              style={{
                transition: 'all 0.5s ease',
                filter: `drop-shadow(0 0 8px ${category.color}55)`,
              }}
            />
            <polygon
              points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
              fill={category.color}
              style={{ transition: 'all 0.45s ease' }}
            />
            <circle cx={cx} cy={cy} r="9" fill="var(--bg-surface-solid)" stroke={category.color} strokeWidth="3" />
            <circle cx={cx} cy={cy} r="3.5" fill={category.color} />
          </>
        )}

        <text
          x={cx}
          y={cy + 30}
          textAnchor="middle"
          fontSize="32"
          fontWeight="800"
          fill={category.color}
          style={{ letterSpacing: '-0.03em' }}
        >
          {isAvailable ? numericAqi : 'N/A'}
        </text>
        <text x={cx} y={cy + 46} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text-muted)">
          US AQI SCALE
        </text>

        <text x="20" y="132" fontSize="10" fontWeight="600" fill="var(--text-faint)">0</text>
        <text x="202" y="132" fontSize="10" fontWeight="600" fill="var(--text-faint)">500</text>
      </svg>

      {/* Text + Icon Accessible Category Pill */}
      <div
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-1 mb-2"
        style={{ background: category.bg, color: category.color }}
      >
        <StatusIcon size={13} aria-hidden="true" />
        <span>{category.label}</span>
      </div>

      {/* Compact Legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {SCALE_SEGMENTS.map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: s.color }} aria-hidden="true" />
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
