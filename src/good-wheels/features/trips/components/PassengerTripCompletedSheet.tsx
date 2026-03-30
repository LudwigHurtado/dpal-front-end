import React, { useState } from 'react';
import type { Trip } from '../tripTypes';

export default function PassengerTripCompletedSheet({
  trip,
  onDone,
}: {
  trip?: Trip | null;
  onDone?: () => void;
}) {
  const [rating, setRating] = useState(5);

  return (
    <>
      <div className="gw-sheet-handle" aria-hidden />
      <div className="text-lg font-extrabold text-slate-900">Trip completed ✅</div>
      <div className="gw-muted mt-1">Receipt</div>

      <div className="gw-card p-5 mt-3 space-y-2" style={{ boxShadow: 'none', background: 'rgba(241,245,249,0.65)' }}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-slate-600">Route</div>
          <div className="text-sm font-extrabold text-slate-900">{trip?.pickup.label ?? 'Pickup'} → {trip?.dropoff.label ?? 'Dropoff'}</div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-slate-600">Distance</div>
          <div className="text-sm font-extrabold text-slate-900">{trip?.estimate ? `${trip.estimate.distanceKm.toFixed(1)} km` : '—'}</div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-slate-600">Donation</div>
          <div className="text-sm font-extrabold text-slate-900">—</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-sm font-extrabold text-slate-900">Rate your driver</div>
        <div className="mt-2 flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={n <= rating ? 'gw-button gw-button-primary' : 'gw-button gw-button-secondary'}
              onClick={() => setRating(n)}
              style={{ borderRadius: 999, padding: '8px 12px' }}
            >
              ★ {n}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="gw-button gw-button-primary w-full mt-5" onClick={onDone}>
        Done
      </button>
    </>
  );
}

