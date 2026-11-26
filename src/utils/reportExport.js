import { getAqiCategory } from '../data/mockData';

export function exportAirQualityCsv(airQuality, historyRows = []) {
  const headers = ['Timestamp', 'Location', 'AQI', 'Category', 'PM2.5 (ug/m3)', 'PM10 (ug/m3)', 'NO2 (ug/m3)', 'O3 (ug/m3)', 'CO (mg/m3)', 'SO2 (ug/m3)', 'Temp (C)', 'Humidity (%)', 'Wind (km/h)', 'Source'];
  const rows = [
    [
      airQuality.lastUpdated || new Date().toISOString(),
      airQuality.location,
      airQuality.aqi ?? 'N/A',
      airQuality.category || 'N/A',
      airQuality.pm25 ?? 'N/A',
      airQuality.pm10 ?? 'N/A',
      airQuality.no2 ?? 'N/A',
      airQuality.o3 ?? 'N/A',
      airQuality.co ?? 'N/A',
      airQuality.so2 ?? 'N/A',
      airQuality.temperature ?? 'N/A',
      airQuality.humidity ?? 'N/A',
      airQuality.windSpeed ?? 'N/A',
      airQuality.dataSource || 'Unknown',
    ],
    ...(historyRows || []).map((r) => [
      r.recorded_at || r.date || '',
      r.city || airQuality.location,
      r.aqi ?? '',
      getAqiCategory(r.aqi).label,
      r.pm25 ?? '',
      r.pm10 ?? '',
      r.no2 ?? '',
      r.o3 ?? '',
      r.co ?? '',
      r.so2 ?? '',
      r.temperature ?? '',
      r.humidity ?? '',
      r.wind_speed ?? '',
      r.source || '',
    ]),
  ];

  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `breathebetter-${(airQuality.location || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function openPrintableAirQualityReport(airQuality) {
  const cat = getAqiCategory(airQuality.aqi);
  const generatedAt = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>BreatheBetter AI — Air Quality Report (${airQuality.location})</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; margin: 36px; line-height: 1.5; }
    .header { border-bottom: 2px solid #0d9488; padding-bottom: 14px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: flex-end; }
    h1 { margin: 0; font-size: 22px; color: #0f172a; }
    .meta { font-size: 12px; color: #475569; }
    .hero { display: flex; gap: 20px; padding: 18px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; margin-bottom: 22px; }
    .aqi { font-size: 42px; font-weight: 800; color: ${cat.color}; line-height: 1; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 22px; }
    .card { padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; }
    .label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .val { font-size: 18px; font-weight: 700; margin-top: 4px; }
    .box { padding: 14px; border-radius: 10px; background: #f0fdfa; border: 1px solid #99f6e4; margin-bottom: 16px; font-size: 13px; }
    .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; }
    @media print { body { margin: 18px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>BreatheBetter AI — Environmental Health Report</h1>
      <div class="meta">Location: <strong>${airQuality.location}</strong> · Station: ${airQuality.stationLabel || 'N/A'}</div>
    </div>
    <div class="meta" style="text-align:right">
      <div>Generated: ${generatedAt}</div>
      <div>Data Source: <strong>${airQuality.dataSource || 'Unavailable'}</strong></div>
    </div>
  </div>

  <div class="hero">
    <div>
      <div class="label">US Air Quality Index</div>
      <div class="aqi">${airQuality.aqi ?? 'N/A'}</div>
      <div style="font-weight:700; color:${cat.color}; font-size:14px;">${airQuality.category || 'Unavailable'}</div>
    </div>
    <div style="flex:1">
      <div class="label">Health Assessment</div>
      <p style="margin:4px 0 6px; font-size:13px;">${airQuality.isLive ? cat.description : 'Live sensor measurements were unavailable at export time.'}</p>
      <p style="margin:0; font-size:12px; color:#475569;"><strong>Sensitive Groups:</strong> ${cat.sensitiveAdvice}</p>
    </div>
  </div>

  <div class="label" style="margin-bottom:8px;">Pollutant Concentrations</div>
  <div class="grid">
    <div class="card"><div class="label">PM2.5</div><div class="val">${airQuality.pm25 ?? 'N/A'} µg/m³</div></div>
    <div class="card"><div class="label">PM10</div><div class="val">${airQuality.pm10 ?? 'N/A'} µg/m³</div></div>
    <div class="card"><div class="label">NO₂</div><div class="val">${airQuality.no2 ?? 'N/A'} µg/m³</div></div>
    <div class="card"><div class="label">O₃ (Ozone)</div><div class="val">${airQuality.o3 ?? 'N/A'} µg/m³</div></div>
    <div class="card"><div class="label">CO</div><div class="val">${airQuality.co ?? 'N/A'} mg/m³</div></div>
    <div class="card"><div class="label">SO₂</div><div class="val">${airQuality.so2 ?? 'N/A'} µg/m³</div></div>
  </div>

  <div class="label" style="margin-bottom:8px;">Meteorological Context</div>
  <div class="grid">
    <div class="card"><div class="label">Temperature / Feels Like</div><div class="val">${airQuality.temperature ?? 'N/A'}°C / ${airQuality.feelsLike ?? 'N/A'}°C</div></div>
    <div class="card"><div class="label">Humidity & Pressure</div><div class="val">${airQuality.humidity ?? 'N/A'}% · ${airQuality.pressure ?? 'N/A'} hPa</div></div>
    <div class="card"><div class="label">Wind & UV Index</div><div class="val">${airQuality.windSpeed ?? 'N/A'} km/h ${airQuality.windDirection || ''} · UV ${airQuality.uvIndex ?? 'N/A'}</div></div>
  </div>

  <div class="box">
    <strong>Recommended Precautions:</strong>
    ${(airQuality.aqi ?? 0) > 150
      ? 'Avoid vigorous outdoor workouts, wear an N95/KN95 mask outdoors, seal windows during traffic peaks, and protect children/seniors indoors.'
      : (airQuality.aqi ?? 0) > 100
        ? 'Sensitive groups should limit strenuous roadside activity; ventilate indoors during midday hours.'
        : 'Air quality is generally favorable for outdoor exercise and natural cross-ventilation.'}
  </div>

  <div class="footer">
    Report generated by BreatheBetter AI · Data Timestamp: ${airQuality.lastUpdated || generatedAt} · Informational environmental guidance only; not a substitute for clinical medical advice.
  </div>
  <script>window.onload = () => { setTimeout(() => window.print(), 250); };</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=860,height=720');
  if (w) {
    w.document.open();
    w.document.write(html);
    w.document.close();
  }
}
