import type { Trip } from '../tripTypes';

/**
 * Good Wheels fare split policy:
 * - Driver: 90% of gross fare
 * - Charity/community: 5% of gross fare
 * - Admin: 5% of gross fare
 *
 * Optional passenger add-ons/donations are separate and do not reduce driver payout.
 */

export type FareSplit = {
  totalFareCents: number;
  adminCostCents: number;
  /** Compatibility field retained for existing UI payloads. */
  netFareCents: number;
  driverPayoutCents: number;
  /** Compatibility field name retained; now represents charity/community share. */
  platformShareCents: number;
  adminPercent: 5;
  driverPercentOfNet: 90;
  platformPercentOfNet: 5;
};

/** Nested shape returned by API / persisted on trip estimate */
export type FareSplitPayload = Omit<FareSplit, 'totalFareCents'>;

const PERCENTS = {
  adminPercent: 5 as const,
  driverPercentOfNet: 90 as const,
  platformPercentOfNet: 5 as const,
};

function emptySplit(): FareSplit {
  return {
    totalFareCents: 0,
    adminCostCents: 0,
    netFareCents: 0,
    driverPayoutCents: 0,
    platformShareCents: 0,
    ...PERCENTS,
  };
}

/**
 * @param totalFareCents — gross listed fare in whole cents (passenger total)
 */
export function calculateGoodWheelsFareSplit(totalFareCents: number): FareSplit {
  const raw = Number(totalFareCents);
  if (!Number.isFinite(raw) || raw <= 0) {
    return emptySplit();
  }
  const total = Math.round(raw);
  const adminCostCents = Math.round(total * 0.05);
  const driverPayoutCents = Math.round(total * 0.9);
  const platformShareCents = total - adminCostCents - driverPayoutCents;
  const netFareCents = total - adminCostCents;
  return {
    totalFareCents: total,
    adminCostCents,
    netFareCents,
    driverPayoutCents,
    platformShareCents,
    ...PERCENTS,
  };
}

export function fareSplitToPayload(split: FareSplit): FareSplitPayload {
  const { totalFareCents: _t, ...rest } = split;
  return rest;
}

export function formatMoneyFromCents(cents: number, currency = 'USD'): string {
  const safe = Number.isFinite(cents) ? Math.round(cents) : 0;
  try {
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe / 100);
  } catch {
    return `$${(safe / 100).toFixed(2)}`;
  }
}

/** USD float → cents → split */
export function calculateFareSplitFromUsd(totalFareUsd: number): FareSplit {
  if (!Number.isFinite(totalFareUsd) || totalFareUsd <= 0) return emptySplit();
  return calculateGoodWheelsFareSplit(Math.round(totalFareUsd * 100));
}

/**
 * Fare shown on driver queue/dashboard cards: passenger offer when set; otherwise recommended rate (not estimate-as-passenger).
 */
export function fareBasisForTrip(trip: Trip): {
  explicitPassengerCents: number;
  recommendedFareCents: number;
  displayCents: number;
  displayKind: 'passenger' | 'recommended';
} {
  const explicit =
    typeof trip.offerState?.passengerOfferCents === 'number' && trip.offerState.passengerOfferCents > 0
      ? Math.round(trip.offerState.passengerOfferCents)
      : 0;
  const est =
    typeof trip.estimate?.totalFareCents === 'number' && trip.estimate.totalFareCents > 0
      ? Math.round(trip.estimate.totalFareCents)
      : 0;
  const recommended =
    typeof trip.offerState?.recommendedFareCents === 'number' && trip.offerState.recommendedFareCents > 0
      ? Math.round(trip.offerState.recommendedFareCents)
      : est;
  if (explicit > 0) {
    return {
      explicitPassengerCents: explicit,
      recommendedFareCents: recommended > 0 ? recommended : explicit,
      displayCents: explicit,
      displayKind: 'passenger',
    };
  }
  return {
    explicitPassengerCents: 0,
    recommendedFareCents: recommended,
    displayCents: recommended,
    displayKind: 'recommended',
  };
}
