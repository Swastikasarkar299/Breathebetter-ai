import { describe, it, expect } from 'vitest';
import {
  pm25ToUsAqi,
  degToCompass,
  getAqiCategory,
  decodeWeatherCode,
  parseOpenMeteoSeries,
} from '../shared/aqiUtils.js';
import {
  generateAlerts,
  analyzeHourlyWindows,
  getDynamicVentilationSchedule,
} from '../src/data/mockData.js';

describe('shared/aqiUtils', () => {
  it('converts PM2.5 concentrations accurately to US AQI scale', () => {
    expect(pm25ToUsAqi(0)).toBe(0);
    expect(pm25ToUsAqi(-5)).toBe(0);
    expect(pm25ToUsAqi(12.0)).toBe(50);
    expect(pm25ToUsAqi(35.4)).toBe(100);
    expect(pm25ToUsAqi(55.4)).toBe(150);
    expect(pm25ToUsAqi(150.4)).toBe(200);
    expect(pm25ToUsAqi(600)).toBe(500);
  });

  it('converts wind degrees into compass labels cleanly', () => {
    expect(degToCompass(0)).toBe('N (0°)');
    expect(degToCompass(90)).toBe('E (90°)');
    expect(degToCompass(225)).toBe('SW (225°)');
    expect(degToCompass(null)).toBe('N/A');
  });

  it('returns clear category metadata including Unavailable for missing AQI', () => {
    expect(getAqiCategory(null).label).toBe('Unavailable');
    expect(getAqiCategory(35).label).toBe('Good');
    expect(getAqiCategory(125).label).toBe('Unhealthy for Sensitive');
    expect(getAqiCategory(240).label).toBe('Very Poor');
    expect(getAqiCategory(360).label).toBe('Hazardous');
  });

  it('decodes WMO weather codes with safe fallback', () => {
    expect(decodeWeatherCode(0)).toBe('Clear sky');
    expect(decodeWeatherCode(45)).toBe('Fog / Mist');
    expect(decodeWeatherCode(999)).toBe('Ambient');
  });

  it('separates historical daily observations from future forecast days', () => {
    const now = new Date('2026-11-25T12:00:00Z').getTime();
    const hourly = {
      time: [
        '2026-11-24T10:00:00Z',
        '2026-11-25T10:00:00Z',
        '2026-11-26T10:00:00Z',
        '2026-11-26T14:00:00Z',
      ],
      us_aqi: [90, 110, 140, 160],
      pm2_5: [30, 40, 52, 60],
      pm10: [60, 80, 95, 110],
    };

    const parsed = parseOpenMeteoSeries(hourly, now);
    expect(parsed.trendData.length).toBe(2);
    expect(parsed.trendData.every((d) => d.isForecast === false)).toBe(true);
    expect(parsed.dailyForecast.length).toBe(1);
    expect(parsed.dailyForecast[0].isForecast).toBe(true);
    expect(parsed.dailyForecast[0].avgAqi).toBe(150);
    expect(parsed.dailyForecast[0].minAqi).toBe(140);
    expect(parsed.dailyForecast[0].maxAqi).toBe(160);
  });
});

describe('Dynamic alert & planner helpers', () => {
  it('does not generate alerts when live data is unavailable', () => {
    expect(generateAlerts({ isLive: false, aqi: null }, { alertThreshold: 100 })).toEqual([]);
  });

  it('generates threshold breach and stagnation alerts for live unhealthy data', () => {
    const alerts = generateAlerts(
      {
        isLive: true,
        location: 'New Delhi, India',
        aqi: 195,
        pm25: 120,
        windSpeed: 3.5,
        humidity: 78,
        temperature: 14,
        hourlyData: [
          { hour: '8AM', aqi: 210 },
          { hour: '2PM', aqi: 165 },
        ],
      },
      { aqiAlerts: true, weatherAlerts: true, dailyReport: true, alertThreshold: 150 }
    );

    expect(alerts.some((a) => a.id === 'threshold-breach')).toBe(true);
    expect(alerts.some((a) => a.id === 'weather-stagnation')).toBe(true);
    expect(alerts.some((a) => a.id === 'daily-summary')).toBe(true);
  });

  it('identifies cleanest and peak hours from hourly curve', () => {
    const win = analyzeHourlyWindows({
      hourlyData: [
        { hour: '8AM', aqi: 180 },
        { hour: '2PM', aqi: 95 },
        { hour: '8PM', aqi: 210 },
      ],
    });
    expect(win.bestHour).toBe('2PM');
    expect(win.bestAqi).toBe(95);
    expect(win.worstHour).toBe('8PM');
    expect(win.worstAqi).toBe(210);
  });

  it('returns offline guidance when ventilation schedule lacks live data', () => {
    const sched = getDynamicVentilationSchedule({ isLive: false, aqi: null });
    expect(sched[0].label).toContain('Awaiting Live');
  });
});
