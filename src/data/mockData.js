// Multi-City AQI & Weather Reference Data, Pollutant Guidelines, Alerts & Dynamic Planners

export const aqiCategories = [
  {
    range: [0, 50],
    label: "Good",
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.12)",
    description: "Air quality is clean and poses minimal risk. Ideal for outdoor activity and natural ventilation.",
    sensitiveAdvice: "Safe for everyone including children, seniors, and respiratory patients.",
  },
  {
    range: [51, 100],
    label: "Moderate",
    color: "#84cc16",
    bg: "rgba(132, 204, 22, 0.14)",
    description: "Acceptable air quality overall. Unusually sensitive individuals may notice mild irritation during intense exercise.",
    sensitiveAdvice: "People with asthma or dust allergies should monitor symptoms during prolonged exertion.",
  },
  {
    range: [101, 150],
    label: "Unhealthy for Sensitive",
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.14)",
    description: "Children, seniors, and people with heart or lung disease should reduce prolonged outdoor exertion.",
    sensitiveAdvice: "Keep rescue inhalers handy; move strenuous workouts indoors or away from busy roads.",
  },
  {
    range: [151, 200],
    label: "Poor",
    color: "#f97316",
    bg: "rgba(249, 115, 22, 0.14)",
    description: "Everyone may begin to experience respiratory irritation. Limit outdoor workouts and wear an N95 mask in traffic.",
    sensitiveAdvice: "Sensitive groups should avoid outdoor exertion and keep windows closed during rush hours.",
  },
  {
    range: [201, 300],
    label: "Very Poor",
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.14)",
    description: "Health warning: prolonged exposure increases respiratory and cardiovascular strain across all age groups.",
    sensitiveAdvice: "Stay indoors with air filtration running; avoid all vigorous outdoor activity.",
  },
  {
    range: [301, 500],
    label: "Hazardous",
    color: "#8b5cf6",
    bg: "rgba(139, 92, 246, 0.15)",
    description: "Emergency air quality conditions. Minimize all outdoor exposure and run HEPA filtration indoors.",
    sensitiveAdvice: "Strict indoor stay advised for children, elderly, pregnant women, and cardiac/lung patients.",
  },
];

export const getAqiCategory = (aqi) => {
  const val = Math.max(0, Math.round(Number(aqi) || 0));
  return aqiCategories.find((c) => val >= c.range[0] && val <= c.range[1]) || aqiCategories[aqiCategories.length - 1];
};

export const POLLUTANT_META = {
  pm25: {
    name: "PM2.5",
    fullName: "Fine Particulate Matter",
    unit: "µg/m³",
    whoLimit: 15,
    highThreshold: 55,
    simpleExplain: "Microscopic particles (<2.5 µm) that bypass nose filters and enter deep into lungs and bloodstream.",
    sources: "Vehicle exhaust, biomass/waste burning, power plants, winter smog",
  },
  pm10: {
    name: "PM10",
    fullName: "Coarse Particulate Matter",
    unit: "µg/m³",
    whoLimit: 45,
    highThreshold: 150,
    simpleExplain: "Inhalable dust and pollen particles (<10 µm) that irritate eyes, throat, and upper airways.",
    sources: "Road dust, construction sites, windblown soil",
  },
  no2: {
    name: "NO₂",
    fullName: "Nitrogen Dioxide",
    unit: "µg/m³",
    whoLimit: 25,
    highThreshold: 100,
    simpleExplain: "A pungent traffic gas that inflames airway linings and worsens asthma and bronchitis.",
    sources: "Diesel & petrol vehicle engines, generators, fossil fuel combustion",
  },
  o3: {
    name: "O₃",
    fullName: "Ground-Level Ozone",
    unit: "µg/m³",
    whoLimit: 100,
    highThreshold: 160,
    simpleExplain: "Formed when sunlight reacts with vehicle exhaust; triggers chest tightness and coughing.",
    sources: "Photochemical reactions from traffic VOCs + sunlight (peaks afternoons)",
  },
  co: {
    name: "CO",
    fullName: "Carbon Monoxide",
    unit: "mg/m³",
    whoLimit: 4,
    highThreshold: 10,
    simpleExplain: "Colorless gas that reduces oxygen delivery to heart and brain when concentrations climb.",
    sources: "Incomplete fuel combustion, idling traffic, indoor biomass stoves",
  },
  so2: {
    name: "SO₂",
    fullName: "Sulfur Dioxide",
    unit: "µg/m³",
    whoLimit: 40,
    highThreshold: 120,
    simpleExplain: "Irritating industrial gas that narrows airways quickly, especially in people with asthma.",
    sources: "Coal/oil power plants, brick kilns, heavy diesel fuel",
  },
};

