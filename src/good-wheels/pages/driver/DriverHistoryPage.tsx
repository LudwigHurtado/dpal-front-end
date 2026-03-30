import React from 'react';
import TripHistoryList from '../../features/trips/components/TripHistoryList';
import { useTripStore } from '../../features/trips/tripStore';

const DriverHistoryPage: React.FC = () => {
  const history = useTripStore((s) => s.history);

  return (
    <div className="space-y-6">
      <div className="gw-pagehead">
        <div>
          <h1 className="gw-h2">History</h1>
          <p className="gw-muted">Completed and past trips.</p>
        </div>
      </div>

      <TripHistoryList trips={history} emptyMessage="No completed trips yet." roleMode="driver" />
    </div>
  );
};

export default DriverHistoryPage;

