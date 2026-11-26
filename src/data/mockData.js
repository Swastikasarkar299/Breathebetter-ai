// Environmental reference metadata, guidelines, dynamic planner/alert generators, and city quick-picks.
import { AQI_CATEGORIES, getAqiCategory } from '../../shared/aqiUtils.js';

export const aqiCategories = AQI_CATEGORIES;
export { getAqiCategory };

export const POLLUTANT_META = {
  pm25: {
    name: 'PM2.5',
    fullName: 'Fine Particulate Matter',
    unit: 'µg/m³',
    whoLimit: 15,
    highThreshold: 55,
    simpleExplain: 'Microscopic particles (<2.5 µm) that bypass nasal filtration and enter deep into lungs and bloodstream.',
    sources: 'Vehicle exhaust, biomass/waste burning, power plants, winter smog',
  },
  pm10: {
    name: 'PM10',
    fullName: 'Coarse Particulate Matter',
    unit: 'µg/m³',
    whoLimit: 45,
    highThreshold: 150,
    simpleExplain: 'Inhalable dust and pollen particles (<10 µm) that irritate eyes, throat, and upper airways.',
    sources: 'Road dust, construction sites, windblown soil',
  },
  no2: {
    name: 'NO₂',
    fullName: 'Nitrogen Dioxide',
    unit: 'µg/m³',
    whoLimit: 25,
    highThreshold: 100,
    simpleExplain: 'Traffic-linked gas that inflames airway linings and aggravates asthma and bronchitis.',
    sources: 'Diesel & petrol engines, generators, fossil fuel combustion',
  },
  o3: {
    name: 'O₃',
    fullName: 'Ground-Level Ozone',
    unit: 'µg/m³',
    whoLimit: 100,
    highThreshold: 160,
    simpleExplain: 'Formed when sunlight reacts with vehicle exhaust VOCs; triggers chest tightness and coughing.',
    sources: 'Photochemical reactions from sunlight + traffic emissions (peaks afternoons)',
  },
  co: {
    name: 'CO',
    fullName: 'Carbon Monoxide',
    unit: 'mg/m³',
    whoLimit: 4,
    highThreshold: 10,
    simpleExplain: 'Colorless gas that reduces oxygen delivery to heart and brain at elevated concentrations.',
    sources: 'Incomplete combustion, idling traffic, unvented indoor stoves',
  },
  so2: {
    name: 'SO₂',
    fullName: 'Sulfur Dioxide',
    unit: 'µg/m³',
    whoLimit: 40,
    highThreshold: 120,
    simpleExplain: 'Irritating industrial gas that narrows airways rapidly, especially in people with asthma.',
    sources: 'Coal/oil power plants, brick kilns, heavy diesel fuel',
  },
};

export const popularCities = [
  'New Delhi, India',
  'Mumbai, India',
  'Bengaluru, India',
  'Kolkata, India',
  'Chennai, India',
  'Hyderabad, India',
  'Pune, India',
  'Jaipur, India',
  'Lucknow, India',
  'Patna, India',
  'London, UK',
  'New York, USA',
  'Singapore',
  'Tokyo, Japan',
];

export function getCityData(cityInput) {
  const location = (cityInput || 'New Delhi, India').trim();
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
    isLive: false,
    dataSource: 'Unavailable',
    lastUpdated: null,
  };
}

export function analyzeHourlyWindows(airQuality) {
  const hourly = airQuality?.hourlyData || [];
  if (hourly.length === 0) {
    return {
      bestHour: 'Unavailable',
      bestAqi: null,
      worstHour: 'Unavailable',
      worstAqi: null,
    };
  }
  let best = hourly[0];
  let worst = hourly[0];
  for (const pt of hourly) {
    if (pt.aqi < best.aqi) best = pt;
    if (pt.aqi > worst.aqi) worst = pt;
  }
  return {
    bestHour: best.hour,
    bestAqi: best.aqi,
    worstHour: worst.hour,
    worstAqi: worst.aqi,
  };
}

