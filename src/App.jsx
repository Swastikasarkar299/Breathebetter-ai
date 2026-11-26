import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import {
  AlertTriangle, CheckCircle2, Info, SlidersHorizontal, ArrowRight, ShieldAlert,
} from 'lucide-react';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import AuthModal from './components/AuthModal';
import { getCityData, getAqiCategory, generateAlerts } from './data/mockData';
import { fetchLiveCityAirQuality, fetchLiveByCoords } from './services/airQualityService';
import { authApi, notificationsApi, getAuthToken, setAuthToken } from './services/apiClient';
import { useTheme } from './hooks/useTheme';
import { usePersistentState } from './hooks/usePersistentState';

// Code-split page modules for faster initial load
const Dashboard = lazy(() => import('./components/Dashboard'));
const ChatAssistant = lazy(() => import('./components/ChatAssistant'));
const DailyPlanner = lazy(() => import('./components/DailyPlanner'));
const IndoorAir = lazy(() => import('./components/IndoorAir'));
const EcoImpact = lazy(() => import('./components/EcoImpact'));
const Community = lazy(() => import('./components/Community'));
const Analytics = lazy(() => import('./components/Analytics'));
const Settings = lazy(() => import('./components/Settings'));

const PAGE_META = {
  dashboard: {
    title: 'Air Quality Overview',
    subtitle: 'Real-time particulate matter, meteorology, forecasts, and risk intelligence',
  },
  assistant: {
    title: 'AI Health Assistant',
    subtitle: 'Context-aware guidance backed by live environmental readings',
  },
  planner: {
    title: 'Smart Daily Planner',
    subtitle: 'Pollution-aware outdoor windows, forecasts, and personal activity scheduling',
  },
  indoor: {
    title: 'Indoor Air Quality',
    subtitle: 'Ventilation scheduling, filtration sizing, and indoor safety guidance',
  },
  impact: {
    title: 'Eco Impact & Carbon',
    subtitle: 'Interactive commute footprint calculator and sustainability progress',
  },
  community: {
    title: 'Community Platform',
    subtitle: 'Local pollution reports, discussions, likes, comments, and challenges',
  },
  analytics: {
    title: 'Analytics, Map & Education',
    subtitle: 'City comparisons, live station map, historical logs, CSV/PDF reports, and AQI learning center',
  },
  settings: {
    title: 'Settings & Account',
    subtitle: 'Theme mode, saved locations, AQI standards, alerts, and account preferences',
  },
};

