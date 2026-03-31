import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GW_PATHS } from '../../routes/paths';
import { useAuthStore } from '../../store/useAuthStore';
import { useActiveTrip } from '../../features/trips/hooks/useActiveTrip';
import RideStatusCard from '../../features/trips/components/RideStatusCard';
import TripEmptyState from '../../features/trips/components/TripEmptyState';
import DriverAvailabilityToggle from '../../features/driver/components/DriverAvailabilityToggle';
import DriverStatusBanner from '../../features/driver/components/DriverStatusBanner';
import DriverPerformanceCard from '../../features/driver/components/DriverPerformanceCard';
import DriverVehicleSummary from '../../features/driver/components/DriverVehicleSummary';
import { useDriverStore } from '../../features/driver/driverStore';

const DriverDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { activeTrip } = useActiveTrip();
  const availability = useDriverStore((s) => s.availabilityStatus);
  const queueItems = useDriverStore((s) => s.queueItems);
  const history = useDriverStore((s) => s.completedTripIds);

  const queuePreview = useMemo(() => queueItems.slice(0, 3), [queueItems]);

  return (
    <div className="space-y-8">
      <div className="gw-pagehead">
        <div>
          <h1 className="gw-h2">Driver</h1>
          <p className="gw-muted">Go online, accept trips, and keep families moving safely.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <DriverAvailabilityToggle />
          <button type="button" className="gw-button gw-button-secondary" onClick={() => navigate(GW_PATHS.driver.queue)}>
            Open queue
          </button>
          <button type="button" className="gw-button gw-button-secondary" onClick={() => navigate(GW_PATHS.driver.comms)}>
            💬 Comms
          </button>
          <button
            type="button"
            className="gw-button gw-button-primary"
            disabled={!activeTrip}
            onClick={() => navigate(GW_PATHS.driver.active)}
          >
            Resume active trip
          </button>
        </div>
      </div>

      <DriverStatusBanner />

      {activeTrip ? (
        <RideStatusCard role="driver" trip={activeTrip} />
      ) : (
        <TripEmptyState
          title="No active trip"
          message="When you accept a request from the queue, your active trip will appear here."
          ctaHref={GW_PATHS.driver.queue}
          ctaLabel="View queue"
        />
      )}

      <div className="gw-grid-2">
        <div className="gw-card p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="gw-card-title">Incoming requests</div>
              <div className="gw-muted">Availability: <strong className="text-slate-800">{availability}</strong></div>
            </div>
            <Link to={GW_PATHS.driver.queue} className="gw-button gw-button-secondary">See all</Link>
          </div>

          {queuePreview.length === 0 ? (
            <div className="gw-muted">No requests right now.</div>
          ) : (
            <div className="space-y-3">
              {queuePreview.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="w-full text-left gw-card p-4"
                  style={{ boxShadow: 'none', background: 'rgba(241,245,249,0.6)' }}
                  onClick={() => navigate(GW_PATHS.driver.queue)}
                >
                  <div className="text-sm font-extrabold text-slate-800 truncate">
                    {t.pickup.label} → {t.dropoff.label}
                  </div>
                  <div className="text-sm text-slate-600 truncate">
                    {t.pickup.addressLine} → {t.dropoff.addressLine}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <DriverPerformanceCard />
          <DriverVehicleSummary />
          <div className="gw-card p-5">
            <div className="gw-card-title">Today</div>
            <div className="mt-2 grid grid-cols-2 gap-4">
              <div className="gw-card p-4" style={{ boxShadow: 'none', background: 'rgba(241,245,249,0.6)' }}>
                <div className="text-xs text-slate-500 font-bold">Trips completed</div>
                <div className="text-2xl font-extrabold text-slate-900">{history.length}</div>
              </div>
              <div className="gw-card p-4" style={{ boxShadow: 'none', background: 'rgba(241,245,249,0.6)' }}>
                <div className="text-xs text-slate-500 font-bold">Driver</div>
                <div className="text-2xl font-extrabold text-slate-900">{user?.fullName ?? '—'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboardPage;

