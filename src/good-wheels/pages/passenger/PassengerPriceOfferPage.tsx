import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GW_PATHS } from '../../routes/paths';
import { useRideStore } from '../../store/useRideStore';
import { useAuthStore } from '../../store/useAuthStore';
import { estimateGoodWheelsListedFareUsd } from '../../features/trips/utils/rideHailFareEstimate';

const PICKUP_GREEN = '#16a34a';
const DROPOFF_RED = '#dc2626';
const ACCENT = '#0077C8';

const KM_TO_MI = 0.621371192;

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const a = s1 * s1 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * s2 * s2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return r * c;
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

const PassengerPriceOfferPage: React.FC = () => {
  const navigate = useNavigate();
  const draft = useRideStore((s) => s.draft);
  const setDraft = useRideStore((s) => s.setDraft);
  const requestRide = useRideStore((s) => s.requestRide);
  const loading = useRideStore((s) => s.loading);
  const error = useRideStore((s) => s.error);
  const user = useAuthStore((s) => s.user);

  const hasPoints =
    Number.isFinite(draft.pickupLat) &&
    Number.isFinite(draft.pickupLng) &&
    Number.isFinite(draft.destinationLat) &&
    Number.isFinite(draft.destinationLng);

  useEffect(() => {
    if (!hasPoints) {
      navigate(GW_PATHS.passenger.dashboard, { replace: true });
    }
  }, [hasPoints, navigate]);

  const distanceKm = useMemo(() => {
    if (!hasPoints) return 0;
    return Math.max(
      1.2,
      haversineKm(draft.pickupLat as number, draft.pickupLng as number, draft.destinationLat as number, draft.destinationLng as number),
    );
  }, [hasPoints, draft.pickupLat, draft.pickupLng, draft.destinationLat, draft.destinationLng]);
  const distanceMi = distanceKm * KM_TO_MI;
  const durationMin = Math.max(8, Math.round(distanceKm * 2.8));

  const standardFare = useMemo(
    () => estimateGoodWheelsListedFareUsd({ distanceKm, durationMinutes: durationMin, serviceTierMultiplier: 1 }),
    [distanceKm, durationMin],
  );

  const tiers = useMemo(
    () => [
      {
        id: 'economy',
        title: 'Economy',
        sub: 'Lower offer · longer wait',
        amount: Math.max(5, Number((standardFare * 0.85).toFixed(2))),
      },
      {
        id: 'standard',
        title: 'Standard',
        sub: 'Suggested fair price',
        amount: Number(standardFare.toFixed(2)),
      },
      {
        id: 'priority',
        title: 'Priority',
        sub: 'Faster pickup · drivers prefer',
        amount: Number((standardFare * 1.25).toFixed(2)),
      },
    ],
    [standardFare],
  );

  const [selectedTier, setSelectedTier] = useState<string>('standard');
  const [customRaw, setCustomRaw] = useState<string>('');
  const customAmount = useMemo(() => {
    const n = parseFloat(customRaw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Number(n.toFixed(2));
  }, [customRaw]);

  const offerAmount =
    customAmount ?? tiers.find((t) => t.id === selectedTier)?.amount ?? Number(standardFare.toFixed(2));

  const lowOffer = offerAmount < standardFare * 0.7;
  const highOffer = offerAmount > standardFare * 1.6;

  async function sendOffer() {
    if (!user?.id || !hasPoints) return;
    const ride = await requestRide({ passengerId: user.id, passengerName: user.fullName || 'Passenger' });
    if (ride) navigate(GW_PATHS.passenger.active);
  }

  if (!hasPoints) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 14 }}>
      <button
        type="button"
        onClick={() => navigate(GW_PATHS.passenger.dashboard)}
        style={{
          alignSelf: 'flex-start',
          fontSize: 12,
          fontWeight: 700,
          color: '#475569',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        ← Edit pickup or drop-off
      </button>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: 14,
          borderRadius: 18,
          background: '#ffffff',
          border: '1px solid rgba(15,23,42,0.08)',
          boxShadow: '0 6px 20px rgba(15,23,42,0.06)',
        }}
      >
        <Row color={PICKUP_GREEN} label="PICKUP" text={draft.pickupAddress || '—'} />
        <Row color={DROPOFF_RED} label="DROP-OFF" text={draft.destinationAddress || '—'} />
        <div style={{ display: 'flex', gap: 12, paddingTop: 4, color: '#475569', fontSize: 12, fontWeight: 600 }}>
          <span>≈ {distanceMi.toFixed(1)} mi</span>
          <span>·</span>
          <span>≈ {durationMin} min</span>
          <span>·</span>
          <span>Fair price {fmtUsd(standardFare)}</span>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.4, color: '#0f172a', marginBottom: 8 }}>
          SUGGESTED PRICES
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tiers.map((tier) => {
            const active = !customAmount && selectedTier === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => {
                  setSelectedTier(tier.id);
                  setCustomRaw('');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: `2px solid ${active ? ACCENT : 'rgba(15,23,42,0.10)'}`,
                  background: active ? `${ACCENT}10` : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: active ? `0 0 0 3px ${ACCENT}22` : 'none',
                  transition: 'box-shadow 120ms ease, background 120ms ease',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{tier.title}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginTop: 2 }}>{tier.sub}</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{fmtUsd(tier.amount)}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.4, color: '#0f172a', marginBottom: 8 }}>
          OR ENTER YOUR OFFER
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 16px',
            borderRadius: 14,
            border: `2px solid ${customAmount ? ACCENT : 'rgba(15,23,42,0.10)'}`,
            background: customAmount ? `${ACCENT}10` : '#ffffff',
            boxShadow: customAmount ? `0 0 0 3px ${ACCENT}22` : 'none',
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>$</span>
          <input
            inputMode="decimal"
            value={customRaw}
            onChange={(e) => setCustomRaw(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder={`e.g. ${standardFare.toFixed(2)}`}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 18,
              fontWeight: 800,
              color: '#0f172a',
            }}
            aria-label="Custom price offer"
          />
          {customRaw ? (
            <button
              type="button"
              onClick={() => setCustomRaw('')}
              style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
            >
              clear
            </button>
          ) : null}
        </div>
        {customAmount && lowOffer ? (
          <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: '#b45309' }}>
            Lower than the fair price — drivers may take longer to accept.
          </div>
        ) : null}
        {customAmount && highOffer ? (
          <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: '#0e7490' }}>
            Above the fair price — drivers will likely accept faster.
          </div>
        ) : null}
      </div>

      {error ? <div className="gw-error">{error}</div> : null}

      <button
        type="button"
        onClick={() => {
          setDraft({ urgency: selectedTier === 'priority' ? 'priority' : selectedTier === 'economy' ? 'low' : 'normal' });
          void sendOffer();
        }}
        disabled={loading || !user?.id}
        className="gw-button gw-button-primary w-full"
        style={{
          padding: '14px 18px',
          fontSize: 15,
          fontWeight: 800,
          letterSpacing: 0.3,
          opacity: loading ? 0.7 : 1,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Sending offer…' : `Send offer · ${fmtUsd(offerAmount)}`}
      </button>
    </div>
  );
};

const Row: React.FC<{ color: string; label: string; text: string }> = ({ color, label, text }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <span
      aria-hidden
      style={{ width: 10, height: 10, borderRadius: 999, background: color, flex: '0 0 auto' }}
    />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, color }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {text}
      </div>
    </div>
  </div>
);

export default PassengerPriceOfferPage;
