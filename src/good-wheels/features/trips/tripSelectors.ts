import type { Trip } from './tripTypes';
import { isActiveTripStatus } from './tripUtils';

export function selectActiveTrip(trips: Trip[]): Trip | null {
  const active = trips.find((t) => isActiveTripStatus(t.status));
  return active ?? null;
}

export function sortTripsNewestFirst(trips: Trip[]): Trip[] {
  return [...trips].sort((a, b) => new Date(b.updatedAtIso).getTime() - new Date(a.updatedAtIso).getTime());
}

