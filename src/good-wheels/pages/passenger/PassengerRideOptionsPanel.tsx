import React from 'react';
import type { GwTranslationKey } from '../../i18n/gwTranslations';

type GwT = (key: GwTranslationKey) => string;
type GwTf = (key: GwTranslationKey, values: Record<string, string | number>) => string;

export type PassengerRideVehicleId = 'car' | 'comfort' | 'moto' | 'large' | 'delivery';

type NegotiationState = 'idle' | 'pending' | 'countered' | 'accepted';

export type VehicleRowDef = {
  id: PassengerRideVehicleId;
  sub: string;
  emoji: string;
  mult: number;
  eta: string;
  /** Listed fare for this tier at current route (USD). */
  estimatedUsd: number;
};

const spin = (
  <span
    style={{
      display: 'inline-block',
      width: 16,
      height: 16,
      border: '2px solid rgba(255,255,255,0.35)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'gw-spin-panel 0.7s linear infinite',
      flexShrink: 0,
    }}
  />
);

type Props = {
  t: GwT;
  tf: GwTf;
  onBack: () => void;
  pickupSummary: string;
  dropoffSummary: string;
  routeDistanceKm: number | null;
  routeDurationMinutes: number | null;
  vehicles: VehicleRowDef[];
  vehicleType: PassengerRideVehicleId;
  onVehicleType: (id: PassengerRideVehicleId) => void;
  recommendedUsd: number;
  maxPrice: string;
  setMaxPrice: (v: string) => void;
  onSendOffer: (explicitUsd?: number) => void;
  broadcasting: boolean;
  bothSet: boolean;
  negotiationState: NegotiationState;
  driverCounterOffer: number | null;
  onAcceptCounter: () => void;
  onKeepMyOffer: () => void;
  negotiationNote: string | null;
};

function vehicleTitleKey(id: PassengerRideVehicleId): GwTranslationKey {
  switch (id) {
    case 'car':
      return 'vehicle_standard';
    case 'comfort':
      return 'vehicle_comfort';
    case 'moto':
      return 'vehicle_moto';
    case 'large':
      return 'vehicle_large';
    case 'delivery':
      return 'service_delivery';
    default:
      return 'vehicle_standard';
  }
}

function vehicleSubtitleKey(id: PassengerRideVehicleId): GwTranslationKey {
  switch (id) {
    case 'car':
      return 'vehicle_standard_sub';
    case 'comfort':
      return 'vehicle_comfort_sub';
    case 'moto':
      return 'vehicle_moto_sub';
    case 'large':
      return 'vehicle_large_sub';
    case 'delivery':
      return 'service_delivery_sub';
    default:
      return 'vehicle_standard_sub';
  }
}

