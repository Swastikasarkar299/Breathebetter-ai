/**
 * Shared isomorphic Air Quality, Weather, and Parsing utilities
 * Used by both Frontend (`src/`) and Backend (`server/`).
 */

/**
 * @typedef {Object} HourlyPoint
 * @property {string} hour
 * @property {string} iso
 * @property {number} aqi
 * @property {number|null} pm25
 * @property {boolean} isForecast
 */

/**
 * @typedef {Object} DailyForecast
 * @property {string} date
 * @property {string} day
 * @property {number} avgAqi
 * @property {number} minAqi
 * @property {number} maxAqi
 * @property {number} avgPm25
 * @property {boolean} isForecast
 */

/**
 * @typedef {Object} AirQualityTelemetry
 * @property {string} location
 * @property {number|null} lat
 * @property {number|null} lon
 * @property {number|null} aqi
 * @property {string} category
 * @property {number|null} pm25
 * @property {number|null} pm10
 * @property {number|null} no2
 * @property {number|null} o3
 * @property {number|null} co
 * @property {number|null} so2
 * @property {number|null} uvIndex
 * @property {number|null} temperature
 * @property {number|null} feelsLike
 * @property {number|null} humidity
 * @property {number|null} windSpeed
 * @property {string} windDirection
 * @property {number|null} pressure
 * @property {string} weatherCondition
 * @property {boolean} isLive
 * @property {boolean=} isStale
 * @property {string=} staleReason
 * @property {string} dataSource
 * @property {string} lastUpdated
 */

export const WMO_WEATHER_LABELS = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog / Mist',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Light rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Light snow',
  80: 'Rain showers',
  95: 'Thunderstorm',
};

const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export const AQI_CATEGORIES = [
  {
    range: [0, 50],
    label: 'Good',
    shortLabel: 'Good',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    description: 'Air quality is clean and poses minimal risk. Ideal for outdoor activity and natural ventilation.',
    sensitiveAdvice: 'Safe for everyone including children, seniors, and respiratory patients.',
  },
  {
    range: [51, 100],
    label: 'Moderate',
    shortLabel: 'Moderate',
    color: '#84cc16',
    bg: 'rgba(132, 204, 22, 0.14)',
    description: 'Acceptable air quality overall. Unusually sensitive individuals may notice mild irritation during prolonged exertion.',
    sensitiveAdvice: 'People with asthma or dust allergies should monitor symptoms during strenuous activity.',
  },
  {
    range: [101, 150],
    label: 'Unhealthy for Sensitive',
    shortLabel: 'Sensitive',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.14)',
    description: 'Children, seniors, and people with heart or lung conditions should reduce prolonged outdoor exertion.',
    sensitiveAdvice: 'Keep rescue inhalers accessible; move strenuous workouts indoors or away from busy roads.',
  },
  {
    range: [151, 200],
    label: 'Poor',
    shortLabel: 'Poor',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.14)',
    description: 'Everyone may experience respiratory irritation. Limit outdoor cardio and wear a tight-fitting N95 mask in traffic.',
    sensitiveAdvice: 'Sensitive groups should avoid outdoor exertion and keep windows closed during rush hours.',
  },
  {
    range: [201, 300],
    label: 'Very Poor',
    shortLabel: 'Very Poor',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.14)',
    description: 'Health warning: prolonged exposure increases respiratory and cardiovascular strain across all age groups.',
    sensitiveAdvice: 'Stay indoors with HEPA filtration running; avoid vigorous outdoor activity.',
  },
  {
    range: [301, 500],
    label: 'Hazardous',
    shortLabel: 'Hazardous',
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.15)',
    description: 'Emergency air quality conditions. Minimize all outdoor exposure and run indoor air filtration.',
    sensitiveAdvice: 'Strict indoor stay advised for children, elderly, pregnant individuals, and cardiac/lung patients.',
  },
];

export function decodeWeatherCode(code) {
  return WMO_WEATHER_LABELS[code] || 'Ambient';
}

export function degToCompass(deg) {
  if (deg == null || Number.isNaN(Number(deg))) return 'N/A';
  const idx = Math.round(((Number(deg) % 360) + 360) % 360 / 45) % 8;
  return `${COMPASS_POINTS[idx]} (${Math.round(Number(deg))}°)`;
}

export function pm25ToUsAqi(pm25 = 0) {
  const c = Math.max(0, Number(pm25) || 0);
  const bps = [
    [0, 12.0, 0, 50],
    [12.1, 35.4, 51, 100],
    [35.5, 55.4, 101, 150],
    [55.5, 150.4, 151, 200],
    [150.5, 250.4, 201, 300],
    [250.5, 500.4, 301, 500],
  ];
  for (const [cLo, cHi, iLo, iHi] of bps) {
    if (c <= cHi) return Math.round(((iHi - iLo) / (cHi - cLo)) * (c - cLo) + iLo);
  }
  return 500;
}

