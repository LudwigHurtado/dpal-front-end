import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGwLang } from '../../i18n/useGwLang';
import { useAuthStore } from '../../store/useAuthStore';
import { GW_PATHS } from '../../routes/paths';
import { useTripStore } from '../../features/trips/tripStore';
import RideStatusCard from '../../features/trips/components/RideStatusCard';
import TripTimeline from '../../features/trips/components/TripTimeline';
import TripMapPanel from '../../features/trips/components/TripMapPanel';
import TripActionBar from '../../features/trips/components/TripActionBar';
import TripRoutePreview from '../../features/trips/components/TripRoutePreview';
import { MOCK_SUPPORT_CATEGORIES } from '../../data/mock/mockSupportCategories';
import PassengerDriverCounterofferBlock, {
  passengerHasPendingDriverCounter,
} from '../../features/passenger/components/PassengerDriverCounterofferBlock';
import PassengerLocationPicker from '../../features/passenger/components/PassengerLocationPicker';

const PassengerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);
  const user = useAuthStore((s) => s.user);
  const activeTrip = useTripStore((s) => s.activeTrip);
  const loading = useTripStore((s) => s.loading);
  const hydrateTrips = useTripStore((s) => s.hydrate);
  const lastTerminalTrip = useTripStore((s) => s.lastTerminalTrip);
  const clearLastTerminalTrip = useTripStore((s) => s.clearLastTerminalTrip);

  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    void hydrateTrips(uid);
    const id = window.setInterval(() => void hydrateTrips(uid), 6000);
    return () => window.clearInterval(id);
  }, [user?.id, hydrateTrips]);

  return (
    <div className="space-y-6">
      {!activeTrip ? <PassengerLocationPicker /> : null}

      {lastTerminalTrip && (lastTerminalTrip.status === 'cancelled' || lastTerminalTrip.status === 'canceled') ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 space-y-3">
          <div className="text-sm font-extrabold text-rose-900">Ride canceled</div>
          <div className="text-sm text-rose-900">
            {lastTerminalTrip.cancelledByRole === 'driver'
              ? 'Your driver canceled this ride.'
              : lastTerminalTrip.cancelledByRole === 'passenger'
                ? 'You canceled this ride.'
                : 'This ride was canceled.'}
            {lastTerminalTrip.cancelReason ? ` Reason: ${lastTerminalTrip.cancelReason}` : ''}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="gw-button gw-button-primary" onClick={() => navigate(GW_PATHS.passenger.request)}>
              {t('requestRideBtn')}
            </button>
            <button type="button" className="gw-button gw-button-secondary" onClick={() => navigate(GW_PATHS.passenger.support)}>
              {t('reportIssue')}
            </button>
            <button type="button" className="gw-button gw-button-secondary" onClick={() => clearLastTerminalTrip()}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="gw-card p-6">
          <div className="gw-muted">Loading…</div>
        </div>
      ) : activeTrip ? (
        <div className="space-y-6">
          {passengerHasPendingDriverCounter(activeTrip) ? (
            <PassengerDriverCounterofferBlock trip={activeTrip} variant="hero" />
          ) : null}
          <RideStatusCard
            role="passenger"
            trip={activeTrip}
            supportCategory={
              activeTrip.supportCategoryId
                ? MOCK_SUPPORT_CATEGORIES.find((c) => c.id === activeTrip.supportCategoryId) ?? null
                : null
            }
          />

          <div className="gw-grid-2">
            <TripMapPanel trip={activeTrip} variant="passenger" />
            <TripRoutePreview trip={activeTrip} />
          </div>

          <div className="gw-grid-2">
            <TripTimeline trip={activeTrip} />
            <div className="space-y-4">
              <div className="gw-card p-5 space-y-2">
                <div className="gw-card-title">Quick actions</div>
                <div className="gw-muted">
                  These actions are shared across roles and will later connect to messaging, cancellations, and emergency support.
                </div>
              </div>
              <TripActionBar role="passenger" trip={activeTrip} onAction={() => {}} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PassengerDashboardPage;

