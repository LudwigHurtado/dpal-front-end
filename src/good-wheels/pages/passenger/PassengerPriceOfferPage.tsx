import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GW_PATHS } from '../../routes/paths';
import { useRideStore } from '../../store/useRideStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useTripStore } from '../../features/trips/tripStore';
import type { PlaceRef } from '../../types/ride';
import { charityImpactCategories } from '../../data/charityImpactCategories';
import type { CharityImpactCategory } from '../../data/charityImpactCategories';
import SelectedRideImpactPanel from '../../components/SelectedRideImpactPanel';
import CharityImpactSelection from '../../components/CharityImpactSelection';
import RideImpactBreakdown from '../../components/RideImpactBreakdown';
import {
  calculateGoodWheelsFareSplit as calculateFareSplitUsd,
  formatMoney as formatMoneyUsd,
} from '../../utils/goodWheelsFareSplitUsd';

const PICKUP_GREEN = '#16a34a';
const DROPOFF_RED = '#dc2626';
const ACCENT = '#0077C8';

const KM_TO_MI = 0.621371192;

/**
 * Vehicle classes priced with order-of-magnitude US ride-hail/courier rates.
 * Math is deterministic from distance + duration so dev/prod agree without a server.
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
  urgency: 'low' | 'normal' | 'high' | 'priority';
  Icon: React.FC<{ size?: number; active?: boolean }>;
};

/* ── Vehicle illustrations — side-profile style ─────────────────────────── */

