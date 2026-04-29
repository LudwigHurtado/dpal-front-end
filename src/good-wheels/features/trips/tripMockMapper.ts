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
  const raw = typeof v === 'string' ? v : 'requested';
  const normalized = raw === 'canceled' ? 'cancelled' : raw;
  const s = normalized as TripStatus;
  return s;
}

function asPlaceRef(v: unknown, fallbackLabel: string): PlaceRef {
  const o = (v ?? {}) as Partial<PlaceRef>;
  return {
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

  const id = typeof o.id === 'string' ? o.id : typeof o.tripId === 'string' ? o.tripId : `trip-${Date.now()}`;
  const createdAtIso = asIso(o.createdAtIso, now);
  const updatedAtIso = asIso(o.updatedAtIso, createdAtIso);
  const status = asStatus(o.status);

  return {
    id,
    passengerId: typeof o.passengerId === 'string' ? o.passengerId : 'passenger-demo',
    driverId: typeof o.driverId === 'string' ? o.driverId : undefined,
    driverSnapshot:
      o.driverSnapshot && typeof o.driverSnapshot === 'object'
        ? {
            id: typeof o.driverSnapshot.id === 'string' ? o.driverSnapshot.id : (typeof o.driverId === 'string' ? o.driverId : 'driver'),
            fullName: typeof o.driverSnapshot.fullName === 'string' ? o.driverSnapshot.fullName : 'Driver',
            vehicle:
              o.driverSnapshot.vehicle && typeof o.driverSnapshot.vehicle === 'object'
                ? {
                    makeModel: typeof o.driverSnapshot.vehicle.makeModel === 'string' ? o.driverSnapshot.vehicle.makeModel : undefined,
                    plateMasked: typeof o.driverSnapshot.vehicle.plateMasked === 'string' ? o.driverSnapshot.vehicle.plateMasked : undefined,
                    colorName: typeof o.driverSnapshot.vehicle.colorName === 'string' ? o.driverSnapshot.vehicle.colorName : undefined,
                    seats: typeof o.driverSnapshot.vehicle.seats === 'number' ? o.driverSnapshot.vehicle.seats : undefined,
                    verification: typeof o.driverSnapshot.vehicle.verification === 'string' ? o.driverSnapshot.vehicle.verification : undefined,
                    vehicleType: typeof o.driverSnapshot.vehicle.vehicleType === 'string' ? o.driverSnapshot.vehicle.vehicleType : undefined,
                  }
                : undefined,
            trust:
              o.driverSnapshot.trust && typeof o.driverSnapshot.trust === 'object'
                ? {
                    verifiedDriver: typeof o.driverSnapshot.trust.verifiedDriver === 'string' ? o.driverSnapshot.trust.verifiedDriver : undefined,
                    verifiedVehicle: typeof o.driverSnapshot.trust.verifiedVehicle === 'string' ? o.driverSnapshot.trust.verifiedVehicle : undefined,
                  }
                : undefined,
          }
        : undefined,
    workerId: typeof o.workerId === 'string' ? o.workerId : undefined,
    pickup: asPlaceRef(o.pickup, 'Pickup'),
    dropoff: asPlaceRef(o.dropoff, 'Dropoff'),
    purpose: typeof o.purpose === 'string' ? o.purpose : 'normal_ride',
    supportCategoryId: (typeof o.supportCategoryId === 'string' ? (o.supportCategoryId as SupportCategoryId) : undefined) ?? undefined,
    status,
    safetyStatus: (typeof o.safetyStatus === 'string' ? (o.safetyStatus as SafetyStatus) : undefined) ?? 'standard',
    timeline: asTimeline(o.timeline),
    notes: typeof o.notes === 'string' ? o.notes : undefined,
    trustMarkers: Array.isArray(o.trustMarkers) ? o.trustMarkers.filter((x: any) => typeof x === 'string') : undefined,
    routeSummary: o.routeSummary && typeof o.routeSummary === 'object' ? o.routeSummary : undefined,
    chatThreadId: typeof o.chatThreadId === 'string' ? o.chatThreadId : undefined,
    broadcastId: typeof o.broadcastId === 'string' ? o.broadcastId : undefined,
    completedAtIso: typeof o.completedAtIso === 'string' ? o.completedAtIso : undefined,
    cancelledAtIso: typeof o.cancelledAtIso === 'string' ? o.cancelledAtIso : undefined,
    cancelReason: typeof o.cancelReason === 'string' ? o.cancelReason : undefined,
    createdAtIso,
    updatedAtIso,
    estimate:
      o.estimate && typeof o.estimate === 'object'
        ? {
            etaMinutes: typeof o.estimate.etaMinutes === 'number' ? o.estimate.etaMinutes : 12,
            distanceKm: typeof o.estimate.distanceKm === 'number' ? o.estimate.distanceKm : 4.2,
          }
        : { etaMinutes: 12, distanceKm: 4.2 },
  } as Trip;
}

