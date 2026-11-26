import React, { useState, useRef, useEffect } from 'react';
import {
  Send, RotateCcw, Copy, Check, ThumbsUp, ThumbsDown, Sparkles,
  MapPin, Bot, HeartPulse, ShieldAlert, Wind, Info, AlertCircle,
} from 'lucide-react';
import { getAqiCategory, analyzeHourlyWindows } from '../data/mockData';
import { aiApi } from '../services/apiClient';

function getDynamicSuggestions(airQuality) {
  const city = (airQuality.location || 'my city').split(',')[0];
  return [
    `Is it safe to go outside in ${city} today?`,
    `Can I exercise outdoors right now?`,
    `What does PM2.5 mean for my health?`,
    `Why is the AQI at ${airQuality.aqi ?? 'this level'}?`,
    `What precautions should children & seniors take?`,
    `Is indoor air safer than outdoor air right now?`,
    `What is the best time for a morning walk in ${city}?`,
    `How can I reduce indoor pollution?`,
  ];
}

const renderFormattedText = (text) => {
  return String(text || '').split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-2" />;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <div key={i} className={line.startsWith('•') || line.trim().startsWith('-') ? 'pl-1 mb-1' : 'mb-0.5'}>
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

export default function ChatAssistant({ airQuality, userProfile }) {
  const cat = getAqiCategory(airQuality.aqi ?? 0);
  const hourlyWin = analyzeHourlyWindows(airQuality);
  const suggestions = getDynamicSuggestions(airQuality);

  const createWelcomeMessage = (aq) => {
    const c = getAqiCategory(aq.aqi ?? 0);
    return {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      engine: aq.isLive ? aq.dataSource : 'Live Telemetry Context',
      text: aq.isLive
        ? `Hello! I'm **BreatheBetter AI**, connected to live telemetry for **${aq.location}**.\n\n**Current Readings:** AQI **${aq.aqi} (${c.label})** · PM2.5 **${aq.pm25} µg/m³** · PM10 **${aq.pm10} µg/m³** · Temp **${aq.temperature}°C** · Wind **${aq.windSpeed} km/h**.\n\nAsk me about outdoor exercise, pollutant health risks, best walking hours, or indoor air safety.`
        : `Hello! I'm **BreatheBetter AI**. Live readings for **${aq.location}** are currently unavailable. Once connected, I can analyze live local AQI, pollutants, and weather for you.`,
      time: new Date().toISOString(),
    };
  };

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('bb_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [createWelcomeMessage(airQuality)];
  });

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [feedback, setFeedback] = useState({});
  const chatEndRef = useRef(null);
  const prevLocationRef = useRef(airQuality.location);

  useEffect(() => {
    try {
      localStorage.setItem('bb_chat_history', JSON.stringify(messages.slice(-30)));
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (prevLocationRef.current !== airQuality.location && airQuality.isLive) {
      prevLocationRef.current = airQuality.location;
      const c = getAqiCategory(airQuality.aqi ?? 0);
      setMessages((prev) => [
        ...prev,
        {
          id: `loc-${Date.now()}`,
          role: 'assistant',
          engine: airQuality.dataSource,
          text: `Switched live telemetry to **${airQuality.location}** — AQI **${airQuality.aqi} (${c.label})**, PM2.5 **${airQuality.pm25} µg/m³**. Ask me anything about air quality here.`,
          time: new Date().toISOString(),
        },
      ]);
    }
  }, [airQuality]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed || isTyping) return;

    setErrorMsg('');
    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      time: new Date().toISOString(),
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setIsTyping(true);

    try {
      const historyPayload = nextHistory
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.text }));

      const res = await aiApi.chat({
        message: trimmed,
        airQuality,
        userProfile,
        history: historyPayload,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: res.response,
          engine: res.engine || 'BreatheBetter AI',
          time: res.timestamp || new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setErrorMsg(
        err?.message || 'Unable to reach AI backend endpoint. Ensure the Node Express server is running on port 8000.'
      );
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    const fresh = [createWelcomeMessage(airQuality)];
    setMessages(fresh);
    setErrorMsg('');
    try { localStorage.setItem('bb_chat_history', JSON.stringify(fresh)); } catch {}
  };

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Context Telemetry Panel */}
      <aside className="lg:col-span-4 space-y-4">
        <div className="surface-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
              >
                <Bot size={20} />
              </div>
              <div>
                <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  AI Health Intelligence
                </div>
                <div className="text-[11px] flex items-center gap-1" style={{ color: 'var(--accent-teal)' }}>
                  <Sparkles size={11} /> Secure Backend Proxy
                </div>
              </div>
            </div>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                background: airQuality.isLive ? cat.bg : 'var(--bg-subtle)',
                color: airQuality.isLive ? cat.color : 'var(--text-muted)',
              }}
            >
              AQI {airQuality.aqi ?? 'N/A'}
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
                <Wind size={13} /> Cleanest Window
              </span>
              <strong style={{ color: 'var(--accent-teal)' }}>
                {airQuality.isLive ? `${hourlyWin.bestHour} (~${hourlyWin.bestAqi})` : 'Unavailable'}
              </strong>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-faint)' }}>
              Suggested Questions
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

          <div className="p-3 rounded-xl flex items-start gap-2 text-[11px]" style={{ background: 'rgba(6, 182, 212, 0.08)', color: 'var(--text-secondary)' }}>
            <Info size={14} className="text-cyan-500 flex-shrink-0 mt-0.5" />
            <span>
              Prompts are processed server-side with live environmental readings and multi-turn history. API keys are never exposed in browser code.
            </span>
          </div>
        </div>
      </aside>

      {/* Main Conversational Interface */}
      <div className="lg:col-span-8 flex flex-col surface-card overflow-hidden" style={{ height: '660px' }}>
        <div className="px-5 py-3.5 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            <ShieldAlert size={15} style={{ color: cat.color }} />
            <span>
              {airQuality.isLive
                ? `${airQuality.location.split(',')[0]} · PM2.5 ${airQuality.pm25} µg/m³ · O₃ ${airQuality.o3} µg/m³`
                : 'Live environmental feed currently offline'}
            </span>
          </div>
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-teal-500/10"
            style={{ color: 'var(--accent-teal)' }}
          >
            <RotateCcw size={13} /> Clear Chat
          </button>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 items-end ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'assistant' && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
                >
                  <Bot size={16} />
                </div>
              )}

              <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                {renderFormattedText(msg.text)}
                <div
                  className="flex items-center justify-between gap-4 mt-2.5 pt-1.5 text-[11px]"
                  style={{
                    borderTop: msg.role === 'assistant' ? '1px solid var(--border-subtle)' : 'none',
                    color: msg.role === 'user' ? 'rgba(255,255,255,0.78)' : 'var(--text-faint)',
                  }}
                >
                  <span className="truncate max-w-[260px]">
                    {formatTime(msg.time)}
                    {msg.engine ? ` · ${msg.engine}` : ''}
                  </span>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1 flex-shrink-0">
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
                style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
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

          {errorMsg && (
            <div className="p-3 rounded-xl text-xs flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/25">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{errorMsg}</span>
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
                style={{ background: 'rgba(13, 148, 136, 0.09)', color: 'var(--accent-teal)' }}
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
              placeholder={`Ask about outdoor safety, PM2.5, or indoor air in ${airQuality.location.split(',')[0]}...`}
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
