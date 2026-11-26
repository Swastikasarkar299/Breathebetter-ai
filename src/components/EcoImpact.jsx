import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Car, Zap, Leaf, CheckCircle2, Plus, Info, Trash2 } from 'lucide-react';
import { ecoApi } from '../services/apiClient';
import ChartTooltip from './ui/ChartTooltip';

// Standard emission factors (DEFRA / EPA / CEA India average grid intensity)
const TRANSPORT_FACTORS = {
  car: { label: 'Private Car', petrol: 0.192, diesel: 0.171, hybrid: 0.115, ev: 0.058 },
  two_wheeler: { label: 'Two-Wheeler', petrol: 0.084, diesel: 0.078, hybrid: 0.06, ev: 0.022 },
  bus: { label: 'Public Bus', petrol: 0.052, diesel: 0.052, hybrid: 0.04, ev: 0.021 },
  metro: { label: 'Metro / Rail', petrol: 0.028, diesel: 0.028, hybrid: 0.028, ev: 0.024 },
  walk_cycle: { label: 'Walk / Bicycle', petrol: 0, diesel: 0, hybrid: 0, ev: 0 },
};

const ELECTRICITY_KG_PER_KWH = 0.71; // Typical regional grid emission factor

const DAILY_CHALLENGES = [
  { id: 'ch1', action: 'Replace 1 solo motorized trip with metro, bus, walk, or cycle', co2Kg: 2.4, tripsAvoided: 1 },
  { id: 'ch2', action: 'Switch off standby appliances & set AC to 25°C', co2Kg: 1.4, tripsAvoided: 0 },
  { id: 'ch3', action: 'Zero open waste/leaf burning in neighborhood today', co2Kg: 3.0, tripsAvoided: 0 },
];

