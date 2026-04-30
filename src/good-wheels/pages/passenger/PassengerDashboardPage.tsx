import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const PassengerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);
  const user = useAuthStore((s) => s.user);
  const activeTrip = useTripStore((s) => s.activeTrip);
  const loading = useTripStore((s) => s.loading);
  const hydrateTrips = useTripStore((s) => s.hydrate);
  const lastTerminalTrip = useTripStore((s) => s.lastTerminalTrip);
  const clearLastTerminalTrip = useTripStore((s) => s.clearLastTerminalTrip);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 860 : false));

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 860);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    void hydrateTrips(uid);
    const id = window.setInterval(() => void hydrateTrips(uid), 6000);
    return () => window.clearInterval(id);
  }, [user?.id, hydrateTrips]);

  const nearbyCharities = useMemo(
    () => [
      { id: 'hope-shelter', name: 'Hope Shelter', miles: 0.5, img: '/good-wheels/charity-hope.jpg' },
      { id: 'kids-outreach', name: 'Kids Outreach', miles: 0.8, img: '/good-wheels/charity-kids.jpg' },
    ],
    []
  );

  return (
    <div className="space-y-8">
      <section
        className="relative overflow-hidden rounded-2xl border border-emerald-200/60 p-4 sm:p-5 text-white"
        style={{
          backgroundImage:
            "linear-gradient(115deg, rgba(6,95,70,0.88), rgba(14,116,144,0.80)), url('/main-screen/water-project-monitoring.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="relative z-10 max-w-2xl">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-emerald-100">DPAL Passenger Mission</p>
          <h2 className="mt-1 text-lg sm:text-xl font-black tracking-tight">Request support rides with clear status and trusted pricing.</h2>
          <p className="mt-1.5 text-sm font-medium text-cyan-50/95">
            Track driver offers, review counteroffers, and keep every trip transparent from request to completion.
          </p>
        </div>
      </section>

      {isMobile && !activeTrip && (
        <div className="gw-mobile-header">
          <div className="gw-mobile-header-inner">
            <div className="gw-mobile-brand">
              <div className="gw-mobile-logo" aria-hidden />
              <div className="min-w-0">
                <div className="gw-mobile-title">Good Wheels</div>
                <div className="gw-mobile-sub">by DPAL</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isMobile && (
        <div className="gw-pagehead">
          <div>
            <h1 className="gw-h2">Welcome back{user?.fullName ? `, ${user.fullName}` : ''}</h1>
            <p className="gw-muted">Request a ride, track your trip, and connect help to real outcomes.</p>
          </div>
          <Link to={GW_PATHS.passenger.request} className="gw-button gw-button-primary">{t('requestRideBtn')}</Link>
        </div>
      )}

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
      ) : (
        <div className={isMobile ? 'gw-mobile-stack' : ''}>
          <div className="gw-card p-6 gw-ride-search">
            <div className="gw-card-title">Ride</div>
            <div className="gw-muted mt-1">Book a ride and optionally support a local cause.</div>
            <div className="gw-form mt-4">
              <label className="gw-label">
                Where from?
                <input className="gw-input" placeholder="Enter pickup location" />
              </label>
              <label className="gw-label">
                Where to?
                <input className="gw-input" placeholder="Enter destination" />
              </label>
              <button type="button" className="gw-button gw-button-primary w-full" onClick={() => navigate(GW_PATHS.passenger.request)}>
                Search Ride
              </button>
            </div>
          </div>

          <div className="gw-card p-6">
            <div className="gw-card-title">{t('causeDiscoveryTitle')}</div>
            <div className="gw-muted mt-1">{t('causeJourneyLead')}</div>
            <div className="gw-charity-row">
              {nearbyCharities.map((c) => (
                <div key={c.id} className="gw-charity-card">
                  <div className="gw-charity-img" aria-hidden />
                  <div className="gw-charity-name">{c.name}</div>
                  <div className="gw-charity-sub">{c.miles} miles away</div>
                </div>
              ))}
            </div>
            <button type="button" className="gw-button gw-button-secondary w-full" onClick={() => navigate(GW_PATHS.passenger.charities)}>
              {t('causeView')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassengerDashboardPage;

