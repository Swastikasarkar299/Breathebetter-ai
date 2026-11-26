import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import {
  BarChart3, Globe2, GitCompare, BookOpen, FileDown, Printer, MapPin,
  RefreshCw, Info, Plus, X, Loader2,
} from 'lucide-react';
import { analyticsApi } from '../services/apiClient';
import { getAqiCategory, POLLUTANT_META, aqiCategories } from '../data/mockData';
import { exportAirQualityCsv, openPrintableAirQualityReport } from '../utils/reportExport';
import ChartTooltip from './ui/ChartTooltip';

const DEFAULT_COMPARE_CITIES = [
  'New Delhi, India',
  'Mumbai, India',
  'Bengaluru, India',
  'London, UK',
];

// Equirectangular geo projection onto SVG viewBox
function projectCoords(lat, lon, region = 'global') {
  if (region === 'india') {
    // India bounding box: lon 67..98, lat 6..36
    const x = ((lon - 67) / (98 - 67)) * 760 + 20;
    const y = ((36 - lat) / (36 - 6)) * 340 + 20;
    return { x, y, visible: lon >= 66 && lon <= 99 && lat >= 5 && lat <= 37 };
  }
  const x = ((lon + 180) / 360) * 760 + 20;
  const y = ((82 - lat) / 145) * 340 + 20;
  return { x, y, visible: true };
}

