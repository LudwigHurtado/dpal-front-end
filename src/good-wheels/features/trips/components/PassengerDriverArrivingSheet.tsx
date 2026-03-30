import React from 'react';
import type { Trip } from '../tripTypes';

export default function PassengerDriverArrivingSheet({
  trip,
  onCancel,
  onContactDriver,
}: {
  trip?: Trip | null;
  onCancel?: () => void;
  onContactDriver?: () => void;
}) {
  return (
    <>
      <div className="gw-sheet-handle" aria-hidden />
      <div className="text-lg font-extrabold text-slate-900">Driver arriving</div>
      <div className="gw-muted mt-1">Pickup: {trip?.pickup.addressLine ?? '—'}</div>
      <div className="gw-card p-4 mt-3" style={{ boxShadow: 'none', background: 'rgba(241,245,249,0.65)' }}>
        <div className="text-xs font-bold text-slate-500">ETA</div>
        <div className="text-2xl font-extrabold text-slate-900">{trip?.estimate ? `${trip.estimate.etaMinutes} min` : '—'}</div>
      </div>
      <div className="gw-action-row mt-4">
        <button type="button" className="gw-button gw-button-secondary" onClick={onContactDriver}>
          Contact
        </button>
        <button type="button" className="gw-button" onClick={onCancel} style={{ background: 'rgba(15,23,42,0.03)' }}>
          Cancel
        </button>
      </div>
    </>
  );
}

