import { getCityData, getAqiCategory } from '../data/mockData';

const WMO_WEATHER_LABELS = {
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

export function decodeWeatherCode(code) {
  return WMO_WEATHER_LABELS[code] || 'Ambient conditions';
}

/**
 * Search cities globally via Open-Meteo Geocoding API (no key required).
 */
export async function searchCities(query) {
  const q = (query || '').trim();
  if (q.length < 2) return [];

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

/**
 * Fetch real-time AQI, pollutants, weather, and hourly/weekly trends by city name or object.
 */
export async function fetchLiveCityAirQuality(cityInput, openWeatherKey = '') {
  const isCityObj = cityInput && typeof cityInput === 'object';
  const cityLabel = isCityObj ? cityInput.shortLabel || cityInput.displayName : String(cityInput || 'New Delhi, India').trim();
  const base = getCityData(cityLabel);

  // Direct coordinates available from autocomplete selection
  if (isCityObj && typeof cityInput.latitude === 'number' && typeof cityInput.longitude === 'number') {
    return fetchLiveByCoords(cityInput.latitude, cityInput.longitude, cityLabel, base);
  }

  // Optional OpenWeatherMap key if configured by user
  if (openWeatherKey && openWeatherKey.trim().length > 10) {
    try {
      const geoResp = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cityLabel)}&limit=1&appid=${openWeatherKey.trim()}`
      );
      if (geoResp.ok) {
        const geo = await geoResp.json();
        if (Array.isArray(geo) && geo.length > 0) {
          const { lat, lon, name, country } = geo[0];
          const [aqiResp, weatherResp] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${openWeatherKey.trim()}`),
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${openWeatherKey.trim()}&units=metric`),
          ]);
          if (aqiResp.ok && weatherResp.ok) {
            const aqiJson = await aqiResp.json();
            const wJson = await weatherResp.json();
            const comp = aqiJson.list?.[0]?.components || {};
            const aqiMap = { 1: 32, 2: 78, 3: 132, 4: 195, 5: 315 };
            const scaledAqi = aqiMap[aqiJson.list?.[0]?.main?.aqi] || pm25ToUsAqi(comp.pm2_5);
            const cat = getAqiCategory(scaledAqi);

            // Also grab Open-Meteo hourly/weekly trend for chart fidelity
            const meteoExtra = await fetchLiveByCoords(lat, lon, `${name}, ${country}`, base);

            return {
              ...meteoExtra,
              location: `${name}, ${country}`,
              lat,
              lon,
              aqi: scaledAqi,
              category: cat.label,
              pm25: Number((comp.pm2_5 ?? meteoExtra.pm25).toFixed(1)),
              pm10: Number((comp.pm10 ?? meteoExtra.pm10).toFixed(1)),
              no2: Number((comp.no2 ?? meteoExtra.no2).toFixed(1)),
              o3: Number((comp.o3 ?? meteoExtra.o3).toFixed(1)),
              co: Number(((comp.co ?? 0) / 1000).toFixed(2)),
              so2: Number((comp.so2 ?? meteoExtra.so2 ?? 0).toFixed(1)),
              temperature: Math.round(wJson.main?.temp ?? meteoExtra.temperature),
              feelsLike: Math.round(wJson.main?.feels_like ?? wJson.main?.temp ?? meteoExtra.temperature),
              humidity: wJson.main?.humidity ?? meteoExtra.humidity,
              windSpeed: Number(((wJson.wind?.speed ?? 0) * 3.6).toFixed(1)),
              weatherCondition: wJson.weather?.[0]?.description || meteoExtra.weatherCondition,
              isLive: true,
              error: null,
              dataSource: 'OpenWeatherMap + Open-Meteo',
              lastUpdated: new Date().toISOString(),
            };
          }
        }
      }
    } catch {
      // Fall through cleanly to Open-Meteo
    }
  }

  // Primary Live Engine: Open-Meteo Geocoding + Air Quality + Weather
  try {
    const queryName = cityLabel.split(',')[0].trim();
    const geoResp = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryName)}&count=3&language=en&format=json`
    );
    if (!geoResp.ok) {
      throw new Error(`Geocoding service responded with status ${geoResp.status}`);
    }
    const geoData = await geoResp.json();
    const results = geoData?.results || [];
    if (results.length === 0) {
      return {
        ...base,
        location: cityLabel,
        isLive: false,
        hasLiveTrend: false,
        dataSource: 'Reference Fallback (City Not Found)',
        error: `Could not locate "${cityLabel}" via geocoding. Try including a major city name or country.`,
      };
    }

    // Prefer matching country if user specified "City, Country"
    const countryHint = cityLabel.includes(',') ? cityLabel.split(',')[1].trim().toLowerCase() : '';
    const place =
      (countryHint && results.find((r) => (r.country || '').toLowerCase().includes(countryHint))) ||
      results[0];

    const resolvedName = [place.name, place.country].filter(Boolean).join(', ');
    return await fetchLiveByCoords(place.latitude, place.longitude, resolvedName, base);
  } catch (err) {
    return {
      ...base,
      isLive: false,
      hasLiveTrend: false,
      dataSource: 'Offline Reference',
      error: err?.message || 'Unable to reach live air quality servers. Showing offline reference data.',
    };
  }
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

