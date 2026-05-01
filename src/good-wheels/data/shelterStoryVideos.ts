import type { Trip } from '../types/ride';

/** Local in-ride “shelter impact” playback. */
export const GOOD_WHEELS_OFFER_VIDEO_URL = '/good-wheels/passenger-offer-side.mp4';
const DEFAULT_SHELTER_VIDEO_URLS: string[] = [
  GOOD_WHEELS_OFFER_VIDEO_URL,
];

const SHELTER_STORY_STATUSES = new Set<string>([
  // Waiting/matching phases — the passenger should see the cause commercial
  // immediately after sending an offer, while drivers decide whether to accept.
  'requested',
  'broadcasted',
  'matched',
  // In-ride phases
  'accepted',
  'driver_en_route',
  'driver_arrived',
  'passenger_onboard',
  'driver_assigned',
  'driver_arriving',
  'arrived',
  'in_progress',
  'support_in_progress',
]);

export function isShelterStoryStatus(status: string): boolean {
  return SHELTER_STORY_STATUSES.has(status);
}

export function getShelterStoryPayload(trip: Trip): { title: string; subtitle?: string; urls: string[] } {
  const name = trip.attachedCause?.name?.trim();
  return {
    title: name ? name : 'Community impact',
    subtitle: trip.attachedCause
      ? [trip.attachedCause.category, trip.attachedCause.city].filter(Boolean).join(' · ') || undefined
      : 'Your ride helps local shelters and partners.',
    urls: DEFAULT_SHELTER_VIDEO_URLS,
  };
}
