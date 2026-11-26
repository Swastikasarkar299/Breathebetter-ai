import { getAqiCategory } from '../data/mockData';

const WMO_WEATHER_LABELS = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog / Mist',
  48: 'Rime fog',
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

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function degToCompass(deg) {
  if (deg == null || Number.isNaN(Number(deg))) return 'N/A';
  const idx = Math.round(((Number(deg) % 360) / 45)) % 8;
  return `${COMPASS[idx]} (${Math.round(deg)}°)`;
}

function pm25ToUsAqi(pm25 = 0) {
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

export async function searchCities(query) {
  const q = (query || '').trim();
  if (q.length < 2) return [];

  // Prefer backend cached search
  try {
    const resp = await fetch(`/api/air-quality/search?q=${encodeURIComponent(q)}`);
    if (resp.ok) {
      const json = await resp.json();
      if (Array.isArray(json.results)) return json.results;
    }
  } catch {
    // fallback directly to public keyless Open-Meteo geocoding
  }

  try {
    const resp = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.results || []).map((r) => ({
      id: r.id || `${r.latitude},${r.longitude}`,
      name: r.name,
      admin1: r.admin1 || '',
      country: r.country || '',
      latitude: r.latitude,
      longitude: r.longitude,
      displayName: [r.name, r.admin1 && r.admin1 !== r.name ? r.admin1 : null, r.country]
        .filter(Boolean)
        .join(', '),
      shortLabel: [r.name, r.country].filter(Boolean).join(', '),
    }));
  } catch {
    return [];
  }
}

