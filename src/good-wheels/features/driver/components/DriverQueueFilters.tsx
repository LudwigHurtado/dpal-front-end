import React from 'react';
import { DRIVER_QUEUE_FILTERS } from '../driverConstants';
import type { DriverQueueFilterId } from '../driverTypes';

const DriverQueueFilters: React.FC<{
  value: DriverQueueFilterId;
  onChange: (id: DriverQueueFilterId) => void;
}> = ({ value, onChange }) => {
  return (
    <div className="gw-card p-4">
      <div className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Filters</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {DRIVER_QUEUE_FILTERS.map((f) => {
          const active = f.id === value;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onChange(f.id)}
              className={active ? 'gw-button gw-button-primary' : 'gw-button gw-button-secondary'}
              style={active ? { padding: '8px 12px', borderRadius: 999 } : { padding: '8px 12px', borderRadius: 999 }}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DriverQueueFilters;