export function generateAlerts(airQuality, preferences = {}) {
  if (!airQuality?.isLive || airQuality.aqi == null) return [];

  const threshold = Number(preferences.alertThreshold ?? 150);
  const aqi = airQuality.aqi;
  const cat = getAqiCategory(aqi);
  const city = (airQuality.location || 'Your area').split(',')[0];
  const alerts = [];

  if (preferences.aqiAlerts !== false && aqi >= threshold) {
    alerts.push({
      id: 'threshold-breach',
      severity: aqi > 200 ? 'critical' : 'warning',
      category: 'Threshold Alert',
      title: `AQI ${aqi} exceeds your ${threshold} threshold in ${city}`,
      message: `${cat.label} conditions (PM2.5: ${airQuality.pm25} µg/m³). ${cat.sensitiveAdvice}`,
      time: 'Live',
    });
  } else if (preferences.aqiAlerts !== false && aqi > 100) {
    alerts.push({
      id: 'moderate-advisory',
      severity: 'info',
      category: 'Air Advisory',
      title: `Elevated AQI (${aqi}) in ${city}`,
      message: `${cat.label} conditions. Sensitive groups should limit prolonged roadside exertion.`,
      time: 'Live',
    });
  }

  if (preferences.weatherAlerts !== false) {
    if ((airQuality.windSpeed ?? 10) < 6 && (airQuality.humidity ?? 50) > 65) {
      alerts.push({
        id: 'weather-stagnation',
        severity: 'warning',
        category: 'Weather Dispersion',
        title: `Low wind (${airQuality.windSpeed} km/h) + ${airQuality.humidity}% humidity trapping particulates`,
        message: 'Stagnant air slows smog dispersion. Keep street-facing windows sealed during rush hours.',
        time: 'Meteorology',
      });
    } else if ((airQuality.o3 ?? 0) > 100 || ((airQuality.temperature ?? 20) >= 32 && aqi > 80)) {
      alerts.push({
        id: 'weather-ozone',
        severity: 'warning',
        category: 'Ozone & Heat',
        title: `Warm sunlight boosting ground-level ozone (${airQuality.o3} µg/m³)`,
        message: 'Schedule outdoor errands earlier in the morning or indoors during peak heat.',
        time: 'Meteorology',
      });
    } else if ((airQuality.windSpeed ?? 0) >= 14) {
      alerts.push({
        id: 'weather-dispersion',
        severity: 'success',
        category: 'Weather Dispersion',
        title: `Brisk ${airQuality.windSpeed} km/h breeze aiding dispersion`,
        message: `Stronger airflow in ${city} is helping clear fine particle accumulation.`,
        time: 'Meteorology',
      });
    }
  }

  if (preferences.dailyReport !== false) {
    const win = analyzeHourlyWindows(airQuality);
    alerts.push({
      id: 'daily-summary',
      severity: aqi <= 100 ? 'success' : 'info',
      category: 'Daily Summary',
      title: `${city} Daily Brief: ${cat.label} (${aqi} AQI)`,
      message: win.bestAqi != null
        ? `Cleanest forecast window: ${win.bestHour} (~${win.bestAqi} AQI). Peak near ${win.worstHour} (~${win.worstAqi} AQI).`
        : 'Live hourly forecast summary ready.',
      time: 'Today',
    });
  }

  return alerts;
}

