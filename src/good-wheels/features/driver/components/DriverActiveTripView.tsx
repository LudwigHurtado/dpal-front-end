import React from 'react';
import type { RideLifecycleStatus, RideRequest } from '../../../types/rideConnection';
import GoodWheelsTripRoom from '../../trip-room/components/GoodWheelsTripRoom';
import { useRideStore } from '../../../store/useRideStore';
import FareBreakdownCard from '../../trips/components/FareBreakdownCard';
import { useGwLang } from '../../../i18n/useGwLang';

const DriverActiveTripView: React.FC<{
  ride: RideRequest;
  userId: string;
  userName: string;
  onUpdateStatus: (status: RideLifecycleStatus) => void;
}> = ({ ride, userId, userName, onUpdateStatus }) => {
  const t = useGwLang((s) => s.t);
  return (
  <div className="space-y-4">
    <GoodWheelsTripRoom ride={ride} role="driver" userId={userId} userName={userName} onUpdateStatus={onUpdateStatus} />
    <div className="gw-card p-4">
      <div className="gw-card-title">Driver reward summary</div>
      <FareBreakdownCard variant="driver" totalFareUsd={ride.estimatedFare} t={t} titleKey="ridePrice" showTransparentHint={false} />
      <div className="text-sm text-slate-700 mt-2">DPAL reward points: {ride.estimatedReward.toFixed(2)}</div>
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          className="gw-button gw-button-secondary"
          onClick={() => void useRideStore.getState().addEvidence({ rideId: ride.id, type: 'qr_scan', label: 'QR confirmed', value: `QR ${ride.qrCodeValue} confirmed by driver.` })}
        >
          Confirm passenger QR
        </button>
        <button
          type="button"
          className="gw-button gw-button-secondary"
          onClick={() => void useRideStore.getState().addEvidence({ rideId: ride.id, type: 'completion_note', label: 'Completion proof', value: 'Driver submitted completion proof.' })}
        >
          Submit completion proof
        </button>
      </div>
    </div>
  </div>
  );
};

export default DriverActiveTripView;

