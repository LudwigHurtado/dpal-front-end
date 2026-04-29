import React from 'react';
import type { RideRequest } from '../../../types/rideConnection';

const LABELS = {
  not_logged: 'Not logged',
  pending_verification: 'Pending verification',
  ready_to_log: 'Ready to log',
  logged: 'Logged',
  disputed: 'Disputed',
} as const;

const TripBlockchainPanel: React.FC<{ ride: RideRequest }> = ({ ride }) => (
  <div className="gw-card p-4 space-y-2">
    <div className="gw-card-title">DPAL Ledger Status</div>
    <div className="text-sm font-semibold text-slate-800">{LABELS[ride.blockchainStatus]}</div>
    <div className="text-xs text-slate-600">Every status update can be prepared for blockchain logging.</div>
    <div className="text-xs text-slate-600">Evidence packet: {ride.evidencePacketId ?? 'Pending'}</div>
  </div>
);

export default TripBlockchainPanel;

