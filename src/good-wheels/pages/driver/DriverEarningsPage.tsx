import React from 'react';
import DriverPerformanceCard from '../../features/driver/components/DriverPerformanceCard';

const DriverEarningsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="gw-pagehead">
        <div>
          <h1 className="gw-h2">Earnings</h1>
          <p className="gw-muted">Credits and payouts (placeholder).</p>
        </div>
      </div>

      <div className="gw-grid-2">
        <div className="gw-card p-5 space-y-2">
          <div className="gw-card-title">Total credits</div>
          <div className="text-3xl font-extrabold text-slate-900">—</div>
          <div className="gw-muted">Hook up payouts/credits when backend is connected.</div>
        </div>
        <DriverPerformanceCard />
      </div>

      <div className="gw-card p-5">
        <div className="gw-card-title">Weekly summary</div>
        <p className="gw-muted mt-2">Daily/weekly summaries will appear here.</p>
      </div>
    </div>
  );
};

export default DriverEarningsPage;

