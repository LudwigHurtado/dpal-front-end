import { useMemo } from 'react';
import { useActiveTrip } from '../../trips/hooks/useActiveTrip';
import { useDriverStore } from '../driverStore';
import type { DriverAvailabilityStatus } from '../driverTypes';

export function useDriverAvailability() {
  const { activeTrip } = useActiveTrip();
  const availability = useDriverStore((s) => s.availabilityStatus);
  const setAvailability = useDriverStore((s) => s.setAvailability);

  const derived: DriverAvailabilityStatus = activeTrip ? 'busy' : availability;

  const caps = useMemo(() => {
    return {
      canGoOnline: !activeTrip && (derived === 'offline' || derived === 'paused'),
      canPause: !activeTrip && derived === 'online',
      canGoOffline: !activeTrip && (derived === 'online' || derived === 'paused'),
    };
  }, [activeTrip, derived]);

  return {
    availability: derived,
    ...caps,
    setAvailability,
  };
}

