import { create } from 'zustand';
import type { RideDraftInput, RideLifecycleStatus, RideRequest, TripEvidence, TripMessage } from '../types/rideConnection';
import { goodWheelsRideService } from '../services/goodWheelsRideService';
import { goodWheelsChatService } from '../services/goodWheelsChatService';
import { goodWheelsEvidenceService } from '../services/goodWheelsEvidenceService';
import { goodWheelsMatchingService } from '../services/goodWheelsMatchingService';

type RideState = {
  activeRide: RideRequest | null;
  rides: RideRequest[];
  messages: Record<string, TripMessage[]>;
  evidence: Record<string, TripEvidence[]>;
  draft: RideDraftInput;
  loading: boolean;
  error: string | null;
  setDraft: (patch: Partial<RideDraftInput>) => void;
  loadForUser: (userId: string) => Promise<void>;
  requestRide: (input: { passengerId: string; passengerName: string }) => Promise<RideRequest | null>;
  acceptRide: (rideId: string, input: { driverId: string; driverName: string }) => Promise<RideRequest | null>;
  updateStatus: (rideId: string, status: RideLifecycleStatus, actorId: string) => Promise<RideRequest | null>;
  syncRide: (rideId: string) => Promise<void>;
  sendMessage: (input: Omit<TripMessage, 'id' | 'createdAt'>) => Promise<void>;
  loadMessages: (rideId: string) => Promise<void>;
  addEvidence: (input: Omit<TripEvidence, 'id' | 'createdAt'>) => Promise<void>;
  loadEvidence: (rideId: string) => Promise<void>;
  clearDraft: () => void;
};

const EMPTY_DRAFT: RideDraftInput = {
  pickupAddress: '',
  destinationAddress: '',
  ridePurpose: 'personal_ride',
  urgency: 'normal',
};

export const useRideStore = create<RideState>((set, get) => ({
  activeRide: null,
  rides: [],
  messages: {},
  evidence: {},
  draft: EMPTY_DRAFT,
  loading: false,
  error: null,

  setDraft(patch) {
    set((s) => ({ draft: { ...s.draft, ...patch } }));
  },

  async loadForUser(userId) {
    set({ loading: true, error: null });
    try {
      const rides = await goodWheelsRideService.listOpenRides();
      const activeRide = rides.find((r) => r.passengerId === userId || r.driverId === userId) ?? null;
      set({ rides, activeRide, loading: false });
    } catch {
      set({ loading: false, error: 'Could not load rides.' });
    }
  },

  async requestRide(input) {
    const { draft } = get();
    if (!draft.pickupAddress.trim() || !draft.destinationAddress.trim()) {
      set({ error: 'Please choose pickup and destination.' });
      return null;
    }
    set({ loading: true, error: null });
    try {
      const ride = await goodWheelsRideService.createRide({
        passengerId: input.passengerId,
        passengerName: input.passengerName,
        draft,
      });
      const eta = await goodWheelsMatchingService.getCandidateEtaMinutes(ride);
      const distance = await goodWheelsMatchingService.getDriverDistanceKm(ride);
      await goodWheelsEvidenceService.addEvidence({
        rideId: ride.id,
        type: 'status_update',
        label: 'Matching started',
        value: `Searching for drivers (ETA ${eta} min, ${distance} km away).`,
      });
      set((s) => ({ loading: false, activeRide: ride, rides: [ride, ...s.rides] }));
      return ride;
    } catch {
      set({ loading: false, error: 'Could not request ride.' });
      return null;
    }
  },

  async acceptRide(rideId, input) {
    const ride = await goodWheelsRideService.acceptRide(rideId, input.driverId, input.driverName);
    if (!ride) return null;
    set((s) => ({
      activeRide: ride,
      rides: s.rides.map((r) => (r.id === ride.id ? ride : r)),
    }));
    return ride;
  },

  async updateStatus(rideId, status, actorId) {
    const ride = await goodWheelsRideService.updateStatus(rideId, status, actorId);
    if (!ride) return null;
    set((s) => ({
      activeRide: s.activeRide?.id === ride.id ? ride : s.activeRide,
      rides: s.rides.map((r) => (r.id === ride.id ? ride : r)),
    }));
    return ride;
  },

  async syncRide(rideId) {
    const ride = await goodWheelsRideService.getRideById(rideId);
    if (!ride) return;
    set((s) => ({
      activeRide: s.activeRide?.id === ride.id ? ride : s.activeRide,
      rides: s.rides.map((r) => (r.id === ride.id ? ride : r)),
    }));
  },

  async sendMessage(input) {
    const message = await goodWheelsChatService.sendMessage(input);
    set((s) => ({
      messages: {
        ...s.messages,
        [message.rideId]: [...(s.messages[message.rideId] ?? []), message],
      },
    }));
  },

  async loadMessages(rideId) {
    const messages = await goodWheelsChatService.listMessages(rideId);
    set((s) => ({ messages: { ...s.messages, [rideId]: messages } }));
  },

  async addEvidence(input) {
    const evidence = await goodWheelsEvidenceService.addEvidence(input);
    set((s) => ({
      evidence: {
        ...s.evidence,
        [evidence.rideId]: [evidence, ...(s.evidence[evidence.rideId] ?? [])],
      },
    }));
  },

  async loadEvidence(rideId) {
    const evidence = await goodWheelsEvidenceService.listEvidence(rideId);
    set((s) => ({ evidence: { ...s.evidence, [rideId]: evidence } }));
  },

  clearDraft() {
    set({ draft: EMPTY_DRAFT, error: null });
  },
}));

