import React, { useState } from 'react';
import {
  Home, Wind, ShieldCheck, Fan, Sprout, Gauge, Info, CheckCircle2,
  AlertTriangle, Lock, Unlock,
} from 'lucide-react';
import {
  indoorTips, getAqiCategory, getDynamicVentilationSchedule,
} from '../data/mockData';

const ROOM_SIZES = [
  { id: 'small', label: 'Bedroom (< 150 sq ft)', cadr: '150–220 m³/h', diy: 'Single 20" box fan + MERV-13 filter' },
  { id: 'medium', label: 'Living Room (150–300 sq ft)', cadr: '250–360 m³/h', diy: 'True HEPA H13 unit or 2-filter box fan' },
  { id: 'large', label: 'Open Hall (300–500 sq ft)', cadr: '400–550 m³/h', diy: '4-filter Corsi-Rosenthal cube + room sealing' },
];

const PURIFIER_OPTIONS = [
  {
    name: 'True HEPA H13 Purifier',
    badge: 'Recommended Commercial',
    efficiency: '99.97% of 0.3 µm PM2.5',
    cost: '₹4,500–₹12,000',
    accent: '#0d9488',
    notes: [
      'Choose True HEPA H13 (avoid ozone-generating ionizers)',
      'Size CADR to deliver 4–5 air changes per hour (ACH)',
      'Run on medium-auto overnight in sealed bedrooms',
    ],
  },
  {
    name: 'DIY Box-Fan MERV-13 Purifier',
    badge: 'Budget Alternative',
    efficiency: '60%–80% PM2.5 reduction',
    cost: '₹400–₹900',
    accent: '#10b981',
    notes: [
      'Seal a MERV-13 or HEPA panel filter tightly to fan intake',
      'Use painter tape around edges so air cannot bypass the media',
      'Replace filter panel every 3–6 months or when visibly grey',
    ],
  },
  {
    name: 'Activated Carbon Pre-Filter',
    badge: 'Gases & Cooking Odors',
    efficiency: 'Adsorbs VOCs & NO₂',
    cost: '₹300–₹1,200',
    accent: '#6366f1',
    notes: [
      'Pair carbon pellets/sheets with HEPA for kitchen or roadside homes',
      'Targets traffic fumes and indoor volatile organic compounds',
      'Does not trap fine dust alone — always pair with particulate filter',
    ],
  },
];

const AIR_PLANTS = [
  { name: 'Snake Plant', sci: 'Sansevieria trifasciata', benefit: 'Low-light tolerant; evening O₂ exchange', care: 'Water every 2–3 weeks' },
  { name: 'Peace Lily', sci: 'Spathiphyllum', benefit: 'Helps reduce trace indoor VOCs', care: 'Indirect light, weekly water (keep away from pets)' },
  { name: 'Spider Plant', sci: 'Chlorophytum comosum', benefit: 'Resilient & pet/child friendly', care: 'Bright indirect light, wipe dusty leaves weekly' },
  { name: 'Pothos / Money Plant', sci: 'Epipremnum aureum', benefit: 'Thrives in indoor apartments', care: 'Minimal watering, tolerates low light' },
];

