import type { RideDraftInput, RideLifecycleStatus, RideRequest, TripEvidence, TripMessage } from '../../types/rideConnection';
import { calculateGoodWheelsFareSplit, fareSplitToPayload } from '../../features/trips/utils/fareSplit';

type RideAdapter = {
  createRide: (input: { passengerId: string; passengerName: string; draft: RideDraftInput }) => Promise<RideRequest>;
  listOpenRides: () => Promise<RideRequest[]>;
  getRideById: (rideId: string) => Promise<RideRequest | null>;
  updateRideStatus: (rideId: string, status: RideLifecycleStatus, actorId: string) => Promise<RideRequest | null>;
  patchRide: (rideId: string, patch: Partial<RideRequest>) => Promise<RideRequest | null>;
  acceptRide: (rideId: string, driverId: string, driverName: string) => Promise<RideRequest | null>;
  appendMessage: (message: TripMessage) => Promise<void>;
  listMessages: (rideId: string) => Promise<TripMessage[]>;
  appendEvidence: (evidence: TripEvidence) => Promise<void>;
  listEvidence: (rideId: string) => Promise<TripEvidence[]>;
};

type StorageShape = {
  rides: RideRequest[];
  messages: TripMessage[];
  evidence: TripEvidence[];
};

const STORAGE_KEY = 'good_wheels_connection_v1';

const readStorage = (): StorageShape => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { rides: [], messages: [], evidence: [] };
    const parsed = JSON.parse(raw) as StorageShape;
    return {
      rides: Array.isArray(parsed.rides) ? parsed.rides : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
    };
  } catch {
    return { rides: [], messages: [], evidence: [] };
  }
};

const writeStorage = (state: StorageShape) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const round = (value: number): number => Number(value.toFixed(2));

const haversineKm = (aLat: number, aLng: number, bLat: number, bLng: number): number => {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const aa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return r * c;
};

const makeId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const localGoodWheelsRideAdapter: RideAdapter = {
  async createRide(input) {
    const state = readStorage();
    const now = new Date().toISOString();
    const latA = input.draft.pickupLat ?? 37.7749;
    const lngA = input.draft.pickupLng ?? -122.4194;
    const latB = input.draft.destinationLat ?? 37.7849;
    const lngB = input.draft.destinationLng ?? -122.4094;
    const km = Math.max(1.2, haversineKm(latA, lngA, latB, lngB));
    const duration = Math.max(8, Math.round(km * 2.8));
    const fare = round(km * 2.9 + 4);
    const reward = round(fare * 0.35);
    const fareSplit = fareSplitToPayload(calculateGoodWheelsFareSplit(Math.round(fare * 100)));

    const ride: RideRequest = {
      id: makeId('ride'),
      passengerId: input.passengerId,
      passengerName: input.passengerName,
      pickupAddress: input.draft.pickupAddress,
      pickupLat: latA,
      pickupLng: lngA,
      destinationAddress: input.draft.destinationAddress,
      destinationLat: latB,
      destinationLng: lngB,
      ridePurpose: input.draft.ridePurpose,
      charityId: input.draft.charityId,
      charityName: input.draft.charityName,
      urgency: input.draft.urgency,
      requestedAt: now,
      status: 'matching',
      estimatedDistance: round(km),
      estimatedDuration: duration,
      estimatedFare: fare,
      fareSplit,
      estimatedReward: reward,
      qrCodeValue: `GW-QR-${Date.now()}`,
      blockchainStatus: 'not_logged',
    };

    state.rides.unshift(ride);
    state.evidence.unshift({
      id: makeId('evidence'),
      rideId: ride.id,
      type: 'status_update',
      label: 'Ride requested',
      value: 'Passenger submitted ride request.',
      createdAt: now,
    });
    writeStorage(state);
    return ride;
  },

  async listOpenRides() {
    const state = readStorage();
    return state.rides.filter((r) => ['matching', 'requested', 'accepted', 'driver_en_route', 'driver_arrived', 'passenger_onboard', 'in_progress'].includes(r.status));
  },

  async getRideById(rideId) {
    const state = readStorage();
    return state.rides.find((r) => r.id === rideId) ?? null;
  },

  async updateRideStatus(rideId, status) {
    const state = readStorage();
    const ride = state.rides.find((r) => r.id === rideId);
    if (!ride) return null;
    ride.status = status;
    if (status === 'in_progress' && !ride.startedAt) ride.startedAt = new Date().toISOString();
    if (status === 'completed') {
      ride.completedAt = new Date().toISOString();
      ride.blockchainStatus = 'ready_to_log';
      if (!ride.evidencePacketId) ride.evidencePacketId = makeId('evidence-packet');
    }
    if (status === 'cancelled') {
      ride.blockchainStatus = 'pending_verification';
    }
    state.evidence.unshift({
      id: makeId('evidence'),
      rideId,
      type: 'status_update',
      label: 'Status updated',
      value: status,
      createdAt: new Date().toISOString(),
    });
    writeStorage(state);
    return ride;
  },

  async patchRide(rideId, patch) {
    const state = readStorage();
    const ride = state.rides.find((r) => r.id === rideId);
    if (!ride) return null;
    Object.assign(ride, patch);
    writeStorage(state);
    return ride;
  },

  async acceptRide(rideId, driverId, driverName) {
    const state = readStorage();
    const ride = state.rides.find((r) => r.id === rideId);
    if (!ride) return null;
    ride.driverId = driverId;
    ride.driverName = driverName;
    ride.acceptedAt = new Date().toISOString();
    ride.status = 'accepted';
    ride.blockchainStatus = 'pending_verification';
    state.evidence.unshift({
      id: makeId('evidence'),
      rideId,
      type: 'status_update',
      label: 'Driver accepted',
      value: `${driverName} accepted this ride.`,
      createdAt: new Date().toISOString(),
    });
    writeStorage(state);
    return ride;
  },

  async appendMessage(message) {
    const state = readStorage();
    state.messages.push(message);
    writeStorage(state);
  },

  async listMessages(rideId) {
    const state = readStorage();
    return state.messages.filter((m) => m.rideId === rideId);
  },

  async appendEvidence(evidence) {
    const state = readStorage();
    state.evidence.unshift(evidence);
    writeStorage(state);
  },

  async listEvidence(rideId) {
    const state = readStorage();
    return state.evidence.filter((e) => e.rideId === rideId);
  },
};

export const goodWheelsRideAdapter: RideAdapter = localGoodWheelsRideAdapter;

