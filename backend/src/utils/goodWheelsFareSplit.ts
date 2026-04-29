/**
 * Mirrors frontend Good Wheels fare split (see src/good-wheels/features/trips/utils/fareSplit.ts).
 */

export type GoodWheelsFareSplit = {
  totalFareCents: number;
  adminCostCents: number;
  netFareCents: number;
  driverPayoutCents: number;
  platformShareCents: number;
  adminPercent: 5;
  driverPercentOfNet: 90;
  platformPercentOfNet: 10;
};

export type GoodWheelsFareSplitPayload = Omit<GoodWheelsFareSplit, 'totalFareCents'>;

const PERCENTS = {
  adminPercent: 5 as const,
  driverPercentOfNet: 90 as const,
  platformPercentOfNet: 10 as const,
};

function empty(): GoodWheelsFareSplit {
  return {
    totalFareCents: 0,
    adminCostCents: 0,
    netFareCents: 0,
    driverPayoutCents: 0,
    platformShareCents: 0,
    ...PERCENTS,
  };
}

export function calculateGoodWheelsFareSplit(totalFareCents: number): GoodWheelsFareSplit {
  const raw = Number(totalFareCents);
  if (!Number.isFinite(raw) || raw <= 0) {
    return empty();
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

export function fareSplitToPayload(split: GoodWheelsFareSplit): GoodWheelsFareSplitPayload {
  const { totalFareCents: _t, ...rest } = split;
  return rest;
}
