import type { DriverAvailabilityStatus, DriverQueueFilterId, DriverQueueItem } from './driverTypes';

export function selectCanChangeAvailability(availability: DriverAvailabilityStatus): boolean {
  return availability !== 'busy';
}

export function filterQueue(items: DriverQueueItem[], filterId: DriverQueueFilterId): DriverQueueItem[] {
  if (filterId === 'all') return items;
  if (filterId === 'standard') return items.filter((t) => !t.supportCategoryId);
  if (filterId === 'support') return items.filter((t) => Boolean(t.supportCategoryId));
  if (filterId === 'medical') return items.filter((t) => t.supportCategoryId === 'medical_transport');
  if (filterId === 'school') return items.filter((t) => t.supportCategoryId === 'school_ride');
  if (filterId === 'family') return items.filter((t) => t.supportCategoryId === 'child_family_safety');
  if (filterId === 'emergency') return items.filter((t) => t.supportCategoryId === 'emergency_support');
  if (filterId === 'nearby') return items; // placeholder until map distance exists
  return items;
}