export const cityPresets = {
  "New Delhi, India": {
    location: "New Delhi, India",
    lat: 28.6139,
    lon: 77.2090,
    aqi: 187,
    pm25: 142.3,
    pm10: 234.8,
    temperature: 14,
    feelsLike: 13,
    humidity: 68,
    windSpeed: 4.2,
    no2: 89.4,
    o3: 42.1,
    co: 2.8,
    so2: 18.4,
    weatherCondition: "Hazy / Mist",
    mainDriver: "Winter temperature inversion, vehicular exhaust, and regional biomass burning",
    helpline: "DPCC Helpline: 1800-11-8899",
    weeklyTrend: [142, 168, 195, 187, 221, 198, 187],
  },
  "Mumbai, India": {
    location: "Mumbai, India",
    lat: 19.0760,
    lon: 72.8777,
    aqi: 118,
    pm25: 62.5,
    pm10: 128.4,
    temperature: 27,
    feelsLike: 29,
    humidity: 74,
    windSpeed: 11.5,
    no2: 52.1,
    o3: 38.4,
    co: 1.4,
    so2: 12.1,
    weatherCondition: "Coastal Haze",
    mainDriver: "Construction dust, coastal humidity trapping particulates, and traffic",
    helpline: "MPCB Helpline: 022-24020781",
    weeklyTrend: [96, 108, 114, 122, 129, 115, 118],
  },
  "Bengaluru, India": {
    location: "Bengaluru, India",
    lat: 12.9716,
    lon: 77.5946,
    aqi: 64,
    pm25: 24.8,
    pm10: 56.2,
    temperature: 22,
    feelsLike: 22,
    humidity: 61,
    windSpeed: 13.2,
    no2: 31.5,
    o3: 34.0,
    co: 0.9,
    so2: 7.4,
    weatherCondition: "Partly Cloudy",
    mainDriver: "Peak-hour arterial traffic and localized road dust",
    helpline: "KSPCB Helpline: 080-25589112",
    weeklyTrend: [58, 62, 70, 66, 72, 60, 64],
  },
  "Kolkata, India": {
    location: "Kolkata, India",
    lat: 22.5726,
    lon: 88.3639,
    aqi: 164,
    pm25: 98.4,
    pm10: 176.0,
    temperature: 19,
    feelsLike: 19,
    humidity: 72,
    windSpeed: 5.8,
    no2: 67.2,
    o3: 39.5,
    co: 2.1,
    so2: 15.6,
    weatherCondition: "Fog / Mist",
    mainDriver: "Winter boundary layer inversion, diesel transport, and coal/wood heating",
    helpline: "WBPCB Helpline: 1800-345-3390",
    weeklyTrend: [138, 149, 158, 172, 180, 169, 164],
  },
  "Chennai, India": {
    location: "Chennai, India",
    lat: 13.0827,
    lon: 80.2707,
    aqi: 78,
    pm25: 31.2,
    pm10: 68.9,
    temperature: 28,
    feelsLike: 30,
    humidity: 76,
    windSpeed: 14.8,
    no2: 34.8,
    o3: 31.2,
    co: 1.0,
    so2: 9.2,
    weatherCondition: "Coastal Breeze",
    mainDriver: "Sea breeze helps disperse pollutants; localized traffic and industrial corridors",
    helpline: "TNPCB Helpline: 044-22353134",
    weeklyTrend: [72, 75, 84, 81, 88, 76, 78],
  },
  "Hyderabad, India": {
    location: "Hyderabad, India",
    lat: 17.3850,
    lon: 78.4867,
    aqi: 94,
    pm25: 41.6,
    pm10: 89.3,
    temperature: 23,
    feelsLike: 23,
    humidity: 55,
    windSpeed: 9.4,
    no2: 43.0,
    o3: 36.8,
    co: 1.2,
    so2: 10.5,
    weatherCondition: "Clear Sky",
    mainDriver: "Morning/evening traffic congestion and construction activity",
    helpline: "TSPCB Helpline: 040-23887500",
    weeklyTrend: [86, 91, 98, 102, 105, 92, 94],
  },
  "Pune, India": {
    location: "Pune, India",
    lat: 18.5204,
    lon: 73.8567,
    aqi: 88,
    pm25: 37.4,
    pm10: 82.1,
    temperature: 21,
    feelsLike: 21,
    humidity: 52,
    windSpeed: 10.1,
    no2: 39.2,
    o3: 35.4,
    co: 1.1,
    so2: 8.8,
    weatherCondition: "Mainly Clear",
    mainDriver: "Two-wheeler emissions and rapid urban construction",
    helpline: "MPCB Pune: 020-25811627",
    weeklyTrend: [79, 84, 92, 95, 91, 85, 88],
  },
  "Jaipur, India": {
    location: "Jaipur, India",
    lat: 26.9124,
    lon: 75.7873,
    aqi: 148,
    pm25: 84.0,
    pm10: 168.5,
    temperature: 17,
    feelsLike: 16,
    humidity: 48,
    windSpeed: 6.4,
    no2: 56.3,
    o3: 41.0,
    co: 1.7,
    so2: 13.0,
    weatherCondition: "Dry Haze",
    mainDriver: "Dry winter windblown dust, stone/construction particulates, and traffic",
    helpline: "RSPCB Helpline: 0141-2711263",
    weeklyTrend: [128, 136, 144, 152, 159, 145, 148],
  },
  "Lucknow, India": {
    location: "Lucknow, India",
    lat: 26.8467,
    lon: 80.9462,
    aqi: 214,
    pm25: 164.2,
    pm10: 262.0,
    temperature: 13,
    feelsLike: 12,
    humidity: 73,
    windSpeed: 3.4,
    no2: 81.5,
    o3: 40.2,
    co: 2.9,
    so2: 19.8,
    weatherCondition: "Dense Mist",
    mainDriver: "Low wind speed, winter fog-smog trapping, and biomass/traffic emissions",
    helpline: "UPPCB Helpline: 0522-2720828",
    weeklyTrend: [176, 192, 208, 219, 234, 220, 214],
  },
  "Patna, India": {
    location: "Patna, India",
    lat: 25.5941,
    lon: 85.1376,
    aqi: 238,
    pm25: 184.5,
    pm10: 289.4,
    temperature: 14,
    feelsLike: 13,
    humidity: 75,
    windSpeed: 3.1,
    no2: 76.8,
    o3: 38.9,
    co: 3.1,
    so2: 21.4,
    weatherCondition: "Winter Smog",
    mainDriver: "Indo-Gangetic plain winter inversion, brick kilns, and road dust",
    helpline: "BSPCB Helpline: 0612-2261250",
    weeklyTrend: [195, 212, 229, 241, 255, 242, 238],
  },
  "London, UK": {
    location: "London, UK",
    lat: 51.5072,
    lon: -0.1276,
    aqi: 38,
    pm25: 11.4,
    pm10: 21.8,
    temperature: 8,
    feelsLike: 5,
    humidity: 79,
    windSpeed: 18.4,
    no2: 26.5,
    o3: 29.0,
    co: 0.4,
    so2: 4.1,
    weatherCondition: "Breezy / Overcast",
    mainDriver: "Mild urban traffic & wood-burning stoves, well dispersed by Atlantic winds",
    helpline: "DEFRA Air Quality Info: 0800 556677",
    weeklyTrend: [34, 41, 39, 36, 44, 40, 38],
  },
  "New York, USA": {
    location: "New York, USA",
    lat: 40.7128,
    lon: -74.0060,
    aqi: 44,
    pm25: 13.8,
    pm10: 25.4,
    temperature: 7,
    feelsLike: 4,
    humidity: 62,
    windSpeed: 16.2,
    no2: 29.4,
    o3: 31.5,
    co: 0.5,
    so2: 4.8,
    weatherCondition: "Crisp & Clear",
    mainDriver: "Urban heating and traffic, generally well ventilated by coastal winds",
    helpline: "NYC 311 Air Quality Line",
    weeklyTrend: [40, 46, 48, 42, 51, 45, 44],
  },
  "Singapore": {
    location: "Singapore",
    lat: 1.3521,
    lon: 103.8198,
    aqi: 49,
    pm25: 15.2,
    pm10: 28.0,
    temperature: 29,
    feelsLike: 33,
    humidity: 82,
    windSpeed: 12.6,
    no2: 22.8,
    o3: 27.4,
    co: 0.5,
    so2: 6.2,
    weatherCondition: "Warm & Humid",
    mainDriver: "Maritime winds keep air clean; occasional transboundary haze",
    helpline: "NEA Hotline: 1800-2255-632",
    weeklyTrend: [45, 48, 52, 47, 50, 46, 49],
  },
  "Tokyo, Japan": {
    location: "Tokyo, Japan",
    lat: 35.6762,
    lon: 139.6503,
    aqi: 36,
    pm25: 10.6,
    pm10: 19.8,
    temperature: 12,
    feelsLike: 10,
    humidity: 58,
    windSpeed: 14.1,
    no2: 24.1,
    o3: 30.2,
    co: 0.4,
    so2: 3.9,
    weatherCondition: "Clear Sky",
    mainDriver: "Strict vehicle emission standards and clean bay breezes",
    helpline: "Tokyo Environment Bureau: 03-5388-3491",
    weeklyTrend: [32, 35, 38, 34, 40, 37, 36],
  },
};

