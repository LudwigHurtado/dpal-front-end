import React from 'react';
import type { Trip } from '../tripTypes';
import type { PassengerTripUiState, PassengerSheetMode } from '../utils/passengerTripSheetConfig';
import PassengerRideSearchSheet from './PassengerRideSearchSheet';
import PassengerSearchingSheet from './PassengerSearchingSheet';
import PassengerDriverFoundSheet from './PassengerDriverFoundSheet';
import PassengerDriverArrivingSheet from './PassengerDriverArrivingSheet';
import PassengerOnTripSheet from './PassengerOnTripSheet';
import PassengerTripCompletedSheet from './PassengerTripCompletedSheet';
import PassengerTripCancelledSheet from './PassengerTripCancelledSheet';

type Props = {
  uiState: PassengerTripUiState;
  sheetMode: PassengerSheetMode;
  trip?: Trip | null;
  onSearchRide?: () => void;
  onCancel?: () => void;
  onContactDriver?: () => void;
  onDonate?: () => void;
  onDone?: () => void;
};

export default function PassengerTripBottomSheet(props: Props) {
  const { uiState, sheetMode } = props;
  const cls = `gw-sheet gw-sheet--${sheetMode}`;

  switch (uiState) {
    case 'searching':
      return (
        <div className={cls}>
          <PassengerSearchingSheet {...props} />
        </div>
      );
    case 'driver_found':
      return (
        <div className={cls}>
          <PassengerDriverFoundSheet {...props} />
        </div>
      );
    case 'driver_arriving':
      return (
        <div className={cls}>
          <PassengerDriverArrivingSheet {...props} />
        </div>
      );
    case 'on_trip':
      return (
        <div className={cls}>
          <PassengerOnTripSheet {...props} />
        </div>
      );
    case 'completed':
      return (
        <div className={cls}>
          <PassengerTripCompletedSheet {...props} />
        </div>
      );
    case 'cancelled':
      return (
        <div className={cls}>
          <PassengerTripCancelledSheet {...props} />
        </div>
      );
    case 'idle':
    default:
      return (
        <div className={cls}>
          <PassengerRideSearchSheet {...props} />
        </div>
      );
  }
}

