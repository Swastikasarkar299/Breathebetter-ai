import React, { useState, useRef, useEffect } from 'react';
import {
  Send, RotateCcw, Copy, Check, ThumbsUp, ThumbsDown, Sparkles,
  MapPin, Bot, HeartPulse, ShieldAlert, Wind, Info,
} from 'lucide-react';
import { getAqiCategory, POLLUTANT_META, analyzeHourlyWindows } from '../data/mockData';

function getDynamicSuggestions(airQuality, userProfile) {
  const city = airQuality.location.split(',')[0];
  const aqi = airQuality.aqi;
  return [
    `Is it safe to walk or exercise outside in ${city} today?`,
    `What precautions should children and elderly take at AQI ${aqi}?`,
    `Explain PM2.5, PM10, NO₂, and O₃ levels in ${city} simply`,
    `When is the cleanest hour to open windows today?`,
    aqi > 150
      ? `How can I commute with less smog exposure in ${city}?`
      : `Is cycling safe in ${city} right now?`,
    `How do I protect someone with asthma during high pollution?`,
    `How can I lower indoor pollution without buying a purifier?`,
    `Give a daily plan for a ${userProfile?.type || 'Working Professional'}`,
  ];
}

function buildSmartResponse(input, airQuality, userProfile, lastTopic, setLastTopic) {
  const lower = input.toLowerCase().trim();
  const city = airQuality.location;
  const shortCity = city.split(',')[0];
  const aqi = airQuality.aqi;
  const cat = getAqiCategory(aqi);
  const win = analyzeHourlyWindows(airQuality);
  const pm25Ratio = (airQuality.pm25 / POLLUTANT_META.pm25.whoLimit).toFixed(1);
  const profileType = userProfile?.type || 'Working Professional';
  const transport = userProfile?.transport || 'Public Transport';
  const budget = userProfile?.budget || 'Low budget';

  // Follow-up why / explain more
  if ((lower === 'why' || lower.includes('why?') || lower.includes('tell me more')) && lastTopic) {
    return {
      text: `**Deeper Evidence for ${shortCity} (${lastTopic}):**\n\n• **PM2.5:** ${airQuality.pm25} µg/m³ (${pm25Ratio}× the WHO 24-hour guideline of 15 µg/m³)\n• **Meteorology:** ${airQuality.temperature}°C, ${airQuality.humidity}% humidity, wind ${airQuality.windSpeed} km/h — ${
        airQuality.windSpeed < 6
          ? 'light winds slow dispersion and allow particulates to accumulate near ground level.'
          : 'moderate airflow helps dilute surface-level emissions.'
      }\n• **Best window today:** ${win.bestHour} (~${win.bestAqi} AQI) vs peak near ${win.worstHour} (~${win.worstAqi} AQI)\n\n**Profile note (${profileType}):** Reducing peak-hour roadside exposure makes the biggest difference in daily inhaled dose.`,
      topic: lastTopic,
    };
  }

  // Specific pollutant explanation (PM2.5, PM10, NO2, O3, CO, SO2)
  if (lower.match(/pm2|pm10|no2|no₂|o3|o₃|ozone|so2|so₂|carbon monoxide|pollutant|explain.*level/)) {
    setLastTopic('pollutant breakdown');
    const lines = [
      `• **PM2.5 (${airQuality.pm25} µg/m³, WHO limit 15):** ${POLLUTANT_META.pm25.simpleExplain}`,
      `• **PM10 (${airQuality.pm10} µg/m³, WHO limit 45):** ${POLLUTANT_META.pm10.simpleExplain}`,
      `• **NO₂ (${airQuality.no2} µg/m³, WHO limit 25):** ${POLLUTANT_META.no2.simpleExplain}`,
      `• **O₃ (${airQuality.o3} µg/m³, WHO limit 100):** ${POLLUTANT_META.o3.simpleExplain}`,
      `• **CO (${airQuality.co} mg/m³) & SO₂ (${airQuality.so2 ?? 0} µg/m³):** Fuel-combustion and industrial gases.`,
    ];
    return {
      text: `**Simple Pollutant Guide for ${shortCity} (AQI ${aqi} · ${cat.label}):**\n\n${lines.join('\n')}\n\n${
        airQuality.pm25 > 35
          ? `**Main health focus today:** Fine PM2.5 is currently your primary exposure risk (${pm25Ratio}× WHO limit).`
          : '**Good news:** Fine particulate load is relatively controlled right now.'
      }`,
      topic: 'pollutant breakdown',
    };
  }

  // Asthma / respiratory / heart / sensitive groups / children / elderly
  if (lower.match(/asthma|copd|heart|cardiac|pregnan|child|kid|school|elder|senior|sensitive|risk/)) {
    setLastTopic('sensitive group protection');
    return {
      text: `**Health Protection for Sensitive Groups in ${shortCity} (AQI ${aqi} · ${cat.label}):**\n\n**Who faces higher risk today:** Children (breathe ~50% more air per kg body weight), older adults, pregnant individuals, and anyone with asthma, bronchitis, or heart conditions.\n\n**Recommended Precautions:**\n• ${aqi > 100 ? 'Shift vigorous outdoor play and senior walks indoors today.' : 'Light outdoor activity is acceptable; avoid busy road junctions.'}\n• Keep prescribed quick-relief inhalers accessible and monitor coughing, wheezing, or shortness of breath.\n• ${aqi > 150 ? 'Wear a well-sealed N95/KN95/FFP2 mask for essential travel (surgical & cloth masks do not block PM2.5).' : `Best window for fresh air today is near **${win.bestHour}** (~${win.bestAqi} AQI).`}\n• Keep indoor air clean by wet-mopping and avoiding incense, candles, or tobacco smoke.`,
      topic: 'sensitive group protection',
    };
  }

  // Morning walk / outdoor exercise / cycling
  if (lower.match(/walk|jog|run|exercise|workout|cycl|bike|outdoor|gym/)) {
    setLastTopic('outdoor activity');
    if (aqi <= 50) {
      return {
        text: `**Yes — outdoor exercise and cycling are safe in ${city} today.**\n\n**Live Context:** AQI **${aqi} (${cat.label})** · PM2.5: ${airQuality.pm25} µg/m³ · Wind: ${airQuality.windSpeed} km/h.\n\n**Tips:**\n• Morning or evening runs and cycling are both comfortable.\n• Still prefer green parks or side roads to minimize direct tailpipe NO₂.`,
        topic: 'outdoor activity',
      };
    }
    if (aqi <= 135) {
      return {
        text: `**Moderate Caution for Outdoor Activity in ${shortCity} (AQI ${aqi} · ${cat.label}):**\n\n• **Best time window:** Around **${win.bestHour}** (projected ~${win.bestAqi} AQI).\n• **Walking & Cycling:** Safe at moderate pace on tree-lined residential routes away from heavy traffic.\n• **Sensitive individuals:** Reduce high-intensity cardio duration if you notice throat irritation.`,
        topic: 'outdoor activity',
      };
    }
    return {
      text: `**Outdoor Cardio Is Not Recommended in ${shortCity} Right Now (AQI ${aqi} · ${cat.label}):**\n\n**Why:** Deep breathing during jogging or brisk cycling pulls **${airQuality.pm25} µg/m³** of PM2.5 (${pm25Ratio}× WHO limit) deep into lung tissue.\n\n**Safer Options Today:**\n• Switch cardio to indoor workouts, yoga, or home resistance training.\n• If you must walk outside, choose the cleanest dip near **${win.bestHour}** (~${win.bestAqi} AQI), wear a snug **N95/KN95 mask**, and stick to side streets.`,
      topic: 'outdoor activity',
    };
  }

  // Ventilation / windows / best time
  if (lower.match(/window|ventilat|best time|open|cleanest hour/)) {
    setLastTopic('ventilation timing');
    return {
      text: `**Ventilation Timing for ${shortCity} (Current AQI ${aqi}):**\n\n• **Cleanest window today:** **${win.bestHour}** (~${win.bestAqi} AQI) — ${
        aqi > 150 ? 'keep opening brief (10 mins) just to refresh indoor CO₂.' : 'open cross-windows for 20–30 minutes for fresh circulation.'
      }\n• **Avoid opening windows near:** **${win.worstHour}** (~${win.worstAqi} AQI) when traffic and cooler stagnant air trap particulates.\n• Always run the kitchen exhaust fan while cooking so indoor fumes don't accumulate while sealed.`,
      topic: 'ventilation timing',
    };
  }

  // Indoor air / purifier
  if (lower.match(/indoor|purifier|home|room|diy|filter|smoke|cook/)) {
    setLastTopic('indoor air quality');
    return {
      text: `**Improving Indoor Air in ${shortCity} (Budget: ${budget}):**\n\n• **Zero-Cost Actions:** Wet-mop hard floors daily (never dry-sweep), use kitchen exhaust while cooking, and keep incense/candles unlit.\n• **Budget Filtration:** Build a DIY box-fan purifier by taping a MERV-13 / HEPA panel filter to a standard box fan — reduces fine PM2.5 by ~60–75%.\n• **Dedicated HEPA Purifier:** Prioritize placing it in the bedroom first with doors closed for 8 hours of clean nighttime lung recovery.`,
      topic: 'indoor air quality',
    };
  }

  // Commute / travel
  if (lower.match(/commut|travel|drive|metro|bus|car|traffic/)) {
    setLastTopic('low-exposure commuting');
    return {
      text: `**Lower-Exposure Commute Guide for ${shortCity} (Your mode: ${transport}):**\n\n1. **Metro / Enclosed Rail:** Lowest particulate exposure due to filtered cabins.\n2. **AC Bus or Carpool:** Keep windows shut and switch AC to **Recirculate** (cuts in-cabin exhaust PM by ~50%).\n3. **Open Two-Wheeler / Walk:** Highest exposure near idling vehicles — wear a sealed N95 mask and take parallel side streets.\n\n**Timing tip:** Try to avoid peak corridor hours near **${win.worstHour}**.`,
      topic: 'low-exposure commuting',
    };
  }

  // Personalized plan
  if (lower.match(/plan|profile|recommend|what should i do|today/)) {
    setLastTopic('daily personalized plan');
    return {
      text: `**Personalized Plan for ${profileType} in ${shortCity} (AQI ${aqi} · ${cat.label}):**\n\n• **Outdoor Timing:** Aim outdoor errands near **${win.bestHour}** (~${win.bestAqi} AQI). ${aqi > 150 ? 'Skip vigorous outdoor workouts today.' : 'Light/moderate walks away from traffic are fine.'}\n• **Commute (${transport}):** ${aqi > 150 ? 'Use enclosed transit + N95 mask for street segments.' : 'Combine errands into one trip to reduce exposure and emissions.'}\n• **Home Air:** Keep peak-hour windows closed near **${win.worstHour}** and cook with exhaust ventilation on.`,
      topic: 'daily personalized plan',
    };
  }

  // Default informative response
  return {
    text: `I'm **BreatheBetter AI**, monitoring **${city}** (**AQI ${aqi} · ${cat.label}**, PM2.5 **${airQuality.pm25} µg/m³**, Wind **${airQuality.windSpeed} km/h**).\n\nI can help you with:\n• **Health risk & sensitive groups** (kids, seniors, asthma)\n• **Best outdoor & exercise timing** (cleanest window today: **${win.bestHour}**)\n• **Plain-language pollutant breakdown** (PM2.5, PM10, NO₂, O₃, CO, SO₂)\n• **Indoor air fixes & low-exposure commuting**\n\nChoose a quick question or type anything below.`,
    topic: null,
  };
}