export default function IndoorAir({ airQuality }) {
  const [activeSection, setActiveSection] = useState('ventilation');
  const [indoorMode, setIndoorMode] = useState('closed'); // closed | open | hepa
  const [sensorReading, setSensorReading] = useState('');
  const [roomSizeId, setRoomSizeId] = useState('medium');

  const outdoorAqi = airQuality.aqi;
  const outdoorCat = getAqiCategory(outdoorAqi);
  const schedule = getDynamicVentilationSchedule(airQuality);

  // Compute transparent indoor estimate OR use user's actual sensor reading
  const factorMap = { closed: 0.58, open: 0.84, hepa: 0.28 };
  const hasManualSensor = sensorReading.trim() !== '' && !Number.isNaN(Number(sensorReading));
  const estIndoorAqi = hasManualSensor
    ? Math.max(0, Math.round(Number(sensorReading) * 2.1))
    : Math.max(10, Math.round(outdoorAqi * (factorMap[indoorMode] || 0.58)));
  const indoorCat = getAqiCategory(estIndoorAqi);

  const selectedRoom = ROOM_SIZES.find((r) => r.id === roomSizeId) || ROOM_SIZES[1];

  const sections = [
    { id: 'ventilation', label: 'Ventilation Timing', Icon: Wind },
    { id: 'room', label: 'Room Prevention', Icon: Home },
    { id: 'purifiers', label: 'Purifiers & CADR', Icon: Fan },
    { id: 'plants', label: 'Healthy Environment', Icon: Sprout },
  ];

  return (
    <div className="space-y-5">
      {/* Measurement vs Estimation Clarity Card */}
      <div className="surface-card p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                style={{
                  background: hasManualSensor ? 'rgba(16, 185, 129, 0.14)' : 'rgba(245, 158, 11, 0.14)',
                  color: hasManualSensor ? '#10b981' : '#d97706',
                }}
              >
                {hasManualSensor ? 'User Sensor Input' : 'Estimated Model · Not a Physical Sensor'}
              </span>
            </div>
            <h2 className="text-lg font-bold mt-1.5" style={{ color: 'var(--text-primary)' }}>
              Outdoor vs. Indoor Air Comparison
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {hasManualSensor
                ? 'Displaying AQI converted from your entered indoor PM2.5 monitor reading.'
                : 'Indoor AQI below is mathematically estimated from live outdoor AQI using standard building infiltration ratios (not measured by an indoor sensor).'}
            </p>
          </div>

          {/* Optional actual sensor input */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl saas-input">
              <Gauge size={14} style={{ color: 'var(--accent-teal)' }} />
              <input
                type="number"
                min="0"
                max="500"
                value={sensorReading}
                onChange={(e) => setSensorReading(e.target.value)}
                placeholder="Enter home PM2.5 sensor (µg/m³)"
                className="text-xs bg-transparent outline-none w-48"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
            {hasManualSensor && (
              <button
                onClick={() => setSensorReading('')}
                className="text-xs font-semibold px-2.5 py-2 rounded-xl"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl" style={{ background: outdoorCat.bg, border: `1px solid ${outdoorCat.color}30` }}>
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: outdoorCat.color }}>
              Outdoor ({airQuality.isLive ? 'Live API' : 'Reference'})
            </div>
            <div className="text-3xl font-black mt-1" style={{ color: outdoorCat.color }}>
              {outdoorAqi}
            </div>
            <div className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
              {outdoorCat.label} · PM2.5 {airQuality.pm25} µg/m³
            </div>
          </div>

          <div className="p-4 rounded-2xl" style={{ background: indoorCat.bg, border: `1px solid ${indoorCat.color}30` }}>
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: indoorCat.color }}>
              Indoor ({hasManualSensor ? 'Your Sensor' : 'Estimated'})
            </div>
            <div className="text-3xl font-black mt-1" style={{ color: indoorCat.color }}>
              {hasManualSensor ? estIndoorAqi : `~${estIndoorAqi}`}
            </div>
            <div className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
              {indoorCat.label} · {hasManualSensor ? `${sensorReading} µg/m³ entered` : 'Simulated I/O ratio'}
            </div>
          </div>

          <div className="p-4 rounded-2xl flex flex-col justify-between" style={{ background: 'var(--bg-subtle)' }}>
            <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              Home Setup Simulation
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                { id: 'closed', label: 'Windows Sealed' },
                { id: 'open', label: 'Windows Open' },
                { id: 'hepa', label: 'HEPA Active' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setIndoorMode(m.id)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={
                    indoorMode === m.id && !hasManualSensor
                      ? { background: 'linear-gradient(135deg, #0d9488, #0ea5e9)', color: '#fff' }
                      : { background: 'var(--bg-surface-solid)', color: 'var(--text-secondary)' }
                  }
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sub-Navigation */}
        <div className="flex gap-2 overflow-x-auto pt-1">
          {sections.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-all"
              style={
                activeSection === id
                  ? { background: 'linear-gradient(135deg, #0d9488, #0ea5e9)', color: '#ffffff' }
                  : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }
              }
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Ventilation Section */}
      {activeSection === 'ventilation' && (
        <div className="surface-card p-5 space-y-3">
          <div>
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Dynamic Window & Ventilation Schedule — {airQuality.location.split(',')[0]}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Calculated from current AQI ({outdoorAqi}), hourly projection, and wind speed ({airQuality.windSpeed} km/h).
            </p>
          </div>
          <div className="space-y-2.5">
            {schedule.map((slot, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl"
                style={{ background: `${slot.color}12`, border: `1px solid ${slot.color}30` }}
              >
                <div className="flex items-center gap-2.5 w-36 flex-shrink-0">
                  {slot.status === 'open' ? (
                    <Unlock size={16} style={{ color: slot.color }} />
                  ) : slot.status === 'closed' ? (
                    <Lock size={16} style={{ color: slot.color }} />
                  ) : (
                    <AlertTriangle size={16} style={{ color: slot.color }} />
                  )}
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                    {slot.time}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold" style={{ color: slot.color }}>{slot.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{slot.reason}</div>
                </div>
                <span
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full self-start sm:self-auto"
                  style={{ background: `${slot.color}22`, color: slot.color }}
                >
                  {slot.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Room Prevention Tips */}
      {activeSection === 'room' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {indoorTips.map((room) => (
            <div key={room.id} className="surface-card p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${room.color}18`, color: room.color }}
                >
                  <Home size={17} />
                </div>
                <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{room.room}</h3>
              </div>
              <div className="space-y-2.5">
                {room.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs leading-relaxed">
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span style={{ color: 'var(--text-secondary)' }}>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Air Purifiers & CADR Sizing */}
      {activeSection === 'purifiers' && (
        <div className="space-y-4">
          <div className="surface-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Room Size & CADR Calculator
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Select room dimensions to size a commercial HEPA purifier or DIY filter correctly.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ROOM_SIZES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRoomSizeId(r.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                    style={
                      roomSizeId === r.id
                        ? { background: 'linear-gradient(135deg, #0d9488, #0ea5e9)', color: '#fff' }
                        : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }
                    }
                  >
                    {r.label.split(' (')[0]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                <div style={{ color: 'var(--text-muted)' }}>Selected Area</div>
                <div className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{selectedRoom.label}</div>
              </div>
              <div className="p-3.5 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                <div style={{ color: 'var(--text-muted)' }}>Target CADR (4–5 ACH)</div>
                <div className="font-bold mt-0.5" style={{ color: 'var(--accent-teal)' }}>{selectedRoom.cadr}</div>
              </div>
              <div className="p-3.5 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                <div style={{ color: 'var(--text-muted)' }}>Recommended Setup</div>
                <div className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{selectedRoom.diy}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PURIFIER_OPTIONS.map((p) => (
              <div key={p.name} className="surface-card p-5 space-y-3">
                <span
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block"
                  style={{ background: `${p.accent}18`, color: p.accent }}
                >
                  {p.badge}
                </span>
                <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{p.name}</h4>
                <div className="text-xs font-semibold" style={{ color: 'var(--accent-teal)' }}>
                  {p.efficiency} · {p.cost}
                </div>
                <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  {p.notes.map((n, i) => (
                    <div key={i} className="flex gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <ShieldCheck size={13} className="flex-shrink-0 mt-0.5" style={{ color: p.accent }} />
                      <span>{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Healthy Indoor Environment */}
      {activeSection === 'plants' && (
        <div className="space-y-4">
          <div
            className="surface-card p-4 flex items-start gap-2.5 text-xs"
            style={{ background: 'rgba(14, 165, 233, 0.08)', borderColor: 'rgba(14, 165, 233, 0.25)' }}
          >
            <Info size={16} className="text-sky-500 flex-shrink-0 mt-0.5" />
            <span style={{ color: 'var(--text-secondary)' }}>
              <strong>Scientific Note:</strong> Houseplants support pleasant indoor humidity and low-level VOC absorption, but they do <strong>not</strong> filter fine PM2.5 particles like HEPA purifiers. Combine plants with source control and filtration.
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AIR_PLANTS.map((plant) => (
              <div key={plant.name} className="surface-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Sprout size={16} className="text-emerald-500" />
                  <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{plant.name}</div>
                </div>
                <div className="text-[11px] italic" style={{ color: 'var(--text-faint)' }}>{plant.sci}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{plant.benefit}</div>
                <div className="text-[11px] font-medium pt-1" style={{ color: 'var(--accent-teal)' }}>
                  Care: {plant.care}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