export async function fetchLiveCityAirQuality(cityInput) {
  const isCityObj = cityInput && typeof cityInput === 'object';
  const cityLabel = isCityObj
    ? cityInput.shortLabel || cityInput.displayName
    : String(cityInput || 'New Delhi, India').trim();

  if (isCityObj && typeof cityInput.latitude === 'number' && typeof cityInput.longitude === 'number') {
    return fetchLiveByCoords(cityInput.latitude, cityInput.longitude, cityLabel);
  }

  // 1. Try secure Express / Vercel cached API first
  try {
    const resp = await fetch(`/api/air-quality/live?city=${encodeURIComponent(cityLabel)}`);
    if (resp.ok) {
      const data = await resp.json();
      if (data?.isLive) return data;
    } else if (resp.status === 404) {
      const errBody = await resp.json().catch(() => ({}));
      return unavailableResult(cityLabel, errBody.error || `City "${cityLabel}" not found.`);
    }
  } catch {
    // Fallback to direct keyless Open-Meteo if backend server is offline
  }

  // 2. Direct keyless Open-Meteo browser call
  try {
    const queryName = cityLabel.split(',')[0].trim();
    const geoResp = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryName)}&count=4&language=en&format=json`
    );
    if (!geoResp.ok) {
      throw new Error(`Geocoding service failed (${geoResp.status})`);
    }
    const geoJson = await geoResp.json();
    const results = geoJson?.results || [];
    if (!results.length) {
      return unavailableResult(cityLabel, `Could not find "${cityLabel}". Try searching with city and country.`);
    }
    const hint = cityLabel.includes(',') ? cityLabel.split(',')[1].trim().toLowerCase() : '';
    const place = (hint && results.find((r) => (r.country || '').toLowerCase().includes(hint))) || results[0];
    const resolved = [place.name, place.country].filter(Boolean).join(', ');
    return await fetchLiveByCoords(place.latitude, place.longitude, resolved);
  } catch (err) {
    return unavailableResult(cityLabel, err?.message || 'Unable to connect to live air quality APIs.');
  }
}

export async function fetchLiveByCoords(lat, lon, labelOverride = null) {
  // 1. Try secure backend first
  try {
    const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
    if (labelOverride) params.set('label', labelOverride);
    const resp = await fetch(`/api/air-quality/live?${params.toString()}`);
    if (resp.ok) {
      const data = await resp.json();
      if (data?.isLive) return data;
    }
  } catch {
    // Direct public keyless Open-Meteo fallback below
  }

  try {
    const [aqResp, wResp] = await Promise.all([
      fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,sulphur_dioxide,uv_index&hourly=us_aqi,pm2_5,pm10&past_days=6&forecast_days=3&timezone=auto`
      ),
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,surface_pressure&timezone=auto`
      ),
    ]);

    if (!aqResp.ok || !wResp.ok) {
      throw new Error('Live air quality or weather API returned an error.');
    }

    const [aq, w] = await Promise.all([aqResp.json(), wResp.json()]);
    const cur = aq.current || {};
    const wCur = w.current || {};

    const pm25 = Number((cur.pm2_5 ?? 0).toFixed(1));
    const aqi = Math.round(cur.us_aqi ?? pm25ToUsAqi(pm25));
    const pm10 = Number((cur.pm10 ?? 0).toFixed(1));
    const no2 = Number((cur.nitrogen_dioxide ?? 0).toFixed(1));
    const o3 = Number((cur.ozone ?? 0).toFixed(1));
    const so2 = Number((cur.sulphur_dioxide ?? 0).toFixed(1));
    const co = Number((((cur.carbon_monoxide ?? 0) / 1000)).toFixed(2));
    const uvIndex = cur.uv_index != null ? Number(cur.uv_index.toFixed(1)) : null;

    const temperature = Math.round(wCur.temperature_2m ?? 0);
    const feelsLike = Math.round(wCur.apparent_temperature ?? temperature);
    const humidity = Math.round(wCur.relative_humidity_2m ?? 0);
    const windSpeed = Number((wCur.wind_speed_10m ?? 0).toFixed(1));
    const windDirectionDeg = wCur.wind_direction_10m != null ? Math.round(wCur.wind_direction_10m) : null;
    const windDirection = degToCompass(windDirectionDeg);
    const pressure = wCur.surface_pressure != null ? Math.round(wCur.surface_pressure) : null;
    const weatherCode = wCur.weather_code ?? 0;
    const weatherCondition = WMO_WEATHER_LABELS[weatherCode] || 'Ambient';

    const times = aq.hourly?.time || [];
    const aqis = aq.hourly?.us_aqi || [];
    const pm25s = aq.hourly?.pm2_5 || [];
    const pm10s = aq.hourly?.pm10 || [];

    const nowMs = Date.now();
    const pastBuckets = {};
    const forecastBuckets = {};

    times.forEach((t, idx) => {
      const val = aqis[idx];
      if (val == null) return;
      const ms = new Date(t).getTime();
      const dStr = t.slice(0, 10);
      if (ms <= nowMs + 6 * 3600 * 1000) {
        if (!pastBuckets[dStr]) pastBuckets[dStr] = { sumAqi: 0, sumPm: 0, sumPm10: 0, count: 0 };
        pastBuckets[dStr].sumAqi += val;
        pastBuckets[dStr].sumPm += pm25s[idx] ?? 0;
        pastBuckets[dStr].sumPm10 += pm10s[idx] ?? 0;
        pastBuckets[dStr].count += 1;
      } else {
        if (!forecastBuckets[dStr]) forecastBuckets[dStr] = { sumAqi: 0, sumPm: 0, minAqi: val, maxAqi: val, count: 0 };
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
        const d = new Date(dateStr + 'T12:00:00');
        return {
          date: dateStr,
          day: d.toLocaleDateString('en-US', { weekday: 'short' }),
          aqi: Math.round(b.sumAqi / b.count),
          pm25: Math.round(b.sumPm / b.count),
          pm10: Math.round(b.sumPm10 / b.count),
        };
      });

    const dailyForecast = Object.entries(forecastBuckets)
      .slice(0, 3)
      .map(([dateStr, b]) => {
        const d = new Date(dateStr + 'T12:00:00');
        return {
          date: dateStr,
          day: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          avgAqi: Math.round(b.sumAqi / b.count),
          minAqi: Math.round(b.minAqi),
          maxAqi: Math.round(b.maxAqi),
          avgPm25: Number((b.sumPm / b.count).toFixed(1)),
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
        });
      }
    }

    const cat = getAqiCategory(aqi);
    return {
      location: labelOverride || `${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)}`,
      lat: Number(lat),
      lon: Number(lon),
      aqi,
      euAqi: cur.european_aqi != null ? Math.round(cur.european_aqi) : null,
      category: cat.label,
      pm25,
      pm10,
      no2,
      o3,
      co,
      so2,
      uvIndex,
      temperature,
      feelsLike,
      humidity,
      windSpeed,
      windDirectionDeg,
      windDirection,
      pressure,
      weatherCode,
      weatherCondition,
      trendData,
      hourlyData,
      dailyForecast,
      hasLiveTrend: trendData.length >= 2,
      stationLabel: `Copernicus CAMS Grid (${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)})`,
      iqair: { supported: false, reason: 'Backend proxy offline' },
      isLive: true,
      error: null,
      dataSource: 'Open-Meteo Live (Direct)',
      lastUpdated: new Date().toISOString(),
    };
  } catch (err) {
    return unavailableResult(labelOverride || 'Selected Location', err?.message || 'Unable to fetch live readings.');
  }
}

function unavailableResult(location, errorMessage) {
  return {
    location,
    lat: null,
    lon: null,
    aqi: null,
    category: 'Unavailable',
    pm25: null,
    pm10: null,
    no2: null,
    o3: null,
    co: null,
    so2: null,
    uvIndex: null,
    temperature: null,
    feelsLike: null,
    humidity: null,
    windSpeed: null,
    windDirection: 'N/A',
    pressure: null,
    weatherCondition: 'Unavailable',
    trendData: [],
    hourlyData: [],
    dailyForecast: [],
    hasLiveTrend: false,
    stationLabel: 'No live station connected',
    isLive: false,
    error: errorMessage,
    dataSource: 'Unavailable',
    lastUpdated: new Date().toISOString(),
  };
}
