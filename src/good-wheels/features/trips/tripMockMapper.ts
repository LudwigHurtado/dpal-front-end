import type {
  PlaceRef,
  SafetyStatus,
  SupportCategoryId,
  Trip,
  TripOfferNegotiationStatus,
  TripOfferState,
  TripStatus,
  TripTimelineEvent,
} from './tripTypes';
import { calculateGoodWheelsFareSplit, fareSplitToPayload } from './utils/fareSplit';

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

function asOfferState(v: unknown, updatedFallback: string): TripOfferState | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  const statusRaw = typeof o.status === 'string' ? o.status : 'none';
  const status = (['none', 'passenger_offered', 'driver_countered', 'accepted', 'rejected'].includes(statusRaw)
    ? statusRaw
    : 'none') as TripOfferNegotiationStatus;
  return {
    passengerOfferCents: typeof o.passengerOfferCents === 'number' ? Math.round(o.passengerOfferCents) : undefined,
    recommendedFareCents: typeof o.recommendedFareCents === 'number' ? Math.round(o.recommendedFareCents) : undefined,
    driverCounterOfferCents:
      typeof o.driverCounterOfferCents === 'number' ? Math.round(o.driverCounterOfferCents) : undefined,
    acceptedFareCents: typeof o.acceptedFareCents === 'number' ? Math.round(o.acceptedFareCents) : undefined,
    status,
    updatedAtIso: typeof o.updatedAtIso === 'string' ? o.updatedAtIso : updatedFallback,
  };
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

  const estimateBlock = (() => {
    const est = o.estimate && typeof o.estimate === 'object' ? o.estimate : {};
    const etaMinutes = typeof est.etaMinutes === 'number' ? est.etaMinutes : 12;
    const distanceKm = typeof est.distanceKm === 'number' ? est.distanceKm : 4.2;
    const currency = typeof est.currency === 'string' ? est.currency : 'USD';
    const offerPassenger =
      o.offerState &&
      typeof o.offerState === 'object' &&
      typeof (o.offerState as { passengerOfferCents?: unknown }).passengerOfferCents === 'number' &&
      Number.isFinite((o.offerState as { passengerOfferCents: number }).passengerOfferCents) &&
      (o.offerState as { passengerOfferCents: number }).passengerOfferCents > 0
        ? Math.round((o.offerState as { passengerOfferCents: number }).passengerOfferCents)
        : 0;
    let totalFareCents: number | undefined =
      typeof est.totalFareCents === 'number' && Number.isFinite(est.totalFareCents)
        ? Math.round(est.totalFareCents)
        : undefined;
    if ((totalFareCents == null || totalFareCents <= 0) && offerPassenger > 0) {
      totalFareCents = offerPassenger;
    }
    if ((totalFareCents == null || totalFareCents <= 0) && typeof o.fareUsd === 'number' && o.fareUsd > 0) {
      totalFareCents = Math.round(o.fareUsd * 100);
    }
    const base = { etaMinutes, distanceKm, currency };
    if (totalFareCents != null && totalFareCents > 0) {
      const split = calculateGoodWheelsFareSplit(totalFareCents);
      return {
        ...base,
        totalFareCents: split.totalFareCents,
        fareSplit: fareSplitToPayload(split),
      };
    }
    return base;
  })();

  const fareUsdResolved =
    typeof o.fareUsd === 'number' && o.fareUsd > 0
      ? o.fareUsd
      : 'totalFareCents' in estimateBlock &&
          typeof (estimateBlock as { totalFareCents?: number }).totalFareCents === 'number' &&
          (estimateBlock as { totalFareCents: number }).totalFareCents > 0
        ? (estimateBlock as { totalFareCents: number }).totalFareCents / 100
        : undefined;

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
    pickupCategory: typeof o.pickupCategory === 'string' ? o.pickupCategory : undefined,
    dropoffCategory: typeof o.dropoffCategory === 'string' ? o.dropoffCategory : undefined,
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
    estimate: estimateBlock,
    fareUsd: fareUsdResolved,
    attachedCause:
      o.attachedCause && typeof o.attachedCause === 'object'
        ? {
            id: typeof o.attachedCause.id === 'string' ? o.attachedCause.id : '',
            name: typeof o.attachedCause.name === 'string' ? o.attachedCause.name : '',
            category: typeof o.attachedCause.category === 'string' ? o.attachedCause.category : '',
            city: typeof o.attachedCause.city === 'string' ? o.attachedCause.city : '',
            country: typeof o.attachedCause.country === 'string' ? o.attachedCause.country : '',
          }
        : undefined,
    offerState: asOfferState(o.offerState, updatedAtIso),
    negotiationDriverId: typeof o.negotiationDriverId === 'string' ? o.negotiationDriverId : undefined,
    rejectedDriverIds: Array.isArray(o.rejectedDriverIds)
      ? (o.rejectedDriverIds as unknown[]).filter((x): x is string => typeof x === 'string')
      : undefined,
    driverResponseState:
      o.driverResponseState && typeof o.driverResponseState === 'object'
        ? {
            driverId: String((o.driverResponseState as { driverId?: unknown }).driverId || ''),
            status: (() => {
              const s = String((o.driverResponseState as { status?: unknown }).status || 'unseen');
              const allowed = new Set(['unseen', 'seen', 'acknowledged', 'countered', 'accepted', 'rejected', 'expired']);
              return (allowed.has(s) ? s : 'unseen') as NonNullable<Trip['driverResponseState']>['status'];
            })(),
            lastActionAtIso: String(
              (o.driverResponseState as { lastActionAtIso?: unknown }).lastActionAtIso || updatedAtIso,
            ),
          }
        : undefined,
    acceptedAtIso: typeof o.acceptedAtIso === 'string' ? o.acceptedAtIso : undefined,
  } as Trip;
}

