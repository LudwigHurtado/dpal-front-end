import React from 'react';
import type { RideLifecycleStatus } from '../../../types/rideConnection';

const ORDER: RideLifecycleStatus[] = [
  'draft',
  'requested',
  'matching',
  'accepted',
  'driver_en_route',
  'driver_arrived',
  'passenger_onboard',
  'in_progress',
  'completed',
];

const LABELS: Record<RideLifecycleStatus, string> = {
  draft: 'Draft',
  requested: 'Requested',
  matching: 'Searching for driver',
  accepted: 'Driver accepted',
  driver_en_route: 'Driver arriving',
  driver_arrived: 'Driver arrived',
  passenger_onboard: 'Passenger onboard',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
};

const TripStatusTimeline: React.FC<{ status: RideLifecycleStatus }> = ({ status }) => {
  const currentIndex = ORDER.indexOf(status);
  return (
    <div className="gw-card p-4 space-y-3">
      <div className="gw-card-title">Live status timeline</div>
      <div className="grid gap-2">
        {ORDER.map((step, index) => {
          const active = currentIndex >= index;
          return (
            <div key={step} className="flex items-center gap-3">
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 99,
                  background: active ? '#2FB344' : '#CBD5E1',
                }}
              />
              <div className={active ? 'text-sm font-semibold text-slate-800' : 'text-sm text-slate-500'}>{LABELS[step]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TripStatusTimeline;