export const popularCities = Object.keys(cityPresets);

export function getCityData(cityInput) {
  const trimmed = (cityInput || "New Delhi, India").trim();
  const lower = trimmed.toLowerCase();

  const matchedKey = Object.keys(cityPresets).find(
    (k) => k.toLowerCase() === lower || k.toLowerCase().startsWith(lower + ",") || k.toLowerCase().includes(lower)
  );

  if (matchedKey) {
    const preset = cityPresets[matchedKey];
    const cat = getAqiCategory(preset.aqi);
    return {
      ...preset,
      category: cat.label,
      lastUpdated: new Date().toISOString(),
      isLive: false,
      hasLiveTrend: false,
      trendData: buildTrendData(preset.weeklyTrend),
      hourlyData: buildHourlyData(preset.aqi),
    };
  }

  return {
    location: trimmed,
    aqi: 85,
    category: "Moderate",
    pm25: 28.0,
    pm10: 54.0,
    temperature: 22,
    feelsLike: 22,
    humidity: 55,
    windSpeed: 8.5,
    no2: 32.0,
    o3: 38.0,
    co: 0.8,
    so2: 7.0,
    weatherCondition: "Offline reference",
    mainDriver: "Connect to internet for real-time Open-Meteo readings for this city",
    helpline: "Local Municipal Pollution Control Helpline",
    lastUpdated: new Date().toISOString(),
    isLive: false,
    hasLiveTrend: false,
    trendData: buildTrendData([78, 82, 91, 85, 89, 80, 85]),
    hourlyData: buildHourlyData(85),
  };
}