export const PassengerRideOptionsPanel: React.FC<Props> = ({
  t,
  tf,
  onBack,
  pickupSummary,
  dropoffSummary,
  routeDistanceKm,
  routeDurationMinutes,
  vehicles,
  vehicleType,
  onVehicleType,
  recommendedUsd,
  maxPrice,
  setMaxPrice,
  onSendOffer,
  broadcasting,
  bothSet,
  negotiationState,
  driverCounterOffer,
  onAcceptCounter,
  onKeepMyOffer,
  negotiationNote,
}) => {
  const offerNum = Number(maxPrice);
  const offerOk = Number.isFinite(offerNum) && offerNum > 0;
  const sendDisabled = broadcasting || !bothSet || negotiationState === 'pending' || !offerOk;
  const recStr = recommendedUsd.toFixed(2);

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 6 }}>
      <style>{`@keyframes gw-spin-panel { to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px 6px' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.4)',
            border: '1px solid rgba(226,232,240,0.75)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          aria-label={t('ride_options_back')}
          title={t('ride_options_back')}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pickupSummary} <span style={{ color: '#94a3b8' }}>→</span> {dropoffSummary}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginTop: 2 }}>
            {routeDistanceKm !== null ? `${routeDistanceKm} km` : '—'}
            {routeDurationMinutes != null ? ` · ${tf('eta_min', { minutes: routeDurationMinutes })}` : ` · ${t('routePreview')}`}
          </div>
        </div>
      </div>

      <div style={{ padding: '4px 12px 8px' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', marginBottom: 4 }}>
          {t('choose_service')}
        </div>
        <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 600, color: '#64748b', lineHeight: 1.45 }}>
          {t('fareEstimateDisclaimer')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {vehicles.map((v) => {
            const sel = v.id === vehicleType;
            const rowFare = v.estimatedUsd.toFixed(2);
            const etaLine = (() => {
              const m = Number.parseInt(v.eta, 10);
              return Number.isFinite(m) ? tf('eta_min', { minutes: m }) : v.eta;
            })();
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onVehicleType(v.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  minHeight: 52,
                  padding: '10px 12px',
                  borderRadius: 14,
                  border: sel ? '2px solid #0077C8' : '1px solid rgba(226,232,240,0.85)',
                  background: sel ? 'rgba(0, 119, 200, 0.12)' : 'rgba(255,255,255,0.38)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{v.emoji}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: sel ? '#0369a1' : '#0f172a' }}>{t(vehicleTitleKey(v.id))}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginTop: 2 }}>{t(vehicleSubtitleKey(v.id))}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', marginTop: 1 }}>{etaLine}</div>
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 72 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 900,
                      color: sel ? '#0369a1' : '#0f172a',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    ${rowFare}
                  </div>
                  {sel && (
                    <div style={{ fontSize: 9, fontWeight: 800, color: '#0077c8', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {t('ride_vehicle_selected')}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          margin: '6px 12px 0',
          padding: '12px 14px',
          borderRadius: 16,
          background: 'rgba(255,255,255,0.34)',
          border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b' }}>
          {t('recommended_rate')}
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: '#0f172a',
            letterSpacing: '-0.02em',
            marginTop: 2,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          ${recStr} <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>USD</span>
        </div>

        <div style={{ marginTop: 10, fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b' }}>
          {t('yourOffer')}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 4,
            background: 'rgba(255,255,255,0.55)',
            borderRadius: 12,
            border: '1px solid rgba(226,232,240,0.75)',
            padding: '8px 10px',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 800, color: '#475569' }}>$</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={recStr}
            value={maxPrice}
            onChange={(e) => {
              const next = e.target.value.replace(/[^\d.]/g, '');
              const parts = next.split('.');
              const normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : next;
              setMaxPrice(normalized);
            }}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 16,
              fontWeight: 700,
              color: '#0f172a',
              fontFamily: 'inherit',
              fontVariantNumeric: 'tabular-nums',
            }}
          />
        </div>
        {maxPrice.trim() !== '' && !offerOk ? (
          <p style={{ margin: '6px 0 0', fontSize: 10, color: '#B45309', fontWeight: 600 }}>{t('offer_amount_invalid')}</p>
        ) : null}

        {negotiationState !== 'countered' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            <button
              type="button"
              disabled={sendDisabled}
              onClick={() => onSendOffer(recommendedUsd)}
              style={{
                width: '100%',
                minHeight: 46,
                borderRadius: 12,
                border: 'none',
                background: sendDisabled ? '#94A3B8' : '#0077C8',
                color: '#fff',
                fontSize: 14,
                fontWeight: 800,
                cursor: sendDisabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {negotiationState === 'pending' ? (
                <>
                  {spin}
                  {t('negotiating')}
                </>
              ) : broadcasting ? (
                <>
                  {spin}
                  {t('broadcasting')}
                </>
              ) : (
                t('accept_recommended_rate')
              )}
            </button>
            <button
              type="button"
              disabled={sendDisabled}
              onClick={() => onSendOffer()}
              style={{
                width: '100%',
                minHeight: 46,
                borderRadius: 12,
                border: '2px solid #0077C8',
                background: 'rgba(255,255,255,0.45)',
                color: '#0369A1',
                fontSize: 14,
                fontWeight: 800,
                cursor: sendDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              {t('offer_my_rate')}
            </button>
          </div>
        ) : null}
      </div>

      {negotiationState === 'countered' && driverCounterOffer !== null && (
        <div style={{ margin: '10px 12px 0', display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => void onAcceptCounter()}
            style={{
              flex: 1,
              border: 'none',
              borderRadius: 12,
              background: '#0077C8',
              color: '#fff',
              padding: '10px 8px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {t('acceptCounter')} ${driverCounterOffer.toFixed(2)}
          </button>
          <button
            type="button"
            onClick={() => void onKeepMyOffer()}
            style={{
              flex: 1,
              border: '1px solid rgba(203,213,225,0.95)',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.5)',
              color: '#111827',
              padding: '10px 8px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {t('keepMyOffer')}
          </button>
        </div>
      )}

      {negotiationNote ? (
        <p style={{ textAlign: 'center', fontSize: 11, color: '#475569', fontWeight: 600, margin: '10px 14px 2px', lineHeight: 1.45 }}>
          {negotiationNote}
        </p>
      ) : null}

      <p style={{ textAlign: 'center', fontSize: 9, color: '#94A3B8', fontWeight: 600, margin: '8px 14px 0', lineHeight: 1.35 }}>
        {t('rideNotActiveUntilAccepted')}
      </p>
    </div>
  );
};
