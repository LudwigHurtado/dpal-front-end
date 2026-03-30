import type { DonationRecord, RewardLedgerEntry } from '../charity/types';

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createRideReward(userId: string, tripId: string): RewardLedgerEntry {
  return {
    id: newId('reward'),
    userId,
    tripId,
    points: 2,
    type: 'ride_completed',
    createdAt: new Date().toISOString(),
    note: 'Completed a Good Wheels ride.',
  };
}

export function createDonationReward(userId: string, tripId: string, donation: DonationRecord): RewardLedgerEntry {
  return {
    id: newId('reward'),
    userId,
    tripId,
    donationId: donation.id,
    points: 5,
    type: 'donation_made',
    createdAt: new Date().toISOString(),
    note: `Supported charity ${donation.charityName ?? donation.charityId}.`,
  };
}

export function createCharitySupportBonus(userId: string, tripId: string): RewardLedgerEntry {
  return {
    id: newId('reward'),
    userId,
    tripId,
    points: 3,
    type: 'charity_supported',
    createdAt: new Date().toISOString(),
    note: 'Bonus for community support.',
  };
}

export async function persistRewards(entries: RewardLedgerEntry[]): Promise<RewardLedgerEntry[]> {
  const key = 'good-wheels-rewards';
  const current: RewardLedgerEntry[] = JSON.parse(localStorage.getItem(key) ?? '[]');
  current.push(...entries);
  localStorage.setItem(key, JSON.stringify(current));
  return Promise.resolve(entries);
}

