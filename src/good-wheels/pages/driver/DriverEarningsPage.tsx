import React, { useEffect, useMemo, useState } from 'react';
import DriverPerformanceCard from '../../features/driver/components/DriverPerformanceCard';
import { goodWheelsDriverApi } from '../../services/adapters/goodWheelsApi';
import { useAuthStore } from '../../store/useAuthStore';
import { useGwLang } from '../../i18n/useGwLang';
import type { Trip } from '../../types/ride';
import { calculateGoodWheelsFareSplit, formatMoneyFromCents } from '../../features/trips/utils/fareSplit';

function driverPayoutCentsForTrip(trip: Trip): number {
  if (typeof trip.estimate?.fareSplit?.driverPayoutCents === 'number') {
    return trip.estimate.fareSplit.driverPayoutCents;
  }
  if (typeof trip.estimate?.totalFareCents === 'number' && trip.estimate.totalFareCents > 0) {
    return calculateGoodWheelsFareSplit(trip.estimate.totalFareCents).driverPayoutCents;
  }
  if (typeof trip.fareUsd === 'number' && trip.fareUsd > 0) {
    return calculateGoodWheelsFareSplit(Math.round(trip.fareUsd * 100)).driverPayoutCents;
  }
  return 0;
}

const DriverEarningsPage: React.FC = () => {
  const t = useGwLang((s) => s.t);
  const tf = useGwLang((s) => s.tf);
  const user = useAuthStore((s) => s.user);
  const [history, setHistory] = useState<Trip[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    void goodWheelsDriverApi.fetchHistory(user.id).then((trips) => {
      if (mounted) setHistory(trips);
    });
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const { totalDriverCents, completedTrips } = useMemo(() => {
    let cents = 0;
    let n = 0;
    for (const trip of history) {
      if (trip.status !== 'completed') continue;
      n += 1;
      cents += driverPayoutCentsForTrip(trip);
    }
    return { totalDriverCents: cents, completedTrips: n };
  }, [history]);

  return (
    <div className="space-y-6">
      <div className="gw-pagehead">
        <div>
          <h1 className="gw-h2">{t('earnings')}</h1>
          <p className="gw-muted">{t('driverPayoutExplainer')}</p>
        </div>
      </div>

      <div className="gw-grid-2">
        <div className="gw-card p-5 space-y-2 border-l-4 border-amber-400">
          <div className="gw-card-title">{t('youReceive')} ({t('earnings')})</div>
          <div className="text-3xl font-extrabold text-amber-900 tabular-nums">
            {completedTrips === 0 && totalDriverCents === 0 ? '—' : formatMoneyFromCents(totalDriverCents)}
          </div>
          <div className="gw-muted text-sm">{tf('earningsCompletedTrips', { count: completedTrips })}</div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 leading-snug">
            <div className="font-bold">{t('youReceive')} = 90% {t('netAfterAdmin')}</div>
            <div>{t('donationDoesNotReduceDriver')}</div>
          </div>
        </div>
        <DriverPerformanceCard />
      </div>

      <div className="gw-card p-5">
        <div className="gw-card-title">Weekly summary</div>
        <p className="gw-muted mt-2">Daily/weekly summaries will appear here.</p>
      </div>
    </div>
  );
};

export default DriverEarningsPage;

