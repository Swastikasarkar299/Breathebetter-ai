import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, CartesianGrid,
} from 'recharts';
import {
  Car, Fuel, Leaf, CheckCircle2, Plus, Info, TrainFront, Bike, Bus,
} from 'lucide-react';
import { ecoImpactData } from '../data/mockData';

const DEFAULT_ACTIONS = [
  { id: 1, action: 'Used metro / public transit instead of private car', days: 4, co2: 7.4, trips: 4, done: true },
  { id: 2, action: 'Avoided all open leaf or garden waste burning', days: 7, co2: 4.5, trips: 0, done: true },
  { id: 3, action: 'Combined multiple errands into a single trip', days: 2, co2: 2.1, trips: 2, done: true },
  { id: 4, action: 'Walked or cycled for short neighborhood trips (<3 km)', days: 3, co2: 2.2, trips: 3, done: true },
  { id: 5, action: 'Chose low-emission plant-forward meals', days: 5, co2: 2.9, trips: 0, done: true },
  { id: 6, action: 'Carpooled for work or campus commute', days: 1, co2: 1.8, trips: 1, done: false },
];

// Emission factors in kg CO2 per passenger-km (standard DEFRA / EPA estimates)
const COMMUTE_MODES = [
  { id: 'car', label: 'Solo Petrol Car', kgPerKm: 0.192, Icon: Car, color: '#ef4444' },
  { id: 'bike', label: 'Two-Wheeler', kgPerKm: 0.084, Icon: Bike, color: '#f59e0b' },
  { id: 'bus', label: 'Public Bus', kgPerKm: 0.052, Icon: Bus, color: '#0ea5e9' },
  { id: 'metro', label: 'Metro / Electric Rail', kgPerKm: 0.028, Icon: TrainFront, color: '#0d9488' },
  { id: 'walk', label: 'Walk / Bicycle', kgPerKm: 0.0, Icon: Leaf, color: '#10b981' },
];

const EcoScoreRing = ({ score }) => {
  const circumference = 2 * Math.PI * 52;
  const dash = (Math.min(100, score) / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#0d9488' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg width="144" height="144" className="-rotate-90">
        <circle cx="72" cy="72" r="52" fill="none" stroke="var(--border-subtle)" strokeWidth="11" />
        <circle
          cx="72"
          cy="72"
          r="52"
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-black" style={{ color }}>{score}</div>
        <div className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Eco Score</div>
      </div>
    </div>
  );
};

