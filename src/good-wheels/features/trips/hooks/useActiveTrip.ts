import { useTripStore } from '../tripStore';

export function useActiveTrip() {
  const activeTrip = useTripStore((s) => s.activeTrip);
  const loading = useTripStore((s) => s.loading);
  const error = useTripStore((s) => s.error);
  return { activeTrip, loading, error };
}

