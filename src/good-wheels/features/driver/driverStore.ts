import { create } from 'zustand';
import type { Trip } from '../trips/tripTypes';
import { useTripStore } from '../trips/tripStore';
import { tripService } from '../trips/tripService';
import type {
  DriverAvailabilityStatus,
  DriverDashboardSummary,
  DriverPerformanceSummary,
  DriverProfile,
  DriverQueueFilterId,
  DriverQueueItem,
  DriverVehicleInfo,
} from './driverTypes';
import { DEFAULT_DRIVER_FILTER_ID } from './driverConstants';
import { driverService } from './driverService';
import { goodWheelsRideApi } from '../../services/adapters/goodWheelsApi';
import { goodWheelsDriverApi } from '../../services/adapters/goodWheelsApi';
import { GOOD_WHEELS_DEMO_MODE } from '../../app/appConfig';
import { useAuthStore } from '../../store/useAuthStore';
import { mapMockTripToTrip } from '../trips/tripMockMapper';

const ACTIVE_ASSIGNED = new Set<string>([
  'accepted',
  'driver_en_route',
  'driver_arrived',
  'passenger_onboard',
  'in_progress',
  'driver_assigned',
  'driver_arriving',
  'arrived',
]);

const dashboardCacheKey = (driverId: string) => `good-wheels-driver-dashboard-cache-${driverId}`;

