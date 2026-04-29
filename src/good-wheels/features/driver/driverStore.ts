import { create } from 'zustand';
import type { Trip } from '../trips/tripTypes';
import { useTripStore } from '../trips/tripStore';
import type {
  DriverAvailabilityStatus,
  DriverPerformanceSummary,
  DriverProfile,
  DriverQueueFilterId,
  DriverQueueItem,
  DriverVehicleInfo,
} from './driverTypes';
import { DEFAULT_DRIVER_FILTER_ID } from './driverConstants';
import { driverService } from './driverService';
import { goodWheelsRideApi } from '../../services/adapters/goodWheelsApi';
import { GOOD_WHEELS_DEMO_MODE } from '../../app/appConfig';
import { useAuthStore } from '../../store/useAuthStore';

type DriverState = {
  driverProfile: DriverProfile | null;
  availabilityStatus: DriverAvailabilityStatus;
  activeTripId: string | null;
  queueFilterId: DriverQueueFilterId;
  queueItems: DriverQueueItem[];
  vehicle: DriverVehicleInfo | null;
  performanceSummary: DriverPerformanceSummary | null;
  completedTripIds: string[];

  hydrate: () => Promise<void>;
  setAvailability: (next: DriverAvailabilityStatus) => void;
  setQueueFilter: (id: DriverQueueFilterId) => void;
  acceptQueueTrip: (tripId: string) => Promise<Trip | null>;
  sendCounteroffer: (tripId: string, amountCents: number, message?: string) => Promise<Trip | null>;
  declineQueueTrip: (tripId: string) => void;
  bindActiveTrip: (trip: Trip) => void;
  clearActiveTrip: () => void;
  updateVehicleInfo: (patch: Partial<DriverVehicleInfo>) => void;
};

export const useDriverStore = create<DriverState>((set, get) => ({
  driverProfile: null,
  availabilityStatus: 'offline',
  activeTripId: null,
  queueFilterId: DEFAULT_DRIVER_FILTER_ID,
  queueItems: [],
  vehicle: null,
  performanceSummary: null,
  completedTripIds: [],

  async hydrate() {
    const authDriverId = useAuthStore.getState().user?.id;
    const [driverProfile, queueItems, vehicle, performanceSummary] = await Promise.all([
      driverService.fetchDriverProfile(authDriverId),
      driverService.fetchDriverQueue(),
      driverService.fetchVehicleInfo(authDriverId),
      driverService.fetchPerformanceSummary(authDriverId),
    ]);
    const activeTrip = useTripStore.getState().activeTrip;
    const hasActive = Boolean(activeTrip && ['accepted', 'driver_en_route', 'driver_arrived', 'passenger_onboard', 'in_progress'].includes(activeTrip.status));
    const prevAvail = get().availabilityStatus;
    const availabilityStatus: DriverAvailabilityStatus = hasActive
      ? 'busy'
      : prevAvail === 'paused'
        ? 'paused'
        : driverProfile.availability === 'offline'
          ? 'offline'
          : 'online';
    set({ driverProfile, queueItems, vehicle, performanceSummary, availabilityStatus });
  },

  setAvailability(next) {
    const { availabilityStatus } = get();
    const activeTrip = useTripStore.getState().activeTrip;
    if (activeTrip && next !== 'busy') {
      set({ availabilityStatus: 'busy' });
      return;
    }
    if (availabilityStatus === 'busy') {
      set({ availabilityStatus: 'busy' });
      return;
    }
    set({ availabilityStatus: next });
    const wire: 'online' | 'offline' | 'busy' | 'paused' =
      next === 'paused' ? 'paused' : next === 'busy' ? 'busy' : next === 'offline' ? 'offline' : 'online';
    void driverService.updateDriverAvailability(wire, get().driverProfile?.id);
  },

  setQueueFilter(id) {
    set({ queueFilterId: id });
  },

  bindActiveTrip(trip) {
    useTripStore.getState().setActiveTrip(trip);
    set({ activeTripId: trip.id, availabilityStatus: 'busy' });
  },

  clearActiveTrip() {
    useTripStore.getState().clearActiveTrip();
    set({ activeTripId: null, availabilityStatus: 'online' });
  },

  async acceptQueueTrip(tripId) {
    const { queueItems } = get();
    const found = queueItems.find((t) => t.id === tripId);
    if (!found) return null;
    const driverId = get().driverProfile?.id ?? useAuthStore.getState().user?.id ?? 'usr-driver-001';
    let next: Trip = {
      ...found,
      driverId,
      status: 'accepted',
      updatedAtIso: new Date().toISOString(),
      timeline: [
        ...found.timeline,
        { id: `acc-${Date.now()}`, atIso: new Date().toISOString(), label: 'Accepted by driver', detail: 'Driver is on the way.' },
      ],
    };
    if (!GOOD_WHEELS_DEMO_MODE) {
      next = await goodWheelsRideApi.acceptTrip(tripId, driverId);
    }
    set({
      queueItems: queueItems.filter((t) => t.id !== tripId),
    });
    get().bindActiveTrip(next);
    return next;
  },

  async sendCounteroffer(tripId, amountCents, message) {
    const { queueItems } = get();
    const found = queueItems.find((t) => t.id === tripId);
    if (!found) return null;
    const driverId = get().driverProfile?.id ?? useAuthStore.getState().user?.id ?? 'usr-driver-001';
    const now = new Date().toISOString();
    let updated: Trip;
    if (GOOD_WHEELS_DEMO_MODE) {
      const basePassenger =
        found.offerState?.passengerOfferCents ??
        (typeof found.estimate?.totalFareCents === 'number' ? found.estimate.totalFareCents : amountCents);
      const recommended =
        found.offerState?.recommendedFareCents ??
        (typeof found.estimate?.totalFareCents === 'number' ? found.estimate.totalFareCents : amountCents);
      updated = {
        ...found,
        updatedAtIso: now,
        offerState: {
          passengerOfferCents: basePassenger,
          recommendedFareCents: recommended,
          driverCounterOfferCents: amountCents,
          acceptedFareCents: found.offerState?.acceptedFareCents,
          status: 'driver_countered',
          updatedAtIso: now,
        },
        timeline: [
          ...found.timeline,
          {
            id: `co-${Date.now()}`,
            atIso: now,
            label: 'Driver sent counteroffer',
            detail: `Counteroffer $${(amountCents / 100).toFixed(2)}${message ? ` — ${message}` : ''}`,
          },
        ],
      };
    } else {
      updated = await goodWheelsRideApi.sendTripCounteroffer(tripId, driverId, amountCents, message);
    }
    set({ queueItems: queueItems.map((t) => (t.id === tripId ? updated : t)) });
    return updated;
  },

  declineQueueTrip(tripId) {
    set((s) => ({ queueItems: s.queueItems.filter((t) => t.id !== tripId) }));
  },

  updateVehicleInfo(patch) {
    set((s) => ({ vehicle: s.vehicle ? { ...s.vehicle, ...patch } : null }));
  },
}));

