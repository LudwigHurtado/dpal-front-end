import React from 'react';

export default function PassengerTripCancelledSheet({
  onDone,
}: {
  onDone?: () => void;
}) {
  return (
    <>
      <div className="gw-sheet-handle" aria-hidden />
      <div className="text-lg font-extrabold text-slate-900">Ride cancelled</div>
      <div className="gw-muted mt-1">You can search again whenever you’re ready.</div>
      <button type="button" className="gw-button gw-button-primary w-full mt-4" onClick={onDone}>
        Back to Ride
      </button>
    </>
  );
}

