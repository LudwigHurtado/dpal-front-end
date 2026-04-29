import React from 'react';
import type { RideRequest } from '../../../types/rideConnection';
import FareBreakdownCard from '../../trips/components/FareBreakdownCard';
import { useGwLang } from '../../../i18n/useGwLang';

const TripDonationPanel: React.FC<{ ride: RideRequest; viewerRole?: 'passenger' | 'driver' }> = ({ ride, viewerRole = 'passenger' }) => {
  const t = useGwLang((s) => s.t);
  const fareVariant = viewerRole === 'driver' ? 'driver' : 'passenger';
  return (
    <div className="gw-card p-4 space-y-3">
      <div className="gw-card-title">Charity and reward corridor</div>
      <div className="text-sm text-slate-700">Purpose: {ride.ridePurpose.replaceAll('_', ' ')}</div>
      <div className="text-sm text-slate-700">Charity: {ride.charityName ?? 'Not selected'}</div>
      <FareBreakdownCard variant={fareVariant} totalFareUsd={ride.estimatedFare} t={t} titleKey="totalFare" showTransparentHint={false} />
      <div className="text-sm text-slate-700">Estimated DPAL reward: {ride.estimatedReward.toFixed(2)} points</div>
    </div>
  );
};

export default TripDonationPanel;
