import type { TripStatus } from '../tripTypes';
import { TRIP_BADGE_TONE } from '../tripConstants';
import { canPassengerCancel, getNextTripStep, getTripProgressPercent, isActiveTripStatus, isTerminalTripStatus, formatTripStatusLabel } from '../tripUtils';

export function useTripStatus(status: TripStatus) {
  return {
    label: formatTripStatusLabel(status),
    isActive: isActiveTripStatus(status),
    isTerminal: isTerminalTripStatus(status),
    progressPercent: getTripProgressPercent(status),
    nextStep: getNextTripStep(status),
    badgeVariant: TRIP_BADGE_TONE[status],
    canCancel: canPassengerCancel(status),
    // Driver/worker flags are conservative defaults; refined per role in useTripActions.
    canStart: status === 'arrived',
    canComplete: status === 'in_progress' || status === 'support_in_progress',
  };
}