export default function EcoImpact() {
  const [distanceKm, setDistanceKm] = useState(14);
  const [transportType, setTransportType] = useState('car');
  const [vehicleFuel, setVehicleFuel] = useState('petrol');
  const [dailyKwh, setDailyKwh] = useState(6);
  const [progressView, setProgressView] = useState('weekly'); // weekly | monthly
  const [logs, setLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('bb_eco_logs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [customAction, setCustomAction] = useState('');

  useEffect(() => {
    ecoApi
      .list()
      .then((res) => {
        if (Array.isArray(res?.logs)) {
          setLogs(res.logs);
          try { localStorage.setItem('bb_eco_logs', JSON.stringify(res.logs)); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const persistLogs = (next) => {
    setLogs(next);
    try { localStorage.setItem('bb_eco_logs', JSON.stringify(next)); } catch {}
  };

  // Calculations
  const factor = TRANSPORT_FACTORS[transportType]?.[vehicleFuel] ?? 0.192;
  const dailyTravelCo2 = Number((distanceKm * factor).toFixed(2));
  const dailyHomeCo2 = Number((dailyKwh * ELECTRICITY_KG_PER_KWH).toFixed(2));
  const totalDailyCo2 = Number((dailyTravelCo2 + dailyHomeCo2).toFixed(2));

  const metroDailyCo2 = Number((distanceKm * TRANSPORT_FACTORS.metro.ev).toFixed(2));
  const potentialDailySavings = Math.max(0, Number((dailyTravelCo2 - metroDailyCo2).toFixed(2)));
  const potentialMonthlySavings = Number((potentialDailySavings * 24).toFixed(1));

  const loggedCo2Saved = Number(logs.reduce((s, l) => s + (Number(l.co2Kg) || 0), 0).toFixed(1));
  const tripsAvoided = logs.reduce((s, l) => s + (Number(l.tripsAvoided) || 0), 0);

  // Sustainability Score (0-100) derived transparently from low-carbon transport + electricity + logged actions
  const transportScore = Math.max(10, Math.round(45 - factor * 180));
  const energyScore = Math.max(5, Math.round(25 - Math.min(20, dailyKwh * 1.1)));
  const actionBonus = Math.min(30, logs.length * 4);
  const sustainabilityScore = Math.min(100, transportScore + energyScore + actionBonus);

  const weeklySeries = [
    { label: 'Mon', co2: Number((totalDailyCo2 * 1.05).toFixed(1)), saved: Number((potentialDailySavings * 0.4).toFixed(1)) },
    { label: 'Tue', co2: Number((totalDailyCo2 * 0.98).toFixed(1)), saved: Number((potentialDailySavings * 0.6).toFixed(1)) },
    { label: 'Wed', co2: Number((totalDailyCo2 * 0.92).toFixed(1)), saved: Number((potentialDailySavings * 0.8).toFixed(1)) },
    { label: 'Thu', co2: totalDailyCo2, saved: Number((potentialDailySavings * 0.5).toFixed(1)) },
    { label: 'Fri', co2: Number((totalDailyCo2 * 0.88).toFixed(1)), saved: Number((potentialDailySavings + loggedCo2Saved * 0.15).toFixed(1)) },
    { label: 'Sat', co2: Number((dailyHomeCo2 + dailyTravelCo2 * 0.5).toFixed(1)), saved: Number((potentialDailySavings * 0.7).toFixed(1)) },
    { label: 'Sun', co2: Number((dailyHomeCo2 + dailyTravelCo2 * 0.4).toFixed(1)), saved: Number((loggedCo2Saved * 0.2).toFixed(1)) },
  ];

  const monthlySeries = [
    { label: 'Week 1', co2: Math.round(totalDailyCo2 * 7), saved: Math.round(potentialDailySavings * 3) },
    { label: 'Week 2', co2: Math.round(totalDailyCo2 * 6.7), saved: Math.round(potentialDailySavings * 4) },
    { label: 'Week 3', co2: Math.round(totalDailyCo2 * 6.4), saved: Math.round(potentialDailySavings * 5) },
    { label: 'Week 4', co2: Math.round(totalDailyCo2 * 6.1), saved: Math.round(potentialDailySavings * 5 + loggedCo2Saved) },
  ];

  const logEcoAction = async (entry) => {
    try {
      const res = await ecoApi.create({
        ...entry,
        distanceKm,
        transportMode: TRANSPORT_FACTORS[transportType].label,
      });
      if (res?.log) {
        persistLogs([res.log, ...logs]);
        return;
      }
    } catch {}
    persistLogs([{ id: `local-${Date.now()}`, ...entry, createdAt: new Date().toISOString() }, ...logs]);
  };

  const deleteLog = async (id) => {
    persistLogs(logs.filter((l) => l.id !== id));
    if (!String(id).startsWith('local-')) {
      ecoApi.remove(id).catch(() => {});
    }
  };

  return (
    <div className="space-y-5">
      {/* Interactive Carbon Footprint Calculator */}
      <div className="surface-card p-5 space-y-5">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Interactive Carbon Footprint & Savings Calculator
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Enter your commute distance, vehicle type, and daily electricity usage to estimate emissions and savings potential.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl space-y-2" style={{ background: 'var(--bg-subtle)' }}>
            <label className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>
              Daily Travel Distance: <strong>{distanceKm} km</strong>
            </label>
            <input
              type="range"
              min="0"
              max="80"
              value={distanceKm}
              onChange={(e) => setDistanceKm(Number(e.target.value))}
              className="w-full accent-teal-600"
            />
          </div>

          <div className="p-3.5 rounded-xl space-y-1.5" style={{ background: 'var(--bg-subtle)' }}>
            <label className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>Transport Type</label>
            <select
              value={transportType}
              onChange={(e) => setTransportType(e.target.value)}
              className="w-full px-3 py-1.5 text-xs saas-input"
            >
              {Object.entries(TRANSPORT_FACTORS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <div className="p-3.5 rounded-xl space-y-1.5" style={{ background: 'var(--bg-subtle)' }}>
            <label className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>Vehicle Powertrain</label>
            <select
              value={vehicleFuel}
              onChange={(e) => setVehicleFuel(e.target.value)}
              disabled={transportType === 'walk_cycle'}
              className="w-full px-3 py-1.5 text-xs saas-input disabled:opacity-50"
            >
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="hybrid">Hybrid</option>
              <option value="ev">Electric (EV)</option>
            </select>
          </div>

          <div className="p-3.5 rounded-xl space-y-2" style={{ background: 'var(--bg-subtle)' }}>
            <label className="text-xs font-semibold block" style={{ color: 'var(--text-secondary)' }}>
              Home Energy Usage: <strong>{dailyKwh} kWh/day</strong>
            </label>
            <input
              type="range"
              min="1"
              max="35"
              value={dailyKwh}
              onChange={(e) => setDailyKwh(Number(e.target.value))}
              className="w-full accent-teal-600"
            />
          </div>
        </div>

        {/* Calculated Results */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
            <div className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <Car size={14} /> Daily Footprint (Est.)
            </div>
            <div className="text-2xl font-black mt-1 text-amber-500">{totalDailyCo2} kg CO₂</div>
            <div className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
              Travel {dailyTravelCo2} kg + Home {dailyHomeCo2} kg
            </div>
          </div>

          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
            <div className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <Leaf size={14} /> Potential Monthly Savings
            </div>
            <div className="text-2xl font-black mt-1 text-emerald-500">{potentialMonthlySavings} kg</div>
            <div className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
              If switching commute to Electric Metro/Rail
            </div>
          </div>

          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
            <div className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <CheckCircle2 size={14} /> Logged CO₂ Avoided
            </div>
            <div className="text-2xl font-black mt-1" style={{ color: 'var(--accent-teal)' }}>
              {loggedCo2Saved} kg
            </div>
            <div className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
              {tripsAvoided} solo trips avoided
            </div>
          </div>

          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
            <div className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <Zap size={14} /> Sustainability Score
            </div>
            <div className="text-2xl font-black mt-1" style={{ color: 'var(--accent-cyan)' }}>
              {sustainabilityScore} / 100
            </div>
            <div className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
              Transport + energy + logged actions
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl flex items-start gap-2 text-xs" style={{ background: 'rgba(6, 182, 212, 0.08)', color: 'var(--text-secondary)' }}>
          <Info size={15} className="text-cyan-500 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Calculation Assumptions:</strong> Estimates use reference DEFRA/EPA passenger-km factors (e.g. Petrol Car ~0.192 kg CO₂/km, Two-Wheeler ~0.084 kg/km, Bus ~0.052 kg/km, Electric Metro ~0.024 kg/km) and average grid electricity intensity (~0.71 kg CO₂/kWh). All numbers are transparent estimates.
          </span>
        </div>
      </div>

      {/* Weekly & Monthly Progress Chart + Daily Eco Challenges */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 surface-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                {progressView === 'weekly' ? 'Weekly Footprint vs. Savings' : 'Monthly Emissions Trajectory'}
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Estimated CO₂ emitted vs. avoided (kg)</p>
            </div>
            <div className="flex gap-1.5">
              {['weekly', 'monthly'].map((v) => (
                <button
                  key={v}
                  onClick={() => setProgressView(v)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold capitalize"
                  style={progressView === v ? { background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: '#fff' } : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            {progressView === 'weekly' ? (
              <AreaChart data={weeklySeries} margin={{ top: 8, right: 10, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="co2" name="Est. Emitted (kg)" stroke="#f59e0b" fill="rgba(245,158,11,0.16)" strokeWidth={2} />
                <Area type="monotone" dataKey="saved" name="Est. Saved (kg)" stroke="#10b981" fill="rgba(16,185,129,0.22)" strokeWidth={2.5} />
              </AreaChart>
            ) : (
              <BarChart data={monthlySeries} margin={{ top: 8, right: 10, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="co2" name="Est. Emitted (kg)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="saved" name="Est. Saved (kg)" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Daily Eco Challenges & Logger */}
        <div className="lg:col-span-5 surface-card p-5 space-y-4">
          <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            Daily Eco Challenges & Action Log
          </h3>

          <div className="space-y-2">
            {DAILY_CHALLENGES.map((ch) => (
              <div key={ch.id} className="p-3 rounded-xl flex items-center justify-between gap-2" style={{ background: 'var(--bg-subtle)' }}>
                <div className="text-xs">
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{ch.action}</div>
                  <div style={{ color: 'var(--text-muted)' }}>Est. -{ch.co2Kg} kg CO₂</div>
                </div>
                <button
                  onClick={() => logEcoAction({ action: ch.action, co2Kg: ch.co2Kg, tripsAvoided: ch.tripsAvoided })}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold flex-shrink-0 btn-brand"
                >
                  Log
                </button>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!customAction.trim()) return;
              logEcoAction({ action: customAction.trim(), co2Kg: 1.5, tripsAvoided: 1 });
              setCustomAction('');
            }}
            className="flex gap-2"
          >
            <input
              value={customAction}
              onChange={(e) => setCustomAction(e.target.value)}
              placeholder="Log custom sustainable action..."
              className="flex-1 px-3 py-2 text-xs saas-input"
            />
            <button type="submit" className="btn-brand px-3 py-2 text-xs flex items-center gap-1">
              <Plus size={13} /> Save
            </button>
          </form>

          {logs.length > 0 && (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              {logs.map((l) => (
                <div key={l.id} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>
                  <span className="truncate pr-2" style={{ color: 'var(--text-secondary)' }}>{l.action}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-emerald-500">-{l.co2Kg} kg</span>
                    <button onClick={() => deleteLog(l.id)} className="text-red-500 hover:opacity-80" title="Remove">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
