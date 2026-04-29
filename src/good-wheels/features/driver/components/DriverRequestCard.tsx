import React, { useMemo, useState } from 'react';
import type { Trip } from '../../trips/tripTypes';
import TripStatusBadge from '../../trips/components/TripStatusBadge';
import TripRoutePreview from '../../trips/components/TripRoutePreview';
import TripSupportCategoryChip from '../../trips/components/TripSupportCategoryChip';
import TripMetaRow from '../../trips/components/TripMetaRow';
import { MOCK_SUPPORT_CATEGORIES } from '../../../data/mock/mockSupportCategories';
import { useGwLang } from '../../../i18n/useGwLang';
import { goodWheelsCommsService } from '../../../services/goodWheelsCommsService';
import { useAuthStore } from '../../../store/useAuthStore';
import FareBreakdownCard from '../../trips/components/FareBreakdownCard';

const DriverRequestCard: React.FC<{
  trip: Trip;
  onReview: () => void;
  onAccept: () => void;
  onDecline: () => void;
}> = ({ trip, onReview, onAccept, onDecline }) => {
  const t = useGwLang((s) => s.t);
  const tf = useGwLang((s) => s.tf);
  const user = useAuthStore((s) => s.user);
  const [ackBusy, setAckBusy] = useState(false);
  const [ackDone, setAckDone] = useState(false);

  const category = useMemo(
    () => (trip.supportCategoryId ? MOCK_SUPPORT_CATEGORIES.find((c) => c.id === trip.supportCategoryId) ?? null : null),
    [trip.supportCategoryId],
  );

  const fareUsd =
    typeof trip.fareUsd === 'number' && trip.fareUsd > 0
      ? trip.fareUsd
      : typeof trip.estimate?.totalFareCents === 'number' && trip.estimate.totalFareCents > 0
        ? trip.estimate.totalFareCents / 100
        : null;

  const listenSignal = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const text = [
      t('newRideBroadcast'),
      `${t('pickupLabel')}: ${trip.pickup.addressLine}`,
      trip.pickupCategory ? `${t('pickupCategoryLabel')}: ${trip.pickupCategory}` : '',
      `${t('dropoff')}: ${trip.dropoff.addressLine}`,
      trip.dropoffCategory ? `${t('dropoffCategoryLabel')}: ${trip.dropoffCategory}` : '',
      `${t('safetyStatusLabel')}: ${(trip.safetyStatus ?? 'standard').replace(/_/g, ' ')}`,
      `${t('estimatedDistance')}: ${trip.estimate.distanceKm.toFixed(1)} km`,
    ]
      .filter(Boolean)
      .join('. ');
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(u);
  };

  const acknowledge = async () => {
    if (!trip.broadcastId || !user?.id) return;
    setAckBusy(true);
    try {
      await goodWheelsCommsService.acknowledgeBroadcast(trip.broadcastId, user.id);
      setAckDone(true);
    } finally {
      setAckBusy(false);
    }
  };

  return (
    <div className="gw-card p-5 space-y-4 gw-driver-surface">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-slate-800 truncate">
            {trip.pickup.label} → {trip.dropoff.label}
          </div>
          <div className="text-sm text-slate-600 truncate">
            {trip.pickup.addressLine} → {trip.dropoff.addressLine}
          </div>
          {(trip.pickupCategory || trip.dropoffCategory) && (
            <div className="text-xs text-slate-500 mt-1">
              {trip.pickupCategory && (
                <span>
                  {t('pickupCategoryLabel')}: <strong>{trip.pickupCategory}</strong>
                </span>
              )}
              {trip.pickupCategory && trip.dropoffCategory ? ' · ' : null}
              {trip.dropoffCategory && (
                <span>
                  {t('dropoffCategoryLabel')}: <strong>{trip.dropoffCategory}</strong>
                </span>
              )}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <TripStatusBadge status={trip.status} />
            {category && <TripSupportCategoryChip category={category} />}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" className="gw-button gw-button-secondary" onClick={onReview}>
            {t('readDetails')}
          </button>
          <button type="button" className="gw-button gw-button-secondary" onClick={listenSignal}>
            {t('listen')}
          </button>
          <button type="button" className="gw-button gw-button-secondary" disabled={!trip.broadcastId || ackBusy || ackDone} onClick={() => void acknowledge()}>
            {ackDone ? t('acknowledged') : t('acknowledge')}
          </button>
          <button type="button" className="gw-button gw-button-primary" onClick={onAccept}>
            {t('acceptRide')}
          </button>
          <button type="button" className="gw-button" onClick={onDecline} style={{ background: 'rgba(15,23,42,0.03)' }}>
            {t('rejectRide')}
          </button>
        </div>
      </div>

      <div className="gw-grid-2">
        <div className="gw-card p-4 space-y-3" style={{ boxShadow: 'none', background: 'rgba(241,245,249,0.6)' }}>
          <div className="gw-card-title">{t('routePreview')}</div>
          <TripMetaRow label="ETA" value={tf('eta_min', { minutes: trip.estimate.etaMinutes })} />
          <TripMetaRow label={t('estimatedDistance')} value={`${trip.estimate.distanceKm.toFixed(1)} km`} />
          <TripMetaRow label={t('safetyStatusLabel')} value={(trip.safetyStatus ?? 'standard').replace(/_/g, ' ')} />
          {fareUsd != null && (
            <FareBreakdownCard variant="driver" totalFareUsd={fareUsd} t={t} titleKey="ridePrice" showTransparentHint={false} />
          )}
        </div>
        <TripRoutePreview trip={trip} />
      </div>
    </div>
  );
};

export default DriverRequestCard;
