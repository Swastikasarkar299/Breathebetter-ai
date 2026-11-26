import React, { useState, useEffect } from 'react';
import {
  Clock, Footprints, Bike, Dumbbell, CheckCircle2, Plus, Pencil, Trash2,
  Sun, Sunrise, Moon, CalendarDays, Calendar, Save, X, CloudSun,
} from 'lucide-react';
import {
  getDailyPlannerData, getRoutineTimeline, getAqiCategory, analyzeHourlyWindows,
} from '../data/mockData';
import { plannerApi } from '../services/apiClient';

const CATEGORIES = [
  { id: 'outdoor', label: 'Outdoor' },
  { id: 'travel', label: 'Commute' },
  { id: 'indoor', label: 'Indoor' },
  { id: 'sports', label: 'Sports / Exercise' },
  { id: 'sustainable', label: 'Eco Action' },
];

const SuitabilityCard = ({ title, status, detail, Icon, color }) => (
  <div className="surface-card p-4 flex items-start gap-3">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18`, color }}>
      <Icon size={18} />
    </div>
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>{title}</div>
      <div className="text-sm font-bold mt-0.5" style={{ color }}>{status}</div>
      <div className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>{detail}</div>
    </div>
  </div>
);

export default function DailyPlanner({ airQuality, userProfile, formatTemp }) {
  const [scheduleView, setScheduleView] = useState('daily'); // daily | weekly
  const [activities, setActivities] = useState(() => {
    try {
      const saved = localStorage.getItem('bb_planner_activities');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('outdoor');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newTime, setNewTime] = useState('07:30 AM');
  const [todayStr] = useState(() => new Date().toISOString().slice(0, 10));
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTime, setEditTime] = useState('');
  const [statusNote, setStatusNote] = useState('');

  const aqi = airQuality.aqi ?? 100;
  const cat = getAqiCategory(aqi);
  const win = analyzeHourlyWindows(airQuality);
  const forecastCards = getDailyPlannerData(airQuality, userProfile);
  const routineTimeline = getRoutineTimeline(airQuality);

  // Sync activities from DB backend
  useEffect(() => {
    plannerApi
      .list()
      .then((res) => {
        if (Array.isArray(res?.activities)) {
          setActivities(res.activities);
          try { localStorage.setItem('bb_planner_activities', JSON.stringify(res.activities)); } catch {}
        }
      })
      .catch(() => {
        // Offline localStorage fallback preserved
      });
  }, []);

  const persistLocal = (next) => {
    setActivities(next);
    try { localStorage.setItem('bb_planner_activities', JSON.stringify(next)); } catch {}
  };

  const evaluateSafetyForSlot = () => {
    if (!airQuality.isLive) return 'Unknown (Offline)';
    if (aqi <= 60) return 'Safe';
    if (aqi <= 135) return 'Moderate Caution';
    return 'High Risk Indoors Advised';
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    const payload = {
      title,
      category: newCategory,
      scheduledDate: newDate,
      timeSlot: newTime,
      recommendedAqi: win.bestAqi,
      weatherNote: airQuality.isLive
        ? `${formatTemp ? formatTemp(airQuality.temperature) : `${airQuality.temperature}°C`}, ${airQuality.weatherCondition}`
        : 'Weather pending',
      safetyStatus: evaluateSafetyForSlot(),
    };

    setNewTitle('');
    try {
      const res = await plannerApi.create(payload);
      if (res?.activity) {
        persistLocal([res.activity, ...activities]);
        setStatusNote('Activity saved to database.');
        setTimeout(() => setStatusNote(''), 2500);
        return;
      }
    } catch {
      // fallback local record if backend unreachable
    }
    const localItem = { id: `local-${Date.now()}`, ...payload, completed: false };
    persistLocal([localItem, ...activities]);
  };

  const handleToggleComplete = async (item) => {
    const nextCompleted = !item.completed;
    persistLocal(activities.map((a) => (a.id === item.id ? { ...a, completed: nextCompleted } : a)));
    if (!String(item.id).startsWith('local-')) {
      plannerApi.update(item.id, { completed: nextCompleted }).catch(() => {});
    }
  };

  const handleSaveEdit = async (item) => {
    if (!editTitle.trim()) return;
    persistLocal(
      activities.map((a) => (a.id === item.id ? { ...a, title: editTitle.trim(), timeSlot: editTime } : a))
    );
    setEditingId(null);
    if (!String(item.id).startsWith('local-')) {
      plannerApi.update(item.id, { title: editTitle.trim(), timeSlot: editTime }).catch(() => {});
    }
  };

  const handleDelete = async (id) => {
    persistLocal(activities.filter((a) => a.id !== id));
    if (!String(id).startsWith('local-')) {
      plannerApi.remove(id).catch(() => {});
    }
  };

  const displayedActivities =
    scheduleView === 'daily' ? activities.filter((a) => a.scheduledDate === todayStr) : activities;

  const walkStatus =
    !airQuality.isLive
      ? { status: 'Check Live AQI', detail: 'Connect live feed for walk index', color: '#64748b' }
      : aqi <= 80
        ? { status: 'Safe All Day', detail: 'Enjoy brisk walks & outdoor errands', color: '#10b981' }
        : aqi <= 140
          ? { status: 'Best Midday', detail: `Walk near ${win.bestHour} (~${win.bestAqi} AQI)`, color: '#f59e0b' }
          : { status: 'Limit & Mask', detail: 'Wear N95 for essential trips only', color: '#ef4444' };

  const cycleStatus =
    !airQuality.isLive
      ? { status: 'Unavailable', detail: 'Live AQI required', color: '#64748b' }
      : aqi <= 75
        ? { status: 'Safe to Cycle', detail: 'Green corridors & normal rides safe', color: '#10b981' }
        : aqi <= 130
          ? { status: 'Side Streets Only', detail: 'Avoid heavy diesel arterial roads', color: '#f59e0b' }
          : { status: 'Switch to Transit', detail: 'Avoid cycling during high PM2.5', color: '#ef4444' };

  const sportsStatus =
    !airQuality.isLive
      ? { status: 'Unavailable', detail: 'Live AQI required', color: '#64748b' }
      : aqi <= 85
        ? { status: 'Outdoor Sports OK', detail: 'Running, football & field sports fine', color: '#10b981' }
        : aqi <= 150
          ? { status: 'Moderate Duration', detail: 'Take frequent hydration breaks', color: '#f59e0b' }
          : { status: 'Indoor Training', detail: 'Yoga, gym & bodyweight workouts', color: '#ef4444' };

  return (
    <div className="space-y-5">
      {/* Forecast Suitability Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SuitabilityCard
          title="Best Exercise Window"
          status={airQuality.isLive ? `${win.bestHour} (~${win.bestAqi} AQI)` : 'Unavailable'}
          detail={airQuality.isLive ? `Peak pollution near ${win.worstHour} (~${win.worstAqi} AQI)` : 'Connect live data'}
          Icon={Clock}
          color="#0d9488"
        />
        <SuitabilityCard title="Walking Guidance" status={walkStatus.status} detail={walkStatus.detail} Icon={Footprints} color={walkStatus.color} />
        <SuitabilityCard title="Cycling & Transit" status={cycleStatus.status} detail={cycleStatus.detail} Icon={Bike} color={cycleStatus.color} />
        <SuitabilityCard title="Sports & Workouts" status={sportsStatus.status} detail={sportsStatus.detail} Icon={Dumbbell} color={sportsStatus.color} />
      </div>

      {/* Personal Activity Scheduler (Full CRUD + Daily/Weekly Schedule) */}
      <div className="surface-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Your Pollution-Aware Activity Schedule
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Create, edit, complete, and organize activities around live AQI ({aqi}) & {airQuality.weatherCondition}.
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setScheduleView('daily')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              style={scheduleView === 'daily' ? { background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: '#fff' } : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
            >
              <Calendar size={13} /> Today ({activities.filter((a) => a.scheduledDate === todayStr).length})
            </button>
            <button
              onClick={() => setScheduleView('weekly')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              style={scheduleView === 'weekly' ? { background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: '#fff' } : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
            >
              <CalendarDays size={13} /> Full Schedule ({activities.length})
            </button>
          </div>
        </div>

        {/* Add Activity Form */}
        <form onSubmit={handleAddActivity} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add activity (e.g., 20-min park walk or indoor yoga)..."
            className="sm:col-span-5 px-3.5 py-2 text-xs saas-input"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="sm:col-span-2 px-3 py-2 text-xs saas-input"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="sm:col-span-2 px-3 py-2 text-xs saas-input"
          />
          <input
            type="text"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            placeholder="07:30 AM"
            className="sm:col-span-2 px-3 py-2 text-xs saas-input"
          />
          <button type="submit" disabled={!newTitle.trim()} className="sm:col-span-1 btn-brand py-2 text-xs flex items-center justify-center gap-1">
            <Plus size={14} /> Add
          </button>
        </form>

        {statusNote && (
          <div className="text-xs font-semibold text-emerald-500">{statusNote}</div>
        )}

        {/* Activities List */}
        {displayedActivities.length === 0 ? (
          <div className="p-6 rounded-xl text-center text-xs" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            No activities scheduled for {scheduleView === 'daily' ? 'today' : 'this week'}. Add one above to plan around clean-air windows.
          </div>
        ) : (
          <div className="space-y-2">
            {displayedActivities.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                style={{
                  background: item.completed ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-subtle)',
                  border: `1px solid ${item.completed ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-subtle)'}`,
                }}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggleComplete(item)}
                    className="mt-0.5 flex-shrink-0"
                    style={{ color: item.completed ? '#10b981' : 'var(--text-faint)' }}
                    title="Toggle completed"
                  >
                    <CheckCircle2 size={18} />
                  </button>

                  {editingId === item.id ? (
                    <div className="flex flex-wrap gap-2 flex-1">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="px-2.5 py-1 text-xs saas-input flex-1 min-w-[160px]"
                      />
                      <input
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="px-2.5 py-1 text-xs saas-input w-24"
                      />
                      <button onClick={() => handleSaveEdit(item)} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-600 text-white flex items-center gap-1">
                        <Save size={12} /> Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="px-2 py-1 rounded-lg text-xs" style={{ color: 'var(--text-muted)' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-sm font-semibold"
                          style={{
                            color: 'var(--text-primary)',
                            textDecoration: item.completed ? 'line-through' : 'none',
                          }}
                        >
                          {item.title}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600">
                          {item.category}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: cat.bg, color: cat.color }}>
                          {item.safetyStatus}
                        </span>
                      </div>
                      <div className="text-[11px] mt-1 flex items-center gap-3 flex-wrap" style={{ color: 'var(--text-muted)' }}>
                        <span>{item.scheduledDate} · {item.timeSlot}</span>
                        {item.recommendedAqi != null && <span>Est. Window AQI ~{item.recommendedAqi}</span>}
                        {item.weatherNote && (
                          <span className="flex items-center gap-1">
                            <CloudSun size={11} /> {item.weatherNote}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {editingId !== item.id && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => {
                        setEditingId(item.id);
                        setEditTitle(item.title);
                        setEditTime(item.timeSlot);
                      }}
                      title="Edit activity"
                      className="p-1.5 rounded-lg hover:bg-teal-500/10"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      title="Delete activity"
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Forecast-Driven Daily Advice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {forecastCards.slice(0, 6).map((card) => (
          <div key={card.id} className="surface-card p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent-teal)' }}>
                {card.categoryLabel}
              </span>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                {card.difficulty}
              </span>
            </div>
            <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{card.action}</h4>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{card.why}</p>
            <div className="text-xs font-semibold text-emerald-500 pt-1">Benefit: {card.benefit}</div>
          </div>
        ))}
      </div>

      {/* Morning / Midday / Evening Routine Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {routineTimeline.map((period) => {
          const PeriodIcon = period.period === 'Morning' ? Sunrise : period.period === 'Midday' ? Sun : Moon;
          return (
            <div key={period.period} className="surface-card p-5">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${period.color}18`, color: period.color }}>
                  <PeriodIcon size={17} />
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{period.period}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{period.timeRange}</div>
                </div>
              </div>
              <div className="space-y-3">
                {period.items.map((item, i) => (
                  <div key={i} className="flex gap-3 items-start text-xs">
                    <span className="font-bold w-16 flex-shrink-0" style={{ color: 'var(--accent-teal)' }}>{item.time}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.action}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
