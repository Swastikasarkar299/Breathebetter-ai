import express from 'express';

const router = express.Router();

function buildContextualFallback(message, aq = {}, profile = {}, history = []) {
  const lower = String(message || '').toLowerCase();
  const city = aq.location || 'your selected city';
  const shortCity = city.split(',')[0];
  const aqi = aq.aqi ?? null;
  const pm25 = aq.pm25 ?? null;
  const pm10 = aq.pm10 ?? null;
  const no2 = aq.no2 ?? null;
  const o3 = aq.o3 ?? null;
  const co = aq.co ?? null;
  const so2 = aq.so2 ?? null;
  const wind = aq.windSpeed ?? null;
  const temp = aq.temperature ?? null;
  const humidity = aq.humidity ?? null;
  const ts = aq.lastUpdated ? new Date(aq.lastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'just now';
  const source = aq.dataSource || 'Current telemetry';

  if (aqi == null) {
    return `Live air quality telemetry is currently unavailable for **${city}**. Please refresh the dashboard or verify network connectivity before making high-exertion outdoor plans.`;
  }

  const hourly = Array.isArray(aq.hourlyData) ? aq.hourlyData : [];
  let bestSlot = null;
  let worstSlot = null;
  for (const h of hourly) {
    if (!bestSlot || h.aqi < bestSlot.aqi) bestSlot = h;
    if (!worstSlot || h.aqi > worstSlot.aqi) worstSlot = h;
  }

  const lastAiTopic = [...(history || [])].reverse().find((m) => m.role === 'assistant')?.content || '';

  if (lower === 'why' || lower.includes('why is') || lower.includes('explain more') || lower.includes('follow up')) {
    return `**Analysis for ${shortCity} (${source}, updated ${ts}):**\n\n• **Primary Particulate Load:** PM2.5 is **${pm25} µg/m³** (WHO 24h guideline: 15 µg/m³) and PM10 is **${pm10} µg/m³**.\n• **Meteorology:** Temperature ${temp}°C, ${humidity}% humidity, wind speed **${wind} km/h**${
      wind != null && wind < 7
        ? ' — light winds restrict vertical mixing and trap surface emissions.'
        : ' — active airflow helps dilute roadside pollution.'
    }\n• **Traffic & Gases:** NO₂ is ${no2} µg/m³, O₃ is ${o3} µg/m³, CO is ${co} mg/m³, SO₂ is ${so2} µg/m³.${
      bestSlot ? `\n• **Cleanest window in forecast:** Near **${bestSlot.hour}** (~${bestSlot.aqi} AQI).` : ''
    }${lastAiTopic ? '\n\nAsk a follow-up about masks, children, commuting, or indoor filtration if you need specific steps.' : ''}`;
  }

  if (lower.match(/pm2\.?5|pm10|no2|o3|so2|co|pollutant|what does/)) {
    return `**Pollutant Breakdown for ${shortCity} (${ts} · ${source}):**\n\n• **PM2.5 (${pm25} µg/m³):** Microscopic particles (<2.5 µm) that penetrate deep into alveoli and bloodstream. WHO 24h target is ≤15 µg/m³.\n• **PM10 (${pm10} µg/m³):** Coarse dust and road particles irritating nose, eyes, and throat (WHO ≤45 µg/m³).\n• **NO₂ (${no2} µg/m³):** Traffic/diesel exhaust gas that irritates airways.\n• **O₃ (${o3} µg/m³):** Sunlight-driven ground ozone peaking in warm afternoons.\n• **CO (${co} mg/m³) & SO₂ (${so2} µg/m³):** Combustion and industrial gases.\n\n**Bottom line:** Current US AQI is **${aqi} (${aq.category})**.`;
  }

  if (lower.match(/indoor.*safer|indoor|purifier|reduce indoor|home air/)) {
    return `**Indoor Air Guidance for ${shortCity} (Outdoor AQI ${aqi}, ${source}):**\n\n• **Is indoor air safer?** Usually yes *when windows are sealed during spikes and indoor combustion is avoided*, because building walls reduce particle infiltration—unless cooking smoke, incense, or dry sweeping pollute indoor rooms.\n• **Action steps right now:**\n  1. ${aqi > 150 ? 'Keep windows shut during high-AQI hours' : 'Ventilate briefly during cleaner midday hours'}${bestSlot ? ` (best forecast hour: **${bestSlot.hour}**, ~${bestSlot.aqi} AQI)` : ''}.\n  2. Run kitchen exhaust while cooking and wet-mop floors instead of dry sweeping.\n  3. Use a True HEPA H13 purifier or sealed MERV-13 box-fan filter in bedrooms.\n  *Note: BreatheBetter cannot measure your physical room air without an indoor sensor.*`;
  }

  if (lower.match(/walk|exercise|outdoor|run|jog|cycl|safe to go/)) {
    if (aqi <= 60) {
      return `**Yes — outdoor activity is safe in ${shortCity} right now.**\n\n• **Live Reading:** AQI **${aqi} (${aq.category})** · PM2.5: ${pm25} µg/m³ · Wind: ${wind} km/h (${ts}, ${source}).\n• Outdoor walks, jogging, and cycling are comfortable. Prefer green parks away from main traffic lanes.`;
    }
    if (aqi <= 135) {
      return `**Moderate Caution Outdoors in ${shortCity} (AQI ${aqi} · ${aq.category}):**\n\n• Light-to-moderate walks are fine, especially ${bestSlot ? `around **${bestSlot.hour}** (~${bestSlot.aqi} AQI)` : 'during midday dispersion'}.\n• Sensitive individuals (asthma, children, seniors) should shorten vigorous workouts near heavy roadways.`;
    }
    return `**Limit Outdoor Exercise in ${shortCity} Today (AQI ${aqi} · ${aq.category}):**\n\n• **Why:** At **${pm25} µg/m³** PM2.5 (${ts}, ${source}), heavy breathing during cardio pulls fine particles deeper into lungs.\n• **Better Alternative:** Move workouts indoors today. For essential outdoor trips, wear a snug **N95/KN95** mask${bestSlot ? ` and aim for **${bestSlot.hour}** (~${bestSlot.aqi} AQI)` : ''}.`;
  }

  if (lower.match(/precaution|child|elder|senior|asthma|sensitive|mask/)) {
    return `**Health Precautions for ${shortCity} (${profile?.type || 'All Residents'} · AQI ${aqi}):**\n\n• **Children & Elderly:** ${aqi > 100 ? 'Keep vigorous play and senior walks indoors until AQI drops below 100.' : 'Safe for light outdoor time away from traffic.'}\n• **Asthma / Cardiac Care:** Keep rescue inhalers accessible and monitor coughing or chest tightness.\n• **Masks:** ${aqi > 150 ? 'Wear a tight-fitting N95/FFP2 mask outdoors; cloth masks do not block PM2.5.' : 'N95 recommended only near heavy construction or traffic corridors.'}\n• **Source:** ${source} at ${ts}.`;
  }

  return `**BreatheBetter Environmental Brief — ${city} (${ts} · ${source}):**\n\n• **AQI:** ${aqi} (${aq.category}) · PM2.5: ${pm25} µg/m³ · PM10: ${pm10} µg/m³\n• **Weather:** ${temp}°C, ${humidity}% humidity, Wind ${wind} km/h\n${bestSlot ? `• **Cleanest Forecast Window:** ${bestSlot.hour} (~${bestSlot.aqi} AQI)\n` : ''}• **Top Recommendation for ${profile?.type || 'you'}:** ${
    aqi > 150
      ? 'Minimize outdoor exertion, seal windows during traffic peaks, and wear N95 protection outdoors.'
      : aqi > 100
        ? 'Prefer midday hours for outdoor errands and avoid congested road junctions.'
        : 'Conditions are generally favorable for outdoor routines and cross-ventilation.'
  }`;
}

router.post('/chat', async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const airQuality = req.body?.airQuality || {};
    const userProfile = req.body?.userProfile || {};
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];

    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();

    const hourly = Array.isArray(airQuality.hourlyData) ? airQuality.hourlyData : [];
    const bestSlot = hourly.reduce((min, h) => (!min || h.aqi < min.aqi ? h : min), null);

    const systemPrompt = `You are BreatheBetter AI, an authoritative, empathetic environmental health intelligence assistant.
ONLY cite the actual environmental measurements provided below. If a field is missing/null, state that it is unavailable rather than inventing numbers.
Never claim to read physical indoor sensor data unless the user explicitly provides it.

Current Telemetry:
- City: ${airQuality.location || 'Unknown'}
- Source: ${airQuality.dataSource || 'Unavailable'} | Updated: ${airQuality.lastUpdated || 'Unknown'}
- US AQI: ${airQuality.aqi ?? 'N/A'} (${airQuality.category || 'N/A'})
- Pollutants: PM2.5=${airQuality.pm25 ?? 'N/A'} µg/m³, PM10=${airQuality.pm10 ?? 'N/A'} µg/m³, NO2=${airQuality.no2 ?? 'N/A'} µg/m³, SO2=${airQuality.so2 ?? 'N/A'} µg/m³, O3=${airQuality.o3 ?? 'N/A'} µg/m³, CO=${airQuality.co ?? 'N/A'} mg/m³
- Weather: Temp=${airQuality.temperature ?? 'N/A'}°C (Feels ${airQuality.feelsLike ?? 'N/A'}°C), Humidity=${airQuality.humidity ?? 'N/A'}%, Wind=${airQuality.windSpeed ?? 'N/A'} km/h ${airQuality.windDirection || ''}, Pressure=${airQuality.pressure ?? 'N/A'} hPa, UV=${airQuality.uvIndex ?? 'N/A'}
- Cleanest Hourly Forecast Window: ${bestSlot ? `${bestSlot.hour} (~${bestSlot.aqi} AQI)` : 'Not available'}
- User Profile: ${userProfile.type || 'General'}, Commute=${userProfile.transport || 'Unspecified'}, Activity=${userProfile.outdoorActivity || 'Unspecified'}, Budget=${userProfile.budget || 'Unspecified'}

Respond concisely (under 220 words), explain pollution science in clear plain language, cite the data timestamp/source when relevant, and use crisp bullet points.`;

    // 1. Google Gemini API (server-side key only)
    if (geminiKey) {
      const contents = [
        ...history.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(m.content || '') }],
        })),
        { role: 'user', parts: [{ text: message }] },
      ];

      for (const model of ['gemini-2.0-flash', 'gemini-1.5-flash']) {
        try {
          const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents,
                generationConfig: { maxOutputTokens: 450, temperature: 0.45 },
              }),
            }
          );
          if (resp.ok) {
            const json = await resp.json();
            const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              return res.json({
                response: text,
                engine: `Google Gemini (${model})`,
                isGenerativeModel: true,
                timestamp: new Date().toISOString(),
              });
            }
          }
        } catch (err) {
          console.warn(`[Gemini ${model} failed]`, err?.message);
        }
      }
    }

    // 2. OpenAI API (server-side key only)
    if (openaiKey) {
      try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              ...history.map((m) => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: String(m.content || ''),
              })),
              { role: 'user', content: message },
            ],
            max_tokens: 450,
            temperature: 0.45,
          }),
        });
        if (resp.ok) {
          const json = await resp.json();
          const text = json?.choices?.[0]?.message?.content;
          if (text) {
            return res.json({
              response: text,
              engine: 'OpenAI GPT-4o-mini',
              isGenerativeModel: true,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        console.warn('[OpenAI failed]', err?.message);
      }
    }

    // 3. Honest server-side contextual engine when no external LLM key is configured on server
    const fallbackText = buildContextualFallback(message, airQuality, userProfile, history);
    return res.json({
      response: fallbackText,
      engine: 'BreatheBetter Live Context Engine (Add GEMINI_API_KEY or OPENAI_API_KEY on server for LLM mode)',
      isGenerativeModel: false,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[AI Chat Error]', err);
    return res.status(500).json({ error: 'AI assistant failed to generate a response.' });
  }
});

export default router;
