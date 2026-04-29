import React, { useMemo, useState } from 'react';
import type { Trip } from '../tripTypes';
import DonationPanel from '../../charity/components/DonationPanel';
import CharitySelectorModal from '../../charity/components/CharitySelectorModal';
import { MOCK_CHARITIES } from '../../charity/mockCharities';
import { useDonation } from '../../charity/useDonation';
import FareBreakdownCard from './FareBreakdownCard';
import { useGwLang } from '../../../i18n/useGwLang';

export default function PassengerOnTripSheet({
  trip,
  onDonate,
  onContactDriver,
}: {
  trip?: Trip | null;
  onDonate?: () => void;
  onContactDriver?: () => void;
}) {
  const t = useGwLang((s) => s.t);
  const [charityOpen, setCharityOpen] = useState(false);
  const grossUsd = useMemo(() => {
    if (typeof trip?.fareUsd === 'number' && trip.fareUsd > 0) return trip.fareUsd;
    if (typeof trip?.estimate?.totalFareCents === 'number' && trip.estimate.totalFareCents > 0) {
      return trip.estimate.totalFareCents / 100;
    }
    return 18.5;
  }, [trip?.fareUsd, trip?.estimate?.totalFareCents]);
  const {
    fareUsd,
    selectedCharity,
    setSelectedCharity,
    donationConfig,
    donationAmountUsd,
    updateDonation,
    clearDonation,
  } = useDonation(grossUsd);

  // fare syncing can be added later if fare becomes dynamic

  return (
    <>
      <div className="gw-sheet-handle" aria-hidden />
      <div className="text-lg font-extrabold text-slate-900">On Trip</div>
      <div className="gw-muted mt-1">
        Heading to: <strong className="text-slate-900">{trip?.dropoff.label ?? 'Destination'}</strong>
      </div>
      <div className="gw-muted">ETA: {trip?.estimate ? `${Math.max(3, trip.estimate.etaMinutes)} min` : '—'}</div>

      <div className="mt-3">
        <FareBreakdownCard
          variant="passenger"
          totalFareUsd={grossUsd}
          t={t}
          titleKey="rideEstimate"
          showTransparentHint
          optionalDonationUsd={donationAmountUsd > 0 ? donationAmountUsd : null}
        />
      </div>

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

      <div className="mt-4">
        <DonationPanel
          fare={fareUsd}
          selectedCharity={selectedCharity}
          donationConfig={donationConfig}
          donationAmount={donationAmountUsd}
          onChange={(type, value) => {
            updateDonation(type, value);
            onDonate?.();
          }}
          onClear={clearDonation}
          onOpenCharities={() => setCharityOpen(true)}
        />
      </div>

      <CharitySelectorModal
        open={charityOpen}
        charities={MOCK_CHARITIES}
        selectedCharityId={selectedCharity?.id ?? null}
        onSelect={(c) => {
          setSelectedCharity(c);
          setCharityOpen(false);
        }}
        onClose={() => setCharityOpen(false)}
      />
    </>
  );
}

