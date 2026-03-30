import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GW_PATHS } from '../../routes/paths';
import { useDriverQueue } from '../../features/driver/hooks/useDriverQueue';
import DriverQueueFilters from '../../features/driver/components/DriverQueueFilters';
import DriverRequestCard from '../../features/driver/components/DriverRequestCard';
import DriverEmptyQueue from '../../features/driver/components/DriverEmptyQueue';

const DriverQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const { filteredQueue, queueCount, filterId, setQueueFilter, acceptRequest, declineRequest } = useDriverQueue();

  const title = useMemo(() => `Queue (${queueCount})`, [queueCount]);

  return (
    <div className="space-y-6">
      <div className="gw-pagehead">
        <div>
          <h1 className="gw-h2">{title}</h1>
          <p className="gw-muted">Review requests and accept a trip when you’re ready.</p>
        </div>
      </div>

      <DriverQueueFilters value={filterId} onChange={setQueueFilter} />

      {filteredQueue.length === 0 ? (
        <DriverEmptyQueue />
      ) : (
        <div className="space-y-4">
          {filteredQueue.map((t) => (
            <DriverRequestCard
              key={t.id}
              trip={t}
              onReview={() => navigate(GW_PATHS.driver.active)}
              onAccept={() => {
                acceptRequest(t.id);
                navigate(GW_PATHS.driver.active);
              }}
              onDecline={() => declineRequest(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DriverQueuePage;

