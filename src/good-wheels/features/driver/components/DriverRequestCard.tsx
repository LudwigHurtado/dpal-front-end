import React, { useMemo } from 'react';
import type { Trip } from '../../trips/tripTypes';
import TripStatusBadge from '../../trips/components/TripStatusBadge';
import TripRoutePreview from '../../trips/components/TripRoutePreview';
import TripSupportCategoryChip from '../../trips/components/TripSupportCategoryChip';
import TripMetaRow from '../../trips/components/TripMetaRow';
import { MOCK_SUPPORT_CATEGORIES } from '../../../data/mock/mockSupportCategories';

const DriverRequestCard: React.FC<{
  trip: Trip;
  onReview: () => void;
  onAccept: () => void;
  onDecline: () => void;
}> = ({ trip, onReview, onAccept, onDecline }) => {
  const category = useMemo(
    () => (trip.supportCategoryId ? MOCK_SUPPORT_CATEGORIES.find((c) => c.id === trip.supportCategoryId) ?? null : null),
    [trip.supportCategoryId]
  );

  return (
    <div className="gw-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-slate-800 truncate">
            {trip.pickup.label} → {trip.dropoff.label}
          </div>
          <div className="text-sm text-slate-600 truncate">
            {trip.pickup.addressLine} → {trip.dropoff.addressLine}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <TripStatusBadge status={trip.status} />
            {category && <TripSupportCategoryChip category={category} />}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" className="gw-button gw-button-secondary" onClick={onReview}>
            Review
          </button>
          <button type="button" className="gw-button gw-button-primary" onClick={onAccept}>
            Accept
          </button>
          <button type="button" className="gw-button" onClick={onDecline} style={{ background: 'rgba(15,23,42,0.03)' }}>
            Decline
          </button>
        </div>
      </div>

      <div className="gw-grid-2">
        <div className="gw-card p-4 space-y-3" style={{ boxShadow: 'none', background: 'rgba(241,245,249,0.6)' }}>
          <div className="gw-card-title">Trip preview</div>
          <TripMetaRow label="ETA" value={`${trip.estimate.etaMinutes} min`} />
          <TripMetaRow label="Distance" value={`${trip.estimate.distanceKm.toFixed(1)} km`} />
          <TripMetaRow label="Safety" value={(trip.safetyStatus ?? 'standard').replace(/_/g, ' ')} />
        </div>
        <TripRoutePreview trip={trip} />
      </div>
    </div>
  );
};

export default DriverRequestCard;