export async function fetchLiveByCoords(lat, lon, labelOverride = null, baseOverride = null) {
  const base = baseOverride || getCityData(labelOverride || 'New Delhi, India');

  try {
    const [aqResp, wResp] = await Promise.all([
      fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,sulphur_dioxide,uv_index&hourly=us_aqi,pm2_5&past_days=6&forecast_days=2&timezone=auto`
      ),
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,surface_pressure&timezone=auto`
      ),
    ]);

    if (!aqResp.ok || !wResp.ok) {
      throw new Error('Live weather or air-quality API temporarily unavailable.');
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

    const temperature = Math.round(wCur.temperature_2m ?? base.temperature);
    const feelsLike = Math.round(wCur.apparent_temperature ?? temperature);
    const humidity = Math.round(wCur.relative_humidity_2m ?? base.humidity);
    const windSpeed = Number((wCur.wind_speed_10m ?? base.windSpeed).toFixed(1));
    const weatherCode = wCur.weather_code ?? 0;
    const weatherCondition = decodeWeatherCode(weatherCode);
    const pressure = wCur.surface_pressure ? Math.round(wCur.surface_pressure) : null;

    // Real 7-day trend & next/current 24h hourly curve
    const times = aq.hourly?.time || [];
    const aqis = aq.hourly?.us_aqi || [];
    const pm25s = aq.hourly?.pm2_5 || [];

    const nowMs = Date.now();
    const dailyBuckets = {};
    times.forEach((t, idx) => {
      const val = aqis[idx];
      if (val == null) return;
      const ms = new Date(t).getTime();
      if (ms > nowMs + 6 * 3600 * 1000) return; // up to today
      const dateStr = t.slice(0, 10);
      if (!dailyBuckets[dateStr]) dailyBuckets[dateStr] = { sumAqi: 0, sumPm: 0, count: 0 };
      dailyBuckets[dateStr].sumAqi += val;
      dailyBuckets[dateStr].sumPm += pm25s[idx] ?? 0;
      dailyBuckets[dateStr].count += 1;
    });

    const trendData = Object.entries(dailyBuckets)
      .slice(-7)
      .map(([dateStr, b]) => {
        const d = new Date(dateStr + 'T12:00:00');
        return {
          day: d.toLocaleDateString('en-US', { weekday: 'short' }),
          aqi: Math.round(b.sumAqi / b.count),
          pm25: Math.round(b.sumPm / b.count),
        };
      });

    // Build 24h forecast window centered on today (from current hour - 3h to +21h)
    let closestIdx = times.findIndex((t) => new Date(t).getTime() >= nowMs - 3600 * 1000);
    if (closestIdx < 0) closestIdx = Math.max(0, times.length - 24);
    const sliceStart = Math.max(0, closestIdx - 3);
    const sliceEnd = Math.min(times.length, sliceStart + 24);

    const hourlyData = [];
    for (let i = sliceStart; i < sliceEnd; i += 2) {
      if (aqis[i] != null) {
        const dt = new Date(times[i]);
        const hr = dt.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).replace(' ', '');
        hourlyData.push({
          hour: hr,
          iso: times[i],
          aqi: Math.round(aqis[i]),
          pm25: pm25s[i] != null ? Number(pm25s[i].toFixed(1)) : null,
        });
      }
    }

    const cat = getAqiCategory(aqi);
    return {
      ...base,
      location: labelOverride || base.location,
      lat,
      lon,
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
      weatherCode,
      weatherCondition,
      pressure,
      trendData: trendData.length >= 3 ? trendData : base.trendData,
      hourlyData: hourlyData.length >= 4 ? hourlyData : base.hourlyData,
      hasLiveTrend: trendData.length >= 3,
      isLive: true,
      error: null,
      dataSource: 'Open-Meteo Live',
      lastUpdated: new Date().toISOString(),
    };
  } catch (err) {
    return {
      ...base,
      location: labelOverride || base.location,
      isLive: false,
      hasLiveTrend: false,
      dataSource: 'Offline Reference',
      error: err?.message || 'Network request failed while fetching real-time data.',
    };
  }
}

/**
 * Verify an optional user-supplied API key in Settings.
 */
export async function testApiKeyConnection(provider, key) {
  const trimmed = (key || '').trim();
  if (!trimmed) return { ok: false, message: 'Enter an API key first.' };

  try {
    if (provider === 'openweather') {
      const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=London&appid=${trimmed}`);
      if (r.ok) return { ok: true, message: 'Connected! OpenWeatherMap key is valid.' };
      return { ok: false, message: `Key rejected (HTTP ${r.status}).` };
    }
    if (provider === 'openai') {
      if (trimmed.startsWith('AIza')) {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${trimmed}`);
        if (r.ok) return { ok: true, message: 'Connected! Gemini API key verified.' };
        return { ok: false, message: `Gemini rejected key (HTTP ${r.status}).` };
      }
      const r = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${trimmed}` },
      });
      if (r.ok) return { ok: true, message: 'Connected! OpenAI key verified.' };
      return { ok: false, message: `Key check returned HTTP ${r.status}.` };
    }
    return { ok: false, message: 'Direct browser test is not supported for IQAir due to CORS; saved locally.' };
  } catch {
    return { ok: false, message: 'Network error while testing key.' };
  }
}
