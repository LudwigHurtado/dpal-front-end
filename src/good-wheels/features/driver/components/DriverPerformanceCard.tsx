import React from 'react';
import TripMetaRow from '../../trips/components/TripMetaRow';
import { useDriverStore } from '../driverStore';

const DriverPerformanceCard: React.FC = () => {
  const perf = useDriverStore((s) => s.performanceSummary);

  return (
    <div className="gw-card p-5 space-y-3">
      <div className="gw-card-title">Performance</div>
      {!perf ? (
        <div className="gw-muted">Loading…</div>
      ) : (
        <div className="space-y-2">
          <TripMetaRow label="Rating" value={typeof perf.rating === 'number' ? `${perf.rating.toFixed(1)} / 5` : '—'} />
          <TripMetaRow label="Completed trips" value={perf.completedTrips} />
          <TripMetaRow label="Response time" value={typeof perf.responseTimeSeconds === 'number' ? `${perf.responseTimeSeconds}s` : '—'} />
          <TripMetaRow label="Trust score" value={typeof perf.trustScore === 'number' ? perf.trustScore : '—'} />
          <TripMetaRow label="Safety" value={perf.safetyCompliance ? perf.safetyCompliance.replace(/_/g, ' ') : '—'} />
        </div>
      )}
    </div>
  );
};

export default DriverPerformanceCard;

