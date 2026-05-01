import type { Trip } from '../tripTypes';

/**
 * Identify trips that are obviously the demo fixture (Carlos / Home → Clinic /
 * Central Park Medical / `usr-passenger-001`) so we can hide them from the UI
 * without depending on backend-side cleanup.
 *
 * Any of these signals individually is enough to drop the trip:
 *   - hardcoded fixture passenger or driver id (`usr-passenger-001`, `usr-driver-001`)
 *   - hardcoded fixture trip id (`trip-1001`, `trip-q-2002`, etc.)
 *   - placeholder labels like "Home" / "Clinic" combined with placeholder addresses
 *   - synthetic driver name "Carlos Driver"
 *   - both endpoints missing real coords AND addresses match the fixture set
 */
const FIXTURE_TRIP_IDS = new Set(['trip-1001', 'trip-0990', 'trip-q-2001', 'trip-q-2002', 'trip-q-2003']);
const FIXTURE_USER_IDS = new Set(['usr-passenger-001', 'usr-driver-001', 'usr-driver-002', 'usr-worker-001']);
const FIXTURE_DRIVER_NAMES = new Set(['Carlos Driver', 'Carlos M.', 'Anna Driver']);
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
  if (FIXTURE_USER_IDS.has(trip.passengerId)) return true;
  if (trip.driverId && FIXTURE_USER_IDS.has(trip.driverId)) return true;
  if (trip.driverSnapshot?.fullName && FIXTURE_DRIVER_NAMES.has(trip.driverSnapshot.fullName)) return true;

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
