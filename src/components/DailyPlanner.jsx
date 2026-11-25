import React, { useState, useEffect } from 'react';
import {
  Clock, Footprints, Bike, Dumbbell, Home, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, Sun, Sunrise, Moon, Layers,
} from 'lucide-react';
import {
  getDailyPlannerData, getRoutineTimeline, getAqiCategory, analyzeHourlyWindows,
} from '../data/mockData';

const CATEGORIES = [
  { id: 'all', label: 'All Advice' },
  { id: 'outdoor', label: 'Outdoor & Exercise' },
  { id: 'travel', label: 'Walking & Commute' },
  { id: 'indoor', label: 'Indoor Activities' },
  { id: 'family', label: 'Family & Sensitive' },
  { id: 'sustainable', label: 'Low-Emission' },
];

const PRIORITY_MAP = {
  critical: { label: 'High Risk', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
  high: { label: 'Recommended', color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)' },
  medium: { label: 'Moderate', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  low: { label: 'Good Window', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
};

const SuitabilityCard = ({ title, status, detail, Icon, color }) => (
  <div className="surface-card p-4 flex items-start gap-3">
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}18`, color }}
    >
      <Icon size={18} />
    </div>
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
        {title}
      </div>
      <div className="text-sm font-bold mt-0.5" style={{ color }}>{status}</div>
      <div className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>{detail}</div>
    </div>
  </div>
);

export default function DailyPlanner({ airQuality, userProfile }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeView, setActiveView] = useState('cards');
  const [expandedId, setExpandedId] = useState(null);
  const [completedIds, setCompletedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('bb_planner_done');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('bb_planner_done', JSON.stringify(completedIds));
    } catch {
      // ignore
    }
  }, [completedIds]);

  const cat = getAqiCategory(airQuality.aqi);
  const win = analyzeHourlyWindows(airQuality);
  const plannerItems = getDailyPlannerData(airQuality, userProfile);
  const timeline = getRoutineTimeline(airQuality);
  const aqi = airQuality.aqi;

  const filtered =
    activeCategory === 'all' ? plannerItems : plannerItems.filter((d) => d.category === activeCategory);

  const toggleDone = (id, e) => {
    e.stopPropagation();
    setCompletedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const walkStatus =
    aqi <= 80
      ? { status: 'Ideal', detail: 'Enjoy brisk walks anytime today', color: '#10b981' }
      : aqi <= 140
        ? { status: 'Use Clean Hours', detail: `Best near ${win.bestHour} away from traffic`, color: '#f59e0b' }
        : { status: 'Limit & Mask', detail: 'Short essential walks only with N95', color: '#ef4444' };

  const cycleStatus =
    aqi <= 75
      ? { status: 'Safe to Cycle', detail: 'Green corridors & normal commute fine', color: '#10b981' }
      : aqi <= 130
        ? { status: 'Side Lanes Only', detail: 'Avoid heavy diesel traffic corridors', color: '#f59e0b' }
        : { status: 'Switch to Transit', detail: 'High breathing rate increases PM intake', color: '#ef4444' };

  const exerciseStatus =
    aqi <= 85
      ? { status: 'Outdoor Cardio OK', detail: 'Running & sports safe outdoors', color: '#10b981' }
      : aqi <= 150
        ? { status: 'Light Intensity', detail: 'Low-impact outdoor or indoor workout', color: '#f59e0b' }
        : { status: 'Indoor Workout', detail: 'Yoga, pilates & strength indoors', color: '#ef4444' };

  return (
    <div className="space-y-5">
      {/* Daily Alerts & Suitability Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SuitabilityCard
          title="Best Outdoor Window"
          status={`${win.bestHour} (~${win.bestAqi} AQI)`}
          detail={`Peak pollution expected near ${win.worstHour} (~${win.worstAqi} AQI)`}
          Icon={Clock}
          color="#0d9488"
        />
        <SuitabilityCard
          title="Walking Suitability"
          status={walkStatus.status}
          detail={walkStatus.detail}
          Icon={Footprints}
          color={walkStatus.color}
        />
        <SuitabilityCard
          title="Cycling Guidance"
          status={cycleStatus.status}
          detail={cycleStatus.detail}
          Icon={Bike}
          color={cycleStatus.color}
        />
        <SuitabilityCard
          title="Exercise Mode"
          status={exerciseStatus.status}
          detail={exerciseStatus.detail}
          Icon={Dumbbell}
          color={exerciseStatus.color}
        />
      </div>

      {/* Pollution-Based Daily Alert Banner */}
      <div
        className="surface-card p-4 flex items-start gap-3"
        style={{
          borderColor: aqi > 150 ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-accent)',
          background: aqi > 150 ? 'rgba(239, 68, 68, 0.08)' : undefined,
        }}
      >
        <AlertTriangle
          size={18}
          className="flex-shrink-0 mt-0.5"
          style={{ color: aqi > 150 ? '#ef4444' : 'var(--accent-teal)' }}
        />
        <div className="text-xs sm:text-sm" style={{ color: 'var(--text-primary)' }}>
          <strong>Daily Pollution Alert ({airQuality.location.split(',')[0]} · AQI {aqi}):</strong>{' '}
          {aqi > 150
            ? `Unhealthy particulate conditions (${airQuality.pm25} µg/m³ PM2.5). Prioritize indoor exercise, keep kids indoors during rush hour, and ventilate only briefly near ${win.bestHour}.`
            : `Air quality is ${cat.label}. Best time for outdoor movement and natural home ventilation is around ${win.bestHour}.`}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="surface-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => {
            const active = activeCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-all"
                style={
                  active
                    ? {
                        background: 'linear-gradient(135deg, #0d9488, #0ea5e9)',
                        color: '#ffffff',
                      }
                    : {
                        background: 'var(--bg-subtle)',
                        color: 'var(--text-secondary)',
                      }
                }
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setActiveView('cards')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold"
            style={
              activeView === 'cards'
                ? { background: 'linear-gradient(135deg, #0d9488, #0ea5e9)', color: '#ffffff' }
                : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }
            }
          >
            <Layers size={14} /> Action Cards
          </button>
          <button
            onClick={() => setActiveView('timeline')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold"
            style={
              activeView === 'timeline'
                ? { background: 'linear-gradient(135deg, #0d9488, #0ea5e9)', color: '#ffffff' }
                : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }
            }
          >
            <Clock size={14} /> Day Schedule
          </button>
        </div>
      </div>

      {/* Cards View */}
      {activeView === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const p = PRIORITY_MAP[item.priority] || PRIORITY_MAP.medium;
            const isExpanded = expandedId === item.id;
            const isDone = completedIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="surface-card interactive-card p-5 cursor-pointer"
                style={{ opacity: isDone ? 0.78 : 1 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                        style={{ background: p.bg, color: p.color }}
                      >
                        {p.label}
                      </span>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                        {item.categoryLabel}
                      </span>
                    </div>

                    <h4
                      className="text-sm font-bold leading-snug"
                      style={{
                        color: 'var(--text-primary)',
                        textDecoration: isDone ? 'line-through' : 'none',
                      }}
                    >
                      {item.action}
                    </h4>

                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'rgba(13, 148, 136, 0.1)', color: 'var(--accent-teal)' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={(e) => toggleDone(item.id, e)}
                    title={isDone ? 'Mark pending' : 'Mark completed'}
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{
                      background: isDone ? '#10b981' : 'var(--bg-subtle)',
                      color: isDone ? '#ffffff' : 'var(--text-faint)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <CheckCircle2 size={15} />
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-3 border-t space-y-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(14, 165, 233, 0.08)' }}>
                      <div className="font-bold mb-0.5 text-sky-500">Why This Matters</div>
                      <div style={{ color: 'var(--text-secondary)' }}>{item.why}</div>
                    </div>
                    <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(16, 185, 129, 0.08)' }}>
                      <div className="font-bold mb-0.5 text-emerald-500">Expected Health Benefit</div>
                      <div style={{ color: 'var(--text-secondary)' }}>{item.benefit}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1 mt-3 text-xs font-semibold" style={{ color: 'var(--accent-teal)' }}>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span>{isExpanded ? 'Hide rationale' : 'View science & benefit'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline View */}
      {activeView === 'timeline' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {timeline.map((period) => {
            const PeriodIcon =
              period.period === 'Morning' ? Sunrise : period.period === 'Midday' ? Sun : Moon;
            return (
              <div key={period.period} className="surface-card p-5">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${period.color}18`, color: period.color }}
                  >
                    <PeriodIcon size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {period.period}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {period.timeRange}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  {period.items.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <div className="text-xs font-bold w-16 flex-shrink-0 pt-0.5" style={{ color: 'var(--accent-teal)' }}>
                        {item.time}
                      </div>
                      <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {item.action}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Indoor Activity Quick Alternatives (when outdoor AQI is elevated) */}
      {aqi > 120 && (
        <div className="surface-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Home size={16} style={{ color: 'var(--accent-teal)' }} />
            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              Recommended Indoor Activity Alternatives Today
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {[
              { title: '25-Min Mobility & Yoga', desc: 'Improves lung capacity without heavy particulate inhalation.' },
              { title: 'Bodyweight Circuit', desc: 'Safe cardiovascular conditioning inside sealed rooms.' },
              { title: 'Family Indoor Games', desc: 'Keeps children active while avoiding outdoor PM2.5 exposure.' },
            ].map((alt) => (
              <div key={alt.title} className="p-3.5 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                <div className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{alt.title}</div>
                <div style={{ color: 'var(--text-muted)' }}>{alt.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
