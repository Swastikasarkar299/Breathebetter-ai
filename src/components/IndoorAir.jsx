import React, { useState, useEffect } from 'react';
import {
  Home, Wind, Fan, Sprout, Gauge, Info, CheckCircle2, AlertTriangle, Lock, Unlock, ShieldAlert, Droplets,
} from 'lucide-react';
import {
  indoorTips, getAqiCategory, getDynamicVentilationSchedule,
} from '../data/mockData';

const INDOOR_CHECKLIST_DEFAULT = [
  { id: 'ic1', task: 'Seal perimeter window gaps & close street-facing windows during rush hour', done: true },
  { id: 'ic2', task: 'Run kitchen exhaust fan before and during stove cooking', done: true },
  { id: 'ic3', task: 'Wet-mop floors instead of dry sweeping to trap fine settled PM2.5', done: false },
  { id: 'ic4', task: 'Maintain indoor relative humidity between 40% and 55%', done: false },
  { id: 'ic5', task: 'Keep incense, scented candles, and tobacco smoke completely indoors-free', done: true },
  { id: 'ic6', task: 'Leave outdoor shoes at the entrance door-mat', done: true },
];

const ROOM_SIZES = [
  { id: 'small', label: 'Bedroom (< 150 sq ft)', cadr: '150–220 m³/h', diy: 'Single box fan + sealed MERV-13 filter' },
  { id: 'medium', label: 'Living Room (150–300 sq ft)', cadr: '250–360 m³/h', diy: 'True HEPA H13 unit or 2-filter box fan' },
  { id: 'large', label: 'Open Hall (300–500 sq ft)', cadr: '400–550 m³/h', diy: '4-filter Corsi-Rosenthal cube' },
];

function pm25ToUsAqi(pm25 = 0) {
  const c = Math.max(0, Number(pm25) || 0);
  const bps = [
    [0, 12.0, 0, 50],
    [12.1, 35.4, 51, 100],
    [35.5, 55.4, 101, 150],
    [55.5, 150.4, 151, 200],
    [150.5, 250.4, 201, 300],
    [250.5, 500.4, 301, 500],
  ];
  for (const [cLo, cHi, iLo, iHi] of bps) {
    if (c <= cHi) return Math.round(((iHi - iLo) / (cHi - cLo)) * (c - cLo) + iLo);
  }
  return 500;
}

