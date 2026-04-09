import { create } from 'zustand';
import type { RideRequestDraft, SafetyStatus, Trip, TripStatus, TripTimelineEvent } from './tripTypes';
import { tripService } from './tripService';
import { TERMINAL_STATUSES } from './tripConstants';

type TripState = {
  activeTrip: Trip | null;
  history: Trip[];
  lastTerminalTrip: Trip | null;
  draft: RideRequestDraft;
  loading: boolean;
  error: string | null;
  setDraft: (patch: Partial<RideRequestDraft>) => void;
  clearDraft: () => void;
  hydrate: (userId: string) => Promise<void>;
  requestRide: () => Promise<void>;
  setActiveTrip: (trip: Trip) => void;
  clearActiveTrip: () => void;
  clearLastTerminalTrip: () => void;
  patchLastTerminalTrip: (patch: Partial<Trip>) => void;
  patchHistoryTrip: (tripId: string, patch: Partial<Trip>) => void;
  updateStatus: (status: TripStatus, timelineLabel?: string, timelineDetail?: string) => void;
  appendTimelineEvent: (label: string, detail?: string) => void;
  updateSafetyState: (safetyStatus: SafetyStatus, timelineDetail?: string) => void;
};

const EMPTY_DRAFT: RideRequestDraft = {
  pickup: null,
  dropoff: null,
  purpose: 'normal_ride',
  familySafe: true,
};

const ACTIVE_TRIP_MARKER_KEY = 'gw_active_trip_marker_v1';

const setActiveTripMarker = (trip: Trip) => {
  try {
    localStorage.setItem(
      ACTIVE_TRIP_MARKER_KEY,
      JSON.stringify({
        id: trip.id,
        status: trip.status,
        updatedAtIso: trip.updatedAtIso,
      }),
    );
  } catch {
    // ignore storage failures
  }
};

const clearActiveTripMarker = () => {
  try {
    localStorage.removeItem(ACTIVE_TRIP_MARKER_KEY);
  } catch {
    // ignore storage failures
  }
};

const hasActiveTripMarker = (): boolean => {
  try {
    return Boolean(localStorage.getItem(ACTIVE_TRIP_MARKER_KEY));
  } catch {
    return false;
  }
};

export const useTripStore = create<TripState>((set, get) => ({
  activeTrip: null,
  history: [],
  lastTerminalTrip: null,
  draft: EMPTY_DRAFT,
  loading: false,
  error: null,
  setDraft(patch) {
    set((s) => ({ draft: { ...s.draft, ...patch } }));
  },
  clearDraft() {
    set({ draft: EMPTY_DRAFT, error: null });
  },
  async hydrate(userId) {
    set({ loading: true, error: null });
    try {
      const [active, hist] = await Promise.all([tripService.getActiveTrip(userId), tripService.listHistory(userId)]);
      const keepActive =
        Boolean(active) &&
        Boolean(active && !TERMINAL_STATUSES.has(active.status)) &&
        hasActiveTripMarker();
      set({ activeTrip: keepActive ? active : null, history: hist, loading: false });
    } catch {
      set({ loading: false, error: 'Could not load trips.' });
    }
  },
  async requestRide() {
    const { draft } = get();
    if (!draft.pickup || !draft.dropoff) {
      set({ error: 'Please choose pickup and destination.' });
      return;
    }
    // Provide immediate UI feedback for the passenger bottom sheet.
    set({
      loading: true,
      error: null,
      activeTrip: {
        id: `trip-${Date.now()}`,
        passengerId: 'usr-passenger-001',
        pickup: draft.pickup,
        dropoff: draft.dropoff,
        purpose: draft.purpose,
        supportCategoryId: draft.supportCategoryId,
        status: 'requested',
        safetyStatus: draft.familySafe ? 'family_safe' : 'standard',
        createdAtIso: new Date().toISOString(),
        updatedAtIso: new Date().toISOString(),
        estimate: { etaMinutes: 8, distanceKm: 4.8 },
        timeline: [{ id: `evt-${Date.now()}`, atIso: new Date().toISOString(), label: 'Finding a driver…' }],
      },
    });
    try {
      const trip = await tripService.requestTrip(draft);
      setActiveTripMarker(trip);
      set({
        activeTrip: {
          ...trip,
          pickup: {
            ...trip.pickup,
            addressLine: draft.pickup?.addressLine ?? trip.pickup.addressLine,
            point: draft.pickup?.point ?? trip.pickup.point,
          },
          dropoff: {
            ...trip.dropoff,
            addressLine: draft.dropoff?.addressLine ?? trip.dropoff.addressLine,
            point: draft.dropoff?.point ?? trip.dropoff.point,
          },
        },
        loading: false,
      });
    } catch {
      set({ loading: false, error: 'Could not request a ride.' });
    }
  },
  setActiveTrip(trip) {
    if (TERMINAL_STATUSES.has(trip.status)) clearActiveTripMarker();
    else setActiveTripMarker(trip);
    set({ activeTrip: trip, error: null });
  },
  clearActiveTrip() {
    clearActiveTripMarker();
    set({ activeTrip: null, error: null });
  },
  clearLastTerminalTrip() {
    set({ lastTerminalTrip: null });
  },
  patchLastTerminalTrip(patch) {
    set((s) => (s.lastTerminalTrip ? { lastTerminalTrip: { ...s.lastTerminalTrip, ...patch } } : s));
  },
  patchHistoryTrip(tripId, patch) {
    set((s) => ({
      history: s.history.map((t) => (t.id === tripId ? { ...t, ...patch } : t)),
    }));
  },
  updateStatus(status, timelineLabel, timelineDetail) {
    const prev = get().activeTrip;
    if (!prev) return;
    const next: Trip = {
      ...prev,
      status,
      updatedAtIso: new Date().toISOString(),
    };
    if (TERMINAL_STATUSES.has(status)) {
      clearActiveTripMarker();
      set((s) => ({
        activeTrip: null,
        lastTerminalTrip: next,
        history: [next, ...s.history],
      }));
    } else {
      setActiveTripMarker(next);
      set({ activeTrip: next });
    }
    if (timelineLabel) get().appendTimelineEvent(timelineLabel, timelineDetail);
  },
  appendTimelineEvent(label, detail) {
    const prev = get().activeTrip;
    if (!prev) return;
    const ev: TripTimelineEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      atIso: new Date().toISOString(),
      label,
      detail,
    };
    set({
      activeTrip: {
        ...prev,
        updatedAtIso: new Date().toISOString(),
        timeline: [...prev.timeline, ev],
      },
    });
  },
  updateSafetyState(safetyStatus, timelineDetail) {
    const prev = get().activeTrip;
    if (!prev) return;
    set({
      activeTrip: {
        ...prev,
        safetyStatus,
        updatedAtIso: new Date().toISOString(),
      },
    });
    get().appendTimelineEvent('Safety updated', timelineDetail ?? `Safety set to ${safetyStatus.replace(/_/g, ' ')}`);
  },
}));

