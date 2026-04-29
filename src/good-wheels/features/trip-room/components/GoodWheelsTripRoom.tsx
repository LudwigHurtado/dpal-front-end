import React from 'react';
import type { RideLifecycleStatus, RideRequest } from '../../../types/rideConnection';
import TripStatusTimeline from './TripStatusTimeline';
import TripChatPanel from './TripChatPanel';
import TripQRCodePanel from './TripQRCodePanel';
import TripEvidencePanel from './TripEvidencePanel';
import TripSafetyPanel from './TripSafetyPanel';
import TripDonationPanel from './TripDonationPanel';
import TripBlockchainPanel from './TripBlockchainPanel';
import TripMapPanel from './TripMapPanel';
import { goodWheelsMissionAdapter } from '../../../services/goodWheelsMissionAdapter';

type Props = {
  ride: RideRequest;
  role: 'passenger' | 'driver';
  userId: string;
  userName: string;
  onUpdateStatus?: (status: RideLifecycleStatus) => void;
};

const STATUS_FLOW: RideLifecycleStatus[] = [
  'accepted',
  'driver_en_route',
  'driver_arrived',
  'passenger_onboard',
  'in_progress',
  'completed',
  'cancelled',
];

const GoodWheelsTripRoom: React.FC<Props> = ({ ride, role, userId, userName, onUpdateStatus }) => {
  const missionCandidate = goodWheelsMissionAdapter.toMissionCandidate(ride);
  return (
    <div className="space-y-4">
      <div className="gw-card p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs font-bold text-slate-500">Shared Trip Room</div>
          <div className="gw-card-title">
            {role === 'passenger' ? 'Passenger console' : 'Driver console'} · {ride.status.replaceAll('_', ' ')}
          </div>
        </div>
        <div className="text-sm text-slate-600">
          Driver: {ride.driverName ?? 'Matching'} · Purpose: {ride.ridePurpose.replaceAll('_', ' ')}
        </div>
      </div>

      <div className="gw-grid-2">
        <TripMapPanel ride={ride} />
        <div className="space-y-3">
          <TripChatPanel rideId={ride.id} userId={userId} userName={userName} senderRole={role} />
          <TripQRCodePanel qrCodeValue={ride.qrCodeValue} />
        </div>
      </div>

      <div className="gw-grid-2">
        <TripStatusTimeline status={ride.status} />
        <div className="space-y-3">
          <TripEvidencePanel rideId={ride.id} />
          <TripDonationPanel ride={ride} viewerRole={role} />
          <TripBlockchainPanel ride={ride} />
        </div>
      </div>

      <TripSafetyPanel />
      <div className="gw-card p-4">
        <div className="gw-card-title">Mission Assignment V2 adapter</div>
        <div className="text-sm text-slate-700">{missionCandidate.title}</div>
        <div className="text-xs text-slate-500">{missionCandidate.summary}</div>
      </div>

      {role === 'driver' && onUpdateStatus && (
        <div className="gw-card p-4">
          <div className="gw-card-title mb-2">Driver trip actions</div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FLOW.map((status) => (
              <button key={status} type="button" className="gw-button gw-button-secondary" onClick={() => onUpdateStatus(status)}>
                {status.replaceAll('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoodWheelsTripRoom;

