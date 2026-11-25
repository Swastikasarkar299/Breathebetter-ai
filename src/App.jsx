import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle, CheckCircle2, Info, SlidersHorizontal, ArrowRight, ShieldAlert,
} from 'lucide-react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import ChatAssistant from './components/ChatAssistant';
import DailyPlanner from './components/DailyPlanner';
import IndoorAir from './components/IndoorAir';
import EcoImpact from './components/EcoImpact';
import Community from './components/Community';
import Settings from './components/Settings';
import { getCityData, getAqiCategory, generateAlerts } from './data/mockData';
import { fetchLiveCityAirQuality, fetchLiveByCoords } from './services/airQualityService';

const PAGE_META = {
  dashboard: {
    title: 'Air Quality Overview',
    subtitle: 'Real-time particulate matter, meteorology, and health risk telemetry',
  },
  assistant: {
    title: 'AI Health Assistant',
    subtitle: 'Evidence-based guidance tailored to live local AQI and personal sensitivity',
  },
  planner: {
    title: 'Daily Activity Planner',
    subtitle: 'Hourly outdoor safety windows, exercise guidance, and daily routines',
  },
  indoor: {
    title: 'Indoor Air Quality',
    subtitle: 'Ventilation timing, filtration sizing, and room-by-room protection',
  },
  impact: {
    title: 'Eco Impact & Carbon',
    subtitle: 'Estimated emissions footprint, transit comparisons, and clean-air tracking',
  },
  community: {
    title: 'Community Action',
    subtitle: 'Neighborhood updates, pollution reporting, and shared clean-air challenges',
  },
  settings: {
    title: 'Settings & Preferences',
    subtitle: 'Profile personalization, alerts, theme mode, and AQI standards',
  },
};

