import React from 'react';
import type { Trip } from '../tripTypes';
import { useTripTimeline } from '../hooks/useTripTimeline';

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const TripTimeline: React.FC<{ trip: Trip }> = ({ trip }) => {
  const { events } = useTripTimeline(trip);
  return (
    <div className="gw-card p-5 space-y-4">
      <div className="gw-card-title">Trip timeline</div>
      {events.length === 0 ? (
        <div className="gw-muted">No events yet.</div>
      ) : (
        <div className="space-y-3">
          {events.map((e, idx) => (
            <div key={e.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: idx === events.length - 1 ? 'var(--gw-blue)' : 'rgba(15,23,42,0.18)',
                  }}
                />
                {idx !== events.length - 1 && (
                  <div style={{ width: 2, flex: 1, background: 'rgba(15,23,42,0.10)', minHeight: 22 }} />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-slate-800">{e.label}</div>
                {e.detail && <div className="text-sm text-slate-600">{e.detail}</div>}
                <div className="text-xs text-slate-400 mt-0.5">{fmtTime(e.atIso)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TripTimeline;

