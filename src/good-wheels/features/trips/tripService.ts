import { GOOD_WHEELS_DEMO_MODE } from '../../app/appConfig';
import { mockRideApi } from '../../services/adapters/mockAdapters';
import type { RideRequestDraft, Trip } from './tripTypes';
import { mapMockTripToTrip } from './tripMockMapper';
import type { Charity, DonationConfig, DonationRecord } from '../charity/types';
import { calculateDonationAmount } from '../charity/utils';
import { createCharitySupportBonus, createDonationReward, createRideReward, persistRewards } from '../rewards/rewardService';

/**
 * Service boundary for trips.
 * For now it uses the mock adapter; later swap to an API adapter with same signatures.
 */
export const tripService = {
  async getActiveTrip(userId: string): Promise<Trip | null> {
    const api = GOOD_WHEELS_DEMO_MODE ? mockRideApi : mockRideApi;
    const raw = await api.getActiveTrip(userId);
    return raw ? mapMockTripToTrip(raw) : null;
  },
  async listHistory(userId: string): Promise<Trip[]> {
    const api = GOOD_WHEELS_DEMO_MODE ? mockRideApi : mockRideApi;
    const raw = await api.listHistory(userId);
    return raw.map((t) => mapMockTripToTrip(t));
  },
  async requestTrip(draft: RideRequestDraft): Promise<Trip> {
    const api = GOOD_WHEELS_DEMO_MODE ? mockRideApi : mockRideApi;
    const raw = await api.requestRide(draft);
    return mapMockTripToTrip(raw);
  },
  /**
   * Donation + rewards side effects for a completed trip (client demo persistence).
   * Keeps lifecycle in tripStore; this is an integration boundary.
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
      donation = {
        id: mkId('donation'),
        tripId: input.trip.id,
        userId: input.userId,
        charityId: input.charity.id,
        charityName: input.charity.name,
        amountUsd: donationAmountUsd,
        type: input.donationConfig.type,
        createdAt: new Date().toISOString(),
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

