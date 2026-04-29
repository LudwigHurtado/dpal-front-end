import type { Role, SupportCategoryId, TripStatus } from './tripTypes';
import type { TripActionId } from './tripActions';

export const TRIP_STATUS_ORDER: TripStatus[] = [
  'draft',
  'requested',
  'broadcasted',
  'matched',
  'accepted',
  'driver_en_route',
  'driver_arrived',
  'passenger_onboard',
  'driver_assigned',
  'driver_arriving',
  'arrived',
  'in_progress',
  'support_in_progress',
  'completed',
  'cancelled',
  'canceled',
  'escalated',
];

export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  draft: 'Draft',
  requested: 'Requested',
  broadcasted: 'Broadcasted',
  matched: 'Matched',
  accepted: 'Accepted',
  driver_en_route: 'Driver En Route',
  driver_arrived: 'Driver Arrived',
  passenger_onboard: 'Passenger Onboard',
  driver_assigned: 'Driver Assigned',
  driver_arriving: 'Driver Arriving',
  arrived: 'Arrived',
  in_progress: 'In Progress',
  support_in_progress: 'Support In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  canceled: 'Canceled',
  escalated: 'Escalated',
};

export const TERMINAL_STATUSES = new Set<TripStatus>(['completed', 'cancelled', 'canceled', 'escalated']);
export const ACTIVE_STATUSES = new Set<TripStatus>([
  'requested',
  'broadcasted',
  'matched',
  'accepted',
  'driver_en_route',
  'driver_arrived',
  'passenger_onboard',
  'driver_assigned',
  'driver_arriving',
  'arrived',
  'in_progress',
  'support_in_progress',
  'escalated',
]);
export const CANCELABLE_STATUSES = new Set<TripStatus>([
  'requested',
  'broadcasted',
  'matched',
  'accepted',
  'driver_en_route',
  'driver_arrived',
  'passenger_onboard',
  'driver_assigned',
  'driver_arriving',
]);

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
  broadcasted: 'warning',
  matched: 'info',
  accepted: 'info',
  driver_en_route: 'info',
  driver_arrived: 'success',
  passenger_onboard: 'success',
  driver_assigned: 'info',
  driver_arriving: 'info',
  arrived: 'success',
  in_progress: 'success',
  support_in_progress: 'info',
  completed: 'success',
  cancelled: 'danger',
  canceled: 'danger',
  escalated: 'danger',
};

/** Rough progress for UI. Completed/canceled/escalated always hit 100%. */
export const TRIP_STATUS_PROGRESS: Record<TripStatus, number> = {
  draft: 10,
  requested: 20,
  broadcasted: 30,
  matched: 35,
  accepted: 45,
  driver_en_route: 55,
  driver_arrived: 65,
  passenger_onboard: 72,
  driver_assigned: 45,
  driver_arriving: 55,
  arrived: 65,
  in_progress: 80,
  support_in_progress: 85,
  completed: 100,
  cancelled: 100,
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
    broadcasted: ['message', 'cancel'],
    matched: ['message', 'cancel'],
    accepted: ['message', 'cancel'],
    driver_en_route: ['message', 'cancel'],
    driver_arrived: ['message', 'confirm_handoff'],
    passenger_onboard: ['message', 'escalate'],
    driver_assigned: ['message', 'cancel'],
    driver_arriving: ['message', 'cancel'],
    arrived: ['message', 'confirm_handoff'],
    in_progress: ['message', 'escalate'],
    support_in_progress: ['message', 'escalate'],
    completed: ['message'],
    cancelled: [],
    canceled: [],
    escalated: ['message', 'escalate'],
  },
  driver: {
    matched: ['mark_arrived'],
    accepted: ['mark_arrived'],
    driver_en_route: ['mark_arrived'],
    driver_arrived: ['start_trip'],
    passenger_onboard: ['start_trip'],
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

