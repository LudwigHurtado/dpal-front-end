import type { Trip } from '../tripTypes';

/**
 * Identify trips that are obviously the demo fixture (Carlos / Home → Clinic /
 * Central Park Medical) so we can hide them from the UI without depending on
 * backend-side cleanup.
 *
 * Do not treat seeded user ids as mock by themselves. Local/prod test accounts
 * can legitimately use ids like `usr-passenger-001` / `usr-driver-001`, and
 * dropping those would hide real ride requests right after submit.
 */
const FIXTURE_TRIP_IDS = new Set(['trip-1001', 'trip-0990', 'trip-q-2001', 'trip-q-2002', 'trip-q-2003']);
const FIXTURE_LABEL_PAIRS: Array<[string, string]> = [
  ['Home', 'Clinic'],
  ['Clinic', 'Pharmacy'],
  ['School', 'Home'],
];
const FIXTURE_ADDRESSES = new Set([
  '123 oak st',
  'central park medical, 4th ave',
  'central park medical',
  'ridgeview elementary',
  '4500 main st',
]);

const norm = (s: string | undefined): string => (s ?? '').trim().toLowerCase();

export function looksLikeSeededFixture(trip: Trip): boolean {
  if (FIXTURE_TRIP_IDS.has(trip.id)) return true;

  const pickupLabel = norm(trip.pickup?.label);
  const dropoffLabel = norm(trip.dropoff?.label);
  for (const [a, b] of FIXTURE_LABEL_PAIRS) {
    if (pickupLabel === a.toLowerCase() && dropoffLabel === b.toLowerCase()) return true;
  }

  const pickupAddr = norm(trip.pickup?.addressLine);
  const dropoffAddr = norm(trip.dropoff?.addressLine);
  if (FIXTURE_ADDRESSES.has(pickupAddr) || FIXTURE_ADDRESSES.has(dropoffAddr)) return true;

  return false;
}
