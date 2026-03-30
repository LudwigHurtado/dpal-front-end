import React from 'react';
import type { Trip } from '../tripTypes';
import TripStatusBadge from './TripStatusBadge';
import { tripPrimaryLine } from '../tripUtils';
import TripEmptyState from './TripEmptyState';

const TripHistoryList: React.FC<{
  trips: Trip[];
  emptyMessage?: string;
  onOpenTrip?: (trip: Trip) => void;
  roleMode?: 'passenger' | 'driver' | 'worker';
}> = ({ trips, emptyMessage, onOpenTrip }) => {
  if (trips.length === 0) return <TripEmptyState message={emptyMessage ?? 'No trip history yet.'} />;
  return (
    <div className="gw-card p-5 space-y-4">
      <div className="gw-card-title">Trip history</div>
      <div className="space-y-3">
        {trips.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onOpenTrip?.(t)}
            className="w-full text-left flex items-center justify-between gap-3 border-t pt-3"
            style={{ borderColor: 'rgba(15,23,42,0.08)' }}
          >
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-slate-800 truncate">{tripPrimaryLine(t)}</div>
              <div className="text-sm text-slate-600 truncate">{t.pickup.addressLine} → {t.dropoff.addressLine}</div>
            </div>
            <TripStatusBadge status={t.status} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default TripHistoryList;

