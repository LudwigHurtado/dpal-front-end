import { create } from 'zustand';
import type { RideRequestDraft, SafetyStatus, Trip, TripStatus, TripTimelineEvent } from './tripTypes';
import { tripService } from './tripService';
import { TERMINAL_STATUSES } from './tripConstants';
import { useAuthStore } from '../../store/useAuthStore';

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

const WAITING_FOR_DRIVER_STATUSES = new Set<TripStatus>(['requested', 'broadcasted', 'matched']);

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
      if (!active) {
        clearActiveTripMarker();
      }
      const currentActive = get().activeTrip;
      const currentIsWaiting =
        currentActive &&
        currentActive.passengerId === userId &&
        WAITING_FOR_DRIVER_STATUSES.has(currentActive.status);
      const activeReal = active ?? (currentIsWaiting ? currentActive : null);
      const keepActive = Boolean(activeReal && !TERMINAL_STATUSES.has(activeReal.status));
      const latestCancelled =
        hist.find((trip) => trip.status === 'cancelled' || trip.status === 'canceled') ?? null;
      set((state) => ({
        activeTrip: keepActive ? activeReal : null,
        history: hist,
        lastTerminalTrip:
          latestCancelled &&
          (!state.lastTerminalTrip ||
            state.lastTerminalTrip.id !== latestCancelled.id ||
            state.lastTerminalTrip.updatedAtIso !== latestCancelled.updatedAtIso)
            ? latestCancelled
            : state.lastTerminalTrip,
        loading: false,
      }));
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
    set({ loading: true, error: null });
    try {
      const passengerId = useAuthStore.getState().user?.id;
      if (!passengerId) {
        set({ loading: false, error: 'Please sign in before requesting a ride.' });
        return;
      }
      const trip = await tripService.requestTrip({ ...draft, passengerId });
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

