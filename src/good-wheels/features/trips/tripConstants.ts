import type { TripStatus } from './tripTypes';

export const TRIP_STATUS_ORDER: TripStatus[] = [
  'draft',
  'requested',
  'matched',
  'driver_assigned',
  'driver_arriving',
  'arrived',
  'in_progress',
  'support_in_progress',
  'completed',
  'canceled',
  'escalated',
];

export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  draft: 'Draft',
  requested: 'Requested',
  matched: 'Matched',
  driver_assigned: 'Driver Assigned',
  driver_arriving: 'Driver Arriving',
  arrived: 'Arrived',
  in_progress: 'In Progress',
  support_in_progress: 'Support In Progress',
  completed: 'Completed',
  canceled: 'Canceled',
  escalated: 'Escalated',
};

export type TripBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export const TRIP_BADGE_TONE: Record<TripStatus, TripBadgeTone> = {
  draft: 'neutral',
  requested: 'warning',
  matched: 'info',
  driver_assigned: 'info',
  driver_arriving: 'info',
  arrived: 'success',
  in_progress: 'success',
  support_in_progress: 'info',
  completed: 'success',
  canceled: 'danger',
  escalated: 'danger',
};

/** Rough progress for UI. Completed/canceled/escalated always hit 100%. */
export const TRIP_STATUS_PROGRESS: Record<TripStatus, number> = {
  draft: 10,
  requested: 20,
  matched: 35,
  driver_assigned: 45,
  driver_arriving: 55,
  arrived: 65,
  in_progress: 80,
  support_in_progress: 85,
  completed: 100,
  canceled: 100,
  escalated: 100,
};

