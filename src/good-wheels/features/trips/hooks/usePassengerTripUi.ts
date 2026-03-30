import { useMemo } from 'react';
import type { Trip } from '../tripTypes';
import { mapTripStatusToPassengerUi, sheetModeForPassengerUi } from '../utils/passengerTripSheetConfig';

export function usePassengerTripUi(trip: Trip | null | undefined) {
  const uiState = useMemo(() => mapTripStatusToPassengerUi(trip?.status), [trip?.status]);
  const sheetMode = useMemo(() => sheetModeForPassengerUi(uiState), [uiState]);
  const isActiveTrip = uiState === 'driver_found' || uiState === 'driver_arriving' || uiState === 'on_trip';

  return {
    uiState,
    sheetMode,
    isActiveTrip,
  };
}

