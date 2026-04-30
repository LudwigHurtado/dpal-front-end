import type { RideRequestDraft, Trip } from './tripTypes';
import { goodWheelsRideApi } from '../../services/adapters/goodWheelsApi';
import type { Charity, DonationConfig, DonationFundingSource, DonationRecord } from '../charity/types';
import { calculateDonationAmount } from '../charity/utils';
import { createCharitySupportBonus, createDonationReward, createRideReward, persistRewards } from '../rewards/rewardService';

/**
 * Service boundary for trips.
 * For now it uses the mock adapter; later swap to an API adapter with same signatures.
 */
export const tripService = {
  async getActiveTrip(userId: string): Promise<Trip | null> {
    return goodWheelsRideApi.getActiveTrip(userId);
  },
  async listHistory(userId: string): Promise<Trip[]> {
    return goodWheelsRideApi.listHistory(userId);
  },
  async requestTrip(draft: RideRequestDraft): Promise<Trip> {
    return goodWheelsRideApi.requestRide(draft);
  },
  /**
   * Donation + rewards side effects for a completed trip (client demo persistence).
   * Keeps lifecycle in tripStore; this is an integration boundary.
   *
   * `fareUsd` must be the **listed total ride fare** (passenger gross), same basis as fare split.
   * Donations here are **passenger add-ons**: they do not change `trip.estimate.fareSplit.driverPayoutCents`.
   * (A future `platform_share` funding mode would need explicit handling and disclosure.)
   */
  async finalizeCompletedTrip(input: {
    trip: Trip;
    userId: string;
    fareUsd: number;
    charity: Charity | null;
    donationConfig: DonationConfig;
  }): Promise<{ donation: DonationRecord | null; rewardPoints: number }> {
    const donationAmountUsd =
      input.charity && input.donationConfig.type !== 'none'
        ? calculateDonationAmount(input.fareUsd, input.donationConfig)
        : 0;

    const donationsKey = 'good-wheels-donations';
    const mkId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

    let donation: DonationRecord | null = null;
    if (input.charity && donationAmountUsd > 0) {
      const fundingSource: DonationFundingSource = 'passenger_addon';
      donation = {
        id: mkId('donation'),
        tripId: input.trip.id,
        userId: input.userId,
        charityId: input.charity.id,
        charityName: input.charity.name,
        amountUsd: donationAmountUsd,
        type: input.donationConfig.type,
        createdAt: new Date().toISOString(),
        fundingSource,
      };
      const current: DonationRecord[] = JSON.parse(localStorage.getItem(donationsKey) ?? '[]');
      current.unshift(donation);
      localStorage.setItem(donationsKey, JSON.stringify(current));
    }

    const rewards = [createRideReward(input.userId, input.trip.id)];
    if (donation) {
      rewards.push(createDonationReward(input.userId, input.trip.id, donation));
      rewards.push(createCharitySupportBonus(input.userId, input.trip.id));
    }
    await persistRewards(rewards);
    const total = rewards.reduce((sum, r) => sum + r.points, 0);
    return { donation, rewardPoints: total };
  },
};

