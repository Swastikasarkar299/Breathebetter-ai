import express from 'express';
import { getDb, makeId } from '../db.js';
import { getCached, setCached } from '../utils/cache.js';

const router = express.Router();

const WMO_LABELS = {
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

function getAqiCategoryLabel(aqi) {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive';
  if (aqi <= 200) return 'Poor';
  if (aqi <= 300) return 'Very Poor';
  return 'Hazardous';
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

const STATION_PRESETS = [
  { city: 'New Delhi, India', lat: 28.6139, lon: 77.2090 },
  { city: 'Mumbai, India', lat: 19.0760, lon: 72.8777 },
  { city: 'Bengaluru, India', lat: 12.9716, lon: 77.5946 },
  { city: 'Kolkata, India', lat: 22.5726, lon: 88.3639 },
  { city: 'Chennai, India', lat: 13.0827, lon: 80.2707 },
  { city: 'Hyderabad, India', lat: 17.3850, lon: 78.4867 },
  { city: 'Lucknow, India', lat: 26.8467, lon: 80.9462 },
  { city: 'Patna, India', lat: 25.5941, lon: 85.1376 },
  { city: 'London, UK', lat: 51.5072, lon: -0.1276 },
  { city: 'New York, USA', lat: 40.7128, lon: -74.0060 },
  { city: 'Singapore', lat: 1.3521, lon: 103.8198 },
  { city: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503 },
];

async function fetchIqAirStation(lat, lon) {
  const key = (process.env.IQAIR_API_KEY || '').trim();
  if (!key) return { supported: false, reason: 'IQAIR_API_KEY not configured on server' };

  const cacheKey = `iqair:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = getCached(cacheKey);
  if (hit) return hit;

  try {
    const resp = await fetch(
      `https://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lon}&key=${encodeURIComponent(key)}`
    );
    if (!resp.ok) {
      return { supported: false, reason: `IQAir API returned HTTP ${resp.status}` };
    }
    const json = await resp.json();
    if (json?.status !== 'success' || !json?.data) {
      return { supported: false, reason: json?.data?.message || 'IQAir response unavailable' };
    }
    const d = json.data;
    const pol = d.current?.pollution || {};
    const wea = d.current?.weather || {};
    const parsed = {
      supported: true,
      stationCity: [d.city, d.state, d.country].filter(Boolean).join(', '),
      aqius: pol.aqius ?? null,
      mainPollutantUs: pol.mainus ?? null,
      timestamp: pol.ts ?? null,
      weather: {
        temperature: wea.tp ?? null,
        humidity: wea.hu ?? null,
        pressure: wea.pr ?? null,
        windSpeedMs: wea.ws ?? null,
      },
    };
    setCached(cacheKey, parsed, 10 * 60 * 1000);
    return parsed;
  } catch (err) {
    return { supported: false, reason: err?.message || 'IQAir request failed' };
  }
}

