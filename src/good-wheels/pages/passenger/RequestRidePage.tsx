import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PassengerRideRequestPanel from '../../features/passenger/components/PassengerRideRequestPanel';
import PassengerMatchingPanel from '../../features/passenger/components/PassengerMatchingPanel';
import PassengerActiveTripView from '../../features/passenger/components/PassengerActiveTripView';
import { useRideStore } from '../../store/useRideStore';
import { useAuthStore } from '../../store/useAuthStore';
import { GW_PATHS } from '../../routes/paths';

const RequestRidePage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const draft = useRideStore((s) => s.draft);
  const setDraft = useRideStore((s) => s.setDraft);
  const requestRide = useRideStore((s) => s.requestRide);
  const loadForUser = useRideStore((s) => s.loadForUser);
  const activeRide = useRideStore((s) => s.activeRide);
  const loading = useRideStore((s) => s.loading);
  const error = useRideStore((s) => s.error);
  const updateStatus = useRideStore((s) => s.updateStatus);

  useEffect(() => {
    if (!user?.id) return;
    void loadForUser(user.id);
    const timer = window.setInterval(() => void loadForUser(user.id), 3000);
    return () => window.clearInterval(timer);
  }, [loadForUser, user?.id]);

  const onRequestRide = async () => {
    if (!user?.id) return;
    const ride = await requestRide({
      passengerId: user.id,
      passengerName: user.fullName || 'Passenger',
    });
    if (ride) navigate(GW_PATHS.passenger.active);
  };

  return (
    <div className="space-y-6">
      {!activeRide ? (
        <>
          <div className="gw-grid-2">
            <PassengerRideRequestPanel draft={draft} onChange={setDraft} onSubmit={() => void onRequestRide()} loading={loading} />
            <div className="gw-card p-5">
              <div className="gw-card-title">Map preview</div>
              <div className="gw-map-placeholder mt-2">Pickup and destination map will appear in active trip room.</div>
            </div>
          </div>
          <PassengerMatchingPanel ride={activeRide} />
          {error && <div className="gw-error">{error}</div>}
        </>
      ) : (
        <PassengerActiveTripView
          ride={activeRide}
          userId={user?.id ?? activeRide.passengerId}
          userName={user?.fullName ?? activeRide.passengerName}
          onUpdateStatus={(status) => void updateStatus(activeRide.id, status, user?.id ?? activeRide.passengerId)}
        />
      )}
      <div className="text-xs text-slate-500">Trips may be prepared as Mission Assignment V2-compatible payloads through adapter integration.</div>
      <div className="text-xs text-slate-500">For emergencies, contact local emergency authorities immediately.</div>
    </div>
  );
};

export default RequestRidePage;

