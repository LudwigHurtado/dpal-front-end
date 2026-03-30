import React from 'react';
import type { Role, Trip } from '../tripTypes';
import { defaultDriverActions, defaultPassengerActions, defaultWorkerActions, type TripAction, type TripActionId } from '../tripActions';

function actionsFor(role: Role, trip: Trip): TripAction[] {
  if (role === 'driver') return defaultDriverActions(trip.status);
  if (role === 'worker') return defaultWorkerActions(trip.status);
  return defaultPassengerActions(trip.status);
}

const TripActionBar: React.FC<{
  role: Role;
  trip: Trip;
  onAction?: (id: TripActionId) => void;
}> = ({ role, trip, onAction }) => {
  const actions = actionsFor(role, trip);
  if (actions.length === 0) return null;

  return (
    <div className="gw-card p-4">
      <div className="flex flex-wrap gap-3">
        {actions.map((a) => {
          const cls =
            a.tone === 'primary'
              ? 'gw-button gw-button-primary'
              : a.tone === 'danger'
                ? 'gw-button'
                : 'gw-button gw-button-secondary';
          const style =
            a.tone === 'danger'
              ? { borderColor: 'rgba(251,113,133,0.30)', color: '#9f1239', background: 'rgba(251,113,133,0.06)' }
              : undefined;
          return (
            <button
              key={a.id}
              type="button"
              className={cls}
              style={style}
              onClick={() => onAction?.(a.id)}
            >
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TripActionBar;

