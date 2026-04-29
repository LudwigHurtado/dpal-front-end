import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveTrip } from '../../features/trips/hooks/useActiveTrip';
import TripMapPanel from '../../features/trips/components/TripMapPanel';
import TripTimeline from '../../features/trips/components/TripTimeline';
import TripRoutePreview from '../../features/trips/components/TripRoutePreview';
import TripParticipantCard from '../../features/trips/components/TripParticipantCard';
import TripSafetyBanner from '../../features/trips/components/TripSafetyBanner';
import RideStatusCard from '../../features/trips/components/RideStatusCard';
import TripEmptyState from '../../features/trips/components/TripEmptyState';
import { GW_PATHS } from '../../routes/paths';
import DriverActiveTripHeader from '../../features/driver/components/DriverActiveTripHeader';
import DriverTripControls from '../../features/driver/components/DriverTripControls';
import TripChatPanel from '../../features/trips/components/TripChatPanel';
import { useAuthStore } from '../../store/useAuthStore';
import { useTripStore } from '../../features/trips/tripStore';
import { useGwLang } from '../../i18n/useGwLang';
import { goodWheelsRideApi } from '../../services/adapters/goodWheelsApi';

const DriverActiveTripPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);
  const user = useAuthStore((s) => s.user);
  const hydrate = useTripStore((s) => s.hydrate);
  const { activeTrip, loading } = useActiveTrip();
  const simulatedTripIdsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (!user?.id) return;
    void hydrate(user.id);
    const timer = window.setInterval(() => void hydrate(user.id), 7000);
    return () => window.clearInterval(timer);
  }, [hydrate, user?.id]);

  React.useEffect(() => {
    if (!activeTrip?.id) return;
    if (activeTrip.status !== 'accepted') return;
    if (simulatedTripIdsRef.current.has(activeTrip.id)) return;

    simulatedTripIdsRef.current.add(activeTrip.id);
    const timers: number[] = [];
    const schedule = (delayMs: number, status: 'driver_en_route' | 'driver_arrived' | 'in_progress', label: string, detail: string) => {
      const timer = window.setTimeout(() => {
        void goodWheelsRideApi
          .updateTripStatus(activeTrip.id, status, label, detail)
          .then((next) => useTripStore.getState().setActiveTrip(next))
          .catch(() => useTripStore.getState().updateStatus(status, label, detail));
      }, delayMs);
      timers.push(timer);
    };

    schedule(2500, 'driver_en_route', 'Driver en route', 'Simulation: driver started heading to pickup.');
    schedule(7000, 'driver_arrived', 'Driver arrived', 'Simulation: driver reached pickup.');
    schedule(11500, 'in_progress', 'Trip started', 'Simulation: passenger onboard, heading to dropoff.');

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [activeTrip?.id, activeTrip?.status]);

  if (loading) {
    return (
      <div className="gw-card p-6">
        <div className="gw-muted">{t('loading')}</div>
      </div>
    );
  }

  if (!activeTrip) {
    return (
      <TripEmptyState
        title={t('noActiveTripTitle')}
        message={t('noActiveTripMsgDriver')}
        ctaHref={GW_PATHS.driver.queue}
        ctaLabel={t('openQueue')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <DriverActiveTripHeader trip={activeTrip} onBack={() => navigate(GW_PATHS.driver.dashboard)} />

      <RideStatusCard role="driver" trip={activeTrip} />

      <div className="gw-grid-2">
        <TripMapPanel trip={activeTrip} variant="driver" />
        <TripRoutePreview trip={activeTrip} />
      </div>

      <div className="gw-grid-2">
        <TripTimeline trip={activeTrip} />
        <div className="space-y-4">
          <TripSafetyBanner trip={activeTrip} />
          <TripParticipantCard
            trip={activeTrip}
            role="passenger"
            passenger={{ id: activeTrip.passengerId, role: 'passenger', fullName: 'Passenger', phoneMasked: '', trust: { trustScore: 0, verifiedUser: 'verified' }, savedPlaceIds: [], assistancePreferences: [], familySafeMode: true }}
            driver={{ id: activeTrip.driverId ?? user?.id ?? 'driver', role: 'driver', fullName: activeTrip.driverSnapshot?.fullName ?? user?.fullName ?? 'Driver', phoneMasked: '', trust: { trustScore: 0, verifiedUser: 'verified', verifiedDriver: 'verified', verifiedVehicle: 'verified' }, vehicleId: 'veh-001', isOnline: true, earningsCents: 0 }}
            worker={{ id: activeTrip.workerId ?? 'worker', role: 'worker', fullName: 'Worker', phoneMasked: '', trust: { trustScore: 0, verifiedUser: 'verified' }, queueIds: [] }}
          />
          {activeTrip.workerId && (
            <TripParticipantCard
              trip={activeTrip}
              role="worker"
              passenger={{ id: activeTrip.passengerId, role: 'passenger', fullName: 'Passenger', phoneMasked: '', trust: { trustScore: 0, verifiedUser: 'verified' }, savedPlaceIds: [], assistancePreferences: [], familySafeMode: true }}
              driver={{ id: activeTrip.driverId ?? user?.id ?? 'driver', role: 'driver', fullName: activeTrip.driverSnapshot?.fullName ?? user?.fullName ?? 'Driver', phoneMasked: '', trust: { trustScore: 0, verifiedUser: 'verified', verifiedDriver: 'verified', verifiedVehicle: 'verified' }, vehicleId: 'veh-001', isOnline: true, earningsCents: 0 }}
              worker={{ id: activeTrip.workerId ?? 'worker', role: 'worker', fullName: 'Worker', phoneMasked: '', trust: { trustScore: 0, verifiedUser: 'verified' }, queueIds: [] }}
            />
          )}
          <DriverTripControls trip={activeTrip} />
          <TripChatPanel
            threadId={activeTrip.chatThreadId ?? `good-wheels-trip-${activeTrip.id}`}
            role="driver"
            userId={user?.id ?? activeTrip.driverId ?? 'driver'}
            userName={user?.fullName ?? activeTrip.driverSnapshot?.fullName ?? 'Driver'}
            title={t('passengerChat')}
          />
        </div>
      </div>
    </div>
  );
};

export default DriverActiveTripPage;

