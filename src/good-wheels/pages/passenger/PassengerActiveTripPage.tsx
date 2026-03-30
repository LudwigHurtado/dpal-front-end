import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GW_PATHS } from '../../routes/paths';
import TripMapPanel from '../../features/trips/components/TripMapPanel';
import PassengerTripBottomSheet from '../../features/trips/components/PassengerTripBottomSheet';
import { useTripStore } from '../../features/trips/tripStore';
import { usePassengerTripUi } from '../../features/trips/hooks/usePassengerTripUi';
import { useTripActions } from '../../features/trips/hooks/useTripActions';

const PassengerActiveTripPage: React.FC = () => {
  const navigate = useNavigate();
  const activeTrip = useTripStore((s) => s.activeTrip);
  const lastTerminalTrip = useTripStore((s) => s.lastTerminalTrip);
  const clearLastTerminalTrip = useTripStore((s) => s.clearLastTerminalTrip);

  const tripForUi = activeTrip ?? lastTerminalTrip;
  const { uiState, sheetMode } = usePassengerTripUi(tripForUi);
  const actions = useTripActions('passenger', tripForUi ?? ({} as any));

  const onCancel = () => {
    // Uses shared trip action; store will move to terminal and capture receipt.
    if (!tripForUi) return;
    actions.cancelTrip();
  };

  const onDone = () => {
    clearLastTerminalTrip();
    navigate(GW_PATHS.passenger.dashboard);
  };

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 64px)' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        {tripForUi ? (
          <TripMapPanel trip={tripForUi} variant="passenger" />
        ) : (
          <div className="gw-map-placeholder">Loading…</div>
        )}
      </div>

      <PassengerTripBottomSheet
        uiState={uiState}
        sheetMode={sheetMode}
        trip={tripForUi}
        onSearchRide={() => navigate(GW_PATHS.passenger.request)}
        onCancel={onCancel}
        onContactDriver={() => actions.appendTimelineEvent('Contact requested', 'Contact tools will be wired soon.')}
        onDonate={() => actions.appendTimelineEvent('Donate opened', 'Donation panel will be wired next.')}
        onDone={onDone}
      />
    </div>
  );
};

export default PassengerActiveTripPage;

