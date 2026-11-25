import React, { useState, useEffect, useRef } from 'react';
import {
  Wind, Menu, X, Bell, MapPin, Search, ChevronDown, Sun, Moon,
  LayoutDashboard, Bot, CalendarClock, Home, Leaf, Users, Settings as SettingsIcon,
  AlertTriangle, Info, CheckCircle2, CloudRain, SlidersHorizontal, Loader2,
} from 'lucide-react';
import { popularCities } from '../data/mockData';
import { searchCities } from '../services/airQualityService';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'assistant', label: 'AI Assistant', Icon: Bot },
  { id: 'planner', label: 'Daily Planner', Icon: CalendarClock },
  { id: 'indoor', label: 'Indoor Air', Icon: Home },
  { id: 'impact', label: 'Eco Impact', Icon: Leaf },
  { id: 'community', label: 'Community', Icon: Users },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];

export default function Navbar({
  activeTab,
  setActiveTab,
  airQuality,
  onSelectCity,
  theme,
  onToggleTheme,
  alerts = [],
  preferences,
  isLoadingCity,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [geoResults, setGeoResults] = useState([]);
  const [searchingGeo, setSearchingGeo] = useState(false);
  const [dismissedIds, setDismissedIds] = useState([]);

  const dropdownRef = useRef(null);

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setNotifOpen(false);
        setCityOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced live geocoding city search
  useEffect(() => {
    if (!cityOpen) return;
    const q = cityQuery.trim();
    if (q.length < 2) return;
    const timer = setTimeout(async () => {
      setSearchingGeo(true);
      const results = await searchCities(q);
      setGeoResults(results);
      setSearchingGeo(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [cityQuery, cityOpen]);

  const alertScope = `${airQuality.location}:${Math.round((airQuality.aqi || 0) / 10)}`;
  const activeAlerts = alerts.filter((a) => !dismissedIds.includes(`${alertScope}:${a.id}`));
  const hasCriticalAlert = activeAlerts.some((a) => a.severity === 'critical' || a.severity === 'warning');

  const filteredPresets = popularCities.filter((c) =>
    c.toLowerCase().includes(cityQuery.toLowerCase())
  );

  const handleCitySubmit = (e) => {
    e.preventDefault();
    if (geoResults.length > 0) {
      onSelectCity(geoResults[0]);
      setCityQuery('');
      setCityOpen(false);
    } else if (cityQuery.trim()) {
      onSelectCity(cityQuery.trim());
      setCityQuery('');
      setCityOpen(false);
    }
  };

  const renderAlertIcon = (alert) => {
    if (alert.severity === 'critical' || alert.severity === 'warning') {
      return <AlertTriangle size={15} className={alert.severity === 'critical' ? 'text-red-500' : 'text-amber-500'} />;
    }
    if (alert.category?.includes('Weather')) {
      return <CloudRain size={15} className="text-sky-500" />;
    }
    if (alert.severity === 'success') {
      return <CheckCircle2 size={15} className="text-emerald-500" />;
    }
    return <Info size={15} className="text-teal-500" />;
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Brand */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 text-left flex-shrink-0 group"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0ea5e9)' }}
              >
                <Wind size={18} color="white" />
              </div>
              <div className="leading-tight">
                <div className="font-bold text-[15px] tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  BreatheBetter <span style={{ color: 'var(--accent-teal)' }}>AI</span>
                </div>
                <div className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                  Air Quality Intelligence
                </div>
              </div>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden xl:flex items-center gap-1 p-1 rounded-2xl" style={{ background: 'var(--bg-subtle)' }}>
              {navItems.map(({ id, label, Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all duration-150"
                    style={
                      active
                        ? {
                            background: 'linear-gradient(135deg, #0d9488, #0ea5e9)',
                            color: '#ffffff',
                            boxShadow: '0 2px 10px rgba(13, 148, 136, 0.28)',
                          }
                        : {
                            color: 'var(--text-secondary)',
                          }
                    }
                  >
                    <Icon size={15} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2" ref={dropdownRef}>
              {/* City Selector */}
              <div className="relative">
                <button
                  onClick={() => {
                    setCityOpen(!cityOpen);
                    setNotifOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <MapPin size={13} style={{ color: 'var(--accent-teal)' }} />
                  <span className="max-w-[90px] sm:max-w-[130px] truncate">
                    {airQuality.location.split(',')[0]}
                  </span>
                  {isLoadingCity ? (
                    <Loader2 size={12} className="animate-spin" style={{ color: 'var(--accent-teal)' }} />
                  ) : (
                    <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
                  )}
                </button>

                {cityOpen && (
                  <div
                    className="absolute right-0 top-11 w-80 p-3 z-50 rounded-2xl shadow-xl"
                    style={{
                      background: 'var(--bg-surface-solid)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <form onSubmit={handleCitySubmit} className="flex gap-1.5 mb-2.5">
                      <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl saas-input">
                        <Search size={13} style={{ color: 'var(--text-faint)' }} />
                        <input
                          type="text"
                          value={cityQuery}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCityQuery(val);
                            if (val.trim().length < 2) {
                              setGeoResults([]);
                              setSearchingGeo(false);
                            }
                          }}
                          placeholder="Search city globally..."
                          autoFocus
                          className="w-full text-xs bg-transparent outline-none"
                          style={{ color: 'var(--text-primary)' }}
                        />
                      </div>
                      <button type="submit" className="btn-brand px-3 py-1.5 text-xs">
                        Go
                      </button>
                    </form>

                    {cityQuery.trim().length >= 2 && (
                      <div className="mb-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wider mb-1 px-1" style={{ color: 'var(--text-faint)' }}>
                          {searchingGeo ? 'Searching Open-Meteo...' : 'Global Matches'}
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {geoResults.map((place) => (
                            <button
                              key={place.id}
                              onClick={() => {
                                onSelectCity(place);
                                setCityQuery('');
                                setCityOpen(false);
                              }}
                              className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors hover:bg-teal-500/10"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              <span className="truncate pr-2">{place.displayName}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 flex-shrink-0">
                                Live
                              </span>
                            </button>
                          ))}
                          {!searchingGeo && geoResults.length === 0 && (
                            <div className="text-xs px-2.5 py-1.5" style={{ color: 'var(--text-muted)' }}>
                              No live geocoding matches found.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="text-[11px] font-semibold uppercase tracking-wider mb-1 px-1" style={{ color: 'var(--text-faint)' }}>
                      Quick Cities
                    </div>
                    <div className="max-h-44 overflow-y-auto space-y-0.5">
                      {filteredPresets.map((city) => {
                        const selected = airQuality.location === city;
                        return (
                          <button
                            key={city}
                            onClick={() => {
                              onSelectCity(city);
                              setCityOpen(false);
                              setCityQuery('');
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between transition-colors hover:bg-teal-500/10"
                            style={{
                              color: selected ? 'var(--accent-teal)' : 'var(--text-secondary)',
                              background: selected ? 'rgba(13, 148, 136, 0.1)' : 'transparent',
                            }}
                          >
                            <span>{city}</span>
                            {selected && <span className="text-[11px] font-bold">Active</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Live Status Indicator */}
              <div
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                style={
                  airQuality.isLive
                    ? {
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                      }
                    : {
                        background: 'rgba(245, 158, 11, 0.12)',
                        color: '#d97706',
                        border: '1px solid rgba(245, 158, 11, 0.28)',
                      }
                }
                title={airQuality.dataSource}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    airQuality.isLive ? 'bg-emerald-500 animate-pulse-soft' : 'bg-amber-500'
                  }`}
                />
                {airQuality.isLive ? 'Live API' : 'Offline Ref'}
              </div>

              {/* Theme Toggle */}
              <button
                onClick={onToggleTheme}
                aria-label="Toggle Light/Dark Mode"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-teal-500/10"
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
              </button>

              {/* Alerts Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setNotifOpen(!notifOpen);
                    setCityOpen(false);
                  }}
                  aria-label="Notifications & Alerts"
                  className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-teal-500/10"
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--accent-teal)',
                  }}
                >
                  <Bell size={17} />
                  {activeAlerts.length > 0 && (
                    <span
                      className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                        hasCriticalAlert ? 'bg-red-500' : 'bg-teal-500'
                      }`}
                    />
                  )}
                </button>

                {notifOpen && (
                  <div
                    className="absolute right-0 top-11 w-80 sm:w-96 p-4 z-50 rounded-2xl shadow-xl"
                    style={{
                      background: 'var(--bg-surface-solid)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          Alerts & Daily Brief
                        </div>
                        <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          Alert threshold: AQI {preferences?.alertThreshold ?? 150}+
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setNotifOpen(false);
                          setActiveTab('settings');
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg hover:bg-teal-500/10"
                        style={{ color: 'var(--accent-teal)' }}
                      >
                        <SlidersHorizontal size={12} /> Configure
                      </button>
                    </div>

                    {activeAlerts.length === 0 ? (
                      <div className="py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                        All alerts cleared for {airQuality.location.split(',')[0]}.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {activeAlerts.map((alert) => (
                          <div
                            key={alert.id}
                            className="p-3 rounded-xl flex gap-2.5 items-start"
                            style={{
                              background: 'var(--bg-subtle)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            <div className="mt-0.5 flex-shrink-0">{renderAlertIcon(alert)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent-teal)' }}>
                                  {alert.category}
                                </span>
                                <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                                  {alert.time}
                                </span>
                              </div>
                              <div className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                                {alert.title}
                              </div>
                              <div className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                {alert.message}
                              </div>
                            </div>
                            <button
                              onClick={() => setDismissedIds((d) => [...d, `${alertScope}:${alert.id}`])}
                              title="Dismiss"
                              className="p-0.5 rounded hover:bg-slate-500/10"
                              style={{ color: 'var(--text-faint)' }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile / Tablet Drawer Toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Open Navigation Menu"
                className="xl:hidden w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--accent-teal)',
                }}
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Tablet / Mobile Navigation Drawer */}
        {mobileOpen && (
          <div
            className="xl:hidden border-t px-4 py-3"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'var(--bg-surface-solid)',
            }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-4xl mx-auto">
              {navItems.map(({ id, label, Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveTab(id);
                      setMobileOpen(false);
                    }}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={
                      active
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
                    <Icon size={15} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>
      <div className="h-16" />
    </>
  );
}
