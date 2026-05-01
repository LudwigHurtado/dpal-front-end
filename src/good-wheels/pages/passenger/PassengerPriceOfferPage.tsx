import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GW_PATHS } from '../../routes/paths';
import { useRideStore } from '../../store/useRideStore';
import { useAuthStore } from '../../store/useAuthStore';

const PICKUP_GREEN = '#16a34a';
const DROPOFF_RED = '#dc2626';
const ACCENT = '#0077C8';

const KM_TO_MI = 0.621371192;

/**
 * Vehicle classes priced with order-of-magnitude US ride-hail/courier rates.
 * Math is deterministic from distance + duration so dev/prod agree without a server.
 *
 * Source benchmarks (mid-2024 → 2025 ranges, USD):
 *   Delivery moto/courier: ~$0.85/mi + $0.18/min, ~$4.00 minimum
 *   Standard car (Uber/Lyft typical): ~$1.72/mi + $0.32/min, ~$5.25 minimum
 *   Comfort (Uber Comfort / Lyft XL-ish): ~$2.20/mi + $0.40/min, ~$7.00 minimum
 *   Luxury (Uber Black / executive): ~$3.40/mi + $0.55/min, ~$12.00 minimum
 *
 * Booking fee modeled as a flat add-on. Final fare = max(minimum, booking + miles*perMi + minutes*perMin).
 */
type VehicleClass = {
  id: 'delivery' | 'standard' | 'comfort' | 'luxury';
  title: string;
  sub: string;
  capacity: string;
  bookingUsd: number;
  perMileUsd: number;
  perMinuteUsd: number;
  minimumUsd: number;
  /** Maps to RideDraftInput.urgency on submit. */
  urgency: 'low' | 'normal' | 'high' | 'priority';
  Icon: React.FC<{ size?: number; tone?: string }>;
};

const MotoIcon: React.FC<{ size?: number; tone?: string }> = ({ size = 44, tone = ACCENT }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
    <circle cx="14" cy="48" r="9" fill="none" stroke={tone} strokeWidth="3" />
    <circle cx="50" cy="48" r="9" fill="none" stroke={tone} strokeWidth="3" />
    <path d="M14 48 L26 28 L40 28 L50 48" fill="none" stroke={tone} strokeWidth="3" strokeLinejoin="round" />
    <path d="M28 28 L34 18 L44 18" fill="none" stroke={tone} strokeWidth="3" strokeLinecap="round" />
    <rect x="36" y="32" width="14" height="6" rx="1.5" fill={tone} opacity="0.85" />
  </svg>
);

const CarIcon: React.FC<{ size?: number; tone?: string }> = ({ size = 44, tone = ACCENT }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
    <path
      d="M8 40 L12 30 C13.5 26 17 24 21 24 H43 C47 24 50.5 26 52 30 L56 40 V46 H8 Z"
      fill={tone}
      opacity="0.16"
      stroke={tone}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path d="M16 30 L19 26 H45 L48 30" fill="none" stroke={tone} strokeWidth="2" />
    <circle cx="20" cy="46" r="5" fill="#0f172a" />
    <circle cx="44" cy="46" r="5" fill="#0f172a" />
    <circle cx="20" cy="46" r="2" fill="#fff" />
    <circle cx="44" cy="46" r="2" fill="#fff" />
  </svg>
);

const ComfortIcon: React.FC<{ size?: number; tone?: string }> = ({ size = 44, tone = ACCENT }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
    <path
      d="M6 42 L10 28 C11.5 24 15 22 19 22 H45 C49 22 52.5 24 54 28 L58 42 V48 H6 Z"
      fill={tone}
      opacity="0.18"
      stroke={tone}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path d="M14 30 L17 24 H47 L50 30" fill="none" stroke={tone} strokeWidth="2" />
    <rect x="22" y="32" width="20" height="6" rx="1.5" fill={tone} opacity="0.45" />
    <circle cx="18" cy="48" r="5" fill="#0f172a" />
    <circle cx="46" cy="48" r="5" fill="#0f172a" />
    <circle cx="18" cy="48" r="2" fill="#fff" />
    <circle cx="46" cy="48" r="2" fill="#fff" />
  </svg>
);

const LuxuryIcon: React.FC<{ size?: number; tone?: string }> = ({ size = 44, tone = ACCENT }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
    <path
      d="M4 44 L8 32 C10 27 14 24 19 24 H45 C50 24 54 27 56 32 L60 44 V50 H4 Z"
      fill="#0f172a"
      stroke={tone}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path d="M12 32 L17 25 H47 L52 32" fill="none" stroke={tone} strokeWidth="2" />
    <rect x="18" y="34" width="28" height="6" rx="1.5" fill={tone} />
    <circle cx="18" cy="50" r="5" fill={tone} />
    <circle cx="46" cy="50" r="5" fill={tone} />
    <circle cx="18" cy="50" r="2" fill="#0f172a" />
    <circle cx="46" cy="50" r="2" fill="#0f172a" />
    <path d="M30 18 L32 14 L34 18 Z" fill={tone} />
  </svg>
);

