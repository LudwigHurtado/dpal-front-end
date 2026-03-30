import type { Role, Trip } from '../tripTypes';
import { defaultDriverActions, defaultPassengerActions, defaultWorkerActions, type TripAction, type TripActionId } from '../tripActions';

export function useTripActions(role: Role, trip: Trip): { actions: TripAction[]; onAction: (id: TripActionId) => void } {
  const actions =
    role === 'driver'
      ? defaultDriverActions(trip.status)
      : role === 'worker'
        ? defaultWorkerActions(trip.status)
        : defaultPassengerActions(trip.status);

  const onAction = (_id: TripActionId) => {
    // Placeholder: wire to messaging/cancel/status transitions once role dashboards are built.
  };

  return { actions, onAction };
}

