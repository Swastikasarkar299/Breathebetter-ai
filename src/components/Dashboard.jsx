import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import {
  MapPin, Clock, RefreshCw, Navigation, Search, Thermometer, Droplets,
  Wind, CloudSun, AlertCircle, CheckCircle2, Sparkles, ShieldCheck, Activity,
  ArrowRight, Sun, Flame, Factory, Info,
} from 'lucide-react';
import {
  getAqiCategory, popularCities, POLLUTANT_META, analyzeHourlyWindows,
} from '../data/mockData';
import { searchCities } from '../services/airQualityService';
import AQIGauge from './AQIGauge';

function getPollutantStatus(key, value) {
  const meta = POLLUTANT_META[key];
  if (!meta) return { label: 'Normal', color: '#10b981', pct: 25 };
  const val = Number(value) || 0;
  const pct = Math.min(100, Math.max(6, Math.round((val / (meta.highThreshold * 1.4)) * 100)));
  if (val <= meta.whoLimit) return { label: 'Within WHO', color: '#10b981', pct };
  if (val <= meta.whoLimit * 2.2) return { label: 'Elevated', color: '#f59e0b', pct };
  if (val <= meta.highThreshold) return { label: 'High', color: '#f97316', pct };
  return { label: 'Very High', color: '#ef4444', pct };
}

