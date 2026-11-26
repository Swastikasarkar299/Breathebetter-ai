import express from 'express';
import { getDb, makeId } from '../db.js';
import { getCached, setCached } from '../utils/cache.js';
import { fetchWithTimeoutRetry } from '../utils/httpClient.js';
import { sanitizeText, validateLatLon } from '../middleware/validate.js';
import {
  decodeWeatherCode,
  degToCompass,
  pm25ToUsAqi,
  getAqiCategory,
  parseOpenMeteoSeries,
} from '../../shared/aqiUtils.js';

const router = express.Router();

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
    const resp = await fetchWithTimeoutRetry(
      `https://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lon}&key=${encodeURIComponent(key)}`,
      { timeoutMs: 6000, retries: 1 }
    );
    if (!resp.ok) {
      return { supported: false, reason: `IQAir API returned HTTP ${resp.status}` };
    }
    const json = await resp.json();
    if (json?.status !== 'success' || !json?.data) {
      return { supported: false, reason: json?.data?.message || 'IQAir data unavailable for this location' };
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
    return { supported: false, reason: err?.message || 'IQAir request timed out' };
  }
}

async function fetchOpenMeteoBundle(lat, lon, label) {
  const cacheKey = `om:${Number(lat).toFixed(3)},${Number(lon).toFixed(3)}`;
  const staleKey = `om-stale:${Number(lat).toFixed(3)},${Number(lon).toFixed(3)}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return { ...cached, location: label || cached.location, cached: true, isStale: false };
  }

  try {
    const [aqResp, wResp] = await Promise.all([
      fetchWithTimeoutRetry(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,sulphur_dioxide,uv_index&hourly=us_aqi,pm2_5,pm10&past_days=6&forecast_days=3&timezone=auto`,
        { timeoutMs: 7500, retries: 1 }
      ),
      fetchWithTimeoutRetry(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,surface_pressure&timezone=auto`,
        { timeoutMs: 7500, retries: 1 }
      ),
    ]);

    if (!aqResp.ok || !wResp.ok) {
      throw new Error(`Open-Meteo upstream error (AQ ${aqResp.status}, Weather ${wResp.status})`);
    }

    const [aq, w] = await Promise.all([aqResp.json(), wResp.json()]);
    const cur = aq.current || {};
    const wCur = w.current || {};

    const pm25 = cur.pm2_5 != null ? Number(cur.pm2_5.toFixed(1)) : null;
    const aqi = cur.us_aqi != null ? Math.round(cur.us_aqi) : pm25 != null ? pm25ToUsAqi(pm25) : null;
    const pm10 = cur.pm10 != null ? Number(cur.pm10.toFixed(1)) : null;
    const no2 = cur.nitrogen_dioxide != null ? Number(cur.nitrogen_dioxide.toFixed(1)) : null;
    const o3 = cur.ozone != null ? Number(cur.ozone.toFixed(1)) : null;
    const so2 = cur.sulphur_dioxide != null ? Number(cur.sulphur_dioxide.toFixed(1)) : null;
    const co = cur.carbon_monoxide != null ? Number((cur.carbon_monoxide / 1000).toFixed(2)) : null;
    const uvIndex = cur.uv_index != null ? Number(cur.uv_index.toFixed(1)) : null;

    const temperature = wCur.temperature_2m != null ? Math.round(wCur.temperature_2m) : null;
    const feelsLike = wCur.apparent_temperature != null ? Math.round(wCur.apparent_temperature) : temperature;
    const humidity = wCur.relative_humidity_2m != null ? Math.round(wCur.relative_humidity_2m) : null;
    const windSpeed = wCur.wind_speed_10m != null ? Number(wCur.wind_speed_10m.toFixed(1)) : null;
    const windDirectionDeg = wCur.wind_direction_10m != null ? Math.round(wCur.wind_direction_10m) : null;
    const windDirection = degToCompass(windDirectionDeg);
    const pressure = wCur.surface_pressure != null ? Math.round(wCur.surface_pressure) : null;
    const weatherCode = wCur.weather_code ?? 0;
    const weatherCondition = decodeWeatherCode(weatherCode);

    const { trendData, dailyForecast, hourlyData } = parseOpenMeteoSeries(aq.hourly || {});
    const iqair = await fetchIqAirStation(lat, lon);
    const resolvedName = label || `${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)}`;
    const cat = getAqiCategory(aqi);

    const payload = {
      location: resolvedName,
      lat: Number(lat),
      lon: Number(lon),
      aqi,
      aqiStandard: 'US_EPA',
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
      stationLabel: iqair.supported
        ? `${iqair.stationCity} (IQAir Station + Open-Meteo)`
        : `Copernicus CAMS Model (${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)})`,
      iqair,
      isLive: true,
      isStale: false,
      cached: false,
      dataSource: iqair.supported ? 'Open-Meteo + IQAir Live' : 'Open-Meteo Live',
      lastUpdated: new Date().toISOString(),
    };

    setCached(cacheKey, payload, 5 * 60 * 1000);
    setCached(staleKey, payload, 45 * 60 * 1000);

    try {
      const db = getDb();
      const recent = db
        .prepare(`
          SELECT id FROM aqi_history
          WHERE lower(city) = lower(?) AND recorded_at >= datetime('now', '-30 minutes')
          LIMIT 1
        `)
        .get(resolvedName);
      if (!recent && aqi != null) {
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
    } catch {
      // Non-fatal history write failure
    }

    return payload;
  } catch (err) {
    const stale = getCached(staleKey);
    if (stale) {
      return {
        ...stale,
        location: label || stale.location,
        isLive: true,
        isStale: true,
        cached: true,
        staleReason: `Showing last verified reading (${err?.message || 'upstream delay'}).`,
      };
    }
    throw err;
  }
}

router.get('/search', async (req, res) => {
  const q = sanitizeText(req.query.q, 80);
  if (q.length < 2) return res.json({ results: [] });

  const cacheKey = `geo:${q.toLowerCase()}`;
  const hit = getCached(cacheKey);
  if (hit) return res.json({ results: hit, cached: true });

  try {
    const resp = await fetchWithTimeoutRetry(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`,
      { timeoutMs: 5500, retries: 1 }
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

    if (lat != null || lon != null) {
      const check = validateLatLon(lat, lon);
      if (!check.valid) return res.status(400).json({ error: check.error, isLive: false });
      const data = await fetchOpenMeteoBundle(check.lat, check.lon, label ? sanitizeText(label, 120) : null);
      return res.json(data);
    }

    const cityQuery = sanitizeText(city || 'New Delhi, India', 100);
    if (cityQuery.length < 2) {
      return res.status(400).json({ error: 'City query must be at least 2 characters.', isLive: false });
    }

    const geoCacheKey = `geo-first:${cityQuery.toLowerCase()}`;
    let place = getCached(geoCacheKey);

    if (!place) {
      const geoResp = await fetchWithTimeoutRetry(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery.split(',')[0].trim())}&count=4&language=en&format=json`,
        { timeoutMs: 5500, retries: 1 }
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
    return res.status(502).json({
      error: err?.message || 'Unable to fetch real-time air quality data.',
      isLive: false,
    });
  }
});

router.get('/compare', async (req, res) => {
  try {
    const citiesParam = sanitizeText(
      req.query.cities || 'New Delhi, India|Mumbai, India|Bengaluru, India|London, UK',
      300
    );
    const requested = citiesParam.split('|').map((s) => sanitizeText(s, 80)).filter(Boolean).slice(0, 5);
    if (!requested.length) return res.status(400).json({ error: 'Provide at least one city to compare.' });

    const results = await Promise.all(
      requested.map(async (cityName) => {
        try {
          const geoResp = await fetchWithTimeoutRetry(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName.split(',')[0].trim())}&count=1&language=en&format=json`,
            { timeoutMs: 5500, retries: 1 }
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
    const city = sanitizeText(req.query.city, 80);
    const days = Math.min(90, Math.max(1, Number(req.query.days || 30) || 30));
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
        : 'No stored multi-day snapshots for this filter yet; snapshots record automatically when cities are queried.',
    });
  } catch {
    return res.status(500).json({ error: 'Failed to query stored AQI history.' });
  }
});

export default router;
