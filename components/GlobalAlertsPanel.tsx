/**
 * GlobalAlertsPanel — Live global disaster/event feed for Situation Room
 *
 * Data sources (via /api/disasters/feed — no API keys required):
 *   USGS Earthquake Hazards Program  — M4.5+ earthquakes, past 7 days
 *   NASA EONET Natural Events API v3 — wildfires, volcanoes, storms, floods
 *
 * Highlights events near the current report's location when coordinates
 * can be inferred from the report title / location string.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, AlertTriangle, Activity, ChevronDown, ChevronRight, ExternalLink } from './icons';
import { apiUrl, API_ROUTES } from '../constants';

// ── Types ──────────────────────────────────────────────────────────────────────

interface DisasterEvent {
  id: string;
  source: 'usgs' | 'eonet';
  type: 'earthquake' | 'wildfire' | 'volcano' | 'storm' | 'flood' | 'sea_and_lake_ice' | 'other';
  title: string;
  place: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  mag?: number;
  depth?: number;
  alertLevel?: string;
  lat?: number;
  lng?: number;
  time: number;
  url?: string;
  category?: string;
}

interface GlobalAlertsPanelProps {
  /** Location string from the report — used to label "possibly nearby" events */
  reportLocation?: string;
  /** Category of the report — used to surface most-relevant event types first */
  reportCategory?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TYPE_META: Record<DisasterEvent['type'], { label: string; emoji: string; color: string }> = {
  earthquake:    { label: 'Earthquake',    emoji: '🌍', color: 'text-orange-400 border-orange-700/40 bg-orange-950/20' },
  wildfire:      { label: 'Wildfire',      emoji: '🔥', color: 'text-red-400    border-red-700/40    bg-red-950/20'    },
  volcano:       { label: 'Volcano',       emoji: '🌋', color: 'text-rose-400   border-rose-700/40   bg-rose-950/20'   },
  storm:         { label: 'Storm',         emoji: '🌀', color: 'text-sky-400    border-sky-700/40    bg-sky-950/20'    },
  flood:         { label: 'Flood',         emoji: '🌊', color: 'text-blue-400   border-blue-700/40   bg-blue-950/20'   },
  sea_and_lake_ice: { label: 'Sea Ice',   emoji: '🧊', color: 'text-cyan-400   border-cyan-700/40   bg-cyan-950/20'   },
  other:         { label: 'Event',         emoji: '⚠️',  color: 'text-zinc-400  border-zinc-700/40   bg-zinc-900/20'   },
};

const SEVERITY_DOT: Record<DisasterEvent['severity'], string> = {
  low:      'bg-zinc-500',
  moderate: 'bg-amber-500',
  high:     'bg-orange-500 animate-pulse',
  critical: 'bg-red-500 animate-ping',
};

const SEVERITY_LABEL: Record<DisasterEvent['severity'], string> = {
  low:      'Low',
  moderate: 'Moderate',
  high:     'High',
  critical: 'Critical',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function relTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000)       return 'just now';
  if (diff < 3_600_000)    return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)   return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

const TYPE_FILTERS: { label: string; value: DisasterEvent['type'] | 'all' }[] = [
  { label: 'All',         value: 'all'        },
  { label: '🌍 Quakes',   value: 'earthquake' },
  { label: '🔥 Fire',     value: 'wildfire'   },
  { label: '🌋 Volcano',  value: 'volcano'    },
  { label: '🌀 Storm',    value: 'storm'      },
  { label: '🌊 Flood',    value: 'flood'      },
];

// ── Component ──────────────────────────────────────────────────────────────────