const PollutantCard = ({ metricKey, value, Icon, onInspect, isSelected }) => {
  const meta = POLLUTANT_META[metricKey];
  const status = getPollutantStatus(metricKey, value);

  return (
    <button
      onClick={() => onInspect(isSelected ? null : metricKey)}
      className="surface-card interactive-card p-4 text-left w-full flex flex-col justify-between"
      style={{
        borderColor: isSelected ? 'var(--accent-teal)' : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-2 w-full">
        <div>
          <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            {meta.name}
          </div>
          <div className="text-xl font-extrabold mt-0.5 tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {value ?? '—'}
            <span className="text-xs font-medium ml-1" style={{ color: 'var(--text-faint)' }}>
              {meta.unit}
            </span>
          </div>
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${status.color}18`, color: status.color }}
        >
          <Icon size={17} />
        </div>
      </div>

      <div className="mt-3 w-full">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${status.pct}%`, background: status.color }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5 text-[11px]">
          <span className="font-semibold" style={{ color: status.color }}>{status.label}</span>
          <span style={{ color: 'var(--text-faint)' }}>WHO ≤ {meta.whoLimit}</span>
        </div>
      </div>
    </button>
  );
};

const WeatherMiniCard = ({ label, value, sub, Icon, accent }) => (
  <div className="surface-card p-3.5 flex items-center gap-3">
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${accent}18`, color: accent }}
    >
      <Icon size={18} />
    </div>
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>
        {label}
      </div>
      <div className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
      {sub && (
        <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
          {sub}
        </div>
      )}
    </div>
  </div>
);

const CustomChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="p-3 rounded-xl text-xs shadow-lg"
      style={{
        background: 'var(--bg-surface-solid)',
        border: '1px solid var(--border-subtle)',
        color: 'var(--text-primary)',
      }}
    >
      <div className="font-bold mb-1">{label}</div>
      {payload.map((p, idx) => (
        <div key={idx} className="flex items-center gap-2 font-medium" style={{ color: p.color }}>
          <span>{p.name}:</span>
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

const DashboardSkeleton = () => (
  <div className="space-y-5">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="surface-card p-6 h-80 flex flex-col justify-between">
        <div className="skeleton h-6 w-44" />
        <div className="skeleton h-36 w-52 mx-auto rounded-full" />
        <div className="skeleton h-14 w-full" />
      </div>
      <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="surface-card p-4 h-36 flex flex-col justify-between">
            <div className="skeleton h-5 w-20" />
            <div className="skeleton h-8 w-24" />
            <div className="skeleton h-2 w-full" />
          </div>
        ))}
      </div>
    </div>
    <div className="surface-card p-6 h-64">
      <div className="skeleton h-6 w-56 mb-4" />
      <div className="skeleton h-44 w-full" />
    </div>
  </div>
);

export default function Dashboard({
  airQuality,
  onSelectCity,
  onRefresh,
  onRequestLocation,
  isLoadingCity,
  apiError,
  preferences,
  formatTemp,
  onNavigate,
}) {
  const [view, setView] = useState('hourly');
  const [showPm25, setShowPm25] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [askLocationConsent, setAskLocationConsent] = useState(false);
  const [inspectedPollutant, setInspectedPollutant] = useState(null);

  const searchBoxRef = useRef(null);

  useEffect(() => {
    const onOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  useEffect(() => {
    const q = searchText.trim();
    if (q.length < 2) return;
    const timer = setTimeout(async () => {
      const results = await searchCities(q);
      setSuggestions(results);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchText]);

  const aqiCat = getAqiCategory(airQuality.aqi);
  const chartData = view === 'weekly' ? airQuality.trendData : airQuality.hourlyData;
  const xKey = view === 'weekly' ? 'day' : 'hour';
  const hourlyInsights = analyzeHourlyWindows(airQuality);

  const formatTimestamp = () => {
    if (!airQuality.lastUpdated) return 'Just now';
    return new Date(airQuality.lastUpdated).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      onSelectCity(suggestions[0]);
      setSearchText('');
      setShowDropdown(false);
    } else if (searchText.trim()) {
      onSelectCity(searchText.trim());
      setSearchText('');
      setShowDropdown(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Control Toolbar: Search + Geolocation + Data Authenticity */}
      <div className="surface-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 relative z-20">
        <div className="flex items-start sm:items-center gap-2.5 text-xs sm:text-sm">
          {airQuality.isLive ? (
            <CheckCircle2 size={17} className="text-emerald-500 flex-shrink-0 mt-0.5 sm:mt-0" />
          ) : (
            <AlertCircle size={17} className="text-amber-500 flex-shrink-0 mt-0.5 sm:mt-0" />
          )}
          <div style={{ color: 'var(--text-secondary)' }}>
            {airQuality.isLive ? (
              <>
                Live telemetry from <strong>{airQuality.dataSource}</strong> · Updated {formatTimestamp()}
              </>
            ) : (
              <>
                <strong style={{ color: '#d97706' }}>{airQuality.dataSource || 'Offline Reference'}:</strong>{' '}
                {apiError || 'Live feed unavailable — showing reference estimates, not live sensor data.'}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative" ref={searchBoxRef}>
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl saas-input">
                <Search size={14} style={{ color: 'var(--text-faint)' }} />
                <input
                  type="text"
                  value={searchText}
                  onFocus={() => setShowDropdown(true)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchText(val);
                    if (val.trim().length < 2) setSuggestions([]);
                    setShowDropdown(true);
                  }}
                  placeholder="Search any city worldwide..."
                  className="text-xs bg-transparent outline-none w-44 sm:w-56"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
              <button type="submit" className="btn-brand px-3.5 py-2 text-xs">
                Search
              </button>
            </form>

            {showDropdown && suggestions.length > 0 && (
              <div
                className="absolute left-0 right-0 top-11 rounded-xl p-1.5 shadow-xl z-40"
                style={{
                  background: 'var(--bg-surface-solid)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {suggestions.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => {
                      onSelectCity(place);
                      setSearchText('');
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between hover:bg-teal-500/10"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <span className="truncate">{place.displayName}</span>
                    <MapPin size={12} style={{ color: 'var(--accent-teal)' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setAskLocationConsent((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors hover:bg-teal-500/15"
            style={{
              background: 'rgba(13, 148, 136, 0.1)',
              color: 'var(--accent-teal)',
              border: '1px solid var(--border-accent)',
            }}
          >
            <Navigation size={13} /> Use My Location
          </button>

          <button
            onClick={onRefresh}
            disabled={isLoadingCity}
            title="Refresh live data"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
            style={{
              background: 'var(--bg-subtle)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <RefreshCw size={13} className={isLoadingCity ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Privacy-Friendly Location Consent Prompt */}
      {askLocationConsent && (
        <div
          className="surface-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in-up"
          style={{ borderColor: 'rgba(14, 165, 233, 0.35)' }}
        >
          <div className="flex items-start gap-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <MapPin size={16} className="text-sky-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Location Privacy Notice:</strong>{' '}
              Your coordinates are sent directly to Open-Meteo and OpenStreetMap solely to fetch local AQI and weather. They are never saved to any third-party tracking server.
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => {
                setAskLocationConsent(false);
                onRequestLocation();
              }}
              className="btn-brand px-3.5 py-1.5 text-xs"
            >
              Allow Location
            </button>
            <button
              onClick={() => setAskLocationConsent(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Quick City Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--text-faint)' }}>
          Featured Cities:
        </span>
        {popularCities.slice(0, 10).map((city) => {
          const active = airQuality.location === city;
          return (
            <button
              key={city}
              onClick={() => onSelectCity(city)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all"
              style={
                active
                  ? {
                      background: 'linear-gradient(135deg, #0d9488, #0ea5e9)',
                      color: '#ffffff',
                    }
                  : {
                      background: 'var(--bg-surface)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }
              }
            >
              {city.split(',')[0]}
            </button>
          );
        })}
      </div>

      {isLoadingCity ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Primary Grid: AQI Gauge + All Pollutant Telemetry */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Gauge Card */}
            <div className="lg:col-span-4 surface-card p-5 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    <MapPin size={15} style={{ color: 'var(--accent-teal)' }} />
                    <span>{airQuality.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    <Clock size={12} />
                    <span>Updated {formatTimestamp()}</span>
                  </div>
                </div>
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0"
                  style={{ background: aqiCat.bg, color: aqiCat.color }}
                >
                  {aqiCat.label}
                </span>
              </div>

              <AQIGauge aqi={airQuality.aqi} />

              <div
                className="mt-4 p-3.5 rounded-xl text-xs space-y-1.5"
                style={{ background: aqiCat.bg, border: `1px solid ${aqiCat.color}30` }}
              >
                <div className="font-bold flex items-center gap-1.5" style={{ color: aqiCat.color }}>
                  <ShieldCheck size={14} /> Health Recommendation
                </div>
                <p className="leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {aqiCat.description}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  <strong>Sensitive groups:</strong> {aqiCat.sensitiveAdvice}
                </p>
              </div>
            </div>

            {/* Pollutants + Weather Column */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {/* Weather Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <WeatherMiniCard
                  label="Temperature"
                  value={formatTemp(airQuality.temperature)}
                  sub={`Feels like ${formatTemp(airQuality.feelsLike ?? airQuality.temperature)}`}
                  Icon={Thermometer}
                  accent="#0ea5e9"
                />
                <WeatherMiniCard
                  label="Humidity"
                  value={`${airQuality.humidity}%`}
                  sub={airQuality.humidity > 70 ? 'High moisture traps PM' : 'Balanced moisture'}
                  Icon={Droplets}
                  accent="#6366f1"
                />
                <WeatherMiniCard
                  label="Wind Speed"
                  value={`${airQuality.windSpeed} km/h`}
                  sub={airQuality.windSpeed < 6 ? 'Low dispersion' : 'Active airflow'}
                  Icon={Wind}
                  accent="#0d9488"
                />
                <WeatherMiniCard
                  label="Conditions"
                  value={airQuality.weatherCondition || 'Ambient'}
                  sub={airQuality.uvIndex != null ? `UV Index ${airQuality.uvIndex}` : `${airQuality.pressure || 1013} hPa`}
                  Icon={CloudSun}
                  accent="#f59e0b"
                />
              </div>

              {/* 6 Pollutant Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
                <PollutantCard
                  metricKey="pm25"
                  value={airQuality.pm25}
                  Icon={Activity}
                  onInspect={setInspectedPollutant}
                  isSelected={inspectedPollutant === 'pm25'}
                />
                <PollutantCard
                  metricKey="pm10"
                  value={airQuality.pm10}
                  Icon={Wind}
                  onInspect={setInspectedPollutant}
                  isSelected={inspectedPollutant === 'pm10'}
                />
                <PollutantCard
                  metricKey="no2"
                  value={airQuality.no2}
                  Icon={Factory}
                  onInspect={setInspectedPollutant}
                  isSelected={inspectedPollutant === 'no2'}
                />
                <PollutantCard
                  metricKey="o3"
                  value={airQuality.o3}
                  Icon={Sun}
                  onInspect={setInspectedPollutant}
                  isSelected={inspectedPollutant === 'o3'}
                />
                <PollutantCard
                  metricKey="co"
                  value={airQuality.co}
                  Icon={Flame}
                  onInspect={setInspectedPollutant}
                  isSelected={inspectedPollutant === 'co'}
                />
                <PollutantCard
                  metricKey="so2"
                  value={airQuality.so2 ?? 0}
                  Icon={AlertCircle}
                  onInspect={setInspectedPollutant}
                  isSelected={inspectedPollutant === 'so2'}
                />
              </div>

              {/* Plain-Language Pollutant Explainer Drawer (when card clicked) */}
              {inspectedPollutant && POLLUTANT_META[inspectedPollutant] && (
                <div
                  className="surface-card p-3.5 flex items-start justify-between gap-3 animate-fade-in-up"
                  style={{ borderColor: 'var(--border-accent)' }}
                >
                  <div className="text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5" style={{ color: 'var(--accent-teal)' }}>
                      <Info size={14} />
                      {POLLUTANT_META[inspectedPollutant].name} ({POLLUTANT_META[inspectedPollutant].fullName})
                    </div>
                    <p style={{ color: 'var(--text-primary)' }}>
                      {POLLUTANT_META[inspectedPollutant].simpleExplain}
                    </p>
                    <p style={{ color: 'var(--text-muted)' }}>
                      <strong>Common sources:</strong> {POLLUTANT_META[inspectedPollutant].sources}
                    </p>
                  </div>
                  <button
                    onClick={() => setInspectedPollutant(null)}
                    className="text-xs font-semibold px-2 py-1 rounded-lg"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Pollution Trend & Forecast Chart */}
          <div className="surface-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  Air Quality Trend — {airQuality.location.split(',')[0]}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {view === 'hourly'
                    ? `Hourly progression · Cleanest window near ${hourlyInsights.bestHour} (~${hourlyInsights.bestAqi} AQI)`
                    : '7-day daily average AQI trajectory'}
                  {!airQuality.isLive && ' (Offline reference curve)'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {view === 'weekly' && (
                  <button
                    onClick={() => setShowPm25((s) => !s)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: showPm25 ? 'rgba(14, 165, 233, 0.16)' : 'var(--bg-subtle)',
                      color: showPm25 ? '#0ea5e9' : 'var(--text-secondary)',
                    }}
                  >
                    {showPm25 ? 'Hide PM2.5' : '+ PM2.5 Layer'}
                  </button>
                )}
                {['hourly', 'weekly'].map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all"
                    style={
                      view === v
                        ? {
                            background: 'linear-gradient(135deg, #0d9488, #0ea5e9)',
                            color: '#ffffff',
                          }
                        : {
                            background: 'var(--bg-subtle)',
                            color: 'var(--text-secondary)',
                          }
                    }
                  >
                    {v === 'hourly' ? '24h Hourly' : '7-Day Trend'}
                  </button>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={chartData} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="pmGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis
                  dataKey={xKey}
                  tick={{ fontSize: 11, fill: 'var(--chart-axis)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--chart-axis)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomChartTooltip />} />
                {preferences?.alertThreshold && (
                  <ReferenceLine
                    y={preferences.alertThreshold}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{
                      value: `Alert (${preferences.alertThreshold})`,
                      position: 'insideTopRight',
                      fill: '#f59e0b',
                      fontSize: 10,
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="aqi"
                  name="US AQI"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  fill="url(#aqiGradient)"
                  dot={{ fill: '#0d9488', strokeWidth: 2, r: 3.5 }}
                  activeDot={{ r: 5.5, fill: '#0d9488' }}
                />
                {view === 'weekly' && showPm25 && (
                  <Area
                    type="monotone"
                    dataKey="pm25"
                    name="PM2.5 (µg/m³)"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fill="url(#pmGradient)"
                    dot={{ fill: '#0ea5e9', r: 3 }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Action Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => onNavigate('assistant')}
              className="surface-card interactive-card p-4 text-left flex items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent-teal)' }}>
                  <Sparkles size={13} /> AI Health Assistant
                </div>
                <div className="text-sm font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                  Ask about {airQuality.location.split(',')[0]} risks & masks
                </div>
              </div>
              <ArrowRight size={16} style={{ color: 'var(--accent-teal)' }} />
            </button>

            <button
              onClick={() => onNavigate('planner')}
              className="surface-card interactive-card p-4 text-left flex items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: '#0ea5e9' }}>
                  <Clock size={13} /> Daily Planner
                </div>
                <div className="text-sm font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                  Best outdoor window: {hourlyInsights.bestHour} (~{hourlyInsights.bestAqi} AQI)
                </div>
              </div>
              <ArrowRight size={16} style={{ color: '#0ea5e9' }} />
            </button>

            <button
              onClick={() => onNavigate('indoor')}
              className="surface-card interactive-card p-4 text-left flex items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: '#10b981' }}>
                  <ShieldCheck size={13} /> Indoor Air Toolkit
                </div>
                <div className="text-sm font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                  {airQuality.aqi > 150 ? 'Keep windows sealed & filter air' : 'Check optimal ventilation hours'}
                </div>
              </div>
              <ArrowRight size={16} style={{ color: '#10b981' }} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
