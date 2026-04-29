import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GW_PATHS } from '../../routes/paths';
import { useDriverQueue } from '../../features/driver/hooks/useDriverQueue';
import DriverQueueFilters from '../../features/driver/components/DriverQueueFilters';
import DriverRequestCard from '../../features/driver/components/DriverRequestCard';
import DriverEmptyQueue from '../../features/driver/components/DriverEmptyQueue';
import { useGwLang } from '../../i18n/useGwLang';

const DriverQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);
  const { filteredQueue, queueCount, filterId, setQueueFilter, acceptRequest, declineRequest } = useDriverQueue();

  const title = useMemo(() => `${t('queueTitle')} (${queueCount})`, [queueCount, t]);

  return (
    <div className="space-y-6">
      <div className="gw-pagehead">
        <div>
          <h1 className="gw-h2">{title}</h1>
          <p className="gw-muted">{t('reviewRequests')}</p>
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
                void acceptRequest(t.id).then((trip) => {
                  if (trip) navigate(GW_PATHS.driver.active);
                });
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

