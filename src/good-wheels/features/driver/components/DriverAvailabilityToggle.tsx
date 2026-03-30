import React from 'react';
import { useDriverAvailability } from '../hooks/useDriverAvailability';

const DriverAvailabilityToggle: React.FC = () => {
  const { availability, canGoOnline, canPause, canGoOffline, setAvailability } = useDriverAvailability();

  return (
    <div className="gw-card p-3" style={{ boxShadow: 'none', background: 'rgba(255,255,255,0.75)' }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-extrabold text-slate-600">Status</span>
        <span
          className="text-xs font-extrabold"
          style={{
            padding: '6px 10px',
            borderRadius: 999,
            border: '1px solid rgba(15,23,42,0.10)',
            background:
              availability === 'online'
                ? 'rgba(22,163,74,0.10)'
                : availability === 'busy'
                  ? 'rgba(37,99,235,0.10)'
                  : availability === 'paused'
                    ? 'rgba(245,158,11,0.10)'
                    : 'rgba(15,23,42,0.04)',
            color:
              availability === 'online'
                ? '#166534'
                : availability === 'busy'
                  ? '#1d4ed8'
                  : availability === 'paused'
                    ? '#92400e'
                    : '#334155',
          }}
        >
          {availability}
        </span>

        <div className="flex items-center gap-2">
          <button type="button" className="gw-button gw-button-secondary" disabled={!canGoOnline} onClick={() => setAvailability('online')}>
            Go online
          </button>
          <button type="button" className="gw-button gw-button-secondary" disabled={!canPause} onClick={() => setAvailability('paused')}>
            Pause
          </button>
          <button type="button" className="gw-button gw-button-secondary" disabled={!canGoOffline} onClick={() => setAvailability('offline')}>
            Go offline
          </button>
        </div>
      </div>
      <div className="text-xs text-slate-500 mt-2">
        Busy mode is automatic when you have an active trip.
      </div>
    </div>
  );
};

export default DriverAvailabilityToggle;

