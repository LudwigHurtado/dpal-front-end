import React from 'react';
import DriverVehicleSummary from '../../features/driver/components/DriverVehicleSummary';

const DriverVehiclePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="gw-pagehead">
        <div>
          <h1 className="gw-h2">Vehicle</h1>
          <p className="gw-muted">Vehicle info and verification (placeholder).</p>
        </div>
      </div>

      <DriverVehicleSummary />
      <div className="gw-card p-5">
        <div className="gw-card-title">Verification</div>
        <p className="gw-muted mt-2">Vehicle verification will be wired to backend checks later.</p>
      </div>
    </div>
  );
};

export default DriverVehiclePage;

