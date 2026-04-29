import type { LedgerStatus, RideRequest } from '../types/rideConnection';
import { goodWheelsRideService } from './goodWheelsRideService';

const nextStatus: Record<LedgerStatus, LedgerStatus> = {
  not_logged: 'pending_verification',
  pending_verification: 'ready_to_log',
  ready_to_log: 'logged',
  logged: 'logged',
  disputed: 'disputed',
};

export const goodWheelsBlockchainService = {
  deriveLedgerStatus(ride: RideRequest): LedgerStatus {
    if (ride.status === 'disputed') return 'disputed';
    if (ride.status === 'completed' && ride.blockchainStatus === 'not_logged') return 'ready_to_log';
    return ride.blockchainStatus;
  },
  async advanceLedgerStatus(ride: RideRequest): Promise<RideRequest | null> {
    const current = this.deriveLedgerStatus(ride);
    const next = nextStatus[current];
    return goodWheelsRideService.patchRide(ride.id, { blockchainStatus: next });
  },
};