type DriverState = {
  driverProfile: DriverProfile | null;
  availabilityStatus: DriverAvailabilityStatus;
  activeTripId: string | null;
  queueFilterId: DriverQueueFilterId;
  /** Open requests for this driver (server-filtered). */
  queueItems: DriverQueueItem[];
  /** Trips where this driver countered and is waiting on the passenger. */
  pendingDealTrips: Trip[];
  recentCompletedTrips: Trip[];
  dashboardSummary: DriverDashboardSummary | null;
  dashboardLoading: boolean;
  dashboardError: string | null;
  dashboardStale: boolean;
  lastDashboardSyncIso: string | null;
  vehicle: DriverVehicleInfo | null;
  performanceSummary: DriverPerformanceSummary | null;
  completedTripIds: string[];

  hydrate: () => Promise<void>;
  setAvailability: (next: DriverAvailabilityStatus) => void;
  setQueueFilter: (id: DriverQueueFilterId) => void;
  acceptQueueTrip: (tripId: string) => Promise<Trip | null>;
  sendCounteroffer: (tripId: string, amountCents: number, message?: string) => Promise<Trip | null>;
  declineQueueTrip: (tripId: string) => Promise<void>;
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
  pendingDealTrips: [],
  recentCompletedTrips: [],
  dashboardSummary: null,
  dashboardLoading: false,
  dashboardError: null,
  dashboardStale: false,
  lastDashboardSyncIso: null,
  vehicle: null,
  performanceSummary: null,
  completedTripIds: [],

  async hydrate() {
    const authDriverId = useAuthStore.getState().user?.id;
    if (!authDriverId) {
      set({ dashboardLoading: false, dashboardError: null });
      return;
    }
    const isInitial = !get().driverProfile;
    if (isInitial) set({ dashboardLoading: true, dashboardError: null, dashboardStale: false });
    else set({ dashboardError: null });
    try {
      if (GOOD_WHEELS_DEMO_MODE) {
        const [driverProfile, queueItems, vehicle, performanceSummary] = await Promise.all([
          driverService.fetchDriverProfile(authDriverId),
          driverService.fetchDriverQueue(authDriverId),
          driverService.fetchVehicleInfo(authDriverId),
          driverService.fetchPerformanceSummary(authDriverId),
        ]);
        const activeTrip = useTripStore.getState().activeTrip;
        const hasActive = Boolean(activeTrip && ACTIVE_ASSIGNED.has(activeTrip.status));
        const prevAvail = get().availabilityStatus;
        const availabilityStatus: DriverAvailabilityStatus = hasActive
          ? 'busy'
          : prevAvail === 'paused'
            ? 'paused'
            : driverProfile.availability === 'offline'
              ? 'offline'
              : 'online';
        const syncIso = new Date().toISOString();
        set({
          driverProfile,
          queueItems,
          pendingDealTrips: [],
          recentCompletedTrips: [],
          dashboardSummary: {
            availableCount: queueItems.length,
            pendingDealCount: 0,
            activeTripStatus: hasActive ? activeTrip?.status ?? null : null,
            completedToday: 0,
            completedTrips: performanceSummary.completedTrips,
          },
          vehicle,
          performanceSummary,
          availabilityStatus,
          dashboardError: null,
          lastDashboardSyncIso: syncIso,
        });
        return;
      }

      const [dash, vehicle, performanceSummary] = await Promise.all([
        driverService.fetchDriverDashboard(authDriverId),
        driverService.fetchVehicleInfo(authDriverId),
        driverService.fetchPerformanceSummary(authDriverId),
      ]);
      const syncIso = new Date().toISOString();
      try {
        localStorage.setItem(dashboardCacheKey(authDriverId), JSON.stringify({ syncedAt: syncIso, dash }));
      } catch {
        /* ignore quota */
      }

      if (dash.activeTrip) {
        useTripStore.getState().setActiveTrip(dash.activeTrip);
      } else {
        const cur = useTripStore.getState().activeTrip;
        if (cur?.driverId === authDriverId) {
          useTripStore.getState().clearActiveTrip();
        }
      }

      const hist = await tripService.listHistory(authDriverId);
      useTripStore.setState({ history: hist });

      const hasDriverActive = Boolean(dash.activeTrip && ACTIVE_ASSIGNED.has(dash.activeTrip.status));
      const prevAvail = get().availabilityStatus;
      const availabilityStatus: DriverAvailabilityStatus = hasDriverActive
        ? 'busy'
        : prevAvail === 'paused'
          ? 'paused'
          : dash.driver.availability === 'offline'
            ? 'offline'
            : 'online';

      set({
        driverProfile: dash.driver,
        queueItems: dash.availableRequests,
        pendingDealTrips: dash.pendingDeals,
        recentCompletedTrips: dash.recentCompletedTrips,
        dashboardSummary: dash.summary,
        vehicle,
        performanceSummary,
        availabilityStatus,
        dashboardError: null,
        dashboardStale: false,
        lastDashboardSyncIso: syncIso,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Dashboard load failed';
      let stale = false;
      try {
        const raw = localStorage.getItem(dashboardCacheKey(authDriverId));
        if (raw) {
          const parsed = JSON.parse(raw) as { syncedAt?: string; dash?: Record<string, unknown> };
          const d = parsed.dash;
          if (d) {
            stale = true;
            const available = Array.isArray(d.availableRequests)
              ? (d.availableRequests as unknown[]).map((x) => mapMockTripToTrip(x))
              : [];
            const pending = Array.isArray(d.pendingDeals) ? (d.pendingDeals as unknown[]).map((x) => mapMockTripToTrip(x)) : [];
            const recent = Array.isArray(d.recentCompletedTrips)
              ? (d.recentCompletedTrips as unknown[]).map((x) => mapMockTripToTrip(x))
              : [];
            const activeRaw = d.activeTrip;
            const activeTrip = activeRaw ? mapMockTripToTrip(activeRaw) : null;
            set({
              queueItems: available,
              pendingDealTrips: pending,
              recentCompletedTrips: recent,
              dashboardSummary: (d.summary as DriverDashboardSummary) ?? null,
              lastDashboardSyncIso: parsed.syncedAt ?? null,
              dashboardStale: true,
            });
            if (activeTrip) useTripStore.getState().setActiveTrip(activeTrip);
          }
        }
      } catch {
        /* ignore */
      }
      set({ dashboardError: msg, dashboardStale: stale });
    } finally {
      set({ dashboardLoading: false });
    }
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
    const { queueItems, pendingDealTrips } = get();
    const found = queueItems.find((t) => t.id === tripId) ?? pendingDealTrips.find((t) => t.id === tripId);
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
    } else {
      set({
        queueItems: queueItems.filter((t) => t.id !== tripId),
        pendingDealTrips: pendingDealTrips.filter((t) => t.id !== tripId),
      });
    }
    get().bindActiveTrip(next);
    if (!GOOD_WHEELS_DEMO_MODE) {
      await get().hydrate();
    }
    return next;
  },

  async sendCounteroffer(tripId, amountCents, message) {
    const { queueItems, pendingDealTrips } = get();
    const found = queueItems.find((t) => t.id === tripId) ?? pendingDealTrips.find((t) => t.id === tripId);
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
        negotiationDriverId: driverId,
        updatedAtIso: now,
        offerState: {
          passengerOfferCents: basePassenger,
          recommendedFareCents: recommended,
          driverCounterOfferCents: amountCents,
          acceptedFareCents: found.offerState?.acceptedFareCents,
          status: 'driver_countered',
          updatedAtIso: now,
        },
        driverResponseState: { driverId, status: 'countered', lastActionAtIso: now },
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
      set({
        queueItems: queueItems.filter((t) => t.id !== tripId),
        pendingDealTrips: [...pendingDealTrips.filter((t) => t.id !== tripId), updated],
      });
    } else {
      updated = await goodWheelsRideApi.sendTripCounteroffer(tripId, driverId, amountCents, message);
      await get().hydrate();
    }
    return updated;
  },

  async declineQueueTrip(tripId) {
    const driverId = get().driverProfile?.id ?? useAuthStore.getState().user?.id ?? '';
    try {
      if (!GOOD_WHEELS_DEMO_MODE && driverId) {
        await goodWheelsDriverApi.rejectTripForDriver(tripId, driverId);
      } else {
        set((s) => ({
          queueItems: s.queueItems.filter((t) => t.id !== tripId),
          pendingDealTrips: s.pendingDealTrips.filter((t) => t.id !== tripId),
        }));
      }
      await get().hydrate();
    } catch (e) {
      set({ dashboardError: e instanceof Error ? e.message : 'Decline failed' });
    }
  },

  updateVehicleInfo(patch) {
    set((s) => ({ vehicle: s.vehicle ? { ...s.vehicle, ...patch } : null }));
  },
}));
