import type { Trip } from '../types/ride';

/** Local first, with remote fallback for in-ride “shelter impact” playback. */
export const GOOD_WHEELS_OFFER_VIDEO_URL = '/good-wheels/passenger-offer-side.mp4';
const DEFAULT_SHELTER_VIDEO_URLS: string[] = [
  GOOD_WHEELS_OFFER_VIDEO_URL,
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
];

const SHELTER_STORY_STATUSES = new Set<string>([
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
