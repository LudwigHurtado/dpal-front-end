import React from 'react';
import type { RideRequest } from '../../../types/rideConnection';
import FareBreakdownCard from '../../trips/components/FareBreakdownCard';
import { useGwLang } from '../../../i18n/useGwLang';

const DriverRideRequestCard: React.FC<{ ride: RideRequest; onAccept: () => void }> = ({ ride, onAccept }) => {
  const t = useGwLang((s) => s.t);
  return (
    <div className="gw-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-slate-800">{ride.passengerName}</div>
        <div className="text-xs font-bold text-slate-500">{ride.urgency.toUpperCase()}</div>
      </div>
      <div className="text-sm text-slate-700">
        {ride.pickupAddress} → {ride.destinationAddress}
      </div>
      <div className="text-sm text-slate-700">
        {t('estimatedDistance')}: {ride.estimatedDistance.toFixed(1)} km · {t('ridePrice')}: ${ride.estimatedFare.toFixed(2)} · Reward{' '}
        {ride.estimatedReward.toFixed(2)}
      </div>
      <FareBreakdownCard variant="driver" totalFareUsd={ride.estimatedFare} t={t} titleKey="ridePrice" showTransparentHint={false} />
      <div className="text-xs text-slate-600">
        Purpose: {ride.ridePurpose.replaceAll('_', ' ')} · Charity: {ride.charityName ?? 'None'}
      </div>
      <button type="button" className="gw-button gw-button-primary" onClick={onAccept}>
        Accept ride
      </button>
    </div>
  );
};

export default DriverRideRequestCard;
