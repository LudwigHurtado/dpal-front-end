import React from 'react';
import type { Trip } from '../tripTypes';

export default function PassengerOnTripSheet({
  trip,
  onDonate,
  onContactDriver,
}: {
  trip?: Trip | null;
  onDonate?: () => void;
  onContactDriver?: () => void;
}) {
  return (
    <>
      <div className="gw-sheet-handle" aria-hidden />
      <div className="text-lg font-extrabold text-slate-900">On Trip</div>
      <div className="gw-muted mt-1">
        Heading to: <strong className="text-slate-900">{trip?.dropoff.label ?? 'Destination'}</strong>
      </div>
      <div className="gw-muted">ETA: {trip?.estimate ? `${Math.max(3, trip.estimate.etaMinutes)} min` : '—'}</div>

      <div className="gw-action-row mt-4">
        <button type="button" className="gw-button gw-button-secondary" onClick={onContactDriver}>
          Contact
        </button>
        <button type="button" className="gw-button gw-button-secondary" onClick={() => {}}>
          Share Trip
        </button>
        <button type="button" className="gw-button gw-button-secondary" onClick={() => {}}>
          Details
        </button>
      </div>

      <div className="gw-card p-5 mt-4" style={{ background: 'rgba(22,163,74,0.06)' }}>
        <div className="font-extrabold text-slate-900">Support a nearby cause</div>
        <div className="gw-muted mt-1">Donate during the ride — your community impact shows up on the receipt.</div>
        <button type="button" className="gw-button gw-button-primary w-full mt-3" onClick={onDonate}>
          Donate
        </button>
      </div>
    </>
  );
}