function buildTrendData(weeklyArr) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day, idx) => ({
    day,
    aqi: weeklyArr[idx] ?? 100,
    pm25: Math.round((weeklyArr[idx] ?? 100) * 0.65),
  }));
}

function buildHourlyData(baseAqi) {
  const multipliers = [
    { hour: "6AM", factor: 0.9 },
    { hour: "8AM", factor: 1.08 },
    { hour: "10AM", factor: 1.12 },
    { hour: "12PM", factor: 0.94 },
    { hour: "2PM", factor: 0.88 },
    { hour: "4PM", factor: 0.98 },
    { hour: "6PM", factor: 1.14 },
    { hour: "8PM", factor: 1.2 },
    { hour: "10PM", factor: 1.08 },
  ];
  return multipliers.map((m) => ({
    hour: m.hour,
    aqi: Math.max(15, Math.round(baseAqi * m.factor)),
  }));
}

/**
 * Compute dynamic alerts based on live AQI, weather, and user's custom notification settings.
 */
export function generateAlerts(airQuality, preferences = {}) {
  const threshold = Number(preferences.alertThreshold ?? 150);
  const aqi = airQuality?.aqi ?? 0;
  const cat = getAqiCategory(aqi);
  const city = airQuality?.location?.split(',')[0] || 'Your area';
  const alerts = [];

  // 1. Custom AQI Threshold / High Pollution Warning
  if (preferences.aqiAlerts !== false && aqi >= threshold) {
    alerts.push({
      id: 'threshold-breach',
      severity: aqi > 200 ? 'critical' : 'warning',
      category: 'Threshold Alert',
      title: `AQI ${aqi} exceeds your ${threshold} threshold in ${city}`,
      message: `${cat.label} air quality detected (PM2.5: ${airQuality.pm25} µg/m³). ${cat.sensitiveAdvice}`,
      time: 'Active now',
    });
  } else if (preferences.aqiAlerts !== false && aqi > 100) {
    alerts.push({
      id: 'moderate-advisory',
      severity: 'info',
      category: 'Air Advisory',
      title: `Elevated AQI (${aqi}) in ${city}`,
      message: `${cat.label} conditions. Sensitive groups should limit prolonged road-side exertion.`,
      time: 'Live status',
    });
  }

  // 2. Weather-related pollution notifications
  if (preferences.weatherAlerts !== false) {
    if ((airQuality?.windSpeed ?? 10) < 6 && (airQuality?.humidity ?? 50) > 65) {
      alerts.push({
        id: 'weather-stagnation',
        severity: 'warning',
        category: 'Weather Impact',
        title: `Low wind (${airQuality.windSpeed} km/h) + ${airQuality.humidity}% humidity trapping smog`,
        message: 'Stagnant boundary conditions slow pollutant dispersion. Keep windows sealed during rush hours.',
        time: 'Meteorology',
      });
    } else if ((airQuality?.o3 ?? 0) > 100 || ((airQuality?.temperature ?? 20) >= 32 && aqi > 80)) {
      alerts.push({
        id: 'weather-ozone',
        severity: 'warning',
        category: 'Ozone & Heat',
        title: `Warm sunlight boosting afternoon ground-level ozone (${airQuality.o3} µg/m³)`,
        message: 'Prefer morning or shaded indoor exercise when UV and temperature peak.',
        time: 'Meteorology',
      });
    } else if ((airQuality?.windSpeed ?? 0) >= 14) {
      alerts.push({
        id: 'weather-dispersion',
        severity: 'success',
        category: 'Weather Dispersion',
        title: `Brisk ${airQuality.windSpeed} km/h breeze aiding dispersion`,
        message: `Stronger airflow in ${city} is helping clear fine particulate buildup.`,
        time: 'Meteorology',
      });
    }
  }

  // 3. Daily Air Quality Summary
  if (preferences.dailyReport !== false) {
    const hourly = analyzeHourlyWindows(airQuality);
    alerts.push({
      id: 'daily-summary',
      severity: aqi <= 100 ? 'success' : 'info',
      category: 'Daily Summary',
      title: `${city} Daily Brief: ${cat.label} (${aqi} AQI)`,
      message: `Best outdoor window: ${hourly.bestHour} (~${hourly.bestAqi} AQI). Peak hour: ${hourly.worstHour} (~${hourly.worstAqi} AQI).`,
      time: 'Today',
    });
  }

  return alerts;
}

