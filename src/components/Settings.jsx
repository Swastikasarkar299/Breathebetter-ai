import React, { useState } from 'react';
import {
  User, Bell, Key, Shield, Sun, Moon, MapPin, BookOpen, CheckCircle2,
  Navigation, AlertCircle, Loader2,
} from 'lucide-react';
import { userProfiles, aqiCategories, POLLUTANT_META } from '../data/mockData';
import { testApiKeyConnection } from '../services/airQualityService';

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
              ? { background: 'linear-gradient(135deg, #0d9488, #0ea5e9)', color: '#ffffff' }
              : {
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }
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
  setUserProfile,
  preferences,
  setPreferences,
  theme,
  setTheme,
  apiKeys,
  setApiKeys,
  onRequestLocation,
}) {
  const [activeSection, setActiveSection] = useState('profile');
  const [draftProfile, setDraftProfile] = useState(userProfile);
  const [draftPrefs, setDraftPrefs] = useState(preferences);
  const [draftKeys, setDraftKeys] = useState(apiKeys);
  const [savedToast, setSavedToast] = useState(false);
  const [keyTests, setKeyTests] = useState({});

  const handleSaveAll = () => {
    setUserProfile(draftProfile);
    setPreferences(draftPrefs);
    setApiKeys(draftKeys);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const handleTestKey = async (provider) => {
    setKeyTests((prev) => ({ ...prev, [provider]: { testing: true } }));
    const res = await testApiKeyConnection(provider, draftKeys[provider]);
    setKeyTests((prev) => ({ ...prev, [provider]: { testing: false, ...res } }));
  };

  const sections = [
    { id: 'profile', label: 'User Profile', Icon: User },
    { id: 'appearance', label: 'Theme & Location', Icon: MapPin },
    { id: 'notifications', label: 'Alerts & Thresholds', Icon: Bell },
    { id: 'api', label: 'API Keys', Icon: Key },
    { id: 'aqi_info', label: 'AQI Measurement Info', Icon: BookOpen },
  ];

  return (
    <div className="space-y-5">
      {/* Section Tabs */}
      <div className="surface-card p-4 flex gap-2 overflow-x-auto">
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

      {/* 1. User Profile */}
      {activeSection === 'profile' && (
        <div className="surface-card p-5 space-y-5">
          <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            Personalization Profile
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Display Name</label>
              <input
                value={draftProfile.name}
                onChange={(e) => setDraftProfile({ ...draftProfile, name: e.target.value })}
                className="w-full mt-1 px-3.5 py-2.5 text-sm saas-input"
              />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Primary City</label>
              <input
                value={draftProfile.location}
                onChange={(e) => setDraftProfile({ ...draftProfile, location: e.target.value })}
                className="w-full mt-1 px-3.5 py-2.5 text-sm saas-input"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Health / Lifestyle Group</label>
            <SelectChip
              options={userProfiles.types}
              value={draftProfile.type}
              onChange={(val) => setDraftProfile({ ...draftProfile, type: val })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Primary Commute Mode</label>
            <SelectChip
              options={userProfiles.transport}
              value={draftProfile.transport}
              onChange={(val) => setDraftProfile({ ...draftProfile, transport: val })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Outdoor Activity Habit</label>
            <SelectChip
              options={userProfiles.outdoorActivity}
              value={draftProfile.outdoorActivity}
              onChange={(val) => setDraftProfile({ ...draftProfile, outdoorActivity: val })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Indoor Space</label>
            <SelectChip
              options={userProfiles.indoor}
              value={draftProfile.indoor}
              onChange={(val) => setDraftProfile({ ...draftProfile, indoor: val })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Clean-Air Budget</label>
            <SelectChip
              options={userProfiles.budget}
              value={draftProfile.budget}
              onChange={(val) => setDraftProfile({ ...draftProfile, budget: val })}
            />
          </div>
        </div>
      )}

      {/* 2. Theme & Location Preferences */}
      {activeSection === 'appearance' && (
        <div className="surface-card p-5 space-y-5">
          <div>
            <h3 className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>Appearance Mode</h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              Switch cleanly between light daylight mode and low-glare dark mode.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'light', label: 'Light Mode', desc: 'Clean daylight SaaS palette', Icon: Sun },
                { id: 'dark', label: 'Dark Mode', desc: 'Reduced-glare slate theme', Icon: Moon },
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
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: active ? '#0d9488' : 'var(--bg-surface-solid)', color: active ? '#fff' : 'var(--text-secondary)' }}
                    >
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

          <div className="pt-4 border-t space-y-4" style={{ borderColor: 'var(--border-subtle)' }}>
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Location & Units</h3>

            <div className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Temperature Unit</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Display weather in Celsius or Fahrenheit</div>
              </div>
              <div className="flex gap-1.5">
                {['C', 'F'].map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setDraftPrefs({ ...draftPrefs, tempUnit: u })}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold"
                    style={
                      draftPrefs.tempUnit === u
                        ? { background: '#0d9488', color: '#fff' }
                        : { background: 'var(--bg-surface-solid)', color: 'var(--text-secondary)' }
                    }
                  >
                    °{u}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Auto-Detect Location on Startup</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Request GPS coordinates automatically when opening BreatheBetter AI
                </div>
              </div>
              <ToggleSwitch
                checked={!!draftPrefs.autoDetectLocation}
                onChange={() =>
                  setDraftPrefs({ ...draftPrefs, autoDetectLocation: !draftPrefs.autoDetectLocation })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
              <div className="flex items-start gap-2.5">
                <Shield size={17} className="text-teal-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Detect Current City Now</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Uses browser Geolocation API with one-time consent
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onRequestLocation}
                className="btn-brand px-3.5 py-2 text-xs flex items-center gap-1.5"
              >
                <Navigation size={13} /> Locate Me
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Notifications & Custom AQI Threshold */}
      {activeSection === 'notifications' && (
        <div className="surface-card p-5 space-y-4">
          <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            Notifications & Custom AQI Thresholds
          </h3>

          {[
            {
              key: 'aqiAlerts',
              label: 'Poor Air Quality & Threshold Alerts',
              desc: 'Show prominent warning banner and bell alerts when local AQI crosses your threshold',
            },
            {
              key: 'weatherAlerts',
              label: 'Weather Stagnation & Ozone Notifications',
              desc: 'Warn when low wind, high humidity, or heat increases pollution trapping',
            },
            {
              key: 'dailyReport',
              label: 'Daily Air Quality Summary',
              desc: 'Highlight today’s cleanest outdoor window and expected peak hour in Alerts',
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-4 p-4 rounded-xl"
              style={{ background: 'var(--bg-subtle)' }}
            >
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.desc}</div>
              </div>
              <ToggleSwitch
                checked={draftPrefs[item.key] !== false}
                onChange={() =>
                  setDraftPrefs({ ...draftPrefs, [item.key]: !(draftPrefs[item.key] !== false) })
                }
              />
            </div>
          ))}

          <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-subtle)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Custom AQI Alert Threshold
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Trigger high-pollution warning whenever AQI reaches or exceeds this level
                </div>
              </div>
              <span className="text-lg font-black" style={{ color: 'var(--accent-teal)' }}>
                {draftPrefs.alertThreshold ?? 150} AQI
              </span>
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
              {[
                { val: 50, label: '50 (Sensitive)' },
                { val: 100, label: '100 (Moderate)' },
                { val: 150, label: '150 (Poor)' },
                { val: 200, label: '200 (Very Poor)' },
                { val: 300, label: '300 (Hazardous)' },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => setDraftPrefs({ ...draftPrefs, alertThreshold: preset.val })}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={
                    (draftPrefs.alertThreshold ?? 150) === preset.val
                      ? { background: '#0d9488', color: '#fff' }
                      : { background: 'var(--bg-surface-solid)', color: 'var(--text-secondary)' }
                  }
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. API Connections */}
      {activeSection === 'api' && (
        <div className="surface-card p-5 space-y-4">
          <div>
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Live Data & GenAI API Connections
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Open-Meteo Live AQI & Weather runs automatically with zero API key. Add optional keys below to enable Gemini/OpenAI chat or OpenWeatherMap station overlays. Keys stay in your browser localStorage.
            </p>
          </div>

          {[
            {
              key: 'openweather',
              label: 'OpenWeatherMap API Key (Optional)',
              desc: 'Optional secondary air pollution + weather data provider',
              placeholder: 'Paste OpenWeatherMap API key...',
              canTest: true,
            },
            {
              key: 'openai',
              label: 'Gemini or OpenAI Key (Optional)',
              desc: 'Paste a Gemini key (AIza...) or OpenAI key (sk-...) for generative chat answers',
              placeholder: 'Paste AIza... or sk-... API key',
              canTest: true,
            },
            {
              key: 'iqair',
              label: 'IQAir API Key (Optional)',
              desc: 'Stored locally for backend server proxy integration',
              placeholder: 'Paste IQAir key...',
              canTest: false,
            },
          ].map((item) => {
            const testState = keyTests[item.key];
            return (
              <div key={item.key} className="p-4 rounded-xl space-y-2.5" style={{ background: 'var(--bg-subtle)' }}>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={draftKeys[item.key] || ''}
                    onChange={(e) => setDraftKeys({ ...draftKeys, [item.key]: e.target.value })}
                    placeholder={item.placeholder}
                    className="flex-1 px-3 py-2 text-xs saas-input"
                  />
                  {item.canTest && (
                    <button
                      type="button"
                      onClick={() => handleTestKey(item.key)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1"
                      style={{ background: 'rgba(13, 148, 136, 0.14)', color: 'var(--accent-teal)' }}
                    >
                      {testState?.testing && <Loader2 size={12} className="animate-spin" />}
                      Test
                    </button>
                  )}
                </div>
                {testState && !testState.testing && (
                  <div
                    className="text-xs font-medium flex items-center gap-1.5"
                    style={{ color: testState.ok ? '#10b981' : '#f59e0b' }}
                  >
                    {testState.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                    <span>{testState.message}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. AQI Measurement Information */}
      {activeSection === 'aqi_info' && (
        <div className="space-y-4">
          <div className="surface-card p-5 space-y-3">
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              US AQI Scale & Health Categories (0–500)
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              BreatheBetter AI fetches US AQI and mass pollutant concentrations from the Open-Meteo Air Quality Copernicus/CAMS global feed.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {aqiCategories.map((c) => (
                <div
                  key={c.label}
                  className="p-3.5 rounded-xl space-y-1"
                  style={{ background: c.bg, border: `1px solid ${c.color}30` }}
                >
                  <div className="flex items-center justify-between text-xs font-bold" style={{ color: c.color }}>
                    <span>{c.label}</span>
                    <span>{c.range[0]}–{c.range[1]}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {c.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card p-5 space-y-3">
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Pollutant Reference & WHO 2021 Guidelines
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.values(POLLUTANT_META).map((m) => (
                <div key={m.name} className="p-3.5 rounded-xl space-y-1" style={{ background: 'var(--bg-subtle)' }}>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span style={{ color: 'var(--text-primary)' }}>{m.name} · {m.fullName}</span>
                    <span style={{ color: 'var(--accent-teal)' }}>WHO ≤ {m.whoLimit} {m.unit}</span>
                  </div>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{m.simpleExplain}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save Footer Bar */}
      {activeSection !== 'aqi_info' && (
        <div className="flex items-center justify-end gap-3">
          {savedToast && (
            <div className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Preferences saved!
            </div>
          )}
          <button type="button" onClick={handleSaveAll} className="btn-brand px-6 py-2.5 text-xs">
            Save Preferences
          </button>
        </div>
      )}
    </div>
  );
}