const VEHICLE_CLASSES: VehicleClass[] = [
  {
    id: 'delivery',
    title: 'Delivery (Moto)',
    sub: 'Fastest · packages or solo rider',
    capacity: 'Up to 1 passenger or parcel',
    bookingUsd: 1.5,
    perMileUsd: 0.85,
    perMinuteUsd: 0.18,
    minimumUsd: 4.0,
    urgency: 'low',
    Icon: MotoIcon,
  },
  {
    id: 'standard',
    title: 'Standard Car',
    sub: 'Everyday rides · sedan',
    capacity: '1–4 passengers',
    bookingUsd: 2.45,
    perMileUsd: 1.72,
    perMinuteUsd: 0.32,
    minimumUsd: 5.25,
    urgency: 'normal',
    Icon: CarIcon,
  },
  {
    id: 'comfort',
    title: 'Comfort',
    sub: 'Extra legroom · top-rated drivers',
    capacity: '1–4 passengers',
    bookingUsd: 3.5,
    perMileUsd: 2.2,
    perMinuteUsd: 0.4,
    minimumUsd: 7.0,
    urgency: 'high',
    Icon: ComfortIcon,
  },
  {
    id: 'luxury',
    title: 'Luxury',
    sub: 'Premium sedan/SUV · executive',
    capacity: '1–4 passengers',
    bookingUsd: 5.0,
    perMileUsd: 3.4,
    perMinuteUsd: 0.55,
    minimumUsd: 12.0,
    urgency: 'priority',
    Icon: LuxuryIcon,
  },
];

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

function priceClass(c: VehicleClass, miles: number, minutes: number): number {
  const raw = c.bookingUsd + miles * c.perMileUsd + minutes * c.perMinuteUsd;
  return Math.max(c.minimumUsd, Number(raw.toFixed(2)));
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
      haversineKm(
        draft.pickupLat as number,
        draft.pickupLng as number,
        draft.destinationLat as number,
        draft.destinationLng as number,
      ),
    );
  }, [hasPoints, draft.pickupLat, draft.pickupLng, draft.destinationLat, draft.destinationLng]);
  const distanceMi = distanceKm * KM_TO_MI;
  const durationMin = Math.max(8, Math.round(distanceKm * 2.8));

  const pricedClasses = useMemo(
    () => VEHICLE_CLASSES.map((c) => ({ ...c, fareUsd: priceClass(c, distanceMi, durationMin) })),
    [distanceMi, durationMin],
  );

  const [selectedId, setSelectedId] = useState<VehicleClass['id']>('standard');
  const selected = pricedClasses.find((c) => c.id === selectedId) ?? pricedClasses[1];

  const [customRaw, setCustomRaw] = useState<string>('');
  const customAmount = useMemo(() => {
    const n = parseFloat(customRaw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Number(n.toFixed(2));
  }, [customRaw]);

  const offerAmount = customAmount ?? selected.fareUsd;
  const lowOffer = customAmount != null && offerAmount < selected.fareUsd * 0.7;
  const highOffer = customAmount != null && offerAmount > selected.fareUsd * 1.6;

  async function sendOffer() {
    if (!user?.id || !hasPoints) return;
    setDraft({ urgency: selected.urgency });
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
        <div
          style={{
            display: 'flex',
            gap: 12,
            paddingTop: 4,
            color: '#475569',
            fontSize: 12,
            fontWeight: 600,
            flexWrap: 'wrap',
          }}
        >
          <span>≈ {distanceMi.toFixed(1)} mi</span>
          <span>·</span>
          <span>≈ {(distanceKm).toFixed(1)} km</span>
          <span>·</span>
          <span>≈ {durationMin} min</span>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.4, color: '#0f172a', marginBottom: 8 }}>
          CHOOSE A VEHICLE
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pricedClasses.map((c) => {
            const active = !customAmount && selectedId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedId(c.id);
                  setCustomRaw('');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: `2px solid ${active ? ACCENT : 'rgba(15,23,42,0.10)'}`,
                  background: active ? `${ACCENT}10` : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: active ? `0 0 0 3px ${ACCENT}22` : 'none',
                  transition: 'box-shadow 120ms ease, background 120ms ease',
                }}
              >
                <div
                  style={{
                    flex: '0 0 auto',
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    background: active ? `${ACCENT}18` : 'rgba(15,23,42,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <c.Icon size={44} tone={active ? ACCENT : '#0f172a'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{c.title}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginTop: 2 }}>{c.sub}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginTop: 2 }}>
                    {c.capacity} · {fmtUsd(c.perMileUsd)}/mi · {fmtUsd(c.perMinuteUsd)}/min
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', flex: '0 0 auto' }}>
                  {fmtUsd(c.fareUsd)}
                </div>
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
            placeholder={`e.g. ${selected.fareUsd.toFixed(2)}`}
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
            Lower than the {selected.title} fair price — drivers may take longer to accept.
          </div>
        ) : null}
        {customAmount && highOffer ? (
          <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: '#0e7490' }}>
            Above the {selected.title} fair price — drivers will likely accept faster.
          </div>
        ) : null}
      </div>

      {error ? <div className="gw-error">{error}</div> : null}

      <button
        type="button"
        onClick={() => void sendOffer()}
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
        {loading ? 'Sending offer…' : `Send offer · ${selected.title} · ${fmtUsd(offerAmount)}`}
      </button>
    </div>
  );
};

const Row: React.FC<{ color: string; label: string; text: string }> = ({ color, label, text }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: color, flex: '0 0 auto' }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, color }}>{label}</div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#0f172a',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </div>
    </div>
  </div>
);

export default PassengerPriceOfferPage;
