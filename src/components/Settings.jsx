import React, { useState, useEffect } from 'react';
import {
  User, Bell, Shield, Sun, Moon, MapPin, BookOpen, CheckCircle2,
  Navigation, Trash2, Database, LogIn, LogOut,
} from 'lucide-react';
import { userProfiles, aqiCategories, POLLUTANT_META } from '../data/mockData';
import { analyticsApi } from '../services/apiClient';

const ToggleSwitch = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
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

const SelectChip = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-2 mt-2">
    {options.map((opt) => {
      const selected = value === opt;
      return (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
          style={
            selected
              ? { background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: '#ffffff' }
              : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
          }
        >
          {opt}
        </button>
      );
    })}
  </div>
);

export default function Settings({
  userProfile,
  preferences,
  onSaveAll,
  theme,
  setTheme,
  onRequestLocation,
  authUser,
  savedLocations = [],
  onSelectCity,
  onRemoveLocation,
  onOpenAuth,
  onLogout,
  airQuality,
}) {
  const [activeSection, setActiveSection] = useState('appearance');
  const [draftProfile, setDraftProfile] = useState(userProfile);
  const [draftPrefs, setDraftPrefs] = useState(preferences);
  const [savedToast, setSavedToast] = useState(false);
  const [serverHealth, setServerHealth] = useState(null);

  useEffect(() => {
    analyticsApi.health().then(setServerHealth).catch(() => setServerHealth(null));
  }, []);

  const handleSave = async () => {
    await onSaveAll(draftProfile, draftPrefs);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const clearLocalCache = () => {
    ['bb_chat_history', 'bb_planner_activities', 'bb_eco_logs', 'bb_indoor_checklist', 'bb_read_dyn_alerts'].forEach((k) => {
      try { localStorage.removeItem(k); } catch {}
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const sections = [
    { id: 'appearance', label: 'Theme & Location', Icon: MapPin },
    { id: 'profile', label: 'User Profile', Icon: User },
    { id: 'notifications', label: 'Notifications', Icon: Bell },
    { id: 'account', label: 'Account & Privacy', Icon: Shield },
    { id: 'about', label: 'Sources & AQI Info', Icon: BookOpen },
  ];

  return (
    <div className="space-y-5">
      <div className="surface-card p-4 flex gap-2 overflow-x-auto">
        {sections.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-all"
            style={
              activeSection === id
                ? { background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: '#ffffff' }
                : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }
            }
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* 1. Theme, Location, Units, Language, AQI Standard */}
      {activeSection === 'appearance' && (
        <div className="surface-card p-5 space-y-5">
          <div>
            <h3 className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>Display Theme</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {[
                { id: 'light', label: 'Light Mode', desc: 'Clean daylight workspace', Icon: Sun },
                { id: 'dark', label: 'Dark Mode', desc: 'Low-glare navy slate palette', Icon: Moon },
              ].map(({ id, label, desc, Icon }) => {
                const active = theme === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTheme(id)}
                    className="p-4 rounded-xl text-left flex items-center gap-3 transition-all"
                    style={{
                      background: active ? 'rgba(13, 148, 136, 0.12)' : 'var(--bg-subtle)',
                      border: `1.5px solid ${active ? 'var(--accent-teal)' : 'var(--border-subtle)'}`,
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: active ? '#0d9488' : 'var(--bg-surface-solid)', color: active ? '#fff' : 'var(--text-secondary)' }}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{label}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="p-3.5 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
              <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>Preferred AQI Standard</label>
              <select
                value={draftPrefs.aqiStandard || 'US_EPA'}
                onChange={(e) => setDraftPrefs({ ...draftPrefs, aqiStandard: e.target.value })}
                className="w-full px-3 py-2 text-xs saas-input"
              >
                <option value="US_EPA">US EPA AQI (0–500)</option>
                <option value="INDIA_NAQI">India NAQI Reference</option>
                <option value="EU_EAQI">European Air Quality Index</option>
              </select>
            </div>

            <div className="p-3.5 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
              <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>Temperature Unit</label>
              <div className="flex gap-2">
                {['C', 'F'].map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setDraftPrefs({ ...draftPrefs, tempUnit: u })}
                    className="flex-1 py-2 rounded-lg text-xs font-bold"
                    style={draftPrefs.tempUnit === u ? { background: '#0d9488', color: '#fff' } : { background: 'var(--bg-surface-solid)', color: 'var(--text-secondary)' }}
                  >
                    °{u}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
              <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>Language</label>
              <select
                value={draftPrefs.language || 'en'}
                onChange={(e) => setDraftPrefs({ ...draftPrefs, language: e.target.value })}
                className="w-full px-3 py-2 text-xs saas-input"
              >
                <option value="en">English (Global)</option>
                <option value="en-IN">English (India Regional)</option>
                <option value="hi">Hindi Labels Preview</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Auto-Detect Location on Load</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Automatically use device GPS coordinates at startup</div>
            </div>
            <ToggleSwitch
              checked={Boolean(draftPrefs.autoDetectLocation)}
              onChange={() => setDraftPrefs({ ...draftPrefs, autoDetectLocation: !draftPrefs.autoDetectLocation })}
            />
          </div>

          {/* Saved Locations */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Saved Locations</h4>
              <button type="button" onClick={onRequestLocation} className="btn-brand px-3 py-1.5 text-xs flex items-center gap-1">
                <Navigation size={12} /> Detect Current Location
              </button>
            </div>
            {savedLocations.length === 0 ? (
              <div className="p-4 rounded-xl text-xs" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                No bookmarked locations yet. Click the bookmark icon on the Dashboard to save cities here.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {savedLocations.map((loc) => (
                  <div key={loc.id || loc.cityName} className="p-3 rounded-xl flex items-center justify-between text-xs" style={{ background: 'var(--bg-subtle)' }}>
                    <button onClick={() => onSelectCity(loc.cityName)} className="font-semibold hover:underline truncate" style={{ color: 'var(--text-primary)' }}>
                      {loc.cityName}
                    </button>
                    <button onClick={() => onRemoveLocation(loc.id)} className="text-red-500 p-1" title="Remove saved location">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Profile */}
      {activeSection === 'profile' && (
        <div className="surface-card p-5 space-y-4">
          <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Health & Lifestyle Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Display Name</label>
              <input value={draftProfile.name || ''} onChange={(e) => setDraftProfile({ ...draftProfile, name: e.target.value })} className="w-full mt-1 px-3.5 py-2 text-sm saas-input" />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Default City</label>
              <input value={draftProfile.location || ''} onChange={(e) => setDraftProfile({ ...draftProfile, location: e.target.value })} className="w-full mt-1 px-3.5 py-2 text-sm saas-input" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Health Group</label>
            <SelectChip options={userProfiles.types} value={draftProfile.type} onChange={(v) => setDraftProfile({ ...draftProfile, type: v })} />
          </div>
          <div>
            <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Commute Mode</label>
            <SelectChip options={userProfiles.transport} value={draftProfile.transport} onChange={(v) => setDraftProfile({ ...draftProfile, transport: v })} />
          </div>
          <div>
            <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Outdoor Activity</label>
            <SelectChip options={userProfiles.outdoorActivity} value={draftProfile.outdoorActivity} onChange={(v) => setDraftProfile({ ...draftProfile, outdoorActivity: v })} />
          </div>
          <div>
            <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Budget</label>
            <SelectChip options={userProfiles.budget} value={draftProfile.budget} onChange={(v) => setDraftProfile({ ...draftProfile, budget: v })} />
          </div>
        </div>
      )}

      {/* 3. Notifications */}
      {activeSection === 'notifications' && (
        <div className="surface-card p-5 space-y-4">
          <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Notification Preferences & AQI Thresholds</h3>
          {[
            { key: 'aqiAlerts', label: 'Poor & Very High AQI Alerts', desc: 'Alert immediately when AQI exceeds your custom threshold' },
            { key: 'weatherAlerts', label: 'Weather Dispersion Warnings', desc: 'Alert during stagnant low-wind inversion or ozone heat conditions' },
            { key: 'dailyReport', label: 'Daily Air Quality Summary', desc: 'Daily forecast highlight with cleanest outdoor exercise hour' },
            { key: 'plannerReminders', label: 'Planner & Ventilation Reminders', desc: 'Activity safety notifications linked to daily schedule' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-4 p-3.5 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</div>
              </div>
              <ToggleSwitch
                checked={draftPrefs[item.key] !== false}
                onChange={() => setDraftPrefs({ ...draftPrefs, [item.key]: !(draftPrefs[item.key] !== false) })}
              />
            </div>
          ))}

          <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-subtle)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Custom AQI Alert Threshold</span>
              <span className="text-lg font-black" style={{ color: 'var(--accent-teal)' }}>{draftPrefs.alertThreshold ?? 150} AQI</span>
            </div>
            <input
              type="range"
              min="50"
              max="350"
              step="10"
              value={draftPrefs.alertThreshold ?? 150}
              onChange={(e) => setDraftPrefs({ ...draftPrefs, alertThreshold: Number(e.target.value) })}
              className="w-full accent-teal-600"
            />
            <div className="flex flex-wrap gap-2">
              {[50, 100, 150, 200, 300].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDraftPrefs({ ...draftPrefs, alertThreshold: v })}
                  className="px-3 py-1 rounded-lg text-xs font-semibold"
                  style={(draftPrefs.alertThreshold ?? 150) === v ? { background: '#0d9488', color: '#fff' } : { background: 'var(--bg-surface-solid)', color: 'var(--text-secondary)' }}
                >
                  {v} AQI
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Account & Privacy */}
      {activeSection === 'account' && (
        <div className="surface-card p-5 space-y-4">
          <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Account & Privacy Management</h3>

          {authUser ? (
            <div className="p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ background: 'var(--bg-subtle)' }}>
              <div>
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{authUser.name}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{authUser.email} · Authenticated Session Active</div>
              </div>
              <button type="button" onClick={onLogout} className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500/12 text-red-500 flex items-center gap-1.5 self-start sm:self-auto">
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ background: 'var(--bg-subtle)' }}>
              <div>
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Guest Workspace Mode</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Sign in or create an account to sync saved locations, planner tasks, and posts across sessions.</div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => onOpenAuth('login')} className="btn-brand px-4 py-2 text-xs flex items-center gap-1.5">
                  <LogIn size={13} /> Sign In
                </button>
                <button type="button" onClick={() => onOpenAuth('register')} className="px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: 'var(--bg-surface-solid)', color: 'var(--accent-teal)' }}>
                  Register
                </button>
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl flex items-center justify-between gap-3" style={{ background: 'var(--bg-subtle)' }}>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Clear Browser Cache</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Reset local chat history, checklist cache, and dismissed alert state</div>
            </div>
            <button type="button" onClick={clearLocalCache} className="px-3.5 py-2 rounded-xl text-xs font-semibold" style={{ background: 'var(--bg-surface-solid)', color: 'var(--text-secondary)' }}>
              Clear Cache
            </button>
          </div>
        </div>
      )}

      {/* 5. Data Sources & About */}
      {activeSection === 'about' && (
        <div className="space-y-4">
          <div className="surface-card p-5 space-y-3">
            <h3 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Database size={16} style={{ color: 'var(--accent-teal)' }} /> Connected APIs & Data Architecture
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Active city telemetry: <strong>{airQuality?.dataSource || 'Open-Meteo'}</strong> · All external API keys are managed securely on the server and never exposed in client JavaScript.
            </p>
            {serverHealth ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  { label: 'Backend Runtime', val: serverHealth.runtime },
                  { label: 'Database', val: serverHealth.database },
                  { label: 'Open-Meteo Live', val: 'Active (Keyless)' },
                  { label: 'Server AI LLM', val: serverHealth.providers?.geminiConfigured ? 'Gemini Ready' : serverHealth.providers?.openaiConfigured ? 'OpenAI Ready' : 'Context Engine' },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                    <div style={{ color: 'var(--text-muted)' }}>{item.label}</div>
                    <div className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{item.val}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                Backend API server status unavailable (running direct keyless Open-Meteo browser mode).
              </div>
            )}
          </div>

          <div className="surface-card p-5 space-y-3">
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>AQI Measurement & WHO 2021 Reference</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {aqiCategories.map((c) => (
                <div key={c.label} className="p-3 rounded-xl text-xs" style={{ background: c.bg, border: `1px solid ${c.color}30` }}>
                  <div className="font-bold flex justify-between" style={{ color: c.color }}>
                    <span>{c.label}</span>
                    <span>{c.range[0]}–{c.range[1]}</span>
                  </div>
                  <div className="mt-1" style={{ color: 'var(--text-secondary)' }}>{c.description}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
              {Object.values(POLLUTANT_META).map((m) => (
                <div key={m.name} className="p-2.5 rounded-xl text-[11px]" style={{ background: 'var(--bg-subtle)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{m.name}:</strong> WHO ≤ {m.whoLimit} {m.unit}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSection !== 'about' && (
        <div className="flex items-center justify-end gap-3">
          {savedToast && (
            <div className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Preferences saved!
            </div>
          )}
          <button type="button" onClick={handleSave} className="btn-brand px-6 py-2.5 text-xs">
            Save Preferences
          </button>
        </div>
      )}
    </div>
  );
}
