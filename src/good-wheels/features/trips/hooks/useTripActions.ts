import type { Role, Trip, TripStatus } from '../tripTypes';
import { actionsForRoleAndStatus, type TripAction, type TripActionId } from '../tripActions';
import { useTripStore } from '../tripStore';

function nowIso(): string {
  return new Date().toISOString();
}

export function useTripActions(role: Role, trip: Trip) {
  const updateStatus = useTripStore((s) => s.updateStatus);
  const appendTimeline = useTripStore((s) => s.appendTimelineEvent);

  const actions: TripAction[] = actionsForRoleAndStatus(role, trip.status);

  const requestTrip = useTripStore((s) => s.requestRide);

  const assignDriver = () => updateStatus('driver_assigned', 'Driver assigned');
  const markDriverArriving = () => updateStatus('driver_arriving', 'Driver arriving');
  const markDriverArrived = () => updateStatus('arrived', 'Driver arrived');
  const startTrip = () => updateStatus('in_progress', 'Trip started');
  const completeTrip = () => updateStatus('completed', 'Trip completed');
  const cancelTrip = () => updateStatus('canceled', 'Trip canceled');
  const escalateTrip = () => updateStatus('escalated', 'Escalated');
  const attachWorker = () => updateStatus('support_in_progress', 'Support attached');

  const onAction = (id: TripActionId) => {
    if (id === 'mark_arrived') markDriverArrived();
    else if (id === 'start_trip') startTrip();
    else if (id === 'complete_trip') completeTrip();
    else if (id === 'cancel') cancelTrip();
    else if (id === 'escalate') escalateTrip();
    else if (id === 'handoff_worker') appendTimeline('Worker handoff noted', 'Notes captured for support continuity.');
    else if (id === 'confirm_handoff') appendTimeline('Pickup confirmed', 'Passenger confirmed safe pickup.');
    else if (id === 'message') appendTimeline('Message sent', 'Messaging will be wired soon.');
  };

  return {
    actions,
    onAction,
    requestTrip,
    assignDriver,
    markDriverArriving,
    markDriverArrived,
    startTrip,
    completeTrip,
    cancelTrip,
    escalateTrip,
    attachWorker,
    // small helper for callers that need a timestamp
    nowIso,
  };
}