const MotoIcon: React.FC<{ size?: number; active?: boolean }> = ({ size = 56, active = false }) => {
  const body = active ? '#0077C8' : '#334155';
  const wheel = active ? '#0077C8' : '#1e293b';
  const chrome = active ? '#bfdbfe' : '#94a3b8';
  return (
    <svg viewBox="0 0 110 72" width={size} height={size} aria-hidden fill="none">
      <circle cx="22" cy="52" r="15" stroke={wheel} strokeWidth="4" />
      <circle cx="22" cy="52" r="7" stroke={wheel} strokeWidth="2.5" />
      <circle cx="22" cy="52" r="2.5" fill={wheel} />
      <circle cx="88" cy="52" r="15" stroke={wheel} strokeWidth="4" />
      <circle cx="88" cy="52" r="7" stroke={wheel} strokeWidth="2.5" />
      <circle cx="88" cy="52" r="2.5" fill={wheel} />
      <path d="M22 52 L38 28 L62 24 L78 38 L88 52" stroke={body} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44 34 Q55 16 72 20 L80 36 L60 40 Z" fill={body} opacity="0.82" />
      <path d="M38 30 Q50 22 62 24 L60 30 Q50 30 40 35 Z" fill={chrome} opacity="0.55" />
      <path d="M76 28 L84 20 L90 23" stroke={chrome} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="90" cy="36" rx="5" ry="4" fill={active ? '#fef9c3' : '#e2e8f0'} />
      <path d="M26 46 Q18 50 12 54" stroke={chrome} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
};

const CarIcon: React.FC<{ size?: number; active?: boolean }> = ({ size = 56, active = false }) => {
  const paint = active ? '#0077C8' : '#334155';
  const glass = active ? '#bfdbfe' : '#cbd5e1';
  const wheel = active ? '#1e40af' : '#1e293b';
  return (
    <svg viewBox="0 0 120 72" width={size} height={size} aria-hidden fill="none">
      <path
        d="M8 50 L10 36 C11 30 15 28 20 28 H100 C105 28 109 30 110 36 L112 50 V56 H8 Z"
        fill={paint}
        opacity="0.15"
        stroke={paint}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M30 28 L36 16 Q40 12 48 12 H76 Q82 12 86 16 L92 28 Z" fill={paint} opacity="0.85" />
      <path d="M36 28 L40 16 H56 L54 28 Z" fill={glass} opacity="0.85" />
      <path d="M66 28 L70 16 H80 L86 28 Z" fill={glass} opacity="0.85" />
      <path d="M55 28 L57 16 H69 L67 28 Z" fill={glass} opacity="0.5" />
      <line x1="60" y1="28" x2="60" y2="50" stroke={paint} strokeWidth="1.5" opacity="0.4" />
      <line x1="82" y1="28" x2="82" y2="50" stroke={paint} strokeWidth="1.5" opacity="0.4" />
      <circle cx="30" cy="55" r="11" fill={wheel} />
      <circle cx="30" cy="55" r="5.5" fill="#475569" />
      <circle cx="30" cy="55" r="2.5" fill={active ? '#93c5fd' : '#94a3b8'} />
      <circle cx="90" cy="55" r="11" fill={wheel} />
      <circle cx="90" cy="55" r="5.5" fill="#475569" />
      <circle cx="90" cy="55" r="2.5" fill={active ? '#93c5fd' : '#94a3b8'} />
      <ellipse cx="111" cy="40" rx="5" ry="3.5" fill={active ? '#fef9c3' : '#e2e8f0'} />
      <ellipse cx="9" cy="42" rx="4" ry="3" fill={active ? '#fca5a5' : '#fecaca'} opacity="0.9" />
    </svg>
  );
};

const ComfortIcon: React.FC<{ size?: number; active?: boolean }> = ({ size = 56, active = false }) => {
  const paint = active ? '#0077C8' : '#334155';
  const glass = active ? '#bfdbfe' : '#cbd5e1';
  const wheel = active ? '#1e40af' : '#1e293b';
  return (
    <svg viewBox="0 0 128 72" width={size} height={size} aria-hidden fill="none">
      <path
        d="M6 50 L8 34 C9 28 14 26 20 26 H108 C114 26 119 28 120 34 L122 50 V57 H6 Z"
        fill={paint}
        opacity="0.15"
        stroke={paint}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M28 26 L32 13 Q36 10 44 10 H86 Q92 10 96 13 L100 26 Z" fill={paint} opacity="0.88" />
      <path d="M34 26 L37 13 H54 L52 26 Z" fill={glass} opacity="0.85" />
      <path d="M54 26 L54 13 H78 L78 26 Z" fill={glass} opacity="0.35" />
      <path d="M78 26 L80 13 H90 L96 26 Z" fill={glass} opacity="0.75" />
      <path d="M32 11 L96 11" stroke={active ? '#bfdbfe' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" />
      <line x1="62" y1="26" x2="62" y2="50" stroke={paint} strokeWidth="1.5" opacity="0.4" />
      <line x1="86" y1="26" x2="86" y2="50" stroke={paint} strokeWidth="1.5" opacity="0.4" />
      <circle cx="30" cy="56" r="12" fill={wheel} />
      <circle cx="30" cy="56" r="6" fill="#475569" />
      <circle cx="30" cy="56" r="3" fill={active ? '#93c5fd' : '#94a3b8'} />
      <circle cx="96" cy="56" r="12" fill={wheel} />
      <circle cx="96" cy="56" r="6" fill="#475569" />
      <circle cx="96" cy="56" r="3" fill={active ? '#93c5fd' : '#94a3b8'} />
      <ellipse cx="121" cy="38" rx="5" ry="4" fill={active ? '#fef9c3' : '#e2e8f0'} />
      <path d="M7 38 L7 46" stroke={active ? '#f87171' : '#fca5a5'} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
};

const LuxuryIcon: React.FC<{ size?: number; active?: boolean }> = ({ size = 56, active = false }) => {
  const paint = active ? '#0077C8' : '#1e293b';
  const glass = active ? '#bfdbfe' : '#94a3b8';
  const chrome = active ? '#bfdbfe' : '#cbd5e1';
  const wheel = active ? '#1e40af' : '#0f172a';
  return (
    <svg viewBox="0 0 140 72" width={size} height={size} aria-hidden fill="none">
      <path
        d="M4 50 L6 32 C7 26 12 24 18 24 H122 C128 24 133 26 134 32 L136 50 V58 H4 Z"
        fill={paint}
        opacity={active ? 0.2 : 0.9}
        stroke={active ? paint : chrome}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M30 24 L36 12 Q42 8 52 8 H92 Q100 8 106 12 L110 24 Z" fill={paint} opacity={active ? 0.9 : 0.95} />
      <path d="M36 24 L41 11 H60 L58 24 Z" fill={glass} opacity="0.9" />
      <path d="M84 24 L90 11 H100 L106 24 Z" fill={glass} opacity="0.8" />
      <path d="M59 24 L59 11 H83 L83 24 Z" fill={glass} opacity="0.45" />
      <path d="M36 24 L41 11 H100 L106 24" stroke={chrome} strokeWidth="1.5" fill="none" opacity="0.6" />
      <path d="M18 38 L122 38" stroke={chrome} strokeWidth="1.5" opacity="0.55" />
      <line x1="68" y1="24" x2="68" y2="50" stroke={chrome} strokeWidth="1.5" opacity="0.35" />
      <line x1="94" y1="24" x2="94" y2="50" stroke={chrome} strokeWidth="1.5" opacity="0.35" />
      <circle cx="34" cy="57" r="13" fill={wheel} />
      <circle cx="34" cy="57" r="7" fill="#334155" />
      <circle cx="34" cy="57" r="3" fill={chrome} />
      <circle cx="106" cy="57" r="13" fill={wheel} />
      <circle cx="106" cy="57" r="7" fill="#334155" />
      <circle cx="106" cy="57" r="3" fill={chrome} />
      <path d="M130 32 L136 36 L134 42" stroke={active ? '#fef9c3' : '#e2e8f0'} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M6 32 L4 38 L6 46" stroke={active ? '#f87171' : '#fca5a5'} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <circle cx="133" cy="28" r="2" fill={chrome} opacity="0.7" />
    </svg>
  );
};

const VEHICLE_CLASSES: VehicleClass[] = [
  {
    id: 'delivery',
    title: 'Motorcycle',
    sub: 'Fast local ride · delivery, errands, or solo rider',
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
    title: 'Economy Car',
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
    title: 'Family Ride',
    sub: 'Extra space · comfortable trips',
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
    title: 'Community Ride',
    sub: 'Premium ride · executive van or sedan',
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
  const user = useAuthStore((s) => s.user);
  const setTripDraft = useTripStore((s) => s.setDraft);
  const requestTripRide = useTripStore((s) => s.requestRide);
  const loading = useTripStore((s) => s.loading);
  const error = useTripStore((s) => s.error);

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

  const [charityFlowActive, setCharityFlowActive] = useState(false);
  const [selectedImpactId, setSelectedImpactId] = useState<string | null>(null);

  const fareSplitUsd = useMemo(() => calculateFareSplitUsd(offerAmount), [offerAmount]);

  const selectedImpactCategory: CharityImpactCategory | null = useMemo(
    () => charityImpactCategories.find((c) => c.id === selectedImpactId) ?? null,
    [selectedImpactId],
  );

  function resetCharityFlow() {
    setCharityFlowActive(false);
    setSelectedImpactId(null);
  }

  function openCharityFlowForVehicle(id: VehicleClass['id']) {
    setSelectedId(id);
    setCharityFlowActive(true);
    setSelectedImpactId(null);
  }

  async function sendOffer() {
    if (!user?.id || !hasPoints || !selectedImpactCategory) return;
    const offerCents = Math.max(50, Math.round(offerAmount * 100));
    const recommendedCents = Math.max(50, Math.round(selected.fareUsd * 100));
    const pickup: PlaceRef = {
      label: 'Pickup',
      addressLine: draft.pickupAddress || 'Selected pickup',
      point: { lat: draft.pickupLat as number, lng: draft.pickupLng as number },
    };
    const dropoff: PlaceRef = {
      label: 'Drop-off',
      addressLine: draft.destinationAddress || 'Selected drop-off',
      point: { lat: draft.destinationLat as number, lng: draft.destinationLng as number },
    };

    const split = fareSplitUsd;
    const notes =
      `Good Wheels charity ride. Vehicle: ${selected.title}. ` +
      `Community cause: ${selectedImpactCategory.title} (${selectedImpactCategory.id}). ` +
      `Fare ${fmtUsd(offerAmount)} → platform ${formatMoneyUsd(split.platformFee)}, ` +
      `driver ${formatMoneyUsd(split.driverAmount)}, community ${formatMoneyUsd(split.charityAmount)}.`;

    setTripDraft({
      passengerId: user.id,
      pickup,
      dropoff,
      purpose: 'normal_ride',
      familySafe: true,
      passengerOfferCents: offerCents,
      recommendedFareCents: recommendedCents,
      estimatePreview: { etaMinutes: durationMin, distanceKm },
      routeSummaryPreview: { distanceKm, durationMinutes: durationMin },
      notes,
      attachedCause: {
        id: selectedImpactCategory.id,
        name: selectedImpactCategory.title,
        category: 'community_impact',
        city: '',
        country: '',
      },
    });
    await requestTripRide();
    if (useTripStore.getState().activeTrip) navigate(GW_PATHS.passenger.dashboard);
  }

  if (!hasPoints) return null;

  const heroCopyStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: '#44403c',
    lineHeight: 1.55,
    margin: 0,
  };

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
          <span>≈ {distanceKm.toFixed(1)} km</span>
          <span>·</span>
          <span>≈ {durationMin} min</span>
        </div>
      </div>

      {!charityFlowActive ? (
        <>
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
                    onClick={() => openCharityFlowForVehicle(c.id)}
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
                        width: 80,
                        height: 56,
                        borderRadius: 12,
                        background: active ? `${ACCENT}12` : 'rgba(15,23,42,0.03)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <c.Icon size={72} active={active} />
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
                onFocus={() => {
                  if (!customRaw) {
                    const standardPrice = pricedClasses.find((c) => c.id === 'standard')?.fareUsd;
                    if (standardPrice) setCustomRaw(standardPrice.toFixed(2));
                  }
                }}
                placeholder={`${(pricedClasses.find((c) => c.id === 'standard')?.fareUsd ?? selected.fareUsd).toFixed(2)}`}
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
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
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

          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#78716c',
              textAlign: 'center',
              padding: '12px 8px',
              lineHeight: 1.45,
            }}
          >
            Tap a ride option to continue — you’ll choose how the community share of your fare makes an impact.
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 16,
              background: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)',
              border: '1px solid rgba(251, 146, 60, 0.25)',
            }}
          >
            <p style={{ ...heroCopyStyle, fontWeight: 800, color: '#9a3412', marginBottom: 10 }}>
              Good Wheels keeps the money moving inside the community.
            </p>
            <p style={heroCopyStyle}>
              Every ride supports the driver and a local cause. After a small 5% platform fee, 90% of the remaining fare
              goes to the driver and 10% goes to the charity category you choose.
            </p>
          </div>

          <div
            style={{
              padding: '14px 16px',
              borderRadius: 16,
              background: '#ffffff',
              border: '1px solid rgba(15,23,42,0.08)',
            }}
          >
            <p style={{ ...heroCopyStyle, color: '#0f172a', fontWeight: 700 }}>
              Your ride supports more than transportation. Good Wheels charges a small 5% platform fee to keep the system
              running. After that, 90% of the remaining fare goes to your driver and 10% goes to the community cause you
              choose.
            </p>
            <p style={{ ...heroCopyStyle, marginTop: 10, fontWeight: 800, color: '#0369a1' }}>
              Your area. Your charity. Your impact.
            </p>
          </div>

          <SelectedRideImpactPanel
            title={selected.title}
            subtitle={selected.sub}
            capacityLine={selected.capacity}
            estimatedFareUsd={offerAmount}
            formatFare={fmtUsd}
            Icon={selected.Icon}
          />

          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>Your ride helps your community</div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#57534e', margin: '0 0 12px', lineHeight: 1.5 }}>
              Pick where the community share of this ride should go. Good Wheels keeps support local: after a 5% platform
              fee, 90% of the remaining fare goes to your driver and 10% goes to the cause you choose.
            </p>
            <CharityImpactSelection
              categories={charityImpactCategories}
              selectedId={selectedImpactId}
              onSelect={(cat) => setSelectedImpactId(cat.id)}
            />
          </div>

          <RideImpactBreakdown split={fareSplitUsd} formatMoney={formatMoneyUsd} />

          <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', margin: 0, lineHeight: 1.45 }}>
            Final charity routing may depend on verified local partners available in your area.
          </p>

          {selectedImpactCategory ? (
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: '#0f172a',
                padding: '10px 12px',
                borderRadius: 12,
                background: 'rgba(5, 150, 105, 0.08)',
                border: '1px solid rgba(5, 150, 105, 0.2)',
              }}
            >
              Your ride will support: {selectedImpactCategory.title}
            </div>
          ) : null}

          {selectedImpactCategory ? (
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
              Selected impact: {selectedImpactCategory.title}
            </div>
          ) : null}

          {error ? <div className="gw-error">{error}</div> : null}

          <button
            type="button"
            onClick={() => void sendOffer()}
            disabled={loading || !user?.id || !selectedImpactCategory}
            className="gw-button gw-button-primary w-full"
            style={{
              padding: '14px 18px',
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: 0.3,
              opacity: loading || !selectedImpactCategory ? 0.55 : 1,
              cursor: loading || !selectedImpactCategory ? 'not-allowed' : 'pointer',
            }}
          >
            {loading
              ? 'Sending…'
              : selectedImpactCategory
                ? 'Continue to Payment'
                : 'Choose a community cause'}
          </button>

          <button
            type="button"
            onClick={resetCharityFlow}
            className="gw-button w-full"
            style={{
              padding: '12px 18px',
              fontSize: 14,
              fontWeight: 700,
              borderRadius: 12,
              border: '1px solid rgba(15,23,42,0.15)',
              background: '#ffffff',
              cursor: 'pointer',
            }}
          >
            Change ride option
          </button>
        </>
      )}

      {!charityFlowActive && error ? <div className="gw-error">{error}</div> : null}
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
