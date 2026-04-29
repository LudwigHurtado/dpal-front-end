import React from 'react';
import type { Trip } from '../tripTypes';
import { useGwLang } from '../../../i18n/useGwLang';

export default function PassengerDriverFoundSheet({
  trip,
  onContactDriver,
  onCancel,
}: {
  trip?: Trip | null;
  onContactDriver?: () => void;
  onCancel?: () => void;
}) {
  const t = useGwLang((s) => s.t);
  const driverName = trip?.driverSnapshot?.fullName ?? t('waitingForDriver');
  const vehicle = trip?.driverSnapshot?.vehicle;
  const verification = trip?.driverSnapshot?.trust?.verifiedVehicle ?? vehicle?.verification;
  return (
    <>
      <div className="gw-sheet-handle" aria-hidden />
      <div className="text-lg font-extrabold text-slate-900">{t('driverAccepted')}</div>

      <div className="gw-driver-card mt-3">
        <div className="gw-driver-avatar" aria-hidden />
        <div className="min-w-0">
          <div className="font-extrabold text-slate-900 truncate">{driverName}</div>
          <div className="text-sm text-slate-600">
            {vehicle?.makeModel ? `${t('vehicle')}: ${vehicle.makeModel}` : t('driverAssigned')}
            {vehicle?.plateMasked ? ` · ${t('plate')}: ${vehicle.plateMasked}` : ''}
          </div>
          <div className="text-sm text-slate-600">
            {vehicle?.colorName ? `${vehicle.colorName}` : ''}{vehicle?.seats ? ` · ${vehicle.seats} seats` : ''}
            {verification ? ` · ${String(verification)}` : ''}
          </div>
          <div className="text-sm text-slate-600 mt-1">
            ETA: {trip?.estimate ? `${Math.max(2, trip.estimate.etaMinutes)} min` : '3 min'}
          </div>
        </div>
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

