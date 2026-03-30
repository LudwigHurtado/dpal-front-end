import React, { useEffect } from 'react';
import type { Trip } from '../tripTypes';
import TripStatusBadge from './TripStatusBadge';

const TripSummaryDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  trip: Trip;
  title?: string;
}> = ({ open, onClose, trip, title = 'Trip summary' }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="absolute inset-0"
        style={{ background: 'rgba(2,6,23,0.25)' }}
        onClick={onClose}
        aria-label="Close"
      />
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-0 w-full"
        style={{ maxWidth: 720 }}
      >
        <div className="gw-card p-6" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="gw-card-title">{title}</div>
              <div className="text-sm text-slate-600 mt-1">{trip.pickup.addressLine} → {trip.dropoff.addressLine}</div>
            </div>
            <TripStatusBadge status={trip.status} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="gw-card p-4" style={{ boxShadow: 'none', background: 'rgba(241,245,249,0.6)' }}>
              <div className="text-xs text-slate-500 font-bold">ETA</div>
              <div className="text-lg font-extrabold text-slate-800">{trip.estimate.etaMinutes} min</div>
            </div>
            <div className="gw-card p-4" style={{ boxShadow: 'none', background: 'rgba(241,245,249,0.6)' }}>
              <div className="text-xs text-slate-500 font-bold">Distance</div>
              <div className="text-lg font-extrabold text-slate-800">{trip.estimate.distanceKm.toFixed(1)} km</div>
            </div>
          </div>

          {trip.notes && (
            <div className="mt-4 text-sm text-slate-700">
              <div className="text-xs text-slate-500 font-bold mb-1">Notes</div>
              {trip.notes}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button type="button" className="gw-button gw-button-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripSummaryDrawer;

