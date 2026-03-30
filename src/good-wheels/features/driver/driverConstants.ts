import type { DriverAvailabilityStatus, DriverQueueFilterSpec } from './driverTypes';

export const DRIVER_AVAILABILITY: DriverAvailabilityStatus[] = ['offline', 'online', 'paused', 'busy'];

export const DRIVER_QUEUE_FILTERS: DriverQueueFilterSpec[] = [
  { id: 'all', label: 'All' },
  { id: 'standard', label: 'Standard rides', mode: 'standard' },
  { id: 'support', label: 'Support rides', mode: 'support' },
  { id: 'nearby', label: 'Nearby' },
  { id: 'medical', label: 'Medical', supportCategoryId: 'medical_transport', mode: 'support' },
  { id: 'school', label: 'School', supportCategoryId: 'school_ride', mode: 'support' },
  { id: 'family', label: 'Family', supportCategoryId: 'child_family_safety', mode: 'support' },
  { id: 'emergency', label: 'Emergency', supportCategoryId: 'emergency_support', mode: 'support' },
];

export const DEFAULT_DRIVER_FILTER_ID: DriverQueueFilterSpec['id'] = 'all';