export function getDynamicVentilationSchedule(airQuality) {
  if (!airQuality?.isLive || airQuality.aqi == null) {
    return [
      { time: 'All Day', status: 'maybe', label: 'Awaiting Live Outdoor Reading', reason: 'Connect to live air quality feed to compute safe window ventilation hours.', color: '#64748b' },
    ];
  }

  const aqi = airQuality.aqi;
  const wind = airQuality.windSpeed ?? 8;
  const win = analyzeHourlyWindows(airQuality);

  if (aqi <= 65) {
    return [
      { time: '6 AM – 9 AM', status: 'open', label: 'Safe Ventilation', reason: 'Clean morning air — flush overnight indoor CO₂.', color: '#10b981' },
      { time: '9 AM – 12 PM', status: 'open', label: 'Open Windows', reason: `Breeze at ${wind} km/h supports healthy cross-ventilation.`, color: '#10b981' },
      { time: '12 PM – 4 PM', status: 'open', label: 'Optimal Window', reason: `Best dispersion period (~${win.bestAqi ?? aqi} AQI around ${win.bestHour}).`, color: '#0d9488' },
      { time: '4 PM – 8 PM', status: 'maybe', label: 'Monitor Traffic', reason: 'Close road-facing windows briefly during peak traffic if near a main street.', color: '#f59e0b' },
      { time: '8 PM – 11 PM', status: 'open', label: 'Gentle Night Air', reason: 'Safe for bedroom ventilation away from direct exhaust.', color: '#10b981' },
    ];
  }

  if (aqi <= 140) {
    return [
      { time: '6 AM – 9 AM', status: 'maybe', label: 'Keep Limited', reason: 'Morning commute + cool surface air raises roadside PM2.5.', color: '#f59e0b' },
      { time: '9 AM – 12 PM', status: 'maybe', label: 'Short 15-min Flush', reason: 'Open cross-windows briefly after morning traffic subsides.', color: '#f59e0b' },
      { time: '12 PM – 4 PM', status: 'open', label: 'Best Window Today', reason: `Lowest projected AQI (~${win.bestAqi ?? aqi} around ${win.bestHour}) — ideal for 20–30 min airing out.`, color: '#10b981' },
      { time: '4 PM – 8 PM', status: 'closed', label: 'Keep Closed', reason: `Evening rush pushes levels toward ~${win.worstAqi ?? aqi} AQI.`, color: '#ef4444' },
      { time: '8 PM – 11 PM', status: 'closed', label: 'Sealed + Filter', reason: 'Use kitchen exhaust while cooking and keep bedroom doors/windows shut.', color: '#ef4444' },
    ];
  }

  return [
    { time: '6 AM – 10 AM', status: 'closed', label: 'Keep Sealed', reason: `High morning inversion & traffic push PM2.5 near ${Math.round((airQuality.pm25 ?? 60) * 1.1)} µg/m³.`, color: '#ef4444' },
    { time: '10 AM – 12 PM', status: 'closed', label: 'Stay Closed', reason: `Wait for midday solar mixing before opening windows (Wind: ${wind} km/h).`, color: '#ef4444' },
    { time: '12 PM – 3 PM', status: 'maybe', label: 'Brief 10-min Window', reason: `Relative dip near ${win.bestHour} (~${win.bestAqi ?? aqi} AQI) — ventilate briefly only if needed.`, color: '#f59e0b' },
    { time: '3 PM – 7 PM', status: 'closed', label: 'Keep Sealed', reason: 'Evening commute surge rapidly degrades indoor air if unsealed.', color: '#ef4444' },
    { time: '7 PM – 11 PM', status: 'closed', label: 'Purify & Seal', reason: `Nighttime inversion peaks near ~${win.worstAqi ?? aqi} AQI. Run HEPA filtration.`, color: '#ef4444' },
  ];
}

