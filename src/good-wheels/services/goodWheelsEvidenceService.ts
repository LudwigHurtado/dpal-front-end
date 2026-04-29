import { goodWheelsRideAdapter } from './adapters/goodWheelsRideAdapter';
import type { TripEvidence } from '../types/rideConnection';

const makeId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const goodWheelsEvidenceService = {
  async addEvidence(input: Omit<TripEvidence, 'id' | 'createdAt'>): Promise<TripEvidence> {
    const evidence: TripEvidence = {
      ...input,
      id: makeId('evidence'),
      createdAt: new Date().toISOString(),
    };
    await goodWheelsRideAdapter.appendEvidence(evidence);
    return evidence;
  },
  listEvidence(rideId: string): Promise<TripEvidence[]> {
    return goodWheelsRideAdapter.listEvidence(rideId);
  },
};

