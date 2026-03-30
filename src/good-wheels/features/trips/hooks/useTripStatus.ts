import type { TripStatus } from '../tripTypes';
import { TRIP_STATUS_LABEL, TRIP_STATUS_PROGRESS } from '../tripConstants';

export function useTripStatus(status: TripStatus) {
  return {
    label: TRIP_STATUS_LABEL[status],
    progressPercent: TRIP_STATUS_PROGRESS[status],
  };
}

