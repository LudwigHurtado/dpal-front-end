import { create } from 'zustand';
import type { RideRequestDraft, Trip } from './tripTypes';
import { tripService } from './tripService';

type TripState = {
  activeTrip: Trip | null;
  history: Trip[];
  draft: RideRequestDraft;
  loading: boolean;
  error: string | null;
  setDraft: (patch: Partial<RideRequestDraft>) => void;
  clearDraft: () => void;
  hydrate: (userId: string) => Promise<void>;
  requestRide: () => Promise<void>;
};

const EMPTY_DRAFT: RideRequestDraft = {
  pickup: null,
  dropoff: null,
  purpose: 'normal_ride',
  familySafe: true,
};

export const useTripStore = create<TripState>((set, get) => ({
  activeTrip: null,
  history: [],
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
      set({ activeTrip: active, history: hist, loading: false });
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
      const trip = await tripService.requestTrip(draft);
      set({ activeTrip: trip, loading: false });
    } catch {
      set({ loading: false, error: 'Could not request a ride.' });
    }
  },
}));