export function getAqiCategory(aqi) {
  if (aqi == null || Number.isNaN(Number(aqi))) {
    return {
      range: [0, 0],
      label: 'Unavailable',
      shortLabel: 'N/A',
      color: '#64748b',
      bg: 'rgba(100, 116, 139, 0.14)',
      description: 'Live air quality measurements are currently unavailable.',
      sensitiveAdvice: 'Check local municipal updates or refresh when connected.',
    };
  }
  const val = Math.max(0, Math.round(Number(aqi)));
  return AQI_CATEGORIES.find((c) => val >= c.range[0] && val <= c.range[1]) || AQI_CATEGORIES[AQI_CATEGORIES.length - 1];
}

/**
 * Parse Open-Meteo hourly arrays into past 7-day trends, 3-day forecasts, and 28h hourly progression.
 * Clearly separates past/current observations from forecast buckets (`isForecast`).
 */
export function parseOpenMeteoSeries(hourly = {}, nowMs = Date.now()) {
  const times = hourly.time || [];
  const aqis = hourly.us_aqi || [];
  const pm25s = hourly.pm2_5 || [];
  const pm10s = hourly.pm10 || [];

  const pastBuckets = {};
  const forecastBuckets = {};

  times.forEach((t, idx) => {
    const val = aqis[idx];
    if (val == null) return;
    const ms = new Date(t).getTime();
    const dStr = t.slice(0, 10);
    if (ms <= nowMs + 2 * 3600 * 1000) {
      if (!pastBuckets[dStr]) pastBuckets[dStr] = { sumAqi: 0, sumPm: 0, sumPm10: 0, count: 0 };
      pastBuckets[dStr].sumAqi += val;
      pastBuckets[dStr].sumPm += pm25s[idx] ?? 0;
      pastBuckets[dStr].sumPm10 += pm10s[idx] ?? 0;
      pastBuckets[dStr].count += 1;
    } else {
      if (!forecastBuckets[dStr]) {
        forecastBuckets[dStr] = { sumAqi: 0, sumPm: 0, minAqi: val, maxAqi: val, count: 0 };
      }
      forecastBuckets[dStr].sumAqi += val;
      forecastBuckets[dStr].sumPm += pm25s[idx] ?? 0;
      forecastBuckets[dStr].minAqi = Math.min(forecastBuckets[dStr].minAqi, val);
      forecastBuckets[dStr].maxAqi = Math.max(forecastBuckets[dStr].maxAqi, val);
      forecastBuckets[dStr].count += 1;
    }
  });

  const trendData = Object.entries(pastBuckets)
    .slice(-7)
    .map(([dateStr, b]) => {
      const d = new Date(`${dateStr}T12:00:00`);
      return {
        date: dateStr,
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        aqi: Math.round(b.sumAqi / b.count),
        pm25: Math.round(b.sumPm / b.count),
        pm10: Math.round(b.sumPm10 / b.count),
        isForecast: false,
      };
    });

  const dailyForecast = Object.entries(forecastBuckets)
    .slice(0, 3)
    .map(([dateStr, b]) => {
      const d = new Date(`${dateStr}T12:00:00`);
      return {
        date: dateStr,
        day: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        avgAqi: Math.round(b.sumAqi / b.count),
        minAqi: Math.round(b.minAqi),
        maxAqi: Math.round(b.maxAqi),
        avgPm25: Number((b.sumPm / b.count).toFixed(1)),
        isForecast: true,
      };
    });

  let closestIdx = times.findIndex((t) => new Date(t).getTime() >= nowMs - 3600 * 1000);
  if (closestIdx < 0) closestIdx = Math.max(0, times.length - 24);
  const sliceStart = Math.max(0, closestIdx - 4);
  const sliceEnd = Math.min(times.length, sliceStart + 28);

  const hourlyData = [];
  for (let i = sliceStart; i < sliceEnd; i += 2) {
    if (aqis[i] != null) {
      const dt = new Date(times[i]);
      hourlyData.push({
        hour: dt.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).replace(' ', ''),
        iso: times[i],
        aqi: Math.round(aqis[i]),
        pm25: pm25s[i] != null ? Number(pm25s[i].toFixed(1)) : null,
        isForecast: dt.getTime() > nowMs,
      });
    }
  }

  return { trendData, dailyForecast, hourlyData };
}