export default function IndoorAir({ airQuality }) {
  const [activeSection, setActiveSection] = useState('ventilation');
  const [sensorPm25, setSensorPm25] = useState(() => {
    try { return localStorage.getItem('bb_indoor_sensor_pm25') || ''; } catch { return ''; }
  });
  const [roomSizeId, setRoomSizeId] = useState('medium');
  const [checklist, setChecklist] = useState(() => {
    try {
      const saved = localStorage.getItem('bb_indoor_checklist');
      return saved ? JSON.parse(saved) : INDOOR_CHECKLIST_DEFAULT;
    } catch { return INDOOR_CHECKLIST_DEFAULT; }
  });

  useEffect(() => {
    try { localStorage.setItem('bb_indoor_sensor_pm25', sensorPm25); } catch {}
  }, [sensorPm25]);

  useEffect(() => {
    try { localStorage.setItem('bb_indoor_checklist', JSON.stringify(checklist)); } catch {}
  }, [checklist]);

  const outdoorAqi = airQuality.aqi;
  const outdoorCat = getAqiCategory(outdoorAqi ?? 0);
  const schedule = getDynamicVentilationSchedule(airQuality);

  const hasSensorConnected = sensorPm25.trim() !== '' && !Number.isNaN(Number(sensorPm25)) && Number(sensorPm25) >= 0;
  const measuredIndoorAqi = hasSensorConnected ? pm25ToUsAqi(Number(sensorPm25)) : null;
  const indoorCat = measuredIndoorAqi != null ? getAqiCategory(measuredIndoorAqi) : null;
  const selectedRoom = ROOM_SIZES.find((r) => r.id === roomSizeId) || ROOM_SIZES[1];

  const toggleCheck = (id) => {
    setChecklist((prev) => prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c)));
  };

  return (
    <div className="space-y-5">
      {/* Honest Indoor Sensor vs Outdoor API Transparency Panel */}
      <div className="surface-card p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <span
              className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-flex items-center gap-1"
              style={{
                background: hasSensorConnected ? 'rgba(16, 185, 129, 0.14)' : 'rgba(245, 158, 11, 0.14)',
                color: hasSensorConnected ? '#10b981' : '#d97706',
              }}
            >
              {hasSensorConnected ? 'User Indoor Monitor Reading' : 'Indoor Sensor Not Connected · Measurement Unavailable'}
            </span>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Indoor vs. Outdoor Air Status
            </h2>
            <p className="text-xs max-w-2xl" style={{ color: 'var(--text-muted)' }}>
              Outdoor APIs (Open-Meteo / IQAir) cannot measure air inside your home. Indoor air quality is marked <strong>Unavailable</strong> until you connect or enter a reading from a physical indoor PM2.5 monitor.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 saas-input">
              <Gauge size={14} style={{ color: 'var(--accent-teal)' }} />
              <input
                type="number"
                min="0"
                max="500"
                step="0.5"
                value={sensorPm25}
                onChange={(e) => setSensorPm25(e.target.value)}
                placeholder="Enter home sensor PM2.5 (µg/m³)"
                className="text-xs bg-transparent outline-none w-52"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
            {hasSensorConnected && (
              <button
                onClick={() => setSensorPm25('')}
                className="px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl" style={{ background: airQuality.isLive ? outdoorCat.bg : 'var(--bg-subtle)' }}>
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: airQuality.isLive ? outdoorCat.color : 'var(--text-muted)' }}>
              Outdoor Ambient ({airQuality.isLive ? 'Live API' : 'Unavailable'})
            </div>
            <div className="text-3xl font-black mt-1" style={{ color: airQuality.isLive ? outdoorCat.color : 'var(--text-muted)' }}>
              {outdoorAqi ?? 'N/A'}
            </div>
            <div className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
              {airQuality.isLive ? `${outdoorCat.label} · PM2.5 ${airQuality.pm25} µg/m³` : 'Outdoor feed offline'}
            </div>
          </div>

          <div
            className="p-4 rounded-2xl"
            style={{
              background: hasSensorConnected ? indoorCat.bg : 'var(--bg-subtle)',
              border: `1px solid ${hasSensorConnected ? `${indoorCat.color}30` : 'var(--border-subtle)'}`,
            }}
          >
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: hasSensorConnected ? indoorCat.color : 'var(--text-muted)' }}>
              Indoor Reading ({hasSensorConnected ? 'Entered Sensor Data' : 'Unavailable'})
            </div>
            <div className="text-3xl font-black mt-1" style={{ color: hasSensorConnected ? indoorCat.color : 'var(--text-faint)' }}>
              {hasSensorConnected ? measuredIndoorAqi : 'Unavailable'}
            </div>
            <div className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {hasSensorConnected
                ? `${indoorCat.label} · ${sensorPm25} µg/m³ measured indoors`
                : 'No indoor PM2.5 sensor connected'}
            </div>
          </div>

          <div className="p-4 rounded-2xl space-y-1.5" style={{ background: 'var(--bg-subtle)' }}>
            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--accent-teal)' }}>
              <Droplets size={14} /> Target Indoor Humidity
            </div>
            <div className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>40% – 55% RH</div>
            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Outdoor RH is {airQuality.humidity ?? 'N/A'}%. Above 60% indoors encourages mold & dust mites; below 30% irritates airways.
            </div>
          </div>
        </div>

        {/* Section Pills */}
        <div className="flex gap-2 overflow-x-auto pt-1">
          {[
            { id: 'ventilation', label: 'Ventilation Schedule', Icon: Wind },
            { id: 'checklist', label: 'Daily Indoor Checklist', Icon: CheckCircle2 },
            { id: 'room', label: 'Room Prevention & Dust', Icon: Home },
            { id: 'purifiers', label: 'Air Purifiers & CADR', Icon: Fan },
            { id: 'plants', label: 'Plants & Science', Icon: Sprout },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-all"
              style={
                activeSection === id
                  ? { background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: '#fff' }
                  : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }
              }
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {activeSection === 'ventilation' && (
        <div className="surface-card p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                Ventilation Reminders & Schedule — {airQuality.location.split(',')[0]}
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Derived from current outdoor AQI ({outdoorAqi ?? 'N/A'}) and wind speed ({airQuality.windSpeed ?? 'N/A'} km/h).
              </p>
            </div>
          </div>
          <div className="space-y-2.5">
            {schedule.map((slot, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl" style={{ background: `${slot.color}12`, border: `1px solid ${slot.color}30` }}>
                <div className="flex items-center gap-2 w-36 flex-shrink-0">
                  {slot.status === 'open' ? <Unlock size={15} style={{ color: slot.color }} /> : slot.status === 'closed' ? <Lock size={15} style={{ color: slot.color }} /> : <AlertTriangle size={15} style={{ color: slot.color }} />}
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{slot.time}</span>
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold" style={{ color: slot.color }}>{slot.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{slot.reason}</div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full self-start sm:self-auto" style={{ background: `${slot.color}22`, color: slot.color }}>
                  {slot.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'checklist' && (
        <div className="surface-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Daily Indoor Environment Improvement Checklist
            </h3>
            <span className="text-xs font-bold" style={{ color: 'var(--accent-teal)' }}>
              {checklist.filter((c) => c.done).length}/{checklist.length} completed
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {checklist.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                className="p-3.5 rounded-xl flex items-center justify-between gap-3 text-left"
                style={{
                  background: item.done ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-subtle)',
                  border: `1px solid ${item.done ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-subtle)'}`,
                }}
              >
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{item.task}</span>
                <CheckCircle2 size={17} className="flex-shrink-0" style={{ color: item.done ? '#10b981' : 'var(--text-faint)' }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'room' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {indoorTips.map((room) => (
            <div key={room.id} className="surface-card p-5 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-sm" style={{ color: room.color }}>
                <Home size={16} /> <span>{room.room}</span>
              </div>
              {room.tips.map((tip, i) => (
                <div key={i} className="flex gap-2 text-xs leading-relaxed">
                  <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span style={{ color: 'var(--text-secondary)' }}>{tip}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {activeSection === 'purifiers' && (
        <div className="surface-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>HEPA Purifier Sizing & CADR Guide</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Avoid ionizers/ozone purifiers; use True HEPA H13 + activated carbon.</p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {ROOM_SIZES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRoomSizeId(r.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={roomSizeId === r.id ? { background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: '#fff' } : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                >
                  {r.label.split(' (')[0]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
              <div style={{ color: 'var(--text-muted)' }}>Room Dimensions</div>
              <div className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{selectedRoom.label}</div>
            </div>
            <div className="p-3.5 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
              <div style={{ color: 'var(--text-muted)' }}>Required CADR (4–5 ACH)</div>
              <div className="font-bold mt-0.5" style={{ color: 'var(--accent-teal)' }}>{selectedRoom.cadr}</div>
            </div>
            <div className="p-3.5 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
              <div style={{ color: 'var(--text-muted)' }}>Recommended Filter</div>
              <div className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{selectedRoom.diy}</div>
            </div>
          </div>
          <div className="p-3.5 rounded-xl flex items-start gap-2 text-xs" style={{ background: 'rgba(13, 148, 136, 0.08)', color: 'var(--text-secondary)' }}>
            <ShieldAlert size={15} className="text-teal-500 flex-shrink-0 mt-0.5" />
            <span>Keep bedroom doors and windows shut while running a purifier for 30+ minutes before sleep to reduce overnight PM2.5 exposure.</span>
          </div>
        </div>
      )}

      {activeSection === 'plants' && (
        <div className="surface-card p-5 space-y-3">
          <div className="flex items-start gap-2 text-xs p-3 rounded-xl" style={{ background: 'rgba(6, 182, 212, 0.09)', color: 'var(--text-secondary)' }}>
            <Info size={15} className="text-cyan-500 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Evidence Note:</strong> NASA-inspired studies showed houseplants absorb trace VOCs in sealed chambers, but at room scale they do <strong>not</strong> replace HEPA filtration for PM2.5 smog. Use plants alongside source control & HEPA filtration.
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {[
              { name: 'Snake Plant', note: 'Low-light hardy, minimal watering' },
              { name: 'Spider Plant', note: 'Pet-safe & easy to maintain' },
              { name: 'Peace Lily', note: 'Humidity tolerant (keep from pets)' },
              { name: 'Pothos', note: 'Grows well in indirect apartment light' },
            ].map((pl) => (
              <div key={pl.name} className="p-3.5 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                <div className="font-bold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  <Sprout size={14} className="text-emerald-500" /> {pl.name}
                </div>
                <div className="mt-1" style={{ color: 'var(--text-muted)' }}>{pl.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
