import type { SafetyStatus, Trip, TripStatus } from './tripTypes';

export function formatTripStatus(status: TripStatus): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function safetyTone(safetyStatus: SafetyStatus | undefined): 'ok' | 'warn' | 'urgent' {
  if (!safetyStatus) return 'ok';
  if (safetyStatus === 'urgent') return 'urgent';
  if (safetyStatus === 'needs_attention') return 'warn';
  return 'ok';
}

export function tripPrimaryLine(trip: Trip): string {
  return `${trip.pickup.label} → ${trip.dropoff.label}`;
}

export function tripSecondaryLine(trip: Trip): string {
  const addr = `${trip.pickup.addressLine} → ${trip.dropoff.addressLine}`;
  return addr.length > 86 ? `${addr.slice(0, 83)}…` : addr;
}

export function isActiveTripStatus(status: TripStatus): boolean {
  return (
    status === 'requested' ||
    status === 'matched' ||
    status === 'driver_assigned' ||
    status === 'driver_arriving' ||
    status === 'arrived' ||
    status === 'in_progress' ||
    status === 'support_in_progress' ||
    status === 'escalated'
  );
}

