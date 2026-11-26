import React, { useState, useEffect, useRef } from 'react';
import {
  Wind, Menu, X, Bell, MapPin, Search, ChevronDown, Sun, Moon,
  LayoutDashboard, Bot, CalendarClock, Home, Leaf, Users, BarChart3, Settings as SettingsIcon,
  AlertTriangle, Info, CheckCircle2, CloudRain, SlidersHorizontal, Loader2, LogIn, User, LogOut, Bookmark,
} from 'lucide-react';
import { popularCities } from '../data/mockData';
import { searchCities } from '../services/airQualityService';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'assistant', label: 'AI Assistant', Icon: Bot },
  { id: 'planner', label: 'Planner', Icon: CalendarClock },
  { id: 'indoor', label: 'Indoor Air', Icon: Home },
  { id: 'impact', label: 'Eco Impact', Icon: Leaf },
  { id: 'community', label: 'Community', Icon: Users },
  { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];

export default function Navbar({
  activeTab,
  setActiveTab,
  airQuality,
  onSelectCity,
  theme,
  onToggleTheme,
  notifications = [],
  onMarkNotifRead,
  onMarkAllRead,
  onClearNotifications,
  preferences,
  isLoadingCity,
  authUser,
  savedLocations = [],
  onOpenAuth,
  onLogout,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [geoResults, setGeoResults] = useState([]);
  const [searchingGeo, setSearchingGeo] = useState(false);

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setNotifOpen(false);
        setCityOpen(false);
        setAccountOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setNotifOpen(false);
        setCityOpen(false);
        setAccountOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!cityOpen) return;
    const q = cityQuery.trim();
    if (q.length < 2) return;
    const timer = setTimeout(async () => {
      setSearchingGeo(true);
      const results = await searchCities(q);
      setGeoResults(results);
      setSearchingGeo(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [cityQuery, cityOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const hasCriticalAlert = notifications.some((n) => !n.isRead && (n.type === 'very_high_aqi' || n.type === 'aqi_alert'));

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
    if (alert.type === 'very_high_aqi' || alert.type === 'aqi_alert') {
      return <AlertTriangle size={15} className={alert.type === 'very_high_aqi' ? 'text-red-500' : 'text-amber-500'} />;
    }
    if (alert.type === 'weather_warning') {
      return <CloudRain size={15} className="text-cyan-500" />;
    }
    if (alert.type === 'challenge' || alert.type === 'daily_summary') {
      return <CheckCircle2 size={15} className="text-emerald-500" />;
    }
    return <Info size={15} className="text-teal-500" />;
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-2">
            {/* Brand */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 text-left flex-shrink-0 group"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
              >
                <Wind size={18} color="white" />
              </div>
              <div className="leading-tight hidden sm:block">
                <div className="font-bold text-[15px] tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  BreatheBetter <span style={{ color: 'var(--accent-teal)' }}>AI</span>
                </div>
                <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Health Intelligence
                </div>
              </div>
            </button>

            {/* Desktop Navigation */}
            <div
              className="hidden xl:flex items-center gap-0.5 p-1 rounded-2xl"
              style={{ background: 'var(--bg-subtle)' }}
              role="tablist"
              aria-label="Primary navigation"
            >
              {navItems.map(({ id, label, Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150"
                    style={
                      active
                        ? {
                            background: 'linear-gradient(135deg, #0d9488, #0891b2)',
                            color: '#ffffff',
                            boxShadow: '0 2px 10px rgba(13, 148, 136, 0.25)',
                          }
                        : {
                            color: 'var(--text-secondary)',
                          }
                    }
                  >
                    <Icon size={14} aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2" ref={dropdownRef}>
              {/* City Selector */}
              <div className="relative">
                <button
                  onClick={() => {
                    setCityOpen(!cityOpen);
                    setNotifOpen(false);
                    setAccountOpen(false);
                  }}
                  aria-expanded={cityOpen}
                  aria-haspopup="true"
                  aria-label={`Selected city: ${airQuality.location}. Switch city`}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <MapPin size={13} style={{ color: 'var(--accent-teal)' }} />
                  <span className="max-w-[85px] sm:max-w-[120px] truncate">
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
                    style={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--border-subtle)' }}
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
                      <button type="submit" className="btn-brand px-3 py-1.5 text-xs">Go</button>
                    </form>

                    {savedLocations.length > 0 && !cityQuery && (
                      <div className="mb-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-1 px-1 flex items-center gap-1" style={{ color: 'var(--accent-teal)' }}>
                          <Bookmark size={10} /> Saved Locations
                        </div>
                        <div className="space-y-0.5 max-h-28 overflow-y-auto">
                          {savedLocations.map((loc) => (
                            <button
                              key={loc.id || loc.cityName}
                              onClick={() => {
                                onSelectCity(loc.cityName);
                                setCityOpen(false);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-teal-500/10 flex items-center justify-between"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              <span className="truncate">{loc.cityName}</span>
                              {airQuality.location === loc.cityName && <span className="text-[10px] font-bold text-teal-500">Active</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {cityQuery.trim().length >= 2 && (
                      <div className="mb-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-1 px-1" style={{ color: 'var(--text-faint)' }}>
                          {searchingGeo ? 'Searching Open-Meteo...' : 'Global Matches'}
                        </div>
                        <div className="max-h-36 overflow-y-auto space-y-0.5">
                          {geoResults.map((place) => (
                            <button
                              key={place.id}
                              onClick={() => {
                                onSelectCity(place);
                                setCityQuery('');
                                setCityOpen(false);
                              }}
                              className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between hover:bg-teal-500/10"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              <span className="truncate pr-2">{place.displayName}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 flex-shrink-0">Live</span>
                            </button>
                          ))}
                          {!searchingGeo && geoResults.length === 0 && (
                            <div className="text-xs px-2.5 py-1.5" style={{ color: 'var(--text-muted)' }}>No matches found.</div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1 px-1" style={{ color: 'var(--text-faint)' }}>
                      Quick Cities
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-0.5">
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
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between hover:bg-teal-500/10"
                            style={{
                              color: selected ? 'var(--accent-teal)' : 'var(--text-secondary)',
                              background: selected ? 'rgba(13, 148, 136, 0.1)' : 'transparent',
                            }}
                          >
                            <span>{city}</span>
                            {selected && <span className="text-[10px] font-bold">Active</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
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
                {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
              </button>

              {/* Notifications Bell */}
              <div className="relative">
                <button
                  onClick={() => {
                    setNotifOpen(!notifOpen);
                    setCityOpen(false);
                    setAccountOpen(false);
                  }}
                  aria-expanded={notifOpen}
                  aria-haspopup="true"
                  aria-label={`Notifications (${unreadCount} unread)`}
                  className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-teal-500/10"
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--accent-teal)',
                  }}
                >
                  <Bell size={16} />
                  {unreadCount > 0 && (
                    <span
                      className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${
                        hasCriticalAlert ? 'bg-red-500' : 'bg-teal-600'
                      }`}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div
                    className="absolute right-0 top-11 w-80 sm:w-96 p-4 z-50 rounded-2xl shadow-xl"
                    style={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--border-subtle)' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          Notification Center
                        </div>
                        <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          Custom threshold: AQI {preferences?.alertThreshold ?? 150}+
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={onMarkAllRead}
                            className="text-[11px] font-semibold hover:underline"
                            style={{ color: 'var(--accent-teal)' }}
                          >
                            Mark read
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button
                            onClick={onClearNotifications}
                            className="text-[11px] font-medium hover:underline"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="py-7 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                        No active notifications. Alerts trigger automatically from live AQI, weather, and planner events.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => !n.isRead && onMarkNotifRead(n.id)}
                            className="p-3 rounded-xl flex gap-2.5 items-start cursor-pointer transition-colors"
                            style={{
                              background: n.isRead ? 'var(--bg-subtle)' : 'rgba(13, 148, 136, 0.08)',
                              border: `1px solid ${n.isRead ? 'var(--border-subtle)' : 'var(--border-accent)'}`,
                              opacity: n.isRead ? 0.78 : 1,
                            }}
                          >
                            <div className="mt-0.5 flex-shrink-0">{renderAlertIcon(n)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent-teal)' }}>
                                  {n.category || n.type?.replace(/_/g, ' ')}
                                </span>
                                {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
                              </div>
                              <div className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                                {n.title}
                              </div>
                              <div className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                {n.message}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setNotifOpen(false);
                        setActiveTab('settings');
                      }}
                      className="mt-3 w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                      style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                    >
                      <SlidersHorizontal size={12} /> Manage Alert Preferences
                    </button>
                  </div>
                )}
              </div>

              {/* Account Button / Menu */}
              {authUser ? (
                <div className="relative">
                  <button
                    onClick={() => {
                      setAccountOpen(!accountOpen);
                      setCityOpen(false);
                      setNotifOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold"
                    style={{
                      background: 'rgba(13, 148, 136, 0.12)',
                      color: 'var(--accent-teal)',
                      border: '1px solid var(--border-accent)',
                    }}
                  >
                    <User size={14} />
                    <span className="hidden md:inline max-w-[80px] truncate">{authUser.name.split(' ')[0]}</span>
                  </button>

                  {accountOpen && (
                    <div
                      className="absolute right-0 top-11 w-60 p-3 z-50 rounded-2xl shadow-xl space-y-2"
                      style={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--border-subtle)' }}
                    >
                      <div className="px-2 py-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                        <div className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{authUser.name}</div>
                        <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{authUser.email}</div>
                      </div>
                      <button
                        onClick={() => {
                          setAccountOpen(false);
                          setActiveTab('settings');
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium hover:bg-teal-500/10 flex items-center gap-2"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <SettingsIcon size={13} /> Profile & Settings
                      </button>
                      <button
                        onClick={() => {
                          setAccountOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium hover:bg-red-500/10 text-red-500 flex items-center gap-2"
                      >
                        <LogOut size={13} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => onOpenAuth('login')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold btn-brand"
                >
                  <LogIn size={13} />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}

              {/* Mobile Menu Toggle */}
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
                {mobileOpen ? <X size={17} /> : <Menu size={17} />}
              </button>
            </div>
          </div>
        </div>

        {/* Tablet / Mobile Navigation Drawer */}
        {mobileOpen && (
          <div
            className="xl:hidden border-t px-4 py-3"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface-solid)' }}
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
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={
                      active
                        ? { background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: '#ffffff' }
                        : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }
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
