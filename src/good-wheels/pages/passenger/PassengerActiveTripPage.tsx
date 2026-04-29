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
import TripChatPanel from '../../features/trips/components/TripChatPanel';
import { useAuthStore } from '../../store/useAuthStore';
import { useGwLang } from '../../i18n/useGwLang';

const PassengerActiveTripPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);
  const user = useAuthStore((s) => s.user);
  const hydrate = useTripStore((s) => s.hydrate);
  const loading = useTripStore((s) => s.loading);
  const error = useTripStore((s) => s.error);
  const activeTrip = useTripStore((s) => s.activeTrip);
  const lastTerminalTrip = useTripStore((s) => s.lastTerminalTrip);
  const clearLastTerminalTrip = useTripStore((s) => s.clearLastTerminalTrip);
  const patchLastTerminalTrip = useTripStore((s) => s.patchLastTerminalTrip);
  const patchHistoryTrip = useTripStore((s) => s.patchHistoryTrip);

  const tripForUi = activeTrip ?? lastTerminalTrip;
  const { uiState, sheetMode } = usePassengerTripUi(tripForUi);
  const actions = useTripActions('passenger', tripForUi ?? ({} as any));
  const [lastSyncedAt, setLastSyncedAt] = React.useState<string | null>(null);

  const canFinalize = useMemo(() => {
    return Boolean(
      tripForUi &&
        tripForUi.status === 'completed' &&
        typeof tripForUi.dpalRewardPoints !== 'number'
    );
  }, [tripForUi]);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    const sync = async () => {
      await hydrate(user.id);
      if (mounted) setLastSyncedAt(new Date().toISOString());
    };
    void sync();
    const timer = window.setInterval(() => void sync(), 7000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [hydrate, user?.id]);

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
    void actions.cancelTrip();
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
          <div className="gw-map-placeholder">{t('loading')}</div>
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
      {tripForUi && ['requested', 'broadcasted', 'matched'].includes(tripForUi.status) && (
        <div style={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 6 }}>
          <div className="gw-card p-3">
            <div className="text-sm font-extrabold text-slate-800">{t('waitingAcceptance')}.</div>
            <div className="text-xs text-slate-600">{t('lookingDrivers')}. {t('rideSignalSent')}.</div>
          </div>
        </div>
      )}
      <div style={{ position: 'absolute', left: 16, bottom: 16, zIndex: 5 }} className="gw-card p-2">
        <div className="text-[11px] text-slate-600">
          {loading ? t('syncingTrip') : error ? t('syncIssue') : t('synced')}
          {lastSyncedAt ? ` · ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
        </div>
      </div>
      {tripForUi && (
        <div style={{ position: 'absolute', right: 16, bottom: 16, width: 'min(420px, calc(100vw - 32px))' }}>
          <TripChatPanel
            threadId={tripForUi.chatThreadId ?? `good-wheels-trip-${tripForUi.id}`}
            role="passenger"
            userId={user?.id ?? tripForUi.passengerId}
            userName={user?.fullName ?? t('passenger')}
            title={t('chatWithDriver')}
          />
        </div>
      )}
    </div>
  );
};

export default PassengerActiveTripPage;