const PageLoader = () => (
  <div className="space-y-4">
    <div className="surface-card p-6 space-y-3">
      <div className="skeleton h-6 w-48" />
      <div className="skeleton h-40 w-full" />
    </div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [authUser, setAuthUser] = useState(null);
  const [savedLocations, setSavedLocations] = usePersistentState('bb_saved_locations', []);
  const { theme, setTheme, toggleTheme } = useTheme('light');

  const [userProfile, setUserProfile] = usePersistentState('bb_user_profile', {
    name: 'Guest Explorer',
    location: 'New Delhi, India',
    type: 'Working Professional',
    transport: 'Public Transport',
    outdoorActivity: 'Moderately Active',
    indoor: 'Apartment (small)',
    budget: 'Medium (₹500–5000)',
  });

  const [preferences, setPreferences] = usePersistentState('bb_preferences', {
    aqiAlerts: true,
    dailyReport: true,
    weatherAlerts: true,
    plannerReminders: true,
    challengeAlerts: true,
    alertThreshold: 150,
    aqiStandard: 'US_EPA',
    tempUnit: 'C',
    language: 'en',
    autoDetectLocation: false,
  });

  const [airQuality, setAirQuality] = useState(() => getCityData(userProfile.location || 'New Delhi, India'));
  const [isLoadingCity, setIsLoadingCity] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [storedNotifications, setStoredNotifications] = useState([]);
  const [readDynamicIds, setReadDynamicIds] = usePersistentState('bb_read_dyn_alerts', []);
  const [clearedDynamic, setClearedDynamic] = useState(false);

  // Restore authenticated session if token exists
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    authApi
      .me()
      .then((res) => {
        if (res?.user) {
          setAuthUser(res.user);
          if (res.user.profile && Object.keys(res.user.profile).length) {
            setUserProfile((p) => ({ ...p, ...res.user.profile }));
          }
          if (res.user.preferences && Object.keys(res.user.preferences).length) {
            setPreferences((pr) => ({ ...pr, ...res.user.preferences }));
          }
          if (Array.isArray(res.savedLocations)) {
            setSavedLocations(res.savedLocations);
          }
        }
      })
      .catch(() => {
        setAuthToken('');
      });
  }, [setPreferences, setSavedLocations, setUserProfile]);

  // Load persisted notifications from API
  const refreshNotifications = () => {
    notificationsApi
      .list()
      .then((res) => {
        if (Array.isArray(res?.notifications)) setStoredNotifications(res.notifications);
      })
      .catch(() => {
        // Offline or backend not running — dynamic notifications still render cleanly
      });
  };

  useEffect(() => {
    refreshNotifications();
  }, [authUser]);

  const fetchCityAirQuality = async (cityInput) => {
    setIsLoadingCity(true);
    setApiError(null);
    setClearedDynamic(false);
    const liveData = await fetchLiveCityAirQuality(cityInput);
    setAirQuality(liveData);
    if (liveData.error) {
      setApiError(liveData.error);
    } else {
      setUserProfile((p) => ({ ...p, location: liveData.location }));
      // Persist real AQI breach notification if threshold crossed
      if (
        liveData.isLive &&
        preferences.aqiAlerts !== false &&
        liveData.aqi >= (preferences.alertThreshold ?? 150)
      ) {
        notificationsApi
          .create({
            type: liveData.aqi > 200 ? 'very_high_aqi' : 'aqi_alert',
            title: `AQI ${liveData.aqi} (${liveData.category}) in ${liveData.location.split(',')[0]}`,
            message: `Exceeds your ${preferences.alertThreshold ?? 150} threshold. PM2.5 is ${liveData.pm25} µg/m³.`,
            city: liveData.location,
            aqiValue: liveData.aqi,
          })
          .then(refreshNotifications)
          .catch(() => {});
      }
    }
    setIsLoadingCity(false);
  };

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setApiError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLoadingCity(true);
    setApiError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let label = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
        try {
          const rev = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          if (rev.ok) {
            const data = await rev.json();
            const city =
              data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              data.address?.county ||
              data.address?.state;
            const country = data.address?.country;
            if (city) label = country ? `${city}, ${country}` : city;
          }
        } catch {
          // keep coordinate label
        }
        const liveData = await fetchLiveByCoords(latitude, longitude, label);
        setAirQuality(liveData);
        if (liveData.error) {
          setApiError(liveData.error);
        } else {
          setUserProfile((p) => ({ ...p, location: liveData.location }));
        }
        setIsLoadingCity(false);
      },
      (err) => {
        setIsLoadingCity(false);
        setApiError(
          err?.code === 1
            ? 'Location access denied. Search any city manually above.'
            : 'Unable to acquire device coordinates.'
        );
      },
      { timeout: 10000 }
    );
  };

  // Initial live fetch
  useEffect(() => {
    if (preferences.autoDetectLocation && navigator.geolocation) {
      handleRequestLocation();
    } else {
      fetchCityAirQuality(userProfile.location || 'New Delhi, India');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Merge live real-time rule alerts + persisted backend notifications (no duplicates)
  const dynamicAlerts = useMemo(() => {
    if (!airQuality.isLive || clearedDynamic) return [];
    return generateAlerts(airQuality, preferences).map((a) => ({
      ...a,
      type: a.severity === 'critical' ? 'very_high_aqi' : a.severity === 'warning' ? 'weather_warning' : 'daily_summary',
      isRead: readDynamicIds.includes(a.id),
      isDynamic: true,
    }));
  }, [airQuality, preferences, readDynamicIds, clearedDynamic]);

  const combinedNotifications = useMemo(() => {
    const seen = new Set();
    const list = [...dynamicAlerts, ...storedNotifications].filter((n) => {
      if (seen.has(n.title)) return false;
      seen.add(n.title);
      return true;
    });
    return list;
  }, [dynamicAlerts, storedNotifications]);

  const handleMarkNotifRead = (id) => {
    if (dynamicAlerts.some((d) => d.id === id)) {
      setReadDynamicIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    } else {
      setStoredNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      notificationsApi.markRead(id).catch(() => {});
    }
  };

  const handleMarkAllRead = () => {
    setReadDynamicIds(dynamicAlerts.map((d) => d.id));
    setStoredNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    notificationsApi.markAllRead().catch(() => {});
  };

  const handleClearNotifications = () => {
    setClearedDynamic(true);
    setStoredNotifications([]);
    notificationsApi.clearAll().catch(() => {});
  };

  const handleAuthSuccess = (res) => {
    setAuthUser(res.user);
    if (res.user?.profile) setUserProfile((p) => ({ ...p, ...res.user.profile }));
    if (res.user?.preferences) setPreferences((pr) => ({ ...pr, ...res.user.preferences }));
    if (Array.isArray(res.savedLocations)) setSavedLocations(res.savedLocations);
  };

  const handleLogout = async () => {
    await authApi.logout().catch(() => {});
    setAuthToken('');
    setAuthUser(null);
    setSavedLocations([]);
  };

  const handleSaveCurrentCity = async () => {
    const cityName = airQuality.location;
    if (!cityName) return;
    if (authUser) {
      const res = await authApi.addLocation({ cityName, lat: airQuality.lat, lon: airQuality.lon }).catch(() => null);
      if (res?.savedLocations) setSavedLocations(res.savedLocations);
    } else {
      setSavedLocations((prev) =>
        prev.some((l) => l.cityName === cityName)
          ? prev
          : [{ id: `loc-${Date.now()}`, cityName, lat: airQuality.lat, lon: airQuality.lon }, ...prev]
      );
    }
  };

  const handleRemoveSavedLocation = async (id) => {
    if (authUser) {
      const res = await authApi.removeLocation(id).catch(() => null);
      if (res?.savedLocations) setSavedLocations(res.savedLocations);
    } else {
      setSavedLocations((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const persistProfileAndPrefs = async (nextProfile, nextPrefs) => {
    setUserProfile(nextProfile);
    setPreferences(nextPrefs);
    if (nextProfile.location && nextProfile.location !== airQuality.location) {
      fetchCityAirQuality(nextProfile.location);
    }
    if (authUser) {
      await authApi.updateProfile({
        name: nextProfile.name,
        profile: nextProfile,
        preferences: nextPrefs,
      }).catch(() => {});
    }
  };

  const thresholdBreached =
    airQuality.isLive &&
    preferences.aqiAlerts !== false &&
    airQuality.aqi >= (preferences.alertThreshold ?? 150);

  const cat = getAqiCategory(airQuality.aqi ?? 0);
  const pageInfo = PAGE_META[activeTab] || PAGE_META.dashboard;

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formatTemp = (celsius) => {
    if (celsius == null) return 'N/A';
    if (preferences.tempUnit === 'F') return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    return `${celsius}°C`;
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div className="app-backdrop" aria-hidden="true" />
      <div className="sr-only" aria-live="polite">
        {isLoadingCity
          ? `Loading live air quality for ${airQuality.location}`
          : airQuality.isLive
            ? `${airQuality.location} air quality index is ${airQuality.aqi}, ${cat.label}`
            : `Live air quality unavailable for ${airQuality.location}`}
      </div>

      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          airQuality={airQuality}
          onSelectCity={fetchCityAirQuality}
          theme={theme}
          onToggleTheme={toggleTheme}
          notifications={combinedNotifications}
          onMarkNotifRead={handleMarkNotifRead}
          onMarkAllRead={handleMarkAllRead}
          onClearNotifications={handleClearNotifications}
          preferences={preferences}
          isLoadingCity={isLoadingCity}
          authUser={authUser}
          savedLocations={savedLocations}
          onOpenAuth={(m = 'login') => {
            setAuthModalMode(m);
            setAuthModalOpen(true);
          }}
          onLogout={handleLogout}
        />

        <main id="main-content" tabIndex={-1} className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 focus:outline-none">
          {/* Page Header */}
          <div className="mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3 animate-fade-in-up">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--accent-teal)' }}>
                {todayFormatted} · {airQuality.location}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {pageInfo.title}
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {pageInfo.subtitle}
              </p>
            </div>

            {activeTab !== 'settings' && (
              <div className="surface-card px-3.5 py-2 flex items-center gap-2.5 self-start sm:self-auto" style={{ borderRadius: '14px' }}>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${airQuality.isLive ? 'animate-pulse-soft' : ''}`}
                  style={{ background: airQuality.isLive ? cat.color : '#94a3b8' }}
                />
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  AQI {airQuality.aqi ?? 'N/A'}
                </span>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: airQuality.isLive ? cat.bg : 'var(--bg-subtle)',
                    color: airQuality.isLive ? cat.color : 'var(--text-muted)',
                  }}
                >
                  {airQuality.isLive ? cat.label : 'Unavailable'}
                </span>
              </div>
            )}
          </div>

          {/* Threshold Alert Banner */}
          {thresholdBreached && activeTab === 'dashboard' && !isLoadingCity && (
            <div
              className="mb-5 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in-up"
              style={{
                background: airQuality.aqi > 200 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                border: `1px solid ${airQuality.aqi > 200 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.32)'}`,
              }}
            >
              <div className="flex items-start sm:items-center gap-2.5 text-xs sm:text-sm">
                <ShieldAlert
                  size={18}
                  className={`flex-shrink-0 mt-0.5 sm:mt-0 ${airQuality.aqi > 200 ? 'text-red-500' : 'text-amber-500'}`}
                />
                <span style={{ color: 'var(--text-primary)' }}>
                  <strong>Threshold Alert:</strong> {airQuality.location.split(',')[0]} is at{' '}
                  <strong>AQI {airQuality.aqi}</strong> (exceeds {preferences.alertThreshold}). {cat.sensitiveAdvice}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setActiveTab('assistant')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1"
                  style={{ background: 'var(--bg-surface-solid)', color: 'var(--accent-teal)' }}
                >
                  Ask AI <ArrowRight size={12} />
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="text-xs font-medium px-2.5 py-1.5 rounded-xl flex items-center gap-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <SlidersHorizontal size={12} /> Alerts
                </button>
              </div>
            </div>
          )}

          {/* Routed View */}
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <div className="animate-fade-in-up">
                {activeTab === 'dashboard' && (
                  <Dashboard
                    airQuality={airQuality}
                    onSelectCity={fetchCityAirQuality}
                    onRefresh={() => fetchCityAirQuality(airQuality.location)}
                    onRequestLocation={handleRequestLocation}
                    isLoadingCity={isLoadingCity}
                    apiError={apiError}
                    preferences={preferences}
                    formatTemp={formatTemp}
                    onNavigate={setActiveTab}
                    onSaveLocation={handleSaveCurrentCity}
                    isLocationSaved={savedLocations.some((l) => l.cityName === airQuality.location)}
                  />
                )}
                {activeTab === 'assistant' && (
                  <ChatAssistant airQuality={airQuality} userProfile={userProfile} />
                )}
                {activeTab === 'planner' && (
                  <DailyPlanner airQuality={airQuality} userProfile={userProfile} formatTemp={formatTemp} />
                )}
                {activeTab === 'indoor' && <IndoorAir airQuality={airQuality} />}
                {activeTab === 'impact' && <EcoImpact userProfile={userProfile} />}
                {activeTab === 'community' && <Community airQuality={airQuality} authUser={authUser} />}
                {activeTab === 'analytics' && <Analytics airQuality={airQuality} onSelectCity={fetchCityAirQuality} />}
                {activeTab === 'settings' && (
                  <Settings
                    key={authUser?.id || 'guest'}
                    userProfile={userProfile}
                    preferences={preferences}
                    onSaveAll={persistProfileAndPrefs}
                    theme={theme}
                    setTheme={setTheme}
                    onRequestLocation={handleRequestLocation}
                    authUser={authUser}
                    savedLocations={savedLocations}
                    onSelectCity={fetchCityAirQuality}
                    onRemoveLocation={handleRemoveSavedLocation}
                    onOpenAuth={(m = 'login') => {
                      setAuthModalMode(m);
                      setAuthModalOpen(true);
                    }}
                    onLogout={handleLogout}
                    airQuality={airQuality}
                  />
                )}
              </div>
            </Suspense>
          </ErrorBoundary>
        </main>

        <footer className="mt-10 pb-6 px-4">
          <div
            className="max-w-7xl mx-auto surface-card px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs"
            style={{ borderRadius: '14px' }}
          >
            <div className="flex items-center gap-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
              {airQuality.isLive ? (
                <CheckCircle2 size={14} className="text-emerald-500" />
              ) : (
                <AlertTriangle size={14} className="text-amber-500" />
              )}
              <span>
                BreatheBetter AI · Data:{' '}
                <strong style={{ color: airQuality.isLive ? 'var(--accent-teal)' : '#d97706' }}>
                  {airQuality.isLive ? airQuality.dataSource : 'Unavailable (Live API unreachable)'}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <Info size={13} />
              <span>Environmental health guidance is informational and not a medical diagnosis.</span>
            </div>
          </div>
        </footer>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        defaultLocation={airQuality.location}
      />
    </div>
  );
}
