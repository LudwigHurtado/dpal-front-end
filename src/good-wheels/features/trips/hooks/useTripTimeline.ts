import type { Trip } from '../tripTypes';

export function useTripTimeline(trip: Trip) {
  const events = [...trip.timeline].sort((a, b) => new Date(a.atIso).getTime() - new Date(b.atIso).getTime());
  const latest = events.length ? events[events.length - 1] : null;
  return { events, latest };
}

