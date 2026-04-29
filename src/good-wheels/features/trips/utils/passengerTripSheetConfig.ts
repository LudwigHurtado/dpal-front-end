import type { TripStatus } from '../tripTypes';

export type PassengerTripUiState =
  | 'idle'
  | 'searching'
  | 'driver_found'
  | 'driver_arriving'
  | 'on_trip'
  | 'completed'
  | 'cancelled';

export type PassengerSheetMode = 'collapsed' | 'mid' | 'expanded';

export function mapTripStatusToPassengerUi(status: TripStatus | null | undefined): PassengerTripUiState {
  if (!status) return 'idle';
  if (status === 'draft') return 'idle';
  if (status === 'requested' || status === 'broadcasted' || status === 'matched') return 'searching';
  if (status === 'accepted' || status === 'driver_assigned') return 'driver_found';
  if (status === 'driver_en_route' || status === 'driver_arriving') return 'driver_arriving';
  if (
    status === 'driver_arrived' ||
    status === 'passenger_onboard' ||
    status === 'arrived' ||
    status === 'in_progress' ||
    status === 'support_in_progress'
  ) return 'on_trip';
  if (status === 'completed') return 'completed';
  if (status === 'cancelled' || status === 'canceled') return 'cancelled';
  // escalated: treat as on_trip (shows support CTA); can split later
  return 'on_trip';
}

export function sheetModeForPassengerUi(ui: PassengerTripUiState): PassengerSheetMode {
  if (ui === 'completed') return 'expanded';
  if (ui === 'on_trip') return 'mid';
  if (ui === 'idle') return 'mid';
  return 'mid';
}

