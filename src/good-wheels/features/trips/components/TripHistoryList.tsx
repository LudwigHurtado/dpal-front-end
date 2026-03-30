import React from 'react';
import type { Trip } from '../tripTypes';
import TripStatusBadge from './TripStatusBadge';
import { tripPrimaryLine } from '../tripUtils';

const TripHistoryList: React.FC<{ trips: Trip[] }> = ({ trips }) => {
  if (trips.length === 0) return null;
  return (
    <div className="gw-card p-5 space-y-4">
      <div className="gw-card-title">Trip history</div>
      <div className="space-y-3">
        {trips.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 border-t pt-3" style={{ borderColor: 'rgba(15,23,42,0.08)' }}>
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-slate-800 truncate">{tripPrimaryLine(t)}</div>
              <div className="text-sm text-slate-600 truncate">{t.pickup.addressLine} → {t.dropoff.addressLine}</div>
            </div>
            <TripStatusBadge status={t.status} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TripHistoryList;

