import React from 'react';
import type { Trip } from '../../trips/tripTypes';
import { useTripStatus } from '../../trips/hooks/useTripStatus';
import { useDriverTripControls } from '../hooks/useDriverTripControls';
import { useGwLang } from '../../../i18n/useGwLang';

const DriverTripControls: React.FC<{ trip: Trip }> = ({ trip }) => {
  const t = useGwLang((s) => s.t);
  const s = useTripStatus(trip.status);
  const c = useDriverTripControls(trip);
  const [loading, setLoading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const run = async (id: string, action: () => Promise<void> | void) => {
    setLoading(id);
    setError(null);
    try {
      await action();
    } catch {
      setError(t('tripStatusUpdateError'));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="gw-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="gw-card-title">{t('driverControls')}</div>
          <div className="gw-muted mt-1">
            {t('nextStep')}: {s.nextStep ?? '—'}
          </div>
        </div>
        <div className="text-sm font-extrabold text-slate-800">{s.progressPercent}%</div>
      </div>

      <div className="flex flex-wrap gap-3">
        {(trip.status === 'driver_assigned' || trip.status === 'accepted' || trip.status === 'driver_en_route') && (
          <>
            <button type="button" className="gw-button gw-button-secondary" onClick={() => void run('arriving', c.markArriving)} disabled={loading !== null}>
              {t('navigateToPickup')}
            </button>
            <button type="button" className="gw-button gw-button-primary" onClick={() => void run('arriving', c.markArriving)} disabled={loading !== null}>
              {t('markArriving')}
            </button>
          </>
        )}
        {(trip.status === 'driver_arriving' || trip.status === 'driver_en_route') && (
          <button type="button" className="gw-button gw-button-primary" onClick={() => void run('arrived', c.markArrived)} disabled={loading !== null}>
            {t('markArrived')}
          </button>
        )}
        {(trip.status === 'arrived' || trip.status === 'driver_arrived' || trip.status === 'passenger_onboard') && (
          <button type="button" className="gw-button gw-button-primary" onClick={() => void run('start', c.startTrip)} disabled={loading !== null}>
            {t('startTripLabel')}
          </button>
        )}
        {(trip.status === 'in_progress' || trip.status === 'support_in_progress') && (
          <button type="button" className="gw-button gw-button-primary" onClick={() => void run('complete', c.completeTrip)} disabled={loading !== null}>
            {trip.status === 'support_in_progress' ? t('completeSupportTrip') : t('completeTripLabel')}
          </button>
        )}

        <button type="button" className="gw-button gw-button-secondary" onClick={() => void run('issue', c.reportIssue)} disabled={loading !== null}>
          {t('reportIssue')}
        </button>
        <button type="button" className="gw-button gw-button-secondary" onClick={() => void run('support', c.contactSupport)} disabled={loading !== null}>
          {t('contactSupport')}
        </button>
        {!['completed', 'cancelled', 'canceled'].includes(trip.status) && (
          <button type="button" className="gw-button" onClick={() => void run('cancel', c.cancelTrip)} disabled={loading !== null} style={{ background: 'rgba(220,38,38,0.1)', color: '#991b1b' }}>
            {t('cancelRideLabel')}
          </button>
        )}
      </div>
      {error && <div className="gw-error">{error}</div>}

      <div className="text-xs text-slate-500">
        {t('sharedTripControlsNote')}
      </div>
    </div>
  );
};

export default DriverTripControls;

