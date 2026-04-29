import React from 'react';
import type { RideLifecycleStatus, RideRequest } from '../../../types/rideConnection';
import GoodWheelsTripRoom from '../../trip-room/components/GoodWheelsTripRoom';

const PassengerActiveTripView: React.FC<{
  ride: RideRequest;
  userId: string;
  userName: string;
  onUpdateStatus: (status: RideLifecycleStatus) => void;
}> = ({ ride, userId, userName, onUpdateStatus }) => (
  <GoodWheelsTripRoom ride={ride} role="passenger" userId={userId} userName={userName} onUpdateStatus={onUpdateStatus} />
);

export default PassengerActiveTripView;

