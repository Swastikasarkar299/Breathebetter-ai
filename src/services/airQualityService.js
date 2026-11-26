import {
  decodeWeatherCode,
  degToCompass,
  pm25ToUsAqi,
  getAqiCategory,
  parseOpenMeteoSeries,
} from '../../shared/aqiUtils.js';
import { fetchWithResilience } from '../utils/fetchWithResilience.js';

const LAST_GOOD_CACHE = new Map();

/**
 * Search global cities via backend cache proxy or direct Open-Meteo Geocoding API.
 */
export async function searchCities(query) {
  const q = (query || '').trim();
  if (q.length < 2) return [];

  try {
    const resp = await fetchWithResilience(`/api/air-quality/search?q=${encodeURIComponent(q)}`, {
      timeoutMs: 5000,
      retries: 0,
    });
    if (resp.ok) {
      const json = await resp.json();
      if (Array.isArray(json.results)) return json.results;
    }
  } catch {
    // fallback directly to keyless Open-Meteo geocoding
  }

  try {
    const resp = await fetchWithResilience(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`,
      { timeoutMs: 5500, retries: 1 }
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

  try {
    const resp = await fetchWithResilience(`/api/air-quality/live?city=${encodeURIComponent(cityLabel)}`, {
      timeoutMs: 8500,
      retries: 1,
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data?.isLive) {
        LAST_GOOD_CACHE.set(cityLabel.toLowerCase(), data);
        return data;
      }
    } else if (resp.status === 404 || resp.status === 400) {
      const errBody = await resp.json().catch(() => ({}));
      return unavailableResult(cityLabel, errBody.error || `City "${cityLabel}" not found.`);
    }
  } catch {
    // Fallback to direct keyless Open-Meteo if backend server is offline
  }

  try {
    const queryName = cityLabel.split(',')[0].trim();
    const geoResp = await fetchWithResilience(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryName)}&count=4&language=en&format=json`,
      { timeoutMs: 6000, retries: 1 }
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
    const stale = LAST_GOOD_CACHE.get(cityLabel.toLowerCase());
    if (stale) {
      return {
        ...stale,
        isStale: true,
        staleReason: `Showing last verified reading (${err?.message || 'network unavailable'}).`,
      };
    }
    return unavailableResult(cityLabel, err?.message || 'Unable to connect to live air quality APIs.');
  }
}

export async function fetchLiveByCoords(lat, lon, labelOverride = null) {
  try {
    const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
    if (labelOverride) params.set('label', labelOverride);
    const resp = await fetchWithResilience(`/api/air-quality/live?${params.toString()}`, {
      timeoutMs: 8500,
      retries: 1,
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data?.isLive) {
        if (labelOverride) LAST_GOOD_CACHE.set(labelOverride.toLowerCase(), data);
        return data;
      }
    }
  } catch {
    // Direct keyless Open-Meteo fallback below
  }

  try {
    const [aqResp, wResp] = await Promise.all([
      fetchWithResilience(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,sulphur_dioxide,uv_index&hourly=us_aqi,pm2_5,pm10&past_days=6&forecast_days=3&timezone=auto`,
        { timeoutMs: 7500, retries: 1 }
      ),
      fetchWithResilience(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,surface_pressure&timezone=auto`,
        { timeoutMs: 7500, retries: 1 }
      ),
    ]);

    if (!aqResp.ok || !wResp.ok) {
      throw new Error('Live air quality or weather API returned an error.');
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
    const cat = getAqiCategory(aqi);
    const resolvedLabel = labelOverride || `${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)}`;

    const payload = {
      location: resolvedLabel,
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
      stationLabel: `Copernicus CAMS Model (${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)})`,
      iqair: { supported: false, reason: 'Backend proxy offline' },
      isLive: true,
      isStale: false,
      error: null,
      dataSource: 'Open-Meteo Live (Direct)',
      lastUpdated: new Date().toISOString(),
    };
    LAST_GOOD_CACHE.set(resolvedLabel.toLowerCase(), payload);
    return payload;
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
    aqiStandard: 'US_EPA',
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
    isStale: false,
    error: errorMessage,
    dataSource: 'Unavailable',
    lastUpdated: new Date().toISOString(),
  };
}
