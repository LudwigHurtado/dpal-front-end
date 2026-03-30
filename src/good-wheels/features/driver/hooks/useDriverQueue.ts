import { useMemo } from 'react';
import { useDriverStore } from '../driverStore';
import { filterQueue } from '../driverSelectors';

export function useDriverQueue() {
  const queueItems = useDriverStore((s) => s.queueItems);
  const filterId = useDriverStore((s) => s.queueFilterId);
  const setQueueFilter = useDriverStore((s) => s.setQueueFilter);
  const acceptRequest = useDriverStore((s) => s.acceptQueueTrip);
  const declineRequest = useDriverStore((s) => s.declineQueueTrip);

  const filteredQueue = useMemo(() => filterQueue(queueItems, filterId), [queueItems, filterId]);

  return {
    filterId,
    setQueueFilter,
    filteredQueue,
    queueCount: filteredQueue.length,
    acceptRequest,
    declineRequest,
  };
}