const renderFormattedText = (text) => {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-2" />;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <div key={i} className={line.startsWith('•') ? 'pl-1 mb-1' : 'mb-0.5'}>
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={j}>{part.slice(2, -2)}</strong>
          ) : (
            <span key={j}>{part}</span>
          )
        )}
      </div>
    );
  });
};

export default function ChatAssistant({ airQuality, userProfile, apiKeys }) {
  const cat = getAqiCategory(airQuality.aqi);
  const hourlyWin = analyzeHourlyWindows(airQuality);
  const suggestions = getDynamicSuggestions(airQuality, userProfile);

  const createWelcomeMessage = (aq) => {
    const c = getAqiCategory(aq.aqi);
    return {
      id: Date.now(),
      type: 'ai',
      source: 'Context Engine',
      text: `Hello! I'm **BreatheBetter AI**, connected to live conditions for **${aq.location}**.\n\n**Current Snapshot:** AQI **${aq.aqi} (${c.label})** · PM2.5 **${aq.pm25} µg/m³** · Temp ${aq.temperature}°C · Wind ${aq.windSpeed} km/h.\n\nAsk me about outdoor exercise safety, precautions for children or elderly family members, pollutant health risks, or cleaner indoor air.`,
      time: new Date(),
    };
  };

  const [messages, setMessages] = useState(() => [createWelcomeMessage(airQuality)]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [lastTopic, setLastTopic] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [feedback, setFeedback] = useState({});
  const chatEndRef = useRef(null);
  const prevLocationRef = useRef(airQuality.location);

  useEffect(() => {
    if (prevLocationRef.current !== airQuality.location) {
      prevLocationRef.current = airQuality.location;
      const c = getAqiCategory(airQuality.aqi);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: 'ai',
          source: 'Location Sync',
          text: `Switched live context to **${airQuality.location}** — AQI **${airQuality.aqi} (${c.label})**, PM2.5 **${airQuality.pm25} µg/m³**. Ask me anything about conditions here.`,
          time: new Date(),
        },
      ]);
    }
  }, [airQuality]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const tryLLMBackendOrDirect = async (userText) => {
    const aiKey = (apiKeys?.openai || import.meta.env.VITE_GEMINI_API_KEY || '').trim();
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    const systemContext = `You are BreatheBetter AI, an evidence-based environmental health assistant.
Live Telemetry: City=${airQuality.location}, US_AQI=${airQuality.aqi} (${cat.label}), PM2.5=${airQuality.pm25} ug/m3, PM10=${airQuality.pm10} ug/m3, NO2=${airQuality.no2} ug/m3, O3=${airQuality.o3} ug/m3, CO=${airQuality.co} mg/m3, SO2=${airQuality.so2 ?? 0} ug/m3, Temp=${airQuality.temperature}C, Humidity=${airQuality.humidity}%, Wind=${airQuality.windSpeed} km/h. Cleanest window=${hourlyWin.bestHour} (~${hourlyWin.bestAqi} AQI).
User Profile: ${userProfile?.type || 'General'}, Transport=${userProfile?.transport || 'Mixed'}, Budget=${userProfile?.budget || 'Low'}.
Give clear, empathetic, practical, non-alarmist guidance under 190 words with concise bullet points. Explain WHY based on the numbers.`;

    // 1. Direct Gemini API if user configured an AIza... key
    if (aiKey.startsWith('AIza')) {
      for (const model of ['gemini-2.0-flash', 'gemini-1.5-flash']) {
        try {
          const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${aiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemContext}\n\nUser Question: ${userText}` }] }],
              }),
            }
          );
          if (resp.ok) {
            const data = await resp.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return { text, source: 'Gemini GenAI' };
          }
        } catch {
          // try next model or fallback
        }
      }
    }

    // 2. Direct OpenAI API if user configured an sk-... key
    if (aiKey.startsWith('sk-')) {
      try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${aiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemContext },
              { role: 'user', content: userText },
            ],
            max_tokens: 350,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const text = data?.choices?.[0]?.message?.content;
          if (text) return { text, source: 'OpenAI GPT' };
        }
      } catch {
        // fallback below
      }
    }

    // 3. Optional FastAPI backend if running on localhost:8000
    if (apiBase.includes(':8000')) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const resp = await fetch(`${apiBase}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userText,
            location: airQuality.location,
            aqi: airQuality.aqi,
            user_type: userProfile?.type || 'general',
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (resp.ok) {
          const data = await resp.json();
          if (data?.response && data.source !== 'fallback') {
            return { text: data.response, source: `Backend (${data.source})` };
          }
        }
      } catch {
        // backend unavailable
      }
    }

    return null;
  };

  const sendMessage = async (text) => {
    if (!text.trim() || isTyping) return;
    const trimmed = text.trim();

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), type: 'user', text: trimmed, time: new Date() },
    ]);
    setInput('');
    setIsTyping(true);

    const llmResult = await tryLLMBackendOrDirect(trimmed);
    if (llmResult) {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, type: 'ai', text: llmResult.text, source: llmResult.source, time: new Date() },
      ]);
      return;
    }

    await new Promise((r) => setTimeout(r, 480));
    setIsTyping(false);
    const localResult = buildSmartResponse(trimmed, airQuality, userProfile, lastTopic, setLastTopic);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        type: 'ai',
        text: localResult.text,
        source: 'BreatheBetter Smart Engine',
        time: new Date(),
      },
    ]);
  };

  const formatTime = (date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" style={{ minHeight: '600px' }}>
      {/* Context Sidebar */}
      <aside className="lg:col-span-4 space-y-4">
        <div className="surface-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0ea5e9)' }}
              >
                <Bot size={20} />
              </div>
              <div>
                <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  BreatheBetter AI
                </div>
                <div className="text-[11px] flex items-center gap-1" style={{ color: 'var(--accent-teal)' }}>
                  <Sparkles size={11} /> Live Context Active
                </div>
              </div>
            </div>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: cat.bg, color: cat.color }}
            >
              AQI {airQuality.aqi}
            </span>
          </div>

          <div className="p-3.5 rounded-xl space-y-2 text-xs" style={{ background: 'var(--bg-subtle)' }}>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <MapPin size={13} /> Location
              </span>
              <strong style={{ color: 'var(--text-primary)' }}>{airQuality.location}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <HeartPulse size={13} /> Profile
              </span>
              <strong style={{ color: 'var(--text-primary)' }}>{userProfile?.type || 'General'}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <Wind size={13} /> Cleanest Hour
              </span>
              <strong style={{ color: 'var(--accent-teal)' }}>
                {hourlyWin.bestHour} (~{hourlyWin.bestAqi})
              </strong>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-faint)' }}>
              Quick Health Topics
            </div>
            <div className="space-y-1.5">
              {suggestions.slice(0, 5).map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors hover:bg-teal-500/10"
                  style={{
                    background: 'var(--bg-subtle)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div
            className="p-3 rounded-xl flex items-start gap-2 text-[11px]"
            style={{ background: 'rgba(14, 165, 233, 0.08)', color: 'var(--text-secondary)' }}
          >
            <Info size={14} className="text-sky-500 flex-shrink-0 mt-0.5" />
            <span>
              Advice adapts automatically to live PM2.5, PM10, NO₂, O₃, and your profile settings. Not a substitute for medical care.
            </span>
          </div>
        </div>
      </aside>

      {/* Main Chat Panel */}
      <div className="lg:col-span-8 flex flex-col surface-card overflow-hidden" style={{ height: '650px' }}>
        {/* Header */}
        <div
          className="px-5 py-3.5 flex items-center justify-between border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            <ShieldAlert size={15} style={{ color: cat.color }} />
            <span>
              Monitoring <strong>{airQuality.location.split(',')[0]}</strong> · PM2.5 {airQuality.pm25} µg/m³ · O₃ {airQuality.o3} µg/m³
            </span>
          </div>
          <button
            onClick={() => {
              setLastTopic(null);
              setMessages([createWelcomeMessage(airQuality)]);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-teal-500/10"
            style={{ color: 'var(--accent-teal)' }}
          >
            <RotateCcw size={13} /> New Chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 items-end ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {msg.type === 'ai' && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #0d9488, #0ea5e9)' }}
                >
                  <Bot size={16} />
                </div>
              )}

              <div className={msg.type === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                {renderFormattedText(msg.text)}
                <div
                  className="flex items-center justify-between gap-4 mt-2.5 pt-1.5 text-[11px]"
                  style={{
                    borderTop: msg.type === 'ai' ? '1px solid var(--border-subtle)' : 'none',
                    color: msg.type === 'user' ? 'rgba(255,255,255,0.78)' : 'var(--text-faint)',
                  }}
                >
                  <span>
                    {formatTime(msg.time)}
                    {msg.source ? ` · ${msg.source}` : ''}
                  </span>
                  {msg.type === 'ai' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(msg.text);
                          setCopiedId(msg.id);
                          setTimeout(() => setCopiedId(null), 1500);
                        }}
                        title="Copy"
                        className="p-1 rounded hover:bg-slate-500/10"
                      >
                        {copiedId === msg.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                      <button
                        onClick={() => setFeedback((f) => ({ ...f, [msg.id]: 'up' }))}
                        title="Helpful"
                        className="p-1 rounded hover:bg-slate-500/10"
                        style={{ color: feedback[msg.id] === 'up' ? '#10b981' : undefined }}
                      >
                        <ThumbsUp size={12} />
                      </button>
                      <button
                        onClick={() => setFeedback((f) => ({ ...f, [msg.id]: 'down' }))}
                        title="Needs improvement"
                        className="p-1 rounded hover:bg-slate-500/10"
                        style={{ color: feedback[msg.id] === 'down' ? '#ef4444' : undefined }}
                      >
                        <ThumbsDown size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 items-end">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0ea5e9)' }}
              >
                <Bot size={16} />
              </div>
              <div className="chat-bubble-ai px-4 py-3 flex gap-1.5 items-center">
                <span className="typing-dot w-2 h-2 rounded-full inline-block bg-teal-500" />
                <span className="typing-dot w-2 h-2 rounded-full inline-block bg-teal-500" />
                <span className="typing-dot w-2 h-2 rounded-full inline-block bg-teal-500" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Composer */}
        <div className="p-4 border-t space-y-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {suggestions.slice(5).map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="text-xs px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0 font-medium transition-colors hover:bg-teal-500/15"
                style={{
                  background: 'rgba(13, 148, 136, 0.09)',
                  color: 'var(--accent-teal)',
                }}
              >
                {q}
              </button>
            ))}
          </div>

          <div className="flex gap-2.5 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder={`Ask about outdoor safety, pollutants, or precautions in ${airQuality.location.split(',')[0]}...`}
              rows={1}
              className="flex-1 resize-none px-4 py-2.5 text-sm saas-input"
              style={{ minHeight: '44px', maxHeight: '110px' }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              aria-label="Send message"
              className="btn-brand w-11 h-11 flex items-center justify-center flex-shrink-0"
            >
              <Send size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