export default function Analytics({ airQuality, onSelectCity }) {
  const [tab, setTab] = useState('trends'); // trends | compare | map | learn
  const [daysFilter, setDaysFilter] = useState(30);
  const [cityFilter, setCityFilter] = useState(airQuality?.location || '');
  const [historyRows, setHistoryRows] = useState([]);
  const [historyNote, setHistoryNote] = useState('');

  // City comparison
  const [compareCities, setCompareCities] = useState(DEFAULT_COMPARE_CITIES);
  const [compareInput, setCompareInput] = useState('');
  const [compareResults, setCompareResults] = useState([]);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // Interactive Pollution Map stations
  const [stations, setStations] = useState([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [mapRegion, setMapRegion] = useState('global');

  useEffect(() => {
    setCityFilter(airQuality?.location || '');
  }, [airQuality?.location]);

  useEffect(() => {
    if (tab !== 'trends') return;
    analyticsApi
      .history(cityFilter, daysFilter)
      .then((res) => {
        setHistoryRows(res.records || []);
        setHistoryNote(res.note || '');
      })
      .catch(() => {
        setHistoryRows([]);
        setHistoryNote('Start the Node backend server to accumulate multi-day SQLite history snapshots.');
      });
  }, [tab, cityFilter, daysFilter]);

  const loadComparison = async (list = compareCities) => {
    setLoadingCompare(true);
    try {
      const res = await analyticsApi.compare(list);
      setCompareResults(res.cities || []);
    } catch {
      setCompareResults([]);
    } finally {
      setLoadingCompare(false);
    }
  };

  useEffect(() => {
    if (tab === 'compare' && compareResults.length === 0) {
      loadComparison(compareCities);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const loadStations = async () => {
    setLoadingStations(true);
    try {
      const res = await analyticsApi.stations();
      const list = res.stations || [];
      setStations(list);
      if (list.length > 0 && !selectedStation) setSelectedStation(list[0]);
    } catch {
      setStations([]);
    } finally {
      setLoadingStations(false);
    }
  };

  useEffect(() => {
    if (tab === 'map' && stations.length === 0) {
      loadStations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // AQI Category distribution from live hourly curve
  const hourlyList = airQuality?.hourlyData || [];
  const categoryDistMap = {};
  hourlyList.forEach((h) => {
    const lbl = getAqiCategory(h.aqi).label;
    categoryDistMap[lbl] = (categoryDistMap[lbl] || 0) + 1;
  });
  const distributionData = Object.entries(categoryDistMap).map(([name, value]) => ({
    name,
    value,
    color: aqiCategories.find((c) => c.label === name)?.color || '#0d9488',
  }));

  const addCityToCompare = (e) => {
    e.preventDefault();
    const val = compareInput.trim();
    if (!val || compareCities.includes(val) || compareCities.length >= 5) return;
    const next = [...compareCities, val];
    setCompareCities(next);
    setCompareInput('');
    loadComparison(next);
  };

  const removeCompareCity = (c) => {
    const next = compareCities.filter((x) => x !== c);
    setCompareCities(next);
    setCompareResults((prev) => prev.filter((x) => x.location !== c));
  };

  return (
    <div className="space-y-5">
      {/* Navigation Tabs + Export Actions */}
      <div className="surface-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'trends', label: 'Trends & History', Icon: BarChart3 },
            { id: 'compare', label: 'City Comparison', Icon: GitCompare },
            { id: 'map', label: 'Pollution Map', Icon: Globe2 },
            { id: 'learn', label: 'Education Center', Icon: BookOpen },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-all"
              style={
                tab === id
                  ? { background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: '#fff' }
                  : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }
              }
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => exportAirQualityCsv(airQuality, historyRows)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}
          >
            <FileDown size={14} /> Export CSV
          </button>
          <button
            onClick={() => openPrintableAirQualityReport(airQuality)}
            className="btn-brand px-3.5 py-2 text-xs flex items-center gap-1.5"
          >
            <Printer size={14} /> Generate PDF Report
          </button>
        </div>
      </div>

      {/* 1. TRENDS & HISTORY */}
      {tab === 'trends' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 surface-card p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                    Weekly Daily AQI & PM2.5 — {airQuality.location}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Real 7-day trend from Open-Meteo hourly telemetry
                  </p>
                </div>
              </div>
              {airQuality.trendData?.length ? (
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={airQuality.trendData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="aqi" name="Daily Avg AQI" stroke="#0d9488" fill="rgba(13,148,136,0.2)" strokeWidth={2.5} />
                    <Area type="monotone" dataKey="pm25" name="Avg PM2.5 (µg/m³)" stroke="#0891b2" fill="rgba(8,145,178,0.14)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="p-8 text-center text-xs rounded-xl" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                  Live 7-day history unavailable while offline.
                </div>
              )}
            </div>

            <div className="lg:col-span-4 surface-card p-5 space-y-3">
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                24h AQI Category Distribution
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Share of hours by severity level</p>
              {distributionData.length ? (
                <>
                  <ResponsiveContainer width="100%" height={175}>
                    <PieChart>
                      <Pie data={distributionData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={68} paddingAngle={3}>
                        {distributionData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 justify-center text-[11px]">
                    {distributionData.map((d) => (
                      <span key={d.name} className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: d.color }} /> {d.name} ({d.value})
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-xs rounded-xl" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                  Distribution requires hourly API telemetry.
                </div>
              )}
            </div>
          </div>

          {/* Stored Historical Snapshots Table */}
          <div className="surface-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  Stored Historical Readings Archive
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {historyNote || 'Multi-month archive depends on recorded live snapshots stored in the database.'}
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  placeholder="Filter city..."
                  className="px-3 py-1.5 text-xs saas-input w-40"
                />
                <select
                  value={daysFilter}
                  onChange={(e) => setDaysFilter(Number(e.target.value))}
                  className="px-3 py-1.5 text-xs saas-input"
                >
                  <option value={7}>Last 7 Days</option>
                  <option value={30}>Last 30 Days</option>
                  <option value={90}>Last 90 Days</option>
                </select>
              </div>
            </div>

            {historyRows.length === 0 ? (
              <div className="p-5 rounded-xl text-xs text-center" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                No multi-day stored database snapshots match this filter yet. Live snapshots save automatically when cities are monitored via the backend API.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <th className="py-2 pr-3">Timestamp</th>
                      <th className="py-2 pr-3">City</th>
                      <th className="py-2 pr-3">AQI</th>
                      <th className="py-2 pr-3">PM2.5</th>
                      <th className="py-2 pr-3">PM10</th>
                      <th className="py-2 pr-3">Temp</th>
                      <th className="py-2">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.slice(0, 15).map((r) => (
                      <tr key={r.id} className="border-b" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                        <td className="py-2 pr-3">{new Date(r.recorded_at).toLocaleString()}</td>
                        <td className="py-2 pr-3 font-semibold">{r.city}</td>
                        <td className="py-2 pr-3 font-bold" style={{ color: getAqiCategory(r.aqi).color }}>{r.aqi}</td>
                        <td className="py-2 pr-3">{r.pm25} µg/m³</td>
                        <td className="py-2 pr-3">{r.pm10} µg/m³</td>
                        <td className="py-2 pr-3">{r.temperature}°C</td>
                        <td className="py-2" style={{ color: 'var(--text-muted)' }}>{r.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. CITY COMPARISON */}
      {tab === 'compare' && (
        <div className="surface-card p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                Multi-City Live AQI Comparison
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Compare live particulates, AQI, and weather across up to 5 global cities side by side.
              </p>
            </div>
            <form onSubmit={addCityToCompare} className="flex gap-2">
              <input
                value={compareInput}
                onChange={(e) => setCompareInput(e.target.value)}
                placeholder="Add city (e.g., Tokyo)..."
                className="px-3 py-1.5 text-xs saas-input w-44"
              />
              <button type="submit" disabled={compareCities.length >= 5} className="btn-brand px-3 py-1.5 text-xs flex items-center gap-1">
                <Plus size={13} /> Add
              </button>
              <button type="button" onClick={() => loadComparison(compareCities)} className="px-2.5 py-1.5 rounded-xl text-xs" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                <RefreshCw size={13} className={loadingCompare ? 'animate-spin' : ''} />
              </button>
            </form>
          </div>

          <div className="flex flex-wrap gap-2">
            {compareCities.map((c) => (
              <span key={c} className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5" style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
                {c}
                {compareCities.length > 2 && (
                  <button onClick={() => removeCompareCity(c)} className="hover:text-red-500"><X size={12} /></button>
                )}
              </span>
            ))}
          </div>

          {loadingCompare ? (
            <div className="h-56 skeleton" />
          ) : compareResults.length === 0 ? (
            <div className="p-6 text-center text-xs rounded-xl" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
              Start the Node backend server to run multi-city live comparisons.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={compareResults.filter((r) => r.isLive)} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="location" tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="aqi" name="Live US AQI" fill="#0d9488" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="pm25" name="PM2.5 (µg/m³)" fill="#0891b2" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <th className="py-2 pr-3">City</th>
                      <th className="py-2 pr-3">AQI</th>
                      <th className="py-2 pr-3">Category</th>
                      <th className="py-2 pr-3">PM2.5</th>
                      <th className="py-2 pr-3">PM10</th>
                      <th className="py-2 pr-3">NO₂</th>
                      <th className="py-2 pr-3">Temp</th>
                      <th className="py-2">Wind</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareResults.map((r) => {
                      const c = getAqiCategory(r.aqi ?? 0);
                      return (
                        <tr key={r.location} className="border-b" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                          <td className="py-2.5 pr-3 font-bold">{r.location}</td>
                          <td className="py-2.5 pr-3 font-extrabold" style={{ color: r.isLive ? c.color : 'var(--text-muted)' }}>
                            {r.isLive ? r.aqi : 'Unavailable'}
                          </td>
                          <td className="py-2.5 pr-3">{r.isLive ? r.category : r.error}</td>
                          <td className="py-2.5 pr-3">{r.pm25 ?? '—'} µg/m³</td>
                          <td className="py-2.5 pr-3">{r.pm10 ?? '—'} µg/m³</td>
                          <td className="py-2.5 pr-3">{r.no2 ?? '—'} µg/m³</td>
                          <td className="py-2.5 pr-3">{r.temperature != null ? `${r.temperature}°C` : '—'}</td>
                          <td className="py-2.5">{r.windSpeed != null ? `${r.windSpeed} km/h` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* 3. INTERACTIVE POLLUTION MAP */}
      {tab === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 surface-card p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  Interactive Monitoring Stations Map
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Click any live station marker to inspect AQI, particulates, and weather.
                </p>
              </div>
              <div className="flex gap-1.5">
                {[
                  { id: 'global', label: 'Global View' },
                  { id: 'india', label: 'India Focus' },
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setMapRegion(r.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                    style={mapRegion === r.id ? { background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: '#fff' } : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                  >
                    {r.label}
                  </button>
                ))}
                <button onClick={loadStations} className="px-2.5 py-1.5 rounded-xl text-xs" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                  {loadingStations ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                </button>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border relative" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
              <svg viewBox="0 0 800 380" className="w-full h-auto block">
                {/* Coordinate grid */}
                {[95, 190, 285].map((y) => (
                  <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="var(--chart-grid)" strokeDasharray="4 4" />
                ))}
                {[160, 320, 480, 640].map((x) => (
                  <line key={x} x1={x} y1="0" x2={x} y2="380" stroke="var(--chart-grid)" strokeDasharray="4 4" />
                ))}
                <text x="16" y="24" fontSize="11" fontWeight="600" fill="var(--text-faint)">
                  {mapRegion === 'india' ? 'INDIA MONITORING GRID (LAT 6°–36°N, LON 67°–98°E)' : 'GLOBAL REFERENCE STATIONS (LIVE OPEN-METEO)'}
                </text>

                {stations.map((st) => {
                  const pt = projectCoords(st.lat, st.lon, mapRegion);
                  if (!pt.visible) return null;
                  const c = getAqiCategory(st.aqi ?? 0);
                  const active = selectedStation?.city === st.city;
                  return (
                    <g
                      key={st.city}
                      transform={`translate(${pt.x}, ${pt.y})`}
                      onClick={() => setSelectedStation(st)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedStation(st);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`${st.city}, AQI ${st.aqi ?? 'unavailable'}, category ${c.label}`}
                      className="cursor-pointer focus:outline-none"
                    >
                      <circle r={active ? 18 : 13} fill={st.isLive ? c.color : '#94a3b8'} opacity="0.22" />
                      <circle r={active ? 11 : 8} fill={st.isLive ? c.color : '#94a3b8'} stroke="#ffffff" strokeWidth="2" />
                      <text y="22" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text-primary)">
                        {st.city.split(',')[0]} ({st.aqi ?? 'N/A'})
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="lg:col-span-4 surface-card p-5 space-y-4">
            <h3 className="font-bold text-base flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <MapPin size={16} style={{ color: 'var(--accent-teal)' }} /> Station Inspector
            </h3>
            {selectedStation ? (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl" style={{ background: getAqiCategory(selectedStation.aqi ?? 0).bg }}>
                  <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{selectedStation.city}</div>
                  <div className="text-2xl font-black mt-1" style={{ color: getAqiCategory(selectedStation.aqi ?? 0).color }}>
                    {selectedStation.aqi ?? 'N/A'} <span className="text-xs font-bold">{selectedStation.category}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                    <div style={{ color: 'var(--text-muted)' }}>PM2.5</div>
                    <div className="font-bold mt-0.5">{selectedStation.pm25 ?? '—'} µg/m³</div>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                    <div style={{ color: 'var(--text-muted)' }}>PM10</div>
                    <div className="font-bold mt-0.5">{selectedStation.pm10 ?? '—'} µg/m³</div>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                    <div style={{ color: 'var(--text-muted)' }}>Temp</div>
                    <div className="font-bold mt-0.5">{selectedStation.temperature ?? '—'}°C</div>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                    <div style={{ color: 'var(--text-muted)' }}>Wind</div>
                    <div className="font-bold mt-0.5">{selectedStation.windSpeed ?? '—'} km/h</div>
                  </div>
                </div>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Source: {selectedStation.dataSource || 'Open-Meteo'}
                </div>
                <button
                  onClick={() => onSelectCity(selectedStation.city)}
                  className="btn-brand w-full py-2.5 text-xs"
                >
                  Open {selectedStation.city.split(',')[0]} on Dashboard
                </button>
              </div>
            ) : (
              <div className="p-6 text-center text-xs rounded-xl" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                Loading live station coordinates...
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. EDUCATIONAL CENTER */}
      {tab === 'learn' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="surface-card p-5 space-y-2.5">
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Understanding AQI Standards</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                The Air Quality Index converts pollutant concentrations (PM2.5, PM10, O₃, NO₂, SO₂, CO) onto a standardized 0–500 scale. US EPA AQI highlights health thresholds strictly at 101+ for sensitive groups and 151+ for everyone, whereas WHO 2021 guidelines set much stricter annual/24h targets (PM2.5 ≤ 15 µg/m³ 24h).
              </p>
            </div>
            <div className="surface-card p-5 space-y-2.5">
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>PM2.5 vs. PM10 & Health Effects</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                PM10 particles (≤10 µm) settle in upper airways causing eye/throat irritation. PM2.5 particles (≤2.5 µm) are ~30× thinner than human hair and cross deep into lung alveoli and circulation, elevating asthma, bronchitis, and cardiovascular strain.
              </p>
            </div>
          </div>

          <div className="surface-card p-5 space-y-3">
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Pollutant Quick Reference</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.values(POLLUTANT_META).map((m) => (
                <div key={m.name} className="p-3.5 rounded-xl space-y-1 text-xs" style={{ background: 'var(--bg-subtle)' }}>
                  <div className="font-bold" style={{ color: 'var(--accent-teal)' }}>{m.name} — {m.fullName}</div>
                  <p style={{ color: 'var(--text-secondary)' }}>{m.simpleExplain}</p>
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>WHO 24h Guideline: {m.whoLimit} {m.unit}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card p-5 flex items-start gap-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Info size={16} className="text-teal-500 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Pollution Prevention:</strong> Replacing short car/two-wheeler trips with metro or walking, avoiding leaf/waste burning, and sealing buildings with HEPA filtration during temperature inversions dramatically lowers both community emissions and personal inhaled dose.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
