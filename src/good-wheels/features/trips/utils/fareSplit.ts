/**
 * Good Wheels fare split: 5% admin on gross, then 90/10 on remainder to driver vs platform.
 * Driver payout is 90% of net after admin — not 90% of gross.
 */

export type FareSplit = {
  totalFareCents: number;
  adminCostCents: number;
  netFareCents: number;
  driverPayoutCents: number;
  platformShareCents: number;
  adminPercent: 5;
  driverPercentOfNet: 90;
  platformPercentOfNet: 10;
};

/** Nested shape returned by API / persisted on trip estimate */
export type FareSplitPayload = Omit<FareSplit, 'totalFareCents'>;

const PERCENTS = {
  adminPercent: 5 as const,
  driverPercentOfNet: 90 as const,
  platformPercentOfNet: 10 as const,
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
  const netFareCents = total - adminCostCents;
  const driverPayoutCents = Math.round(netFareCents * 0.9);
  const platformShareCents = netFareCents - driverPayoutCents;
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
