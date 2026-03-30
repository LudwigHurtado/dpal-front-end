import React from 'react';
import TripMetaRow from '../../trips/components/TripMetaRow';
import { useDriverStore } from '../driverStore';

const DriverVehicleSummary: React.FC = () => {
  const vehicle = useDriverStore((s) => s.vehicle);
  const profile = useDriverStore((s) => s.driverProfile);

  return (
    <div className="gw-card p-5 space-y-3">
      <div className="gw-card-title">Vehicle</div>
      {!vehicle ? (
        <div className="gw-muted">Loading…</div>
      ) : (
        <div className="space-y-2">
          <TripMetaRow label="Driver" value={profile?.fullName ?? '—'} />
          <TripMetaRow label="Make / model" value={vehicle.makeModel} />
          <TripMetaRow label="Plate" value={vehicle.plateMasked} />
          <TripMetaRow label="Seats" value={vehicle.seats} />
          <TripMetaRow label="Accessibility" value={vehicle.accessibilityReady ? 'ready' : 'standard'} />
          <TripMetaRow label="Verification" value={vehicle.verification} />
        </div>
      )}
    </div>
  );
};

export default DriverVehicleSummary;