export function getDailyPlannerData(airQuality, userProfile) {
  const isLive = Boolean(airQuality?.isLive && airQuality.aqi != null);
  const aqi = airQuality?.aqi ?? 100;
  const location = airQuality?.location ?? 'your city';
  const isHighAqi = isLive && aqi > 150;
  const isModerateAqi = isLive && aqi > 100 && aqi <= 150;
  const win = analyzeHourlyWindows(airQuality);

  return [
    {
      id: 1,
      category: 'outdoor',
      categoryLabel: 'Outdoor Activities',
      action: !isLive
        ? `Check live AQI in ${location} before outdoor exercise`
        : isHighAqi
          ? `Avoid outdoor cardio in ${location}; shift workouts indoors`
          : isModerateAqi
            ? `Schedule light outdoor walks around ${win.bestHour} (~${win.bestAqi} AQI)`
            : `Great conditions for outdoor running, yoga & park walks in ${location}`,
      why: !isLive
        ? 'Live outdoor particulate data is currently unavailable.'
        : isHighAqi
          ? `Live AQI is ${aqi} (PM2.5: ${airQuality.pm25} µg/m³) with ${airQuality.windSpeed} km/h wind. Deep breathing during cardio multiplies particulate intake.`
          : `Lowest projected hourly pollution today occurs around ${win.bestHour} (~${win.bestAqi} AQI).`,
      benefit: isHighAqi ? 'Cuts PM2.5 lung deposition by up to 65%' : 'Optimizes aerobic benefit with cleaner air',
      difficulty: 'Easy',
      priority: isHighAqi ? 'critical' : isModerateAqi ? 'medium' : 'low',
    },
    {
      id: 2,
      category: 'outdoor',
      categoryLabel: 'Walking & Cycling',
      action: isHighAqi
        ? 'Replace outdoor cycling with enclosed transit; wear N95 for essential walks'
        : isModerateAqi
          ? 'Walk or cycle on tree-lined residential lanes away from arterial highways'
          : 'Safe for walking and cycling commutes via green corridors',
      why: 'Side streets experience 30–40% lower vehicle exhaust concentration than main junctions.',
      benefit: 'Lowers acute NO₂ and black-carbon inhalation',
      difficulty: 'Easy',
      priority: isHighAqi ? 'high' : 'low',
    },
    {
      id: 3,
      category: 'travel',
      categoryLabel: 'Travel & Commute',
      action: userProfile?.transport === 'Walk/Cycle' && !isHighAqi
        ? 'Maintain zero-emission walk/cycle commute via green lanes'
        : 'Prefer enclosed Metro, rail, or AC transit with recirculation enabled',
      why: 'Open two-wheelers expose riders to 3–5× more particulates than enclosed filtered cabins.',
      benefit: 'Reduces daily commute exposure and lowers tailpipe emissions',
      difficulty: 'Medium',
      priority: isHighAqi ? 'high' : 'medium',
    },
    {
      id: 4,
      category: 'indoor',
      categoryLabel: 'Indoor Protection',
      action: isHighAqi
        ? `Keep windows shut during peak hours (${win.worstHour}); brief airing near ${win.bestHour}`
        : `Cross-ventilate home for 25 minutes around ${win.bestHour}`,
      why: isHighAqi
        ? `Outdoor PM2.5 (${airQuality.pm25} µg/m³) quickly infiltrates unsealed rooms.`
        : 'Flushes accumulated indoor CO₂, humidity, and cooking fumes efficiently.',
      benefit: 'Maintains fresher indoor air cleanly',
      difficulty: 'Easy',
      priority: isHighAqi ? 'high' : 'low',
    },
    {
      id: 5,
      category: 'family',
      categoryLabel: 'Children & Seniors',
      action: isHighAqi
        ? "Move children's play and senior walks indoors; monitor asthma symptoms"
        : 'Schedule children’s outdoor play in parks away from heavy roadways',
      why: 'Children inhale ~50% more air per kg body weight than adults; seniors have higher cardiopulmonary sensitivity.',
      benefit: 'Protects developing lungs and sensitive airways',
      difficulty: 'Medium',
      priority: isHighAqi ? 'critical' : 'medium',
    },
    {
      id: 6,
      category: 'sustainable',
      categoryLabel: 'Clean Air Action',
      action: 'Combine errands into one trip and avoid/report open leaf or waste burning',
      why: 'Cold-start vehicle trips and open waste burning emit disproportionate amounts of toxic PM2.5.',
      benefit: 'Directly lowers neighborhood particulate load',
      difficulty: 'Easy',
      priority: 'high',
    },
  ];
}

