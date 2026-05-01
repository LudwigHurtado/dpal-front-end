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
import { useAuthStore } from '../../store/useAuthStore';
import { mapMockTripToTrip } from '../trips/tripMockMapper';
import { looksLikeSeededFixture } from '../trips/utils/seededFixtureFilter';

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

/** Prefer latest `updatedAtIso` if the dashboard payload ever repeats the same trip id. */
function dedupeTripsByLatestUpdate(trips: Trip[]): Trip[] {
  const byId = new Map<string, Trip>();
  for (const trip of trips) {
    const prev = byId.get(trip.id);
    if (!prev || (trip.updatedAtIso ?? '') >= (prev.updatedAtIso ?? '')) {
      byId.set(trip.id, trip);
    }
  }
  return Array.from(byId.values()).sort((a, b) => (b.updatedAtIso ?? '').localeCompare(a.updatedAtIso ?? ''));
}

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

      // Filter seeded fixture trips (Carlos / Home → Clinic) before they reach
      // the trip store or queue UI.
      const realActive = dash.activeTrip && !looksLikeSeededFixture(dash.activeTrip) ? dash.activeTrip : null;
      const realAvailable = (dash.availableRequests ?? []).filter((t) => !looksLikeSeededFixture(t));
      const realPending = (dash.pendingDeals ?? []).filter((t) => !looksLikeSeededFixture(t));
      const realRecent = (dash.recentCompletedTrips ?? []).filter((t) => !looksLikeSeededFixture(t));

      if (realActive) {
        useTripStore.getState().setActiveTrip(realActive);
      } else {
        const cur = useTripStore.getState().activeTrip;
        if (cur?.driverId === authDriverId || (cur && looksLikeSeededFixture(cur))) {
          useTripStore.getState().clearActiveTrip();
        }
      }

      const hist = await tripService.listHistory(authDriverId);
      useTripStore.setState({ history: hist.filter((t) => !looksLikeSeededFixture(t)) });

      const hasDriverActive = Boolean(realActive && ACTIVE_ASSIGNED.has(realActive.status));
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
        queueItems: dedupeTripsByLatestUpdate(realAvailable),
        pendingDealTrips: dedupeTripsByLatestUpdate(realPending),
        recentCompletedTrips: realRecent,
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
            const available = (Array.isArray(d.availableRequests)
              ? (d.availableRequests as unknown[]).map((x) => mapMockTripToTrip(x))
              : []
            ).filter((t) => !looksLikeSeededFixture(t));
            const pending = (Array.isArray(d.pendingDeals) ? (d.pendingDeals as unknown[]).map((x) => mapMockTripToTrip(x)) : []).filter(
              (t) => !looksLikeSeededFixture(t),
            );
            const recent = (Array.isArray(d.recentCompletedTrips)
              ? (d.recentCompletedTrips as unknown[]).map((x) => mapMockTripToTrip(x))
              : []
            ).filter((t) => !looksLikeSeededFixture(t));
            const activeRaw = d.activeTrip;
            const activeTrip = activeRaw ? mapMockTripToTrip(activeRaw) : null;
            set({
              queueItems: dedupeTripsByLatestUpdate(available),
              pendingDealTrips: dedupeTripsByLatestUpdate(pending),
              recentCompletedTrips: recent,
              dashboardSummary: (d.summary as DriverDashboardSummary) ?? null,
              lastDashboardSyncIso: parsed.syncedAt ?? null,
              dashboardStale: true,
            });
            // Do not resurrect potentially stale active trips from cache.
          }
        }
      } catch {
        /* ignore */
      }
      useTripStore.getState().clearActiveTrip();
      set({ dashboardError: msg, dashboardStale: stale, availabilityStatus: 'offline' });
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
    next = await goodWheelsRideApi.acceptTrip(tripId, driverId);
    get().bindActiveTrip(next);
    await get().hydrate();
    return next;
  },

  async sendCounteroffer(tripId, amountCents, message) {
    const { queueItems, pendingDealTrips } = get();
    const found = queueItems.find((t) => t.id === tripId) ?? pendingDealTrips.find((t) => t.id === tripId);
    if (!found) return null;
    const driverId = get().driverProfile?.id ?? useAuthStore.getState().user?.id ?? 'usr-driver-001';
    let updated: Trip;
    updated = await goodWheelsRideApi.sendTripCounteroffer(tripId, driverId, amountCents, message);
    await get().hydrate();
    return updated;
  },

  async declineQueueTrip(tripId) {
    const driverId = get().driverProfile?.id ?? useAuthStore.getState().user?.id ?? '';
    try {
      if (!driverId) throw new Error('Driver ID is required');
      await goodWheelsDriverApi.rejectTripForDriver(tripId, driverId);
      await get().hydrate();
    } catch (e) {
      set({ dashboardError: e instanceof Error ? e.message : 'Decline failed' });
    }
  },

  updateVehicleInfo(patch) {
    set((s) => ({ vehicle: s.vehicle ? { ...s.vehicle, ...patch } : null }));
  },
}));
