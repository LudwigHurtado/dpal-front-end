import type { Role, SafetyStatus, Trip, TripStatus } from '../tripTypes';
import { actionsForRoleAndStatus, type TripAction, type TripActionId } from '../tripActions';
import { useTripStore } from '../tripStore';
import { goodWheelsRideApi } from '../../../services/adapters/goodWheelsApi';

function nowIso(): string {
  return new Date().toISOString();
}

export function useTripActions(role: Role, trip: Trip) {
  const updateStatus = useTripStore((s) => s.updateStatus);
  const appendTimeline = useTripStore((s) => s.appendTimelineEvent);
  const updateSafetyState = useTripStore((s) => s.updateSafetyState);

  const actions: TripAction[] = actionsForRoleAndStatus(role, trip.status);

  const requestTrip = useTripStore((s) => s.requestRide);

  const requireTripId = () => {
    if (!trip?.id) throw new Error('Trip ID is required for this action.');
    return trip.id;
  };

  const setTripFromServer = (next: Trip) => {
    useTripStore.getState().setActiveTrip(next);
    if (next.status === 'completed' || next.status === 'cancelled') {
      useTripStore.getState().updateStatus(next.status as TripStatus);
    }
  };

  const assignDriver = async () => {
    const next = await goodWheelsRideApi.updateTripStatus(requireTripId(), 'accepted', 'Driver assigned');
    setTripFromServer(next);
  };
  const markDriverArriving = async () => {
    const next = await goodWheelsRideApi.updateTripStatus(requireTripId(), 'driver_en_route', 'Driver en route');
    setTripFromServer(next);
  };
  const markDriverArrived = async () => {
    const next = await goodWheelsRideApi.updateTripStatus(requireTripId(), 'driver_arrived', 'Driver arrived');
    setTripFromServer(next);
  };
  const startTrip = async () => {
    const next = await goodWheelsRideApi.updateTripStatus(requireTripId(), 'in_progress', 'Trip started');
    setTripFromServer(next);
  };
  const completeTrip = async () => {
    const next = await goodWheelsRideApi.completeTrip(requireTripId(), 'Trip completed by driver');
    useTripStore.getState().setActiveTrip(next);
    useTripStore.getState().updateStatus('completed', 'Trip completed');
  };
  const cancelTrip = async () => {
    const actorRole = role === 'driver' ? 'driver' : role === 'passenger' ? 'passenger' : undefined;
    const actorUserId = actorRole === 'driver' ? trip.driverId : actorRole === 'passenger' ? trip.passengerId : undefined;
    const next = await goodWheelsRideApi.cancelTrip(requireTripId(), 'Cancelled by user', {
      role: actorRole,
      userId: actorUserId,
    });
    useTripStore.getState().setActiveTrip(next);
    useTripStore.getState().updateStatus('cancelled', 'Trip cancelled');
  };
  const escalateTrip = async () => {
    const next = await goodWheelsRideApi.updateTripStatus(requireTripId(), 'escalated', 'Escalated');
    setTripFromServer(next);
  };
  const attachWorker = async () => {
    const next = await goodWheelsRideApi.updateTripStatus(requireTripId(), 'support_in_progress', 'Support attached');
    setTripFromServer(next);
  };

  const onAction = async (id: TripActionId) => {
    if (id === 'mark_arrived') await markDriverArrived();
    else if (id === 'start_trip') await startTrip();
    else if (id === 'complete_trip') await completeTrip();
    else if (id === 'cancel') await cancelTrip();
    else if (id === 'escalate') await escalateTrip();
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
    appendTimelineEvent: appendTimeline,
    updateSafetyState: (safety: SafetyStatus, detail?: string) => updateSafetyState(safety, detail),
    // small helper for callers that need a timestamp
    nowIso,
  };
}

