import React, { useMemo, useState } from 'react';
import type { Role, SupportCategory, Trip, UserProfile } from '../tripTypes';
import { tripPrimaryLine, tripSecondaryLine } from '../tripUtils';
import TripStatusBadge from './TripStatusBadge';
import TripSupportCategoryChip from './TripSupportCategoryChip';
import TripSummaryDrawer from './TripSummaryDrawer';
import TripSafetyBanner from './TripSafetyBanner';

const RideStatusCard: React.FC<{
  role: Role;
  trip: Trip;
  supportCategory?: SupportCategory | null;
  passenger?: UserProfile | null;
  driver?: UserProfile | null;
  worker?: UserProfile | null;
}> = ({ role, trip, supportCategory }) => {
  const [open, setOpen] = useState(false);
  const title = useMemo(() => tripPrimaryLine(trip), [trip]);

  return (
    <div className="space-y-4">
      <div className="gw-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-slate-800 truncate">{title}</div>
            <div className="text-sm text-slate-600 mt-1">{tripSecondaryLine(trip)}</div>
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <TripStatusBadge status={trip.status} />
              {supportCategory && <TripSupportCategoryChip category={supportCategory} />}
              {trip.safetyStatus && (
                <span className="text-xs font-bold text-slate-500">
                  • {trip.safetyStatus.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>
          <button type="button" className="gw-button gw-button-secondary" onClick={() => setOpen(true)}>
            View
          </button>
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
      </div>

      <TripSafetyBanner trip={trip} />

      <TripSummaryDrawer
        open={open}
        onClose={() => setOpen(false)}
        trip={trip}
        title={role === 'passenger' ? 'Your trip' : role === 'driver' ? 'Assigned trip' : 'Linked trip'}
      />
    </div>
  );
};

export default RideStatusCard;

