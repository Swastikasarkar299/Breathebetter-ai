import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Cell,
} from 'recharts';
import {
  MapPin, Clock, RefreshCw, Navigation, Search, Thermometer, Droplets,
  Wind, CloudSun, AlertCircle, CheckCircle2, Sparkles, ShieldCheck, Activity,
  ArrowRight, Sun, Flame, Factory, Info, Compass, Gauge, Bookmark, BookmarkCheck,
  FileDown, Printer, Calendar, Radio,
} from 'lucide-react';
import {
  getAqiCategory, popularCities, POLLUTANT_META, analyzeHourlyWindows,
} from '../data/mockData';
import { searchCities } from '../services/airQualityService';
import { exportAirQualityCsv, openPrintableAirQualityReport } from '../utils/reportExport';
import AQIGauge from './AQIGauge';
import ChartTooltip from './ui/ChartTooltip';
import StatusBanner from './ui/StatusBanner';
import EmptyState from './ui/EmptyState';

function getPollutantStatus(key, value) {
  const meta = POLLUTANT_META[key];
  if (!meta || value == null) return { label: 'N/A', color: '#94a3b8', pct: 0, ratio: 0 };
  const val = Number(value) || 0;
  const pct = Math.min(100, Math.max(6, Math.round((val / (meta.highThreshold * 1.4)) * 100)));
  const ratio = Math.round((val / meta.whoLimit) * 100);
  if (val <= meta.whoLimit) return { label: 'Within WHO', color: '#10b981', pct, ratio };
  if (val <= meta.whoLimit * 2.2) return { label: 'Elevated', color: '#f59e0b', pct, ratio };
  if (val <= meta.highThreshold) return { label: 'High', color: '#f97316', pct, ratio };
  return { label: 'Very High', color: '#ef4444', pct, ratio };
}

const PollutantCard = ({ metricKey, value, Icon, onInspect, isSelected }) => {
  const meta = POLLUTANT_META[metricKey];
  const status = getPollutantStatus(metricKey, value);

  return (
    <button
      onClick={() => onInspect(isSelected ? null : metricKey)}
      className="surface-card interactive-card p-4 text-left w-full flex flex-col justify-between"
      style={{ borderColor: isSelected ? 'var(--accent-teal)' : undefined }}
    >
      <div className="flex items-start justify-between gap-2 w-full">
        <div>
          <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            {meta.name}
          </div>
          <div className="text-xl font-extrabold mt-0.5 tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {value != null ? value : 'Unavailable'}
            {value != null && (
              <span className="text-xs font-medium ml-1" style={{ color: 'var(--text-faint)' }}>
                {meta.unit}
              </span>
            )}
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
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${status.pct}%`, background: status.color }} />
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
      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${accent}18`, color: accent }}
    >
      <Icon size={17} />
    </div>
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
        {label}
      </div>
      <div className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
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

