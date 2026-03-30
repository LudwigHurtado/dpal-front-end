import type { PlaceRef, SafetyStatus, SupportCategoryId, Trip, TripStatus, TripTimelineEvent } from './tripTypes';

/**
 * Mock/API mapper placeholder.
 * Kept as a separate file because real backend shapes often differ from UI domain shapes.
 */
function asIso(v: unknown, fallback: string): string {
  if (typeof v === 'string' && !Number.isNaN(new Date(v).getTime())) return v;
  return fallback;
}

function asStatus(v: unknown): TripStatus {
  const s = typeof v === 'string' ? (v as TripStatus) : 'requested';
  return s;
}

function asPlaceRef(v: unknown, fallbackLabel: string): PlaceRef {
  const o = (v ?? {}) as Partial<PlaceRef>;
  return {
    id: typeof o.id === 'string' ? o.id : `place-${fallbackLabel.toLowerCase().replace(/\\s+/g, '-')}`,
    label: typeof o.label === 'string' ? o.label : fallbackLabel,
    addressLine: typeof o.addressLine === 'string' ? o.addressLine : '—',
    point: o.point && typeof o.point === 'object' ? (o.point as any) : undefined,
  } as PlaceRef;
}

function asTimeline(v: unknown): TripTimelineEvent[] {
  if (!Array.isArray(v)) return [];
  const now = new Date().toISOString();
  return v
    .map((e) => {
      const o = (e ?? {}) as Partial<TripTimelineEvent>;
      return {
        id: typeof o.id === 'string' ? o.id : `evt-${Math.random().toString(16).slice(2)}`,
        atIso: asIso(o.atIso, now),
        label: typeof o.label === 'string' ? o.label : 'Updated',
        detail: typeof o.detail === 'string' ? o.detail : undefined,
      };
    })
    .filter(Boolean);
}

export function mapMockTripToTrip(input: unknown): Trip {
  const now = new Date().toISOString();
  const o = (input ?? {}) as any;

  const tripId = typeof o.tripId === 'string' ? o.tripId : typeof o.id === 'string' ? o.id : `trip-${Date.now()}`;
  const createdAtIso = asIso(o.createdAtIso, now);
  const updatedAtIso = asIso(o.updatedAtIso, createdAtIso);
  const status = asStatus(o.status);

  return {
    tripId,
    passengerId: typeof o.passengerId === 'string' ? o.passengerId : 'passenger-demo',
    driverId: typeof o.driverId === 'string' ? o.driverId : null,
    workerId: typeof o.workerId === 'string' ? o.workerId : null,
    pickup: asPlaceRef(o.pickup, 'Pickup'),
    dropoff: asPlaceRef(o.dropoff, 'Dropoff'),
    purpose: typeof o.purpose === 'string' ? o.purpose : 'normal_ride',
    supportCategoryId: (typeof o.supportCategoryId === 'string' ? (o.supportCategoryId as SupportCategoryId) : undefined) ?? undefined,
    status,
    safetyStatus: (typeof o.safetyStatus === 'string' ? (o.safetyStatus as SafetyStatus) : undefined) ?? 'ok',
    timeline: asTimeline(o.timeline),
    notes: typeof o.notes === 'string' ? o.notes : undefined,
    trustMarkers: Array.isArray(o.trustMarkers) ? o.trustMarkers.filter((x: any) => typeof x === 'string') : undefined,
    routeSummary: o.routeSummary && typeof o.routeSummary === 'object' ? o.routeSummary : undefined,
    createdAtIso,
    updatedAtIso,
  } as Trip;
}

