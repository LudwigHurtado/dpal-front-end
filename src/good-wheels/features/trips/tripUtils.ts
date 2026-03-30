import type { SafetyStatus, Trip, TripStatus } from './tripTypes';
import { ACTIVE_STATUSES, CANCELABLE_STATUSES, TERMINAL_STATUSES, TRIP_STATUS_LABEL, TRIP_STATUS_ORDER, TRIP_STATUS_PROGRESS, TRIP_BADGE_TONE, type TripBadgeTone } from './tripConstants';

export function formatTripStatusLabel(status: TripStatus): string {
  return TRIP_STATUS_LABEL[status] ?? status;
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
  return ACTIVE_STATUSES.has(status);
}

export function isTerminalTripStatus(status: TripStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function canPassengerCancel(status: TripStatus): boolean {
  return CANCELABLE_STATUSES.has(status);
}

export function getTripProgressPercent(status: TripStatus): number {
  return TRIP_STATUS_PROGRESS[status] ?? 0;
}

export function badgeTone(status: TripStatus): TripBadgeTone {
  return TRIP_BADGE_TONE[status] ?? 'neutral';
}

export function getNextTripStep(status: TripStatus): string | null {
  if (isTerminalTripStatus(status)) return null;
  const idx = TRIP_STATUS_ORDER.indexOf(status);
  if (idx < 0) return null;
  const next = TRIP_STATUS_ORDER[idx + 1];
  return next ? formatTripStatusLabel(next) : null;
}

