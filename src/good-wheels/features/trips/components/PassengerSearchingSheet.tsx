import React from 'react';
import type { Trip } from '../tripTypes';

export default function PassengerSearchingSheet({ trip, onCancel }: { trip?: Trip | null; onCancel?: () => void }) {
  return (
    <>
      <div className="gw-sheet-handle" aria-hidden />
      <div className="gw-sheet-row">
        <div className="gw-pulse" aria-hidden />
        <div>
          <div className="text-lg font-extrabold text-slate-900">Finding your driver…</div>
          <div className="text-sm text-slate-600 mt-1">
            {trip?.pickup.addressLine ?? 'Pickup'} → {trip?.dropoff.addressLine ?? 'Destination'}
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button type="button" className="gw-button gw-button-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </>
  );
}

