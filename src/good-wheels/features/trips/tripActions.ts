import type { Trip, TripStatus } from './tripTypes';
import { ROLE_ACTIONS_BY_STATUS } from './tripConstants';

export type TripActionId =
  | 'cancel'
  | 'message'
  | 'call'
  | 'mark_arrived'
  | 'start_trip'
  | 'complete_trip'
  | 'escalate'
  | 'handoff_worker'
  | 'confirm_handoff';

export type TripAction = {
  id: TripActionId;
  label: string;
  tone: 'primary' | 'secondary' | 'danger';
  enabledWhen?: (trip: Trip) => boolean;
};

export const TRIP_ACTION_META: Record<TripActionId, Omit<TripAction, 'enabledWhen'>> = {
  cancel: { id: 'cancel', label: 'Cancel ride', tone: 'danger' },
  message: { id: 'message', label: 'Message', tone: 'secondary' },
  call: { id: 'call', label: 'Call', tone: 'secondary' },
  mark_arrived: { id: 'mark_arrived', label: 'Mark arrived', tone: 'primary' },
  start_trip: { id: 'start_trip', label: 'Start trip', tone: 'primary' },
  complete_trip: { id: 'complete_trip', label: 'Complete trip', tone: 'primary' },
  escalate: { id: 'escalate', label: 'Emergency support', tone: 'danger' },
  handoff_worker: { id: 'handoff_worker', label: 'Handoff / notes', tone: 'secondary' },
  confirm_handoff: { id: 'confirm_handoff', label: 'Confirm pickup', tone: 'primary' },
};

export function actionsForRoleAndStatus(role: import('./tripTypes').Role, status: TripStatus): TripAction[] {
  const ids = ROLE_ACTIONS_BY_STATUS[role]?.[status] ?? [];
  return ids.map((id) => TRIP_ACTION_META[id]).filter(Boolean) as TripAction[];
}

export function defaultPassengerActions(status: TripStatus): TripAction[] {
  const base: TripAction[] = [{ id: 'message', label: 'Message', tone: 'secondary' }];
  if (status === 'requested' || status === 'matched' || status === 'driver_assigned' || status === 'driver_arriving') {
    return [...base, { id: 'cancel', label: 'Cancel Ride', tone: 'danger' }];
  }
  if (status === 'arrived') return [...base, { id: 'confirm_handoff', label: 'Confirm pickup', tone: 'primary' }];
  if (status === 'in_progress' || status === 'support_in_progress' || status === 'escalated') {
    return [...base, { id: 'escalate', label: 'Emergency Support', tone: 'danger' }];
  }
  return base;
}

export function defaultDriverActions(status: TripStatus): TripAction[] {
  if (status === 'matched' || status === 'driver_assigned' || status === 'driver_arriving') {
    return [{ id: 'mark_arrived', label: 'Mark arrived', tone: 'primary' }];
  }
  if (status === 'arrived') return [{ id: 'start_trip', label: 'Start trip', tone: 'primary' }];
  if (status === 'in_progress' || status === 'support_in_progress') return [{ id: 'complete_trip', label: 'Complete trip', tone: 'primary' }];
  return [];
}

export function defaultWorkerActions(status: TripStatus): TripAction[] {
  if (status === 'support_in_progress') return [{ id: 'handoff_worker', label: 'Handoff / Notes', tone: 'secondary' }];
  if (status === 'escalated') return [{ id: 'escalate', label: 'Escalation tools', tone: 'danger' }];
  return [];
}

