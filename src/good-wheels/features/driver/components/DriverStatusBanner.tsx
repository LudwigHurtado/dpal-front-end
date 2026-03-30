import React from 'react';
import { useActiveTrip } from '../../trips/hooks/useActiveTrip';
import { useTripStatus } from '../../trips/hooks/useTripStatus';
import { useDriverAvailability } from '../hooks/useDriverAvailability';

const DriverStatusBanner: React.FC = () => {
  const { activeTrip } = useActiveTrip();
  const { availability } = useDriverAvailability();
  const tripStatus = useTripStatus(activeTrip?.status ?? 'draft');

  const bg =
    availability === 'online'
      ? 'linear-gradient(135deg, rgba(22,163,74,0.10), rgba(37,99,235,0.06))'
      : availability === 'busy'
        ? 'linear-gradient(135deg, rgba(37,99,235,0.10), rgba(22,163,74,0.06))'
        : availability === 'paused'
          ? 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(37,99,235,0.05))'
          : 'linear-gradient(135deg, rgba(15,23,42,0.05), rgba(37,99,235,0.03))';

  return (
    <div className="gw-card p-5" style={{ background: bg }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Driver status</div>
          <div className="text-lg font-extrabold text-slate-900 mt-1">
            {availability === 'busy'
              ? `On trip — ${tripStatus.label}`
              : availability === 'online'
                ? 'Online — ready for requests'
                : availability === 'paused'
                  ? 'Paused — not receiving new requests'
                  : 'Offline'}
          </div>
          <div className="gw-muted mt-1">
            {availability === 'busy'
              ? 'Use trip controls to move through the shared trip status lifecycle.'
              : 'Go online to receive ride requests.'}
          </div>
        </div>
        <div className="gw-card p-4" style={{ boxShadow: 'none', background: 'rgba(255,255,255,0.65)' }}>
          <div className="text-xs font-bold text-slate-500">Safety</div>
          <div className="text-sm font-extrabold text-slate-900 mt-1">
            {activeTrip?.safetyStatus ? activeTrip.safetyStatus.replace(/_/g, ' ') : 'standard'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverStatusBanner;