export function getRoutineTimeline(airQuality) {
  const isHigh = Boolean(airQuality?.isLive && airQuality.aqi > 150);
  const win = analyzeHourlyWindows(airQuality);
  const city = airQuality?.location?.split(',')[0] || 'your city';

  return [
    {
      period: 'Morning',
      color: '#f59e0b',
      timeRange: '6:00 AM – 11:00 AM',
      items: [
        { time: '6:30 AM', action: `Check live AQI (${airQuality?.aqi ?? 'N/A'}) in ${city} before opening windows` },
        { time: '7:15 AM', action: isHigh ? 'Do indoor mobility / yoga instead of outdoor jogging' : 'Enjoy a brisk walk along low-traffic green streets' },
        { time: '8:30 AM', action: isHigh ? 'Commute via metro/AC transit; wear N95 outdoors' : 'Walk, cycle, or use public transit' },
      ],
    },
    {
      period: 'Midday',
      color: '#0891b2',
      timeRange: '11:00 AM – 4:00 PM',
      items: [
        { time: win.bestHour, action: win.bestAqi != null ? `Cleanest window (~${win.bestAqi} AQI) — ventilate rooms or run errands` : 'Midday solar mixing window for essential errands' },
        { time: '1:30 PM', action: 'Hydrate well and include antioxidant-rich produce & greens' },
        { time: '3:00 PM', action: 'Batch errands together to avoid extra evening trips' },
      ],
    },
    {
      period: 'Evening',
      color: '#6366f1',
      timeRange: '4:00 PM – 10:00 PM',
      items: [
        { time: win.worstHour, action: isHigh ? `Peak pollution (~${win.worstAqi ?? 'High'} AQI) — seal windows & avoid main roads` : 'Run kitchen exhaust while cooking dinner' },
        { time: '8:00 PM', action: 'Wet-wipe high-dust surfaces; keep indoor burning zero' },
        { time: '9:30 PM', action: isHigh ? 'Run bedroom HEPA / MERV-13 purifier overnight' : 'Keep bedroom cool and dust-free for recovery' },
      ],
    },
  ];
}

export const indoorTips = [
  {
    id: 1,
    room: 'Living Room',
    color: '#0d9488',
    tips: [
      'Seal perimeter window gaps with affordable foam weather-stripping',
      'Use damp microfiber mops/cloths instead of dry brooms that re-suspend fine dust',
      'Keep indoor relative humidity between 40%–55% to prevent mold and dry airways',
    ],
  },
  {
    id: 2,
    room: 'Kitchen',
    color: '#f97316',
    tips: [
      'Turn on exhaust fan/chimney 2 minutes before lighting the stove and keep on 10 minutes after',
      'Cover pans while simmering and avoid smoke-point overheating of cooking oils',
      'Prefer induction/LPG over solid fuels and ensure cross-ventilation if outdoor AQI permits',
    ],
  },
  {
    id: 3,
    room: 'Bedroom',
    color: '#6366f1',
    tips: [
      'Run HEPA or DIY MERV-13 purifier 30 minutes before bedtime for clean sleep recovery',
      'Wash pillowcases and sheets weekly in hot water (60°C) to control dust mites',
      'Keep incense, scented paraffin candles, and tobacco completely out of bedrooms',
    ],
  },
  {
    id: 4,
    room: 'Entryway & Workspace',
    color: '#10b981',
    tips: [
      'Leave outdoor shoes at the entrance door to block tracked-in heavy metals & road dust',
      'Place double door-mats (rough outer + washable inner) to trap coarse particles',
      'Change out of outer jackets after high-AQI commutes before sitting on upholstery',
    ],
  },
];

export const userProfiles = {
  types: ['Student', 'Working Professional', 'Family (with kids)', 'Senior Citizen', 'Sensitive / Asthma'],
  transport: ['Walk/Cycle', 'Public Transport', 'Two Wheeler', 'Car/Cab', 'Mixed'],
  outdoorActivity: ['Very Active (Daily)', 'Moderately Active', 'Occasionally', 'Indoors Mostly'],
  indoor: ['Apartment (small)', 'House (medium)', 'Office building', 'School/College'],
  budget: ['Free solutions only', 'Low budget (< ₹500)', 'Medium (₹500–5000)', 'Any budget'],
};
