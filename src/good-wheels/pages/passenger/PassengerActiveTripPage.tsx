import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GW_PATHS } from '../../routes/paths';
import TripMapPanel from '../../features/trips/components/TripMapPanel';
import PassengerTripBottomSheet from '../../features/trips/components/PassengerTripBottomSheet';
import { useTripStore } from '../../features/trips/tripStore';
import { usePassengerTripUi } from '../../features/trips/hooks/usePassengerTripUi';
import { useTripActions } from '../../features/trips/hooks/useTripActions';
import { tripService } from '../../features/trips/tripService';
import type { DonationConfig } from '../../features/charity/types';

const PassengerActiveTripPage: React.FC = () => {
  const navigate = useNavigate();
  const activeTrip = useTripStore((s) => s.activeTrip);
  const lastTerminalTrip = useTripStore((s) => s.lastTerminalTrip);
  const clearLastTerminalTrip = useTripStore((s) => s.clearLastTerminalTrip);
  const patchLastTerminalTrip = useTripStore((s) => s.patchLastTerminalTrip);
  const patchHistoryTrip = useTripStore((s) => s.patchHistoryTrip);

  const tripForUi = activeTrip ?? lastTerminalTrip;
  const { uiState, sheetMode } = usePassengerTripUi(tripForUi);
  const actions = useTripActions('passenger', tripForUi ?? ({} as any));

  const canFinalize = useMemo(() => {
    return Boolean(
      tripForUi &&
        tripForUi.status === 'completed' &&
        typeof tripForUi.dpalRewardPoints !== 'number'
    );
  }, [tripForUi]);

  useEffect(() => {
    if (!canFinalize || !tripForUi) return;
    let mounted = true;
    (async () => {
      const rawDonation = tripForUi.donationConfig;
      const donationConfig: DonationConfig =
        rawDonation?.type === 'fixed'
          ? { type: 'fixed', value: Number(rawDonation.value ?? 0) }
          : rawDonation?.type === 'percentage'
            ? { type: 'percentage', value: Number(rawDonation.value ?? 0) }
            : rawDonation?.type === 'round_up'
              ? { type: 'round_up', value: 0 }
              : { type: 'none', value: 0 };
      const charity =
        tripForUi.charityId && tripForUi.charityName
          ? { id: tripForUi.charityId, name: tripForUi.charityName, category: 'community' }
          : null;
      const { donation, rewardPoints } = await tripService.finalizeCompletedTrip({
        trip: tripForUi,
        userId: tripForUi.passengerId,
        fareUsd: tripForUi.fareUsd ?? 18.5,
        charity,
        donationConfig,
      });
      if (!mounted) return;
      const patch = {
        donationAmountUsd: donation?.amountUsd ?? 0,
        dpalRewardPoints: rewardPoints,
        charityId: charity?.id ?? tripForUi.charityId ?? null,
        charityName: charity?.name ?? tripForUi.charityName ?? null,
      };
      patchLastTerminalTrip(patch);
      patchHistoryTrip(tripForUi.id, patch);
    })().catch(() => {});
    return () => {
      mounted = false;
    };
  }, [canFinalize, tripForUi, patchLastTerminalTrip, patchHistoryTrip]);

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
        onDonate={() => actions.appendTimelineEvent('Donation updated', 'Donation settings updated for this trip.')}
        onDone={onDone}
      />
    </div>
  );
};

export default PassengerActiveTripPage;

