import React, { useState } from 'react';
import {
  Users, Trophy, Target, Flame, Send, CheckCircle2, PhoneCall, MapPin,
} from 'lucide-react';
import { communityData, getAqiCategory } from '../data/mockData';

const REPORT_TYPES = ['Waste Burning', 'Construction Dust', 'Vehicle Smoke', 'Industrial'];

const ProgressBar = ({ value, color = '#0d9488' }) => (
  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
    <div
      className="h-full rounded-full transition-all duration-700"
      style={{ width: `${Math.min(100, value)}%`, background: color }}
    />
  </div>
);

export default function Community({ airQuality, userEcoScore = 74, userName = 'You' }) {
  const [joined, setJoined] = useState(() => {
    try {
      return localStorage.getItem('bb_challenge_joined') === 'true';
    } catch {
      return false;
    }
  });
  const [reportCategory, setReportCategory] = useState('Waste Burning');
  const [reportText, setReportText] = useState('');
  const [reported, setReported] = useState(false);
  const [feedFilter, setFeedFilter] = useState('All');
  const [userReports, setUserReports] = useState(() => {
    try {
      const saved = localStorage.getItem('bb_waste_reports');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const { communityScore, participants, challenge, leaderboard, recentActions, goals } = communityData;
  const cat = getAqiCategory(airQuality?.aqi ?? 100);

  const toggleJoin = () => {
    const next = !joined;
    setJoined(next);
    try {
      localStorage.setItem('bb_challenge_joined', String(next));
    } catch {
      // ignore
    }
  };

  const handleReport = (e) => {
    e.preventDefault();
    if (!reportText.trim()) return;
    const newEntry = {
      id: Date.now(),
      user: userName || 'You',
      category: reportCategory,
      action: `${reportCategory} in ${airQuality?.location?.split(',')[0] || 'local area'}: ${reportText.trim()}`,
      time: 'Just now',
    };
    const updated = [newEntry, ...userReports].slice(0, 12);
    setUserReports(updated);
    try {
      localStorage.setItem('bb_waste_reports', JSON.stringify(updated));
    } catch {
      // ignore
    }
    setReported(true);
    setTimeout(() => setReported(false), 3000);
    setReportText('');
  };

  // Sync user's live Eco Score into the leaderboard
  const syncedLeaderboard = leaderboard
    .map((entry) =>
      entry.name === 'You'
        ? { ...entry, displayName: userName ? `${userName} (You)` : 'You', score: userEcoScore, isUser: true }
        : { ...entry, displayName: entry.name, isUser: false }
    )
    .sort((a, b) => b.score - a.score)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

  const feedItems = [...userReports, ...recentActions];
  const filteredFeed =
    feedFilter === 'All' ? feedItems : feedItems.filter((item) => item.category === feedFilter);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="surface-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--accent-teal)' }}>
            <MapPin size={13} />
            <span>{airQuality?.location || 'Local Region'} · Regional AQI {airQuality?.aqi} ({cat.label})</span>
          </div>
          <h2 className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
            Neighborhood Clean-Air Community
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {(participants + (joined ? 1 : 0)).toLocaleString()} active members collaborating to cut local emissions.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-black" style={{ color: 'var(--accent-teal)' }}>{communityScore}</div>
            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Community Score</div>
          </div>
          <button
            onClick={toggleJoin}
            className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={
              joined
                ? {
                    background: 'rgba(16, 185, 129, 0.14)',
                    color: '#10b981',
                    border: '1.5px solid #10b981',
                  }
                : {
                    background: 'linear-gradient(135deg, #0d9488, #0ea5e9)',
                    color: '#ffffff',
                  }
            }
          >
            {joined ? 'Joined Weekly Challenge' : '+ Join Challenge'}
          </button>
        </div>
      </div>

      {/* Active Challenge & Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="surface-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span
              className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1"
              style={{ background: 'rgba(16, 185, 129, 0.14)', color: '#10b981' }}
            >
              <Trophy size={12} /> Active Eco Challenge
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {challenge.daysLeft} days left
            </span>
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{challenge.title}</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{challenge.description}</p>
          </div>
          <ProgressBar value={joined ? Math.min(100, challenge.progress + 2) : challenge.progress} color="#10b981" />
          <div className="flex items-center justify-between text-xs pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              <strong>{challenge.participants + (joined ? 1 : 0)}</strong> participants
            </span>
            <span className="font-bold text-emerald-500">
              {joined ? Math.min(100, challenge.progress + 2) : challenge.progress}% goal achieved
            </span>
          </div>
        </div>

        <div className="surface-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Target size={16} style={{ color: 'var(--accent-teal)' }} />
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Shared Neighborhood Goals</h3>
          </div>
          <div className="space-y-4">
            {goals.map((g) => (
              <div key={g.title} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{g.title}</span>
                  <span className="font-bold" style={{ color: 'var(--accent-teal)' }}>
                    {g.current.toLocaleString()} / {g.target.toLocaleString()}
                  </span>
                </div>
                <ProgressBar value={g.progress} color="#0d9488" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="surface-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} style={{ color: 'var(--accent-teal)' }} />
          <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Clean-Air Participation Leaderboard</h3>
        </div>
        <div className="space-y-2">
          {syncedLeaderboard.map((entry) => (
            <div
              key={entry.displayName}
              className="flex items-center gap-4 p-3 rounded-xl"
              style={{
                background: entry.isUser ? 'rgba(13, 148, 136, 0.1)' : 'var(--bg-subtle)',
                border: entry.isUser ? '1.5px solid var(--border-accent)' : '1px solid transparent',
              }}
            >
              <div className="w-7 text-center text-xs font-extrabold" style={{ color: 'var(--accent-teal)' }}>
                #{entry.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {entry.displayName}
                </div>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {entry.members} member{entry.members > 1 ? 's' : ''}
                </div>
              </div>
              <div className="text-right w-14">
                <div className="text-sm font-black" style={{ color: 'var(--accent-teal)' }}>{entry.score}</div>
              </div>
              <div className="hidden sm:block w-28">
                <ProgressBar value={entry.score} color={entry.isUser ? '#0d9488' : '#0ea5e9'} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Feed + Share Pollution Report */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="surface-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Local Updates & Activities
            </h3>
            <div className="flex gap-1.5 overflow-x-auto">
              {['All', 'Waste Burning', 'Eco Commute'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFeedFilter(f)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold flex-shrink-0"
                  style={
                    feedFilter === f
                      ? { background: 'var(--accent-teal)', color: '#fff' }
                      : { background: 'var(--bg-subtle)', color: 'var(--text-muted)' }
                  }
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {filteredFeed.map((item) => (
              <div key={item.id || item.action} className="p-3.5 rounded-xl space-y-1" style={{ background: 'var(--bg-subtle)' }}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{item.user}</span>
                  <span style={{ color: 'var(--text-faint)' }}>{item.time}</span>
                </div>
                {item.category && (
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/10 text-teal-600">
                    {item.category}
                  </span>
                )}
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.action}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Flame size={17} className="text-orange-500" />
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Share Local Pollution Report
            </h3>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Log open waste burning, heavy construction dust, or smoke incidents in {airQuality?.location?.split(',')[0] || 'your area'} to alert community members.
          </p>

          <form onSubmit={handleReport} className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {REPORT_TYPES.map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setReportCategory(type)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={
                    reportCategory === type
                      ? { background: '#f97316', color: '#fff' }
                      : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }
                  }
                >
                  {type}
                </button>
              ))}
            </div>

            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Location landmark and observation (e.g., Leaf burning near Central Park gate)..."
              rows={3}
              className="w-full p-3 text-xs resize-none saas-input"
            />

            {reported && (
              <div className="p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 size={15} /> Report posted to your local feed.
              </div>
            )}

            <button
              type="submit"
              disabled={!reportText.trim()}
              className="btn-brand w-full py-2.5 text-xs flex items-center justify-center gap-1.5"
            >
              <Send size={13} /> Submit Community Report
            </button>
          </form>

          <div className="pt-3 border-t flex items-center gap-2 text-xs" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
            <PhoneCall size={14} style={{ color: 'var(--accent-teal)' }} />
            <span>{airQuality?.helpline || 'Contact local municipal pollution control helpline for urgent enforcement'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