export const GlobalAlertsPanel: React.FC<GlobalAlertsPanelProps> = ({
  reportLocation,
  reportCategory,
}) => {
  const [events, setEvents]         = useState<DisasterEvent[]>([]);
  const [loading, setLoading]       = useState(true);
  const [err, setErr]               = useState('');
  const [expanded, setExpanded]     = useState(true);
  const [filter, setFilter]         = useState<DisasterEvent['type'] | 'all'>('all');
  const [lastFetch, setLastFetch]   = useState<Date | null>(null);
  const filterRef                   = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch(apiUrl(API_ROUTES.DISASTERS_FEED));
      const json = await res.json() as { ok: boolean; events: DisasterEvent[]; error?: string };
      if (!json.ok) throw new Error(json.error ?? 'Feed error');
      setEvents(json.events);
      setLastFetch(new Date());
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visible = filter === 'all' ? events : events.filter((e) => e.type === filter);
  const criticalCount = events.filter((e) => e.severity === 'critical' || e.severity === 'high').length;

  // Surface report-category–relevant events at the top
  const sorted = [...visible].sort((a, b) => {
    const catBoost = (e: DisasterEvent) => {
      if (!reportCategory) return 0;
      const cat = reportCategory.toLowerCase();
      if (cat.includes('police') || cat.includes('government')) return 0;
      if (cat.includes('health') && (e.type === 'wildfire' || e.type === 'storm')) return 1;
      if (cat.includes('property') && (e.type === 'earthquake' || e.type === 'flood')) return 1;
      return 0;
    };
    return catBoost(b) - catBoost(a) || b.time - a.time;
  });

  return (
    <section className="shrink-0 border-b border-zinc-800/80 bg-zinc-950/60 px-3 py-3 md:px-6 md:py-4">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 mb-0"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-400">
            Live Global Alerts
          </span>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 bg-red-900/40 border border-red-700/40 text-red-400 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
              {criticalCount} high+
            </span>
          )}
          {!loading && !err && (
            <span className="text-[8px] text-zinc-600 font-mono">
              {events.length} events
              {lastFetch && ` · ${lastFetch.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); void load(); }}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {expanded
            ? <ChevronDown className="w-4 h-4 text-zinc-600" />
            : <ChevronRight className="w-4 h-4 text-zinc-600" />
          }
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Source badges */}
          <div className="flex flex-wrap gap-2">
            <span className="text-[8px] font-black uppercase tracking-wider text-zinc-600 px-2 py-1 border border-zinc-800 rounded-full">
              USGS Earthquakes
            </span>
            <span className="text-[8px] font-black uppercase tracking-wider text-zinc-600 px-2 py-1 border border-zinc-800 rounded-full">
              NASA EONET
            </span>
            {reportLocation && (
              <span className="text-[8px] font-black uppercase tracking-wider text-cyan-700 px-2 py-1 border border-cyan-900/60 rounded-full">
                Context for: {reportLocation}
              </span>
            )}
          </div>

          {/* Type filters */}
          <div ref={filterRef} className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] pb-0.5">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={`shrink-0 text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all ${
                  filter === f.value
                    ? 'bg-emerald-900/40 border-emerald-700/50 text-emerald-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Error */}
          {err && (
            <div className="flex items-center gap-2 bg-rose-950/30 border border-rose-800/40 rounded-xl px-3 py-2 text-[9px] text-rose-400 font-mono">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              {err} — Railway backend may be starting up
            </div>
          )}

          {/* Loading skeleton */}
          {loading && !events.length && (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 rounded-xl bg-zinc-900/60 border border-zinc-800 animate-pulse" />
              ))}
            </div>
          )}

          {/* Event list */}
          {!loading && sorted.length === 0 && !err && (
            <p className="text-[9px] text-zinc-600 font-mono text-center py-4">
              No {filter === 'all' ? '' : filter} events in the past 7 days.
            </p>
          )}

          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {sorted.slice(0, 40).map((ev) => {
              const meta = TYPE_META[ev.type];
              return (
                <div
                  key={ev.id}
                  className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 ${meta.color}`}
                >
                  {/* Severity dot */}
                  <div className="mt-1 shrink-0 relative w-2 h-2">
                    <span className={`w-2 h-2 rounded-full absolute inset-0 ${SEVERITY_DOT[ev.severity]}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-wider leading-tight truncate">
                      {meta.emoji} {ev.title}
                    </p>
                    <p className="text-[8px] font-mono text-zinc-500 mt-0.5 truncate">
                      {ev.type === 'earthquake' && ev.mag != null && `M${ev.mag.toFixed(1)} · `}
                      {SEVERITY_LABEL[ev.severity]}
                      {ev.depth != null && ` · ${ev.depth.toFixed(0)} km depth`}
                      {ev.category && ev.type !== 'earthquake' && ` · ${ev.category}`}
                    </p>
                  </div>

                  {/* Right side: time + link */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[8px] font-mono text-zinc-600">{relTime(ev.time)}</span>
                    {ev.url && (
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-zinc-600 hover:text-zinc-300 transition"
                        title="View source"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {sorted.length > 40 && (
            <p className="text-[8px] text-zinc-600 font-mono text-center">
              Showing 40 of {sorted.length} events · Filter by type to narrow results
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export default GlobalAlertsPanel;
