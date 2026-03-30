import type { Role, SupportCategoryId, TripStatus } from './tripTypes';
import type { TripActionId } from './tripActions';

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

export const TERMINAL_STATUSES = new Set<TripStatus>(['completed', 'canceled', 'escalated']);
export const ACTIVE_STATUSES = new Set<TripStatus>([
  'requested',
  'matched',
  'driver_assigned',
  'driver_arriving',
  'arrived',
  'in_progress',
  'support_in_progress',
  'escalated',
]);
export const CANCELABLE_STATUSES = new Set<TripStatus>(['requested', 'matched', 'driver_assigned', 'driver_arriving']);

export const SUPPORT_CATEGORY_LABEL: Partial<Record<SupportCategoryId, string>> = {
  medical_transport: 'Medical Transport',
  elder_help: 'Elder Help',
  school_ride: 'School / Education Ride',
  family_assistance: 'Family Assistance',
  shelter_support: 'Shelter / Housing Support',
  accessibility_support: 'Accessibility Support',
  community_errand: 'Community Errand',
  emergency_support: 'Emergency Support',
  child_family_safety: 'Child / Family Safety',
  lost_found_transport: 'Lost & Found Transport Help',
  volunteer_task: 'Volunteer Task',
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

/**
 * Single-source mapping for actions per role/status.
 * Components should not invent action availability.
 */
export const ROLE_ACTIONS_BY_STATUS: Record<Role, Partial<Record<TripStatus, TripActionId[]>>> = {
  passenger: {
    draft: [],
    requested: ['message', 'cancel'],
    matched: ['message', 'cancel'],
    driver_assigned: ['message', 'cancel'],
    driver_arriving: ['message', 'cancel'],
    arrived: ['message', 'confirm_handoff'],
    in_progress: ['message', 'escalate'],
    support_in_progress: ['message', 'escalate'],
    completed: ['message'],
    canceled: [],
    escalated: ['message', 'escalate'],
  },
  driver: {
    matched: ['mark_arrived'],
    driver_assigned: ['mark_arrived'],
    driver_arriving: ['mark_arrived'],
    arrived: ['start_trip'],
    in_progress: ['complete_trip'],
    support_in_progress: ['complete_trip'],
  },
  worker: {
    support_in_progress: ['handoff_worker'],
    escalated: ['escalate'],
  },
};

