/**
 * Listed fare (USD) for Good Wheels — **must stay aligned** with
 * `src/good-wheels/features/trips/utils/rideHailFareEstimate.ts`.
 *
 * Used when the API must derive a fallback fare from route distance/time (no passenger cents).
 */
const KM_TO_MI = 0.621371192;

const MIN_LISTED_FARE_USD = 5.25;
const BOOKING_FEE_USD = 2.45;
const PER_MILE_USD = 1.72;
const PER_MINUTE_USD = 0.32;
const FALLBACK_ROUTE_MILES = 3.2;
const IMPLIED_MPH_FOR_DURATION = 22;

export type GoodWheelsFareEstimateInput = {
  distanceKm: number | null | undefined;
  durationMinutes: number | null | undefined;
  serviceTierMultiplier: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function estimateGoodWheelsListedFareUsd(input: GoodWheelsFareEstimateInput): number {
  const tier =
    Number.isFinite(input.serviceTierMultiplier) && input.serviceTierMultiplier > 0
      ? input.serviceTierMultiplier
      : 1;

  let miles: number;
  if (input.distanceKm != null && Number.isFinite(input.distanceKm) && input.distanceKm > 0) {
    miles = input.distanceKm * KM_TO_MI;
  } else {
    miles = FALLBACK_ROUTE_MILES;
  }

  let minutes: number;
  if (input.durationMinutes != null && Number.isFinite(input.durationMinutes) && input.durationMinutes > 0) {
    minutes = input.durationMinutes;
  } else {
    minutes = clamp((miles / IMPLIED_MPH_FOR_DURATION) * 60, 6, 240);
  }

  const distanceUsd = miles * PER_MILE_USD;
  const timeUsd = minutes * PER_MINUTE_USD;
  const raw = (BOOKING_FEE_USD + distanceUsd + timeUsd) * tier;
  return Math.round(Math.max(MIN_LISTED_FARE_USD, raw) * 100) / 100;
}

/** Whole cents from route metrics (economy tier = 1). */
export function listedFareCentsFromRoute(distanceKm: number, durationMinutes?: number): number {
  const usd = estimateGoodWheelsListedFareUsd({
    distanceKm,
    durationMinutes: durationMinutes ?? null,
    serviceTierMultiplier: 1,
  });
  return Math.round(usd * 100);
}
