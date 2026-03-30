import type { Trip } from '../../trips/tripTypes';
import { useTripActions } from '../../trips/hooks/useTripActions';

export function useDriverTripControls(trip: Trip) {
  const a = useTripActions('driver', trip);

  return {
    markArriving: a.markDriverArriving,
    markArrived: a.markDriverArrived,
    startTrip: a.startTrip,
    completeTrip: a.completeTrip,
    reportIssue: () => a.appendTimelineEvent('Issue reported', 'Support tools will be wired soon.'),
    contactSupport: () => a.appendTimelineEvent('Support contacted', 'Support messaging will be wired soon.'),
  };
}