/**
 * Analyze hourly AQI curve to recommend best & worst outdoor time windows.
 */
export function analyzeHourlyWindows(airQuality) {
  const hourly = airQuality?.hourlyData || [];
  if (hourly.length === 0) {
    return {
      bestHour: '12 PM – 3 PM',
      bestAqi: Math.round((airQuality?.aqi || 100) * 0.85),
      worstHour: '7 PM – 9 PM',
      worstAqi: Math.round((airQuality?.aqi || 100) * 1.15),
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

/**
 * Dynamic ventilation schedule driven by live AQI & wind speed.
 */
export function getDynamicVentilationSchedule(airQuality) {
  const aqi = airQuality?.aqi ?? 120;
  const wind = airQuality?.windSpeed ?? 8;
  const hourly = airQuality?.hourlyData || [];
  const win = analyzeHourlyWindows(airQuality);

  if (aqi <= 65) {
    return [
      { time: "6 AM – 9 AM", status: "open", label: "Safe Ventilation", reason: `Clean morning air (~${Math.round(aqi * 0.95)} AQI) — flush overnight indoor CO₂.`, color: "#10b981" },
      { time: "9 AM – 12 PM", status: "open", label: "Open Windows", reason: `Breeze at ${wind} km/h supports healthy cross-ventilation.`, color: "#10b981" },
      { time: "12 PM – 4 PM", status: "open", label: "Optimal Window", reason: `Best dispersion period (~${win.bestAqi} AQI around ${win.bestHour}).`, color: "#0d9488" },
      { time: "4 PM – 8 PM", status: "maybe", label: "Monitor Traffic", reason: "Close road-facing windows briefly during peak traffic if near a main street.", color: "#f59e0b" },
      { time: "8 PM – 11 PM", status: "open", label: "Gentle Night Air", reason: "Safe for bedroom ventilation away from direct exhaust.", color: "#10b981" },
    ];
  }

  if (aqi <= 140) {
    return [
      { time: "6 AM – 9 AM", status: "maybe", label: "Keep Limited", reason: "Morning commute + cool surface air raises roadside PM2.5.", color: "#f59e0b" },
      { time: "9 AM – 12 PM", status: "maybe", label: "Short 15-min Flush", reason: "Open cross-windows briefly after morning traffic subsides.", color: "#f59e0b" },
      { time: "12 PM – 4 PM", status: "open", label: "Best Window Today", reason: `Lowest hourly AQI (~${win.bestAqi} around ${win.bestHour}) — ideal for 20–30 min airing out.`, color: "#10b981" },
      { time: "4 PM – 8 PM", status: "closed", label: "Keep Closed", reason: `Evening rush hour pushes levels toward ~${win.worstAqi} AQI.`, color: "#ef4444" },
      { time: "8 PM – 11 PM", status: "closed", label: "Sealed + Filter", reason: "Use kitchen exhaust while cooking and keep bedroom doors/windows shut.", color: "#ef4444" },
    ];
  }

  return [
    { time: "6 AM – 10 AM", status: "closed", label: "Keep Sealed", reason: `High morning inversion & traffic push PM2.5 near ${Math.round(airQuality.pm25 * 1.1)} µg/m³.`, color: "#ef4444" },
    { time: "10 AM – 12 PM", status: "closed", label: "Stay Closed", reason: `Wait for midday solar mixing before opening any window (Wind: ${wind} km/h).`, color: "#ef4444" },
    { time: "12 PM – 3 PM", status: "maybe", label: "Brief 10-min Window", reason: hourly.length ? `Relative dip near ${win.bestHour} (~${win.bestAqi} AQI) — ventilate briefly only if needed.` : "Only crack windows for 10 min to clear indoor CO₂.", color: "#f59e0b" },
    { time: "3 PM – 7 PM", status: "closed", label: "Keep Sealed", reason: "Evening commute surge rapidly degrades indoor air if unsealed.", color: "#ef4444" },
    { time: "7 PM – 11 PM", status: "closed", label: "Purify & Seal", reason: `Nighttime inversion peaks near ~${win.worstAqi} AQI. Run HEPA or DIY box-fan filter.`, color: "#ef4444" },
  ];
}

export function getDailyPlannerData(airQuality, userProfile) {
  const aqi = airQuality?.aqi ?? 120;
  const location = airQuality?.location ?? "your city";
  const isHighAqi = aqi > 150;
  const isModerateAqi = aqi > 100 && aqi <= 150;
  const win = analyzeHourlyWindows(airQuality);

  return [
    {
      id: 1,
      category: "outdoor",
      categoryLabel: "Outdoor Activities",
      action: isHighAqi
        ? `Avoid outdoor cardio in ${location}; shift workouts indoors`
        : isModerateAqi
          ? `Schedule light outdoor walks around ${win.bestHour} (~${win.bestAqi} AQI)`
          : `Great conditions for outdoor running, yoga & park walks in ${location}`,
      why: isHighAqi
        ? `Current AQI is ${aqi} (PM2.5: ${airQuality.pm25} µg/m³) with ${airQuality.windSpeed} km/h wind. Deep breathing during exercise multiplies particulate intake.`
        : `Lowest projected hourly pollution today occurs around ${win.bestHour} (~${win.bestAqi} AQI).`,
      benefit: isHighAqi ? "Cuts PM2.5 lung deposition by up to 65%" : "Optimizes aerobic benefit with cleaner air",
      difficulty: "Easy",
      priority: isHighAqi ? "critical" : isModerateAqi ? "medium" : "low",
      tags: ["Exercise", "Timing"],
    },
    {
      id: 2,
      category: "outdoor",
      categoryLabel: "Walking & Cycling",
      action: isHighAqi
        ? "Replace outdoor cycling with enclosed transit; wear N95 for essential walks"
        : isModerateAqi
          ? "Walk or cycle on tree-lined residential lanes away from arterial highways"
          : "Safe for walking and cycling commutes throughout the day",
      why: "Side streets experience 30–40% lower vehicle exhaust concentration than main junctions.",
      benefit: "Lowers acute NO₂ and black-carbon inhalation",
      difficulty: "Easy",
      priority: isHighAqi ? "high" : "low",
      tags: ["Walking", "Cycling"],
    },
    {
      id: 3,
      category: "travel",
      categoryLabel: "Travel & Commute",
      action: userProfile?.transport === "Walk/Cycle" && !isHighAqi
        ? "Maintain zero-emission walk/cycle commute via green corridors"
        : "Prefer enclosed Metro, rail, or AC transit with recirculation enabled",
      why: "Open two-wheelers expose riders to 3–5× more particulates than enclosed filtered cabins.",
      benefit: "Reduces daily commute exposure and cuts tailpipe emissions",
      difficulty: "Medium",
      priority: isHighAqi ? "high" : "medium",
      tags: ["Commute", "Low-Emission"],
    },
    {
      id: 4,
      category: "travel",
      categoryLabel: "In-Vehicle Air",
      action: "Keep car windows rolled up in congestion and set cabin AC to Recirculate",
      why: "Cabin PM2.5 rises up to 5× higher behind idling buses/trucks when outside-air vents remain open.",
      benefit: "Cuts in-cabin particle spike by ~50%",
      difficulty: "Easy",
      priority: "medium",
      tags: ["Transit", "Quick Win"],
    },
    {
      id: 5,
      category: "indoor",
      categoryLabel: "Indoor Protection",
      action: isHighAqi
        ? `Keep windows shut during peak hours (${win.worstHour}); brief airing near ${win.bestHour}`
        : `Cross-ventilate home for 25 minutes around ${win.bestHour}`,
      why: isHighAqi
        ? `Outdoor PM2.5 (${airQuality.pm25} µg/m³) quickly infiltrates unsealed rooms.`
        : `Flushes accumulated indoor CO₂, humidity, and cooking fumes efficiently.`,
      benefit: "Keeps indoor air cleaner without unnecessary energy draw",
      difficulty: "Easy",
      priority: isHighAqi ? "high" : "low",
      tags: ["Ventilation", "Home"],
    },
    {
      id: 6,
      category: "indoor",
      categoryLabel: "Indoor Activity",
      action: isHighAqi
        ? "Wet-mop hard floors & avoid incense, candles, or dry dusting today"
        : "Run kitchen chimney/exhaust whenever frying or sautéing",
      why: "Dry sweeping and indoor combustion spike indoor PM2.5 above outdoor levels.",
      benefit: "Prevents secondary indoor dust & smoke surges",
      difficulty: "Easy",
      priority: "medium",
      tags: ["Home Hygiene", "Smoke-Free"],
    },
    {
      id: 7,
      category: "family",
      categoryLabel: "Children & Seniors",
      action: isHighAqi
        ? "Move children's play and senior walks indoors; monitor asthma symptoms"
        : isModerateAqi
          ? "Limit kids' vigorous sports near roadways; schedule play mid-day"
          : "Safe for children's outdoor play and senior walks with normal hydration",
      why: "Children inhale ~50% more air per kg of body weight than adults; seniors have higher cardiopulmonary sensitivity.",
      benefit: "Protects developing lungs and sensitive airways",
      difficulty: "Medium",
      priority: isHighAqi ? "critical" : "medium",
      tags: ["Children", "Seniors"],
    },
    {
      id: 8,
      category: "sustainable",
      categoryLabel: "Clean Air Action",
      action: "Combine errands into one trip and report any open garbage or leaf burning",
      why: "Cold-start vehicle trips and open waste burning emit disproportionate amounts of toxic PM2.5.",
      benefit: "Directly lowers neighborhood particulate load",
      difficulty: "Easy",
      priority: "high",
      tags: ["Eco Habit", "Community"],
    },
  ];
}

export function getRoutineTimeline(airQuality) {
  const aqi = airQuality?.aqi ?? 120;
  const isHigh = aqi > 150;
  const win = analyzeHourlyWindows(airQuality);

  return [
    {
      period: "Morning",
      color: "#f59e0b",
      timeRange: "6:00 AM – 11:00 AM",
      items: [
        { time: "6:30 AM", action: `Review live AQI (${aqi}) in ${airQuality?.location?.split(',')[0] || 'your city'} before ventilating`, type: "check" },
        { time: "7:15 AM", action: isHigh ? "Do indoor mobility / yoga instead of outdoor jogging" : "Enjoy a brisk walk along low-traffic green streets", type: "activity" },
        { time: "8:30 AM", action: isHigh ? "Commute via metro/AC transit; wear N95 outdoors" : "Walk, cycle, or use public transit", type: "transport" },
      ],
    },
    {
      period: "Midday",
      color: "#0ea5e9",
      timeRange: "11:00 AM – 4:00 PM",
      items: [
        { time: win.bestHour, action: `Best outdoor window (~${win.bestAqi} AQI) — ventilate rooms or run errands`, type: "efficiency" },
        { time: "1:30 PM", action: "Hydrate and include antioxidant-rich fruits, greens & nuts", type: "food" },
        { time: "3:00 PM", action: "Batch errands together to avoid extra evening trips", type: "transport" },
      ],
    },
    {
      period: "Evening",
      color: "#6366f1",
      timeRange: "4:00 PM – 10:00 PM",
      items: [
        { time: win.worstHour, action: isHigh ? `Peak pollution (~${win.worstAqi} AQI) — seal windows & avoid main roads` : "Keep kitchen exhaust running while cooking dinner", type: "indoor" },
        { time: "8:00 PM", action: "Wet-wipe high-dust surfaces; keep indoor burning zero", type: "kitchen" },
        { time: "9:30 PM", action: isHigh ? "Run bedroom HEPA / DIY box-fan filter overnight" : "Ensure cool, dust-free bedroom ventilation for recovery", type: "health" },
      ],
    },
  ];
}

export const indoorTips = [
  {
    id: 1,
    room: "Living Room",
    color: "#0d9488",
    tips: [
      "Seal perimeter window gaps with affordable foam weather-stripping",
      "Use damp microfiber mops/cloths instead of dry brooms that re-suspend fine dust",
      "Keep indoor relative humidity between 40%–55% to prevent mold and dry airways",
    ],
  },
  {
    id: 2,
    room: "Kitchen",
    color: "#f97316",
    tips: [
      "Turn on exhaust fan/chimney 2 minutes before lighting the stove and keep on 10 minutes after",
      "Cover pans while simmering and avoid smoke-point overheating of oils",
      "Prefer induction/LPG over solid fuels and ensure back-burner ventilation",
    ],
  },
  {
    id: 3,
    room: "Bedroom",
    color: "#6366f1",
    tips: [
      "Run HEPA or DIY MERV-13 purifier 30 minutes before bedtime for clean sleep recovery",
      "Wash pillowcases and sheets weekly in hot water (60°C) to control dust mites",
      "Keep incense, scented paraffin candles, and tobacco completely out of bedrooms",
    ],
  },
  {
    id: 4,
    room: "Entryway & Workspace",
    color: "#10b981",
    tips: [
      "Leave outdoor shoes at the entrance door to block tracked-in heavy metals & road dust",
      "Place double door-mats (rough outer + washable inner) to trap coarse particles",
      "Change out of outer jackets after high-AQI commutes before sitting on upholstery",
    ],
  },
];

export const ecoImpactData = {
  weeklyProgress: [
    { day: "Mon", score: 62, co2: 2.1 },
    { day: "Tue", score: 66, co2: 2.5 },
    { day: "Wed", score: 70, co2: 3.1 },
    { day: "Thu", score: 69, co2: 2.4 },
    { day: "Fri", score: 74, co2: 2.9 },
    { day: "Sat", score: 79, co2: 3.4 },
    { day: "Sun", score: 76, co2: 2.8 },
  ],
};

export const communityData = {
  communityScore: 72,
  participants: 1247,
  challenge: {
    title: "Zero-Burn Clean Air Week",
    description: "Pledge zero open waste/leaf burning and replace 3 solo motor trips with transit or walking.",
    progress: 74,
    daysLeft: 4,
    participants: 892,
  },
  leaderboard: [
    { rank: 1, name: "Green Warriors Ward", score: 94, members: 42 },
    { rank: 2, name: "Clean Air Collective", score: 91, members: 38 },
    { rank: 3, name: "EcoFam Neighborhood", score: 88, members: 31 },
    { rank: 4, name: "You", score: 74, members: 1 },
    { rank: 5, name: "Breathe First Hub", score: 71, members: 25 },
    { rank: 6, name: "Air Angels Group", score: 69, members: 19 },
  ],
  recentActions: [
    { id: 'c1', user: "Priya S.", category: "Waste Burning", action: "Reported open leaf burning near community park — resolved by municipal team", time: "12m ago" },
    { id: 'c2', user: "Rahul M.", category: "Eco Commute", action: "Completed 5-day metro + walking commute streak", time: "35m ago" },
    { id: 'c3', user: "Ananya K.", category: "Indoor Clean Air", action: "Built a low-cost MERV-13 box-fan purifier for elderly parents", time: "1h ago" },
    { id: 'c4', user: "Riverside School", category: "Health Alert", action: "Moved afternoon sports indoors during AQI spike", time: "3h ago" },
  ],
  goals: [
    { title: "Urban Tree Canopy", progress: 68, target: 1000, current: 680 },
    { title: "Zero-Burn Neighborhood Days", progress: 73, target: 30, current: 22 },
    { title: "Shared Carpool & Transit Trips", progress: 52, target: 500, current: 260 },
  ],
};

export const userProfiles = {
  types: ["Student", "Working Professional", "Family (with kids)", "Senior Citizen", "Sensitive / Asthma"],
  transport: ["Walk/Cycle", "Public Transport", "Two Wheeler", "Car/Cab", "Mixed"],
  outdoorActivity: ["Very Active (Daily)", "Moderately Active", "Occasionally", "Indoors Mostly"],
  indoor: ["Apartment (small)", "House (medium)", "Office building", "School/College"],
  budget: ["Free solutions only", "Low budget (< ₹500)", "Medium (₹500–5000)", "Any budget"],
};
