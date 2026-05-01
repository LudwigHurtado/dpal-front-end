import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { GW_PATHS } from '../../../routes/paths';
import { useRideStore } from '../../../store/useRideStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { nominatimForwardGeocode } from '../../map/nominatimForwardGeocode';
import { nominatimReverseGeocode } from '../../map/nominatimReverseGeocode';
import type { LatLng } from '../../map/mapTypes';

type Mode = 'pickup' | 'dropoff';

type PinPoint = { latLng: LatLng; address: string };

type Status = { kind: 'idle' | 'loading' | 'error' | 'info'; message: string };

const DEFAULT_CENTER: [number, number] = [40.7128, -74.006];
const PICKUP_GREEN = '#16a34a';
const DROPOFF_RED = '#dc2626';
const ACTIVE_RING_PX = 26;

function ClickCapture({ onClick }: { onClick: (ll: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FlyTo({ to, zoomTo = 15 }: { to: LatLng | null; zoomTo?: number }) {
  const map = useMap();
  const last = useRef<string>('');
  useEffect(() => {
    if (!to) return;
    const sig = `${to.lat.toFixed(5)},${to.lng.toFixed(5)}`;
    if (last.current === sig) return;
    last.current = sig;
    map.flyTo([to.lat, to.lng], Math.max(map.getZoom(), zoomTo), { duration: 0.6 });
  }, [to, zoomTo, map]);
  return null;
}

const PassengerLocationPicker: React.FC = () => {
  const navigate = useNavigate();
  const setDraft = useRideStore((s) => s.setDraft);
  const userId = useAuthStore((s) => s.user?.id);

  const [mode, setMode] = useState<Mode>('pickup');
  const [pickup, setPickup] = useState<PinPoint | null>(null);
  const [dropoff, setDropoff] = useState<PinPoint | null>(null);
  const [inputs, setInputs] = useState<Record<Mode, string>>({ pickup: '', dropoff: '' });
  const [status, setStatus] = useState<Status>({ kind: 'idle', message: '' });
  const [isCompact, setIsCompact] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 720 : false));

  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth < 720);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const activePoint = mode === 'pickup' ? pickup : dropoff;
  const setActivePoint = (next: PinPoint | null) => {
    if (mode === 'pickup') setPickup(next);
    else setDropoff(next);
  };

  const center: [number, number] = useMemo(() => {
    if (pickup) return [pickup.latLng.lat, pickup.latLng.lng];
    if (dropoff) return [dropoff.latLng.lat, dropoff.latLng.lng];
    return DEFAULT_CENTER;
  }, [pickup, dropoff]);

  const flyTarget: LatLng | null = activePoint?.latLng ?? null;

  async function handleMapClick(ll: LatLng) {
    setStatus({ kind: 'loading', message: 'Reading address from this point…' });
    setActivePoint({ latLng: ll, address: `${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}` });
    setInputs((s) => ({ ...s, [mode]: `${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}` }));
    const display = await nominatimReverseGeocode(ll);
    if (display) {
      setActivePoint({ latLng: ll, address: display });
      setInputs((s) => ({ ...s, [mode]: display }));
      setStatus({ kind: 'idle', message: '' });
    } else {
      setStatus({ kind: 'info', message: 'Pinned by GPS coordinates (address not found).' });
    }
    if (mode === 'pickup' && !dropoff) setMode('dropoff');
  }

  async function handleAddressSubmit() {
    const value = inputs[mode].trim();
    if (!value) return;
    setStatus({ kind: 'loading', message: 'Looking up address…' });
    const ll = await nominatimForwardGeocode(value);
    if (!ll) {
      setStatus({ kind: 'error', message: 'Could not find that address. Try a more specific one or tap the map.' });
      return;
    }
    setActivePoint({ latLng: ll, address: value });
    setStatus({ kind: 'idle', message: '' });
    if (mode === 'pickup' && !dropoff) setMode('dropoff');
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setStatus({ kind: 'error', message: 'Geolocation is not available in this browser.' });
      return;
    }
    setStatus({ kind: 'loading', message: 'Getting your current location…' });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const ll: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        await handleMapClick(ll);
      },
      () => setStatus({ kind: 'error', message: 'Could not read your location.' }),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  const bothSet = !!(pickup && dropoff);

  function handleContinue() {
    if (!pickup || !dropoff || !userId) return;
    setDraft({
      pickupAddress: pickup.address,
      pickupLat: pickup.latLng.lat,
      pickupLng: pickup.latLng.lng,
      destinationAddress: dropoff.address,
      destinationLat: dropoff.latLng.lat,
      destinationLng: dropoff.latLng.lng,
    });
    navigate(GW_PATHS.passenger.request);
  }

  const mapHeight = isCompact ? 320 : 420;

  return (
    <div className="gw-card overflow-hidden" style={{ padding: 0 }}>
      <div style={{ position: 'relative', width: '100%', height: mapHeight }}>
        <MapContainer
          center={center}
          zoom={pickup || dropoff ? 14 : 12}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          attributionControl
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          />
          <ClickCapture onClick={handleMapClick} />
          <FlyTo to={flyTarget} />

          {pickup ? (
            <>
              <CircleMarker
                center={[pickup.latLng.lat, pickup.latLng.lng]}
                radius={ACTIVE_RING_PX}
                pathOptions={{
                  color: PICKUP_GREEN,
                  weight: mode === 'pickup' ? 3 : 1.5,
                  opacity: mode === 'pickup' ? 0.9 : 0.5,
                  fillColor: PICKUP_GREEN,
                  fillOpacity: mode === 'pickup' ? 0.18 : 0.08,
                  dashArray: mode === 'pickup' ? undefined : '4 4',
                }}
              />
              <CircleMarker
                center={[pickup.latLng.lat, pickup.latLng.lng]}
                radius={9}
                pathOptions={{ color: '#ffffff', weight: 2, fillColor: PICKUP_GREEN, fillOpacity: 1 }}
              />
            </>
          ) : null}

          {dropoff ? (
            <>
              <CircleMarker
                center={[dropoff.latLng.lat, dropoff.latLng.lng]}
                radius={ACTIVE_RING_PX}
                pathOptions={{
                  color: DROPOFF_RED,
                  weight: mode === 'dropoff' ? 3 : 1.5,
                  opacity: mode === 'dropoff' ? 0.9 : 0.5,
                  fillColor: DROPOFF_RED,
                  fillOpacity: mode === 'dropoff' ? 0.18 : 0.08,
                  dashArray: mode === 'dropoff' ? undefined : '4 4',
                }}
              />
              <CircleMarker
                center={[dropoff.latLng.lat, dropoff.latLng.lng]}
                radius={9}
                pathOptions={{ color: '#ffffff', weight: 2, fillColor: DROPOFF_RED, fillOpacity: 1 }}
              />
            </>
          ) : null}
        </MapContainer>

        {/* Mode toggle (top-left overlay) */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 1000,
            display: 'flex',
            gap: 6,
            background: 'rgba(255,255,255,0.96)',
            padding: 4,
            borderRadius: 999,
            boxShadow: '0 4px 14px rgba(15,23,42,0.16)',
          }}
        >
          <button
            type="button"
            onClick={() => setMode('pickup')}
            aria-pressed={mode === 'pickup'}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.2,
              border: `2px solid ${PICKUP_GREEN}`,
              background: mode === 'pickup' ? PICKUP_GREEN : 'transparent',
              color: mode === 'pickup' ? '#ffffff' : PICKUP_GREEN,
              cursor: 'pointer',
            }}
          >
            ● Pick me up
          </button>
          <button
            type="button"
            onClick={() => setMode('dropoff')}
            aria-pressed={mode === 'dropoff'}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.2,
              border: `2px solid ${DROPOFF_RED}`,
              background: mode === 'dropoff' ? DROPOFF_RED : 'transparent',
              color: mode === 'dropoff' ? '#ffffff' : DROPOFF_RED,
              cursor: 'pointer',
            }}
          >
            ● Drop me off
          </button>
        </div>

        {/* GPS button (top-right overlay) */}
        <button
          type="button"
          onClick={useCurrentLocation}
          aria-label="Use my current location"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 1000,
            width: 40,
            height: 40,
            borderRadius: 999,
            border: '1px solid rgba(15,23,42,0.10)',
            background: 'rgba(255,255,255,0.96)',
            boxShadow: '0 4px 14px rgba(15,23,42,0.16)',
            cursor: 'pointer',
            fontSize: 18,
          }}
        >
          ◎
        </button>

        {/* Status pill (bottom-center overlay) */}
        {status.message ? (
          <div
            role="status"
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 12,
              transform: 'translateX(-50%)',
              zIndex: 1000,
              padding: '6px 12px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              background:
                status.kind === 'error' ? '#fee2e2' : status.kind === 'loading' ? '#e0f2fe' : '#ecfeff',
              color:
                status.kind === 'error' ? '#991b1b' : status.kind === 'loading' ? '#075985' : '#155e75',
              boxShadow: '0 4px 14px rgba(15,23,42,0.12)',
              maxWidth: '90%',
              textAlign: 'center',
            }}
          >
            {status.message}
          </div>
        ) : null}
      </div>

      {/* Address input + chips + continue */}
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={inputs[mode]}
            onChange={(e) => setInputs((s) => ({ ...s, [mode]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleAddressSubmit();
              }
            }}
            className="gw-input"
            style={{ flex: 1 }}
            placeholder={mode === 'pickup' ? 'Pickup address — or tap the map' : 'Drop-off address — or tap the map'}
            aria-label={mode === 'pickup' ? 'Pickup address' : 'Drop-off address'}
          />
          <button
            type="button"
            onClick={() => void handleAddressSubmit()}
            disabled={!inputs[mode].trim()}
            className="gw-button gw-button-secondary"
            style={{ whiteSpace: 'nowrap' }}
          >
            Set
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setMode('pickup')}
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: 'left',
              padding: '8px 12px',
              borderRadius: 12,
              border: `2px solid ${mode === 'pickup' ? PICKUP_GREEN : 'rgba(22,163,74,0.35)'}`,
              background: pickup ? 'rgba(22,163,74,0.08)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: PICKUP_GREEN, letterSpacing: 0.4 }}>
              ● PICKUP
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pickup ? pickup.address : 'Tap the map or type an address'}
            </div>
          </button>
          <button
            type="button"
            onClick={() => setMode('dropoff')}
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: 'left',
              padding: '8px 12px',
              borderRadius: 12,
              border: `2px solid ${mode === 'dropoff' ? DROPOFF_RED : 'rgba(220,38,38,0.35)'}`,
              background: dropoff ? 'rgba(220,38,38,0.08)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: DROPOFF_RED, letterSpacing: 0.4 }}>
              ● DROP-OFF
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {dropoff ? dropoff.address : 'Tap the map or type an address'}
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!bothSet || !userId}
          className="gw-button gw-button-primary w-full"
          style={{
            opacity: bothSet && userId ? 1 : 0.55,
            cursor: bothSet && userId ? 'pointer' : 'not-allowed',
            fontWeight: 800,
            letterSpacing: 0.3,
          }}
        >
          {bothSet ? 'Continue → Negotiate with driver' : 'Pick both points to continue'}
        </button>
      </div>
    </div>
  );
};

export default PassengerLocationPicker;