function loadSaved(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('bb_theme') || 'light';
    } catch {
      return 'light';
    }
  });

  const [userProfile, setUserProfile] = useState(() =>
    loadSaved('bb_user_profile', {
      name: 'Arjun S.',
      location: 'New Delhi, India',
      type: 'Working Professional',
      transport: 'Public Transport',
      outdoorActivity: 'Moderately Active',
      indoor: 'Apartment (small)',
      budget: 'Medium (₹500–5000)',
    })
  );

  const [preferences, setPreferences] = useState(() =>
    loadSaved('bb_preferences', {
      aqiAlerts: true,
      dailyReport: true,
      weatherAlerts: true,
      communityUpdates: true,
      alertThreshold: 150,
      tempUnit: 'C',
      autoDetectLocation: false,
      privacy: {
        locationAccess: false,
        localStorage: true,
        communityLeaderboard: true,
      },
    })
  );

  const [apiKeys, setApiKeys] = useState(() =>
    loadSaved('bb_api_keys', {
      openweather: import.meta.env.VITE_OPENWEATHER_API_KEY || '',
      iqair: import.meta.env.VITE_IQAIR_API_KEY || '',
      openai: import.meta.env.VITE_GEMINI_API_KEY || '',
    })
  );

  const [airQuality, setAirQuality] = useState(() =>
    getCityData(userProfile.location || 'New Delhi, India')
  );
  const [isLoadingCity, setIsLoadingCity] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [ecoScoreSummary, setEcoScoreSummary] = useState(() => {
    try {
      return Number(localStorage.getItem('bb_eco_score_cache') || 74);
    } catch {
      return 74;
    }
  });

  // Apply light/dark theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('bb_theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('bb_user_profile', JSON.stringify(userProfile));
    } catch {
      // ignore
    }
  }, [userProfile]);

  useEffect(() => {
    try {
      localStorage.setItem('bb_preferences', JSON.stringify(preferences));
    } catch {
      // ignore
    }
  }, [preferences]);

  useEffect(() => {
    try {
      localStorage.setItem('bb_api_keys', JSON.stringify(apiKeys));
    } catch {
      // ignore
    }
  }, [apiKeys]);

  const fetchCityAirQuality = async (cityInput) => {
    setIsLoadingCity(true);
    setApiError(null);
    const liveData = await fetchLiveCityAirQuality(cityInput, apiKeys.openweather);
    setAirQuality(liveData);
    if (liveData.error) {
      setApiError(liveData.error);
    } else {
      setUserProfile((p) => ({ ...p, location: liveData.location }));
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
        setPreferences((pr) => ({
          ...pr,
          privacy: { ...(pr.privacy || {}), locationAccess: true },
        }));
        setIsLoadingCity(false);
      },
      (err) => {
        setIsLoadingCity(false);
        setApiError(
          err?.code === 1
            ? 'Location permission was declined. You can search any city manually above.'
            : 'Unable to determine device location right now.'
        );
      },
      { timeout: 10000 }
    );
  };

  // Initial live fetch on startup
  useEffect(() => {
    if (preferences.autoDetectLocation && navigator.geolocation) {
      handleRequestLocation();
    } else {
      fetchCityAirQuality(userProfile.location || 'New Delhi, India');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alerts = useMemo(() => generateAlerts(airQuality, preferences), [airQuality, preferences]);
  const thresholdBreached =
    preferences.aqiAlerts !== false && airQuality.aqi >= (preferences.alertThreshold ?? 150);

  const cat = getAqiCategory(airQuality.aqi);
  const pageInfo = PAGE_META[activeTab] || PAGE_META.dashboard;

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formatTemp = (celsius) => {
    if (preferences.tempUnit === 'F') {
      return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    }
    return `${celsius}°C`;
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div className="app-backdrop" />

      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          airQuality={airQuality}
          onSelectCity={fetchCityAirQuality}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          alerts={alerts}
          preferences={preferences}
          isLoadingCity={isLoadingCity}
        />

        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
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
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div
                  className="surface-card px-3.5 py-2 flex items-center gap-2.5"
                  style={{ borderRadius: '14px' }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full animate-pulse-soft"
                    style={{ background: cat.color }}
                  />
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    AQI {airQuality.aqi}
                  </span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: cat.bg, color: cat.color }}
                  >
                    {cat.label}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Custom Threshold Breach Banner */}
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
                  <strong>Air Quality Alert:</strong> {airQuality.location.split(',')[0]} is at{' '}
                  <strong>AQI {airQuality.aqi}</strong>, above your alert threshold of{' '}
                  <strong>{preferences.alertThreshold}</strong>. {cat.sensitiveAdvice}
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
                  <SlidersHorizontal size={12} /> Threshold
                </button>
              </div>
            </div>
          )}

          {/* Active Page View */}
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
              />
            )}
            {activeTab === 'assistant' && (
              <ChatAssistant
                airQuality={airQuality}
                userProfile={userProfile}
                apiKeys={apiKeys}
              />
            )}
            {activeTab === 'planner' && (
              <DailyPlanner
                airQuality={airQuality}
                userProfile={userProfile}
              />
            )}
            {activeTab === 'indoor' && (
              <IndoorAir
                airQuality={airQuality}
                userProfile={userProfile}
              />
            )}
            {activeTab === 'impact' && (
              <EcoImpact
                userProfile={userProfile}
                onScoreChange={(score) => {
                  setEcoScoreSummary(score);
                  try {
                    localStorage.setItem('bb_eco_score_cache', String(score));
                  } catch {
                    // ignore
                  }
                }}
              />
            )}
            {activeTab === 'community' && (
              <Community
                airQuality={airQuality}
                userEcoScore={ecoScoreSummary}
                userName={userProfile.name}
              />
            )}
            {activeTab === 'settings' && (
              <Settings
                userProfile={userProfile}
                setUserProfile={(next) => {
                  setUserProfile(next);
                  if (next.location && next.location !== airQuality.location) {
                    fetchCityAirQuality(next.location);
                  }
                }}
                preferences={preferences}
                setPreferences={setPreferences}
                theme={theme}
                setTheme={setTheme}
                apiKeys={apiKeys}
                setApiKeys={setApiKeys}
                onRequestLocation={handleRequestLocation}
              />
            )}
          </div>
        </main>

        {/* Footer */}
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
                BreatheBetter AI · Data source:{' '}
                <strong style={{ color: airQuality.isLive ? 'var(--accent-teal)' : '#d97706' }}>
                  {airQuality.isLive ? airQuality.dataSource : 'Offline Reference (Not Live)'}
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
    </div>
  );
}