const DashboardSkeleton = () => (
  <div className="space-y-5">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-4 surface-card p-6 h-96 flex flex-col justify-between">
        <div className="skeleton h-6 w-44" />
        <div className="skeleton h-36 w-52 mx-auto rounded-full" />
        <div className="skeleton h-20 w-full" />
      </div>
      <div className="lg:col-span-8 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="surface-card p-3.5 h-20 skeleton" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="surface-card p-4 h-32 skeleton" />
          ))}
        </div>
      </div>
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
  onSaveLocation,
  isLocationSaved,
}) {
  const [view, setView] = useState('hourly'); // hourly | weekly | comparison
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

  const aqiCat = getAqiCategory(airQuality.aqi ?? 0);
  const chartData = view === 'weekly' ? airQuality.trendData || [] : airQuality.hourlyData || [];
  const xKey = view === 'weekly' ? 'day' : 'hour';
  const hourlyInsights = analyzeHourlyWindows(airQuality);

  const pollutantComparisonData = [
    { key: 'PM2.5', value: airQuality.pm25, who: POLLUTANT_META.pm25.whoLimit },
    { key: 'PM10', value: airQuality.pm10, who: POLLUTANT_META.pm10.whoLimit },
    { key: 'NO₂', value: airQuality.no2, who: POLLUTANT_META.no2.whoLimit },
    { key: 'O₃', value: airQuality.o3, who: POLLUTANT_META.o3.whoLimit },
    { key: 'SO₂', value: airQuality.so2, who: POLLUTANT_META.so2.whoLimit },
  ].map((d) => ({
    name: d.key,
    value: d.value ?? 0,
    whoPct: d.value != null ? Math.min(400, Math.round((d.value / d.who) * 100)) : 0,
    who: d.who,
  }));

  const formatTimestamp = () => {
    if (!airQuality.lastUpdated) return 'Unknown';
    return new Date(airQuality.lastUpdated).toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
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

  const smartRecommendations = airQuality.isLive
    ? [
        {
          title: 'Outdoor Exercise',
          desc:
            airQuality.aqi <= 60
              ? 'Conditions are safe for running, brisk walking, and outdoor training.'
              : airQuality.aqi <= 135
                ? `Prefer moderate activity near ${hourlyInsights.bestHour} (~${hourlyInsights.bestAqi} AQI).`
                : 'Shift high-intensity workouts indoors to avoid deep PM2.5 inhalation.',
          color: airQuality.aqi <= 60 ? '#10b981' : airQuality.aqi <= 135 ? '#f59e0b' : '#ef4444',
        },
        {
          title: 'Mask Guidance',
          desc:
            airQuality.aqi > 150
              ? 'Wear a tight-fitting N95/KN95 mask outdoors; cloth masks do not block PM2.5.'
              : airQuality.aqi > 100
                ? 'Carry an N95 mask if walking or commuting along busy diesel traffic routes.'
                : 'No respiratory mask needed under current clean ambient conditions.',
          color: airQuality.aqi > 150 ? '#ef4444' : '#0d9488',
        },
        {
          title: 'Ventilation Window',
          desc:
            airQuality.aqi <= 100
              ? `Open cross-windows for 20–30 minutes (best near ${hourlyInsights.bestHour}).`
              : `Keep windows shut during peak traffic; brief airing only near ${hourlyInsights.bestHour}.`,
          color: '#0891b2',
        },
        {
          title: 'Sensitive Groups',
          desc: aqiCat.sensitiveAdvice,
          color: aqiCat.color,
        },
      ]
    : [];

  return (
    <div className="space-y-5">
      {/* Control & Source Bar */}
      <div className="surface-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 relative z-20">
        <div className="flex items-start sm:items-center gap-2.5 text-xs">
          {airQuality.isLive ? (
            <CheckCircle2 size={17} className="text-emerald-500 flex-shrink-0 mt-0.5 sm:mt-0" />
          ) : (
            <AlertCircle size={17} className="text-amber-500 flex-shrink-0 mt-0.5 sm:mt-0" />
          )}
          <div style={{ color: 'var(--text-secondary)' }}>
            {airQuality.isLive ? (
              <>
                <strong>Live Measurement:</strong> {airQuality.dataSource} · Station:{' '}
                <strong>{airQuality.stationLabel || airQuality.location}</strong> · Updated {formatTimestamp()}
              </>
            ) : (
              <>
                <strong style={{ color: '#d97706' }}>Live Data Unavailable:</strong>{' '}
                {apiError || 'Could not reach air quality APIs. Real measurements will appear once reconnected.'}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative" ref={searchBoxRef}>
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5" role="search" aria-label="Search city air quality">
              <label htmlFor="dashboard-city-search" className="sr-only">Search city worldwide</label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl saas-input">
                <Search size={14} style={{ color: 'var(--text-faint)' }} aria-hidden="true" />
                <input
                  id="dashboard-city-search"
                  type="text"
                  value={searchText}
                  onFocus={() => setShowDropdown(true)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchText(val);
                    if (val.trim().length < 2) setSuggestions([]);
                    setShowDropdown(true);
                  }}
                  placeholder="Search city globally..."
                  className="text-xs bg-transparent outline-none w-40 sm:w-52"
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
                style={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--border-subtle)' }}
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
            <Navigation size={13} /> Locate Me
          </button>

          <button
            onClick={onSaveLocation}
            disabled={!airQuality.isLive}
            title={isLocationSaved ? 'City already saved' : 'Bookmark city'}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
            style={{
              background: isLocationSaved ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-subtle)',
              color: isLocationSaved ? '#10b981' : 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {isLocationSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          </button>

          <button
            onClick={onRefresh}
            disabled={isLoadingCity}
            title="Refresh live data"
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold"
            style={{
              background: 'var(--bg-subtle)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <RefreshCw size={13} className={isLoadingCity ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Location Privacy Notice */}
      {askLocationConsent && (
        <div
          className="surface-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in-up"
          style={{ borderColor: 'rgba(6, 182, 212, 0.35)' }}
        >
          <div className="flex items-start gap-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <MapPin size={16} className="text-cyan-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Location Permission:</strong>{' '}
              Your browser coordinates are used strictly to retrieve local Open-Meteo AQI & weather and reverse-geocode city name.
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
              Allow Access
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

      {/* Quick City Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--text-faint)' }}>
          Cities:
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
                  ? { background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: '#ffffff' }
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

      {airQuality.isStale && (
        <StatusBanner
          variant="warning"
          title="Cached Reading:"
          message={airQuality.staleReason || 'Showing last verified snapshot while live API reconnects.'}
          action={
            <button onClick={onRefresh} className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ background: 'var(--bg-surface-solid)', color: 'var(--accent-teal)' }}>
              Retry Now
            </button>
          }
        />
      )}

      {isLoadingCity ? (
        <DashboardSkeleton />
      ) : !airQuality.isLive ? (
        <EmptyState
          title={`Live Measurements Unavailable for ${airQuality.location}`}
          description={apiError || 'Network or upstream air-quality API could not be reached. BreatheBetter AI never displays fabricated numbers as live measurements.'}
          onRetry={onRefresh}
          retryLabel="Retry Live Fetch"
        />
      ) : (
        <>
          {/* Primary Grid: Gauge + Full Weather + 6 Pollutants */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-4 surface-card p-5 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    <MapPin size={15} style={{ color: 'var(--accent-teal)' }} />
                    <span>{airQuality.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    <Clock size={12} />
                    <span>{formatTimestamp()}</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0" style={{ background: aqiCat.bg, color: aqiCat.color }}>
                  {aqiCat.label}
                </span>
              </div>

              <AQIGauge aqi={airQuality.aqi} />

              <div className="mt-3 p-3.5 rounded-xl text-xs space-y-1.5" style={{ background: aqiCat.bg, border: `1px solid ${aqiCat.color}30` }}>
                <div className="font-bold flex items-center gap-1.5" style={{ color: aqiCat.color }}>
                  <ShieldCheck size={14} /> Health Risk Indicator
                </div>
                <p className="leading-relaxed" style={{ color: 'var(--text-primary)' }}>{aqiCat.description}</p>
              </div>

              {/* Station / Download Report Footer */}
              <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="text-[11px] flex items-center gap-1 truncate" style={{ color: 'var(--text-muted)' }}>
                  <Radio size={12} className="text-emerald-500 flex-shrink-0" />
                  <span className="truncate">{airQuality.dataSource}</span>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => exportAirQualityCsv(airQuality)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1"
                    style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                  >
                    <FileDown size={12} /> CSV
                  </button>
                  <button
                    onClick={() => openPrintableAirQualityReport(airQuality)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1"
                    style={{ background: 'rgba(13, 148, 136, 0.12)', color: 'var(--accent-teal)' }}
                  >
                    <Printer size={12} /> PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 flex flex-col gap-4">
              {/* Complete Weather Strip (6 metrics) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <WeatherMiniCard
                  label="Temperature"
                  value={formatTemp(airQuality.temperature)}
                  sub={`Feels like ${formatTemp(airQuality.feelsLike ?? airQuality.temperature)}`}
                  Icon={Thermometer}
                  accent="#0891b2"
                />
                <WeatherMiniCard
                  label="Humidity"
                  value={`${airQuality.humidity ?? 'N/A'}%`}
                  sub={airQuality.humidity > 70 ? 'High humidity traps PM' : 'Balanced humidity'}
                  Icon={Droplets}
                  accent="#0d9488"
                />
                <WeatherMiniCard
                  label="Wind Speed"
                  value={`${airQuality.windSpeed ?? 'N/A'} km/h`}
                  sub={airQuality.windSpeed < 6 ? 'Stagnant dispersion' : 'Active mixing'}
                  Icon={Wind}
                  accent="#10b981"
                />
                <WeatherMiniCard
                  label="Wind Direction"
                  value={airQuality.windDirection || 'N/A'}
                  sub="Surface vector"
                  Icon={Compass}
                  accent="#0ea5e9"
                />
                <WeatherMiniCard
                  label="Pressure"
                  value={airQuality.pressure != null ? `${airQuality.pressure} hPa` : 'N/A'}
                  sub={airQuality.pressure > 1018 ? 'High pressure inversion risk' : 'Normal barometric'}
                  Icon={Gauge}
                  accent="#6366f1"
                />
                <WeatherMiniCard
                  label="Sky & UV"
                  value={airQuality.weatherCondition || 'Ambient'}
                  sub={airQuality.uvIndex != null ? `UV Index ${airQuality.uvIndex}` : 'UV unavailable'}
                  Icon={CloudSun}
                  accent="#f59e0b"
                />
              </div>

              {/* 6 Pollutant Concentrations */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
                <PollutantCard metricKey="pm25" value={airQuality.pm25} Icon={Activity} onInspect={setInspectedPollutant} isSelected={inspectedPollutant === 'pm25'} />
                <PollutantCard metricKey="pm10" value={airQuality.pm10} Icon={Wind} onInspect={setInspectedPollutant} isSelected={inspectedPollutant === 'pm10'} />
                <PollutantCard metricKey="no2" value={airQuality.no2} Icon={Factory} onInspect={setInspectedPollutant} isSelected={inspectedPollutant === 'no2'} />
                <PollutantCard metricKey="o3" value={airQuality.o3} Icon={Sun} onInspect={setInspectedPollutant} isSelected={inspectedPollutant === 'o3'} />
                <PollutantCard metricKey="co" value={airQuality.co} Icon={Flame} onInspect={setInspectedPollutant} isSelected={inspectedPollutant === 'co'} />
                <PollutantCard metricKey="so2" value={airQuality.so2} Icon={AlertCircle} onInspect={setInspectedPollutant} isSelected={inspectedPollutant === 'so2'} />
              </div>

              {inspectedPollutant && POLLUTANT_META[inspectedPollutant] && (
                <div className="surface-card p-3.5 flex items-start justify-between gap-3 animate-fade-in-up" style={{ borderColor: 'var(--border-accent)' }}>
                  <div className="text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5" style={{ color: 'var(--accent-teal)' }}>
                      <Info size={14} /> {POLLUTANT_META[inspectedPollutant].name} ({POLLUTANT_META[inspectedPollutant].fullName})
                    </div>
                    <p style={{ color: 'var(--text-primary)' }}>{POLLUTANT_META[inspectedPollutant].simpleExplain}</p>
                    <p style={{ color: 'var(--text-muted)' }}>
                      <strong>Primary sources:</strong> {POLLUTANT_META[inspectedPollutant].sources}
                    </p>
                  </div>
                  <button onClick={() => setInspectedPollutant(null)} className="text-xs font-semibold px-2 py-1" style={{ color: 'var(--text-muted)' }}>
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* IQAir Ground Station Box (only if IQAir returned live station data) */}
          {airQuality.iqair?.supported && (
            <div className="surface-card p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Radio size={15} className="text-emerald-500" />
                <span>
                  <strong>IQAir Nearest Ground Station:</strong> {airQuality.iqair.stationCity} ·{' '}
                  US AQI <strong>{airQuality.iqair.aqius}</strong> (Main pollutant: {airQuality.iqair.mainPollutantUs})
                </span>
              </div>
              <span style={{ color: 'var(--text-muted)' }}>
                Station Temp {airQuality.iqair.weather?.temperature ?? 'N/A'}°C · Humidity {airQuality.iqair.weather?.humidity ?? 'N/A'}%
              </span>
            </div>
          )}

          {/* Charts: Hourly AQI / Daily AQI / Pollutant Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 surface-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                    {view === 'hourly' && `Hourly AQI Trajectory — ${airQuality.location.split(',')[0]}`}
                    {view === 'weekly' && `7-Day Daily AQI Trend — ${airQuality.location.split(',')[0]}`}
                    {view === 'comparison' && 'Pollutants vs. WHO 24h Guidelines (%)'}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {view === 'hourly' && `Cleanest window near ${hourlyInsights.bestHour} (~${hourlyInsights.bestAqi} AQI) · Peak near ${hourlyInsights.worstHour}`}
                    {view === 'weekly' && 'Daily average US AQI derived from Copernicus/Open-Meteo hourly history'}
                    {view === 'comparison' && 'Values at 100% equal WHO 2021 guideline threshold'}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { id: 'hourly', label: 'Hourly AQI' },
                    { id: 'weekly', label: 'Daily AQI' },
                    { id: 'comparison', label: 'Pollutant %' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setView(tab.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                      style={
                        view === tab.id
                          ? { background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: '#fff' }
                          : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }
                      }
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {view === 'comparison' ? (
                <div role="img" aria-label={`Pollutant concentration bar chart compared to WHO 2021 guidelines for ${airQuality.location}`}>
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={pollutantComparisonData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine y={100} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'WHO 100%', fill: '#10b981', fontSize: 10, position: 'insideTopRight' }} />
                      <Bar dataKey="whoPct" name="% of WHO Guideline" radius={[6, 6, 0, 0]}>
                        {pollutantComparisonData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.whoPct <= 100 ? '#10b981' : entry.whoPct <= 220 ? '#f59e0b' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div role="img" aria-label={`${view === 'hourly' ? 'Hourly' : '7-day daily'} AQI trend chart for ${airQuality.location}`}>
                  <ResponsiveContainer width="100%" height={230}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="aqiDashGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.32} />
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                      <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      {preferences?.alertThreshold && (
                        <ReferenceLine y={preferences.alertThreshold} stroke="#f59e0b" strokeDasharray="4 4" />
                      )}
                      <Area
                        type="monotone"
                        dataKey="aqi"
                        name="US AQI"
                        stroke="#0d9488"
                        strokeWidth={2.5}
                        fill="url(#aqiDashGrad)"
                        dot={{ fill: '#0d9488', r: 3.5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Multi-Day Air Quality Forecast */}
            <div className="lg:col-span-4 surface-card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={16} style={{ color: 'var(--accent-teal)' }} />
                  <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                    Air Quality Forecast
                  </h3>
                </div>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                  Open-Meteo multi-day projected AQI range
                </p>

                {airQuality.dailyForecast?.length ? (
                  <div className="space-y-3">
                    {airQuality.dailyForecast.map((f) => {
                      const fCat = getAqiCategory(f.avgAqi);
                      return (
                        <div key={f.date} className="p-3 rounded-xl flex items-center justify-between gap-2" style={{ background: 'var(--bg-subtle)' }}>
                          <div>
                            <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{f.day}</div>
                            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              Range {f.minAqi}–{f.maxAqi} · PM2.5 ~{f.avgPm25} µg/m³
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-extrabold px-2.5 py-1 rounded-full" style={{ background: fCat.bg, color: fCat.color }}>
                              ~{f.avgAqi}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl text-xs text-center" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                    Extended daily forecast unavailable for this query.
                  </div>
                )}
              </div>

              <button
                onClick={() => onNavigate('analytics')}
                className="mt-4 w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                style={{ background: 'rgba(13, 148, 136, 0.1)', color: 'var(--accent-teal)' }}
              >
                Open Full Analytics & Map <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Smart Dynamic Recommendations Grid */}
          <div className="surface-card p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                Live Recommendations for {airQuality.location.split(',')[0]}
              </h3>
              <button
                onClick={() => onNavigate('assistant')}
                className="text-xs font-semibold flex items-center gap-1"
                style={{ color: 'var(--accent-teal)' }}
              >
                <Sparkles size={13} /> Ask AI Assistant <ArrowRight size={12} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {smartRecommendations.map((rec) => (
                <div key={rec.title} className="p-3.5 rounded-xl space-y-1" style={{ background: 'var(--bg-subtle)' }}>
                  <div className="text-xs font-bold" style={{ color: rec.color }}>{rec.title}</div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{rec.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
