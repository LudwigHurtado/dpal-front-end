/** USD fare breakdown for passenger-facing copy (matches cent-based policy in `features/trips/utils/fareSplit.ts`). */

export type GoodWheelsFareSplitUsd = {
  totalFare: number;
  platformFee: number;
  remainingAfterFee: number;
  driverAmount: number;
  charityAmount: number;
};

export function calculateGoodWheelsFareSplit(totalFare: number): GoodWheelsFareSplitUsd {
  const raw = Number(totalFare);
  if (!Number.isFinite(raw) || raw <= 0) {
    return {
      totalFare: 0,
      platformFee: 0,
      remainingAfterFee: 0,
      driverAmount: 0,
      charityAmount: 0,
    };
  }
  const totalFareRounded = Number(raw.toFixed(2));
  const platformFee = Number((totalFareRounded * 0.05).toFixed(2));
  const remainingAfterFee = Number((totalFareRounded - platformFee).toFixed(2));
  const driverAmount = Number((remainingAfterFee * 0.9).toFixed(2));
  const charityAmount = Number((remainingAfterFee - driverAmount).toFixed(2));
  return {
    totalFare: totalFareRounded,
    platformFee,
    remainingAfterFee,
    driverAmount,
    charityAmount,
  };
}

export function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}