const ChartTooltip = ({ active, payload, label }) => {
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
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

export default function EcoImpact({ onScoreChange }) {
  const [activeMetric, setActiveMetric] = useState('score');
  const [commuteKm, setCommuteKm] = useState(14);
  const [actions, setActions] = useState(() => {
    try {
      const saved = localStorage.getItem('bb_eco_actions');
      return saved ? JSON.parse(saved) : DEFAULT_ACTIONS;
    } catch {
      return DEFAULT_ACTIONS;
    }
  });
  const [extraTrips, setExtraTrips] = useState(() => {
    try {
      return Number(localStorage.getItem('bb_extra_trips') || 4);
    } catch {
      return 4;
    }
  });
  const [newActionText, setNewActionText] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('bb_eco_actions', JSON.stringify(actions));
    } catch {
      // ignore
    }
  }, [actions]);

  useEffect(() => {
    try {
      localStorage.setItem('bb_extra_trips', String(extraTrips));
    } catch {
      // ignore
    }
  }, [extraTrips]);

  const completed = actions.filter((a) => a.done);
  const tripsAvoided = extraTrips + completed.reduce((sum, a) => sum + (a.trips || 0), 0);
  const fuelSaved = Number((tripsAvoided * 8 * 0.07).toFixed(1));
  const co2Avoided = Number(
    (fuelSaved * 2.33 + completed.reduce((s, a) => s + (a.trips ? 0 : a.co2), 0)).toFixed(1)
  );
  const actionsCompleted = completed.reduce((sum, a) => sum + a.days, 0);
  const ecoScore = Math.min(
    100,
    Math.round(35 + (completed.length / Math.max(1, actions.length)) * 45 + Math.min(20, tripsAvoided * 1.2))
  );

  useEffect(() => {
    if (onScoreChange) onScoreChange(ecoScore);
  }, [ecoScore, onScoreChange]);

  const weeklyProgress = ecoImpactData.weeklyProgress.map((d, idx) =>
    idx === ecoImpactData.weeklyProgress.length - 1
      ? { ...d, score: ecoScore, co2: Number((co2Avoided / 6).toFixed(1)) }
      : d
  );

  const toggleAction = (id) => {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, done: !a.done } : a)));
  };

  const addCustomAction = (e) => {
    e.preventDefault();
    if (!newActionText.trim()) return;
    setActions((prev) => [
      {
        id: Date.now(),
        action: newActionText.trim(),
        days: 1,
        co2: 1.2,
        trips: 1,
        done: true,
      },
      ...prev,
    ]);
    setNewActionText('');
  };

  const carDailyCo2 = Number((commuteKm * 0.192).toFixed(2));
  const metroDailyCo2 = Number((commuteKm * 0.028).toFixed(2));
  const annualTransitSavingsKg = Math.round((carDailyCo2 - metroDailyCo2) * 240);

  return (
    <div className="space-y-5">
      {/* Header & Methodology Notice */}
      <div className="surface-card p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Personal Pollution & Carbon Impact Tracker
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Track low-emission habits and compare daily transit carbon footprints.
            </p>
          </div>
          <button
            onClick={() => setExtraTrips((t) => t + 1)}
            className="btn-brand px-4 py-2 text-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus size={14} /> Log Avoided Car Trip
          </button>
        </div>

        <div
          className="p-3 rounded-xl flex items-start gap-2 text-xs"
          style={{ background: 'rgba(14, 165, 233, 0.08)', color: 'var(--text-secondary)' }}
        >
          <Info size={15} className="text-sky-500 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Estimated Values Methodology:</strong> Fuel saved = trips avoided × 8 km avg trip × 0.07 L/km. CO₂ avoided = fuel saved × 2.33 kg CO₂/L + logged non-transport eco actions.
          </span>
        </div>
      </div>

      {/* Big Impact Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Car Trips Avoided', val: tripsAvoided, unit: 'trips', sub: 'Estimated weekly', Icon: Car, color: '#ef4444' },
          { label: 'Fuel Conserved', val: fuelSaved, unit: 'L', sub: 'Estimated petrol eq.', Icon: Fuel, color: '#f59e0b' },
          { label: 'CO₂ Emissions Avoided', val: co2Avoided, unit: 'kg', sub: 'Estimated reduction', Icon: Leaf, color: '#10b981' },
          { label: 'Clean-Air Action Days', val: actionsCompleted, unit: 'days', sub: 'Saved locally', Icon: CheckCircle2, color: '#0d9488' },
        ].map(({ label, val, unit, sub, Icon, color }) => (
          <div key={label} className="surface-card p-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</div>
              <div className="text-2xl font-black mt-1" style={{ color }}>
                {val} <span className="text-xs font-semibold" style={{ color: 'var(--text-faint)' }}>{unit}</span>
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-faint)' }}>{sub}</div>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, color }}>
              <Icon size={17} />
            </div>
          </div>
        ))}
      </div>

      {/* Commute Carbon Footprint Comparison Calculator */}
      <div className="surface-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Personal Commute Footprint Comparison
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Switching a {commuteKm} km/day solo car commute to Metro/Rail avoids ~<strong>{annualTransitSavingsKg} kg CO₂/year</strong>.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Daily distance: <strong>{commuteKm} km</strong>
            </label>
            <input
              type="range"
              min="2"
              max="50"
              value={commuteKm}
              onChange={(e) => setCommuteKm(Number(e.target.value))}
              className="accent-teal-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {COMMUTE_MODES.map(({ id, label, kgPerKm, Icon, color }) => {
            const dailyKg = (commuteKm * kgPerKm).toFixed(2);
            const pct = Math.min(100, Math.round((kgPerKm / 0.192) * 100));
            return (
              <div key={id} className="p-3.5 rounded-xl space-y-2" style={{ background: 'var(--bg-subtle)' }}>
                <div className="flex items-center gap-2">
                  <Icon size={15} style={{ color }} />
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{label}</span>
                </div>
                <div className="text-lg font-extrabold" style={{ color }}>
                  {dailyKg} <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>kg CO₂/day</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-solid)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.max(4, pct)}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Eco Score + Progress Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 surface-card p-5 flex flex-col items-center justify-between">
          <div className="w-full text-left mb-2">
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Weekly Eco Score</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Updates live as actions are completed</p>
          </div>
          <EcoScoreRing score={ecoScore} />
          <div className="grid grid-cols-3 gap-2 w-full mt-4 text-center text-xs">
            <div className="p-2 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
              <div className="font-bold" style={{ color: 'var(--accent-teal)' }}>
                {Math.round((completed.length / actions.length) * 100)}%
              </div>
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Completion</div>
            </div>
            <div className="p-2 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
              <div className="font-bold text-emerald-500">
                {completed.length}/{actions.length}
              </div>
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Habits</div>
            </div>
            <div className="p-2 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
              <div className="font-bold text-sky-500">{tripsAvoided}</div>
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Trips Saved</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 surface-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Environmental Progress</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Weekly eco score & estimated CO₂ reduction</p>
            </div>
            <div className="flex gap-2">
              {[
                { id: 'score', label: 'Eco Score' },
                { id: 'co2', label: 'CO₂ Avoided' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveMetric(m.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={
                    activeMetric === m.id
                      ? { background: 'linear-gradient(135deg, #0d9488, #0ea5e9)', color: '#fff' }
                      : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }
                  }
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {activeMetric === 'score' ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weeklyProgress} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="ecoScoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} domain={[30, 100]} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="score" name="Eco Score" stroke="#10b981" strokeWidth={2.5} fill="url(#ecoScoreGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyProgress} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="co2" name="CO₂ Avoided (kg)" radius={[6, 6, 0, 0]}>
                  {weeklyProgress.map((_, i) => (
                    <Cell key={i} fill={i === weeklyProgress.length - 1 ? '#0d9488' : 'rgba(16, 185, 129, 0.55)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Interactive Checklist */}
      <div className="surface-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            Low-Emission Action Checklist
          </h3>
          <form onSubmit={addCustomAction} className="flex gap-2">
            <input
              type="text"
              value={newActionText}
              onChange={(e) => setNewActionText(e.target.value)}
              placeholder="Add a custom eco action..."
              className="px-3 py-1.5 text-xs saas-input w-52"
            />
            <button type="submit" className="btn-brand px-3.5 py-1.5 text-xs">
              Add
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {actions.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleAction(item.id)}
              className="flex items-center justify-between gap-3 p-3.5 rounded-xl text-left transition-all"
              style={{
                background: item.done ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-subtle)',
                border: `1px solid ${item.done ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-subtle)'}`,
              }}
            >
              <div>
                <div className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {item.action}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {item.days} day{item.days > 1 ? 's' : ''} · ~{item.co2} kg CO₂ est.
                </div>
              </div>
              <CheckCircle2
                size={18}
                className="flex-shrink-0"
                style={{ color: item.done ? '#10b981' : 'var(--text-faint)' }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