async function fetchOpenMeteoBundle(lat, lon, label) {
  const cacheKey = `om:${Number(lat).toFixed(3)},${Number(lon).toFixed(3)}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return { ...cached, location: label || cached.location, cached: true };
  }

  const [aqResp, wResp] = await Promise.all([
    fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,sulphur_dioxide,uv_index&hourly=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone&past_days=6&forecast_days=3&timezone=auto`
    ),
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,surface_pressure&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto`
    ),
  ]);

  if (!aqResp.ok || !wResp.ok) {
    throw new Error(`Open-Meteo upstream error (AQ ${aqResp.status}, Weather ${wResp.status})`);
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
  const weatherCondition = WMO_LABELS[weatherCode] || 'Ambient';

  const times = aq.hourly?.time || [];
  const aqis = aq.hourly?.us_aqi || [];
  const pm25s = aq.hourly?.pm2_5 || [];
  const pm10s = aq.hourly?.pm10 || [];

  const nowMs = Date.now();
  const dailyPastBuckets = {};
  const dailyForecastBuckets = {};

  times.forEach((t, idx) => {
    const val = aqis[idx];
    if (val == null) return;
    const ms = new Date(t).getTime();
    const dateStr = t.slice(0, 10);
    if (ms <= nowMs + 6 * 3600 * 1000) {
      if (!dailyPastBuckets[dateStr]) dailyPastBuckets[dateStr] = { sumAqi: 0, sumPm: 0, sumPm10: 0, count: 0 };
      dailyPastBuckets[dateStr].sumAqi += val;
      dailyPastBuckets[dateStr].sumPm += pm25s[idx] ?? 0;
      dailyPastBuckets[dateStr].sumPm10 += pm10s[idx] ?? 0;
      dailyPastBuckets[dateStr].count += 1;
    } else {
      if (!dailyForecastBuckets[dateStr]) dailyForecastBuckets[dateStr] = { sumAqi: 0, sumPm: 0, minAqi: val, maxAqi: val, count: 0 };
      dailyForecastBuckets[dateStr].sumAqi += val;
      dailyForecastBuckets[dateStr].sumPm += pm25s[idx] ?? 0;
      dailyForecastBuckets[dateStr].minAqi = Math.min(dailyForecastBuckets[dateStr].minAqi, val);
      dailyForecastBuckets[dateStr].maxAqi = Math.max(dailyForecastBuckets[dateStr].maxAqi, val);
      dailyForecastBuckets[dateStr].count += 1;
    }
  });

  const trendData = Object.entries(dailyPastBuckets)
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

  const dailyForecast = Object.entries(dailyForecastBuckets)
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

  const iqair = await fetchIqAirStation(lat, lon);
  const resolvedName = label || `${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)}`;

  const payload = {
    location: resolvedName,
    lat: Number(lat),
    lon: Number(lon),
    aqi,
    euAqi: cur.european_aqi != null ? Math.round(cur.european_aqi) : null,
    category: getAqiCategoryLabel(aqi),
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
    stationLabel: iqair.supported ? `${iqair.stationCity} (IQAir + CAMS)` : `Copernicus CAMS Grid (${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)})`,
    iqair,
    isLive: true,
    cached: false,
    dataSource: iqair.supported ? 'Open-Meteo + IQAir Live' : 'Open-Meteo Live',
    lastUpdated: new Date().toISOString(),
  };

  setCached(cacheKey, payload, 5 * 60 * 1000);

  // Record historical snapshot in DB at most once every 30 min per city
  try {
    const db = getDb();
    const recent = db.prepare(`
      SELECT id FROM aqi_history
      WHERE lower(city) = lower(?) AND recorded_at >= datetime('now', '-30 minutes')
      LIMIT 1
    `).get(resolvedName);
    if (!recent) {
      db.prepare(`
        INSERT INTO aqi_history (id, city, lat, lon, aqi, pm25, pm10, no2, o3, co, so2, temperature, humidity, wind_speed, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        makeId(),
        resolvedName,
        payload.lat,
        payload.lon,
        payload.aqi,
        payload.pm25,
        payload.pm10,
        payload.no2,
        payload.o3,
        payload.co,
        payload.so2,
        payload.temperature,
        payload.humidity,
        payload.windSpeed,
        payload.dataSource
      );
    }
  } catch (dbErr) {
    console.warn('[History Log Skipped]', dbErr?.message);
  }

  return payload;
}

router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ results: [] });

  const cacheKey = `geo:${q.toLowerCase()}`;
  const hit = getCached(cacheKey);
  if (hit) return res.json({ results: hit, cached: true });

  try {
    const resp = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`
    );
    if (!resp.ok) return res.status(502).json({ error: 'Geocoding upstream error', results: [] });
    const data = await resp.json();
    const results = (data.results || []).map((r) => ({
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
    setCached(cacheKey, results, 60 * 60 * 1000);
    return res.json({ results });
  } catch {
    return res.status(502).json({ error: 'Failed to reach geocoding service', results: [] });
  }
});

router.get('/live', async (req, res) => {
  try {
    const { city, lat, lon, label } = req.query;

    if (lat != null && lon != null) {
      const data = await fetchOpenMeteoBundle(Number(lat), Number(lon), label ? String(label) : null);
      return res.json(data);
    }

    const cityQuery = String(city || 'New Delhi, India').trim();
    const geoCacheKey = `geo-first:${cityQuery.toLowerCase()}`;
    let place = getCached(geoCacheKey);

    if (!place) {
      const geoResp = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery.split(',')[0].trim())}&count=4&language=en&format=json`
      );
      if (!geoResp.ok) {
        return res.status(502).json({ error: 'Geocoding service temporarily unavailable.', isLive: false });
      }
      const geoJson = await geoResp.json();
      const results = geoJson?.results || [];
      if (!results.length) {
        return res.status(404).json({ error: `City "${cityQuery}" was not found.`, isLive: false });
      }
      const hint = cityQuery.includes(',') ? cityQuery.split(',')[1].trim().toLowerCase() : '';
      place = (hint && results.find((r) => (r.country || '').toLowerCase().includes(hint))) || results[0];
      setCached(geoCacheKey, place, 60 * 60 * 1000);
    }

    const resolvedName = [place.name, place.country].filter(Boolean).join(', ');
    const data = await fetchOpenMeteoBundle(place.latitude, place.longitude, resolvedName);
    return res.json(data);
  } catch (err) {
    console.error('[Live AQI Error]', err);
    return res.status(502).json({
      error: err?.message || 'Unable to fetch real-time air quality data.',
      isLive: false,
    });
  }
});

