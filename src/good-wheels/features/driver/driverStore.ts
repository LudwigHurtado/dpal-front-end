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
  acceptQueueTrip: (tripId: string) => void;
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
    const [driverProfile, queueItems, vehicle, performanceSummary] = await Promise.all([
      driverService.fetchDriverProfile(),
      driverService.fetchDriverQueue(),
      driverService.fetchVehicleInfo(),
      driverService.fetchPerformanceSummary(),
    ]);
    set({ driverProfile, queueItems, vehicle, performanceSummary });
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
    void driverService.updateDriverAvailability();
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

  acceptQueueTrip(tripId) {
    const { queueItems } = get();
    const found = queueItems.find((t) => t.id === tripId);
    if (!found) return;
    const driverId = get().driverProfile?.id ?? 'usr-driver-001';
    const next: Trip = {
      ...found,
      driverId,
      status: 'driver_assigned',
      updatedAtIso: new Date().toISOString(),
      timeline: [
        ...found.timeline,
        { id: `acc-${Date.now()}`, atIso: new Date().toISOString(), label: 'Accepted by driver', detail: 'Driver is on the way.' },
      ],
    };
    set({
      queueItems: queueItems.filter((t) => t.id !== tripId),
    });
    get().bindActiveTrip(next);
  },

  declineQueueTrip(tripId) {
    set((s) => ({ queueItems: s.queueItems.filter((t) => t.id !== tripId) }));
  },

  updateVehicleInfo(patch) {
    set((s) => ({ vehicle: s.vehicle ? { ...s.vehicle, ...patch } : null }));
  },
}));

