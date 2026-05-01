import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
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

function FitToRoute({ pickup, dropoff }: { pickup: LatLng | null; dropoff: LatLng | null }) {
  const map = useMap();
  const last = useRef<string>('');
  useEffect(() => {
    if (!pickup || !dropoff) return;
    const sig = `${pickup.lat.toFixed(4)},${pickup.lng.toFixed(4)}|${dropoff.lat.toFixed(4)},${dropoff.lng.toFixed(4)}`;
    if (last.current === sig) return;
    last.current = sig;
    const bounds = L.latLngBounds([
      [pickup.lat, pickup.lng],
      [dropoff.lat, dropoff.lng],
    ]);
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [pickup, dropoff, map]);
  return null;
}

async function fetchClosestRoute(a: LatLng, b: LatLng, signal?: AbortSignal): Promise<[number, number][] | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson&alternatives=false`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { routes?: { geometry?: { coordinates?: [number, number][] } }[] };
    const coords = data.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    return coords.map(([lng, lat]) => [lat, lng] as [number, number]);
  } catch {
    return null;
  }
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
  const [routeLine, setRouteLine] = useState<[number, number][] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    if (!pickup || !dropoff) {
      setRouteLine(null);
      setRouteLoading(false);
      return;
    }
    const ac = new AbortController();
    setRouteLoading(true);
    fetchClosestRoute(pickup.latLng, dropoff.latLng, ac.signal).then((coords) => {
      if (ac.signal.aborted) return;
      setRouteLine(
        coords ?? [
          [pickup.latLng.lat, pickup.latLng.lng],
          [dropoff.latLng.lat, dropoff.latLng.lng],
        ],
      );
      setRouteLoading(false);
    });
    return () => {
      ac.abort();
      setRouteLoading(false);
    };
  }, [pickup, dropoff]);

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

  async function submitAddressFor(target: Mode) {
    const value = inputs[target].trim();
    if (!value) return;
    setStatus({ kind: 'loading', message: 'Looking up address…' });
    const ll = await nominatimForwardGeocode(value);
    if (!ll) {
      setStatus({ kind: 'error', message: 'Could not find that address. Try a more specific one or tap the map.' });
      return;
    }
    if (target === 'pickup') setPickup({ latLng: ll, address: value });
    else setDropoff({ latLng: ll, address: value });
    setMode(target);
    setStatus({ kind: 'idle', message: '' });
    if (target === 'pickup' && !dropoff) setMode('dropoff');
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

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 'min(78dvh, 720px)',
          minHeight: 420,
        }}
      >
        <MapContainer
          center={center}
          zoom={pickup || dropoff ? 14 : 12}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          attributionControl
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <ClickCapture onClick={handleMapClick} />
          <FlyTo to={flyTarget} />
          <FitToRoute pickup={pickup?.latLng ?? null} dropoff={dropoff?.latLng ?? null} />

          {routeLine && routeLine.length > 1 ? (
            <>
              <Polyline
                positions={routeLine}
                pathOptions={{ color: '#0b1f3a', weight: 8, opacity: 0.35, lineCap: 'round', lineJoin: 'round' }}
              />
              <Polyline
                positions={routeLine}
                pathOptions={{ color: '#1a73e8', weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
              />
            </>
          ) : null}

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

        {/* Mode toggle (top-center overlay) */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
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

        {/* Status pill (above inputs overlay) */}
        {status.message ? (
          <div
            role="status"
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 200,
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

        {/* Route loading hint */}
        {routeLoading ? (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 64,
              transform: 'translateX(-50%)',
              zIndex: 1000,
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              background: 'rgba(255,255,255,0.92)',
              color: '#0f172a',
              boxShadow: '0 4px 14px rgba(15,23,42,0.10)',
            }}
          >
            Finding closest route…
          </div>
        ) : null}

        {/* Translucent inputs overlay anchored to bottom of map */}
        <div
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: 12,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: 12,
            borderRadius: 18,
            background: 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.55)',
            boxShadow: '0 12px 30px rgba(15,23,42,0.18)',
          }}
        >
        {(['pickup', 'dropoff'] as const).map((slot) => {
          const color = slot === 'pickup' ? PICKUP_GREEN : DROPOFF_RED;
          const label = slot === 'pickup' ? 'PICKUP' : 'DROP-OFF';
          const placeholder = slot === 'pickup' ? 'Pickup address — or tap the map' : 'Drop-off address — or tap the map';
          const isActive = mode === slot;
          const isSet = slot === 'pickup' ? !!pickup : !!dropoff;
          return (
            <div
              key={slot}
              onClick={() => setMode(slot)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px 8px 12px',
                borderRadius: 14,
                border: `2px solid ${color}`,
                background: 'transparent',
                boxShadow: isActive ? `0 0 0 3px ${color}33` : 'none',
                transition: 'box-shadow 120ms ease',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: isSet ? color : 'transparent',
                  border: `2px solid ${color}`,
                  flex: '0 0 auto',
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, color }}>{label}</div>
                <input
                  value={inputs[slot]}
                  onFocus={() => setMode(slot)}
                  onChange={(e) => setInputs((s) => ({ ...s, [slot]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void submitAddressFor(slot);
                    }
                  }}
                  placeholder={placeholder}
                  aria-label={`${label} address`}
                  style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#0f172a',
                    padding: '2px 0',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void submitAddressFor(slot);
                }}
                disabled={!inputs[slot].trim()}
                style={{
                  padding: '6px 10px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 0.3,
                  border: `1px solid ${color}`,
                  background: inputs[slot].trim() ? color : 'transparent',
                  color: inputs[slot].trim() ? '#ffffff' : color,
                  cursor: inputs[slot].trim() ? 'pointer' : 'not-allowed',
                  opacity: inputs[slot].trim() ? 1 : 0.55,
                }}
              >
                SET
              </button>
            </div>
          );
        })}

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
    </div>
  );
};

export default PassengerLocationPicker;