router.get('/compare', async (req, res) => {
  try {
    const citiesParam = String(req.query.cities || 'New Delhi, India|Mumbai, India|Bengaluru, India|London, UK');
    const requested = citiesParam.split('|').map((s) => s.trim()).filter(Boolean).slice(0, 5);

    const results = await Promise.all(
      requested.map(async (cityName) => {
        try {
          const geoResp = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName.split(',')[0].trim())}&count=1&language=en&format=json`
          );
          if (!geoResp.ok) return { location: cityName, error: 'Geocoding failed', isLive: false };
          const geo = await geoResp.json();
          const place = geo?.results?.[0];
          if (!place) return { location: cityName, error: 'Not found', isLive: false };
          const resolved = [place.name, place.country].filter(Boolean).join(', ');
          return await fetchOpenMeteoBundle(place.latitude, place.longitude, resolved);
        } catch (err) {
          return { location: cityName, error: err?.message || 'Fetch error', isLive: false };
        }
      })
    );

    return res.json({ cities: results });
  } catch {
    return res.status(500).json({ error: 'Comparison request failed.' });
  }
});

router.get('/stations', async (_req, res) => {
  const cacheKey = 'stations:global';
  const hit = getCached(cacheKey);
  if (hit) return res.json({ stations: hit, cached: true });

  try {
    const stations = await Promise.all(
      STATION_PRESETS.map(async (st) => {
        try {
          const data = await fetchOpenMeteoBundle(st.lat, st.lon, st.city);
          return {
            city: data.location,
            lat: data.lat,
            lon: data.lon,
            aqi: data.aqi,
            category: data.category,
            pm25: data.pm25,
            pm10: data.pm10,
            temperature: data.temperature,
            humidity: data.humidity,
            windSpeed: data.windSpeed,
            dataSource: data.dataSource,
            lastUpdated: data.lastUpdated,
            isLive: true,
          };
        } catch {
          return { ...st, isLive: false, error: 'Unavailable' };
        }
      })
    );

    setCached(cacheKey, stations, 10 * 60 * 1000);
    return res.json({ stations });
  } catch {
    return res.status(500).json({ error: 'Failed to load monitoring stations.' });
  }
});

router.get('/history', (req, res) => {
  try {
    const city = String(req.query.city || '').trim();
    const days = Math.min(90, Math.max(1, Number(req.query.days || 30)));
    const db = getDb();

    const rows = city
      ? db
          .prepare(`
            SELECT * FROM aqi_history
            WHERE lower(city) LIKE lower(?) AND recorded_at >= datetime('now', ?)
            ORDER BY recorded_at DESC LIMIT 200
          `)
          .all(`%${city.split(',')[0].trim()}%`, `-${days} days`)
      : db
          .prepare(`
            SELECT * FROM aqi_history
            WHERE recorded_at >= datetime('now', ?)
            ORDER BY recorded_at DESC LIMIT 200
          `)
          .all(`-${days} days`);

    return res.json({
      records: rows,
      note: rows.length
        ? 'Stored live telemetry snapshots collected by BreatheBetter AI.'
        : 'No stored multi-day snapshots for this filter yet; snapshots accumulate automatically whenever live stations are queried.',
    });
  } catch {
    return res.status(500).json({ error: 'Failed to query stored AQI history.' });
  }
});

export default router;
