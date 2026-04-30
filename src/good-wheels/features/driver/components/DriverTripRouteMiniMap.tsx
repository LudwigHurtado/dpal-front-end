import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Trip } from '../../trips/tripTypes';
import type { LatLng } from '../../map/mapTypes';
import { nominatimForwardGeocode } from '../../map/nominatimForwardGeocode';
import { useGwLang } from '../../../i18n/useGwLang';

function routeSvgFallback(tripId: string) {
  const id = `gw-mini-${tripId.replace(/[^a-zA-Z0-9_-]/g, '') || 'x'}`;
  return (
    <svg viewBox="0 0 120 96" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>
      <rect width="120" height="96" fill={`url(#${id})`} />
      <path d="M12 72 Q40 20 108 28" fill="none" stroke="#1a73e8" strokeWidth="3" strokeLinecap="round" />
      <circle cx="14" cy="70" r="5" fill="#16a34a" stroke="#fff" strokeWidth="2" />
      <circle cx="106" cy="26" r="5" fill="#dc2626" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

function FitTripBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 13);
      return;
    }
    const b = L.latLngBounds(positions);
    if (b.isValid()) map.fitBounds(b, { padding: [10, 10], maxZoom: 15 });
  }, [map, positions]);
  return null;
}

const NOMINATIM_GAP_MS = 1100;

/**
 * Compact pickup → drop-off preview for driver cards (Leaflet + OSM; no Google).
 * Geocodes via Nominatim when coordinates are missing; lazy-mounts the map when near the viewport.
 */
const DriverTripRouteMiniMap: React.FC<{ trip: Trip; className?: string }> = ({ trip, className = '' }) => {
  const t = useGwLang((s) => s.t);
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [pickupLL, setPickupLL] = useState<LatLng | null>(() => (trip.pickup.point as LatLng | undefined) ?? null);
  const [dropoffLL, setDropoffLL] = useState<LatLng | null>(() => (trip.dropoff.point as LatLng | undefined) ?? null);
  const [geoDone, setGeoDone] = useState(() => Boolean(trip.pickup.point && trip.dropoff.point));
  const [geoFailed, setGeoFailed] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setInView(true);
      },
      { rootMargin: '120px', threshold: 0.01 },
    );
    ob.observe(root);
    return () => ob.disconnect();
  }, []);

  const pickupAddress = trip.pickup.addressLine?.trim() ?? '';
  const dropoffAddress = trip.dropoff.addressLine?.trim() ?? '';

  useEffect(() => {
    if (!inView) return;
    if (trip.pickup.point && trip.dropoff.point) {
      setPickupLL(trip.pickup.point as LatLng);
      setDropoffLL(trip.dropoff.point as LatLng);
      setGeoFailed(false);
      setGeoDone(true);
      return;
    }

    const ac = new AbortController();
    let cancelled = false;
    setGeoDone(false);
    setGeoFailed(false);

    (async () => {
      try {
        let p: LatLng | null = trip.pickup.point ? (trip.pickup.point as LatLng) : null;
        let d: LatLng | null = trip.dropoff.point ? (trip.dropoff.point as LatLng) : null;
        let usedNominatim = false;

        if (!p && pickupAddress) {
          p = await nominatimForwardGeocode(pickupAddress, ac.signal);
          if (cancelled) return;
          usedNominatim = true;
        }
        if (!d && dropoffAddress) {
          if (usedNominatim) await new Promise((r) => setTimeout(r, NOMINATIM_GAP_MS));
          if (cancelled) return;
          d = await nominatimForwardGeocode(dropoffAddress, ac.signal);
        }

        if (cancelled) return;
        setPickupLL(p);
        setDropoffLL(d);
        if (!p || !d) setGeoFailed(true);
      } catch {
        if (!cancelled) setGeoFailed(true);
      } finally {
        if (!cancelled) setGeoDone(true);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [inView, trip.id, trip.pickup.point, trip.dropoff.point, pickupAddress, dropoffAddress]);

  const missingCoords = !pickupLL || !dropoffLL;
  const showLeaflet = inView && geoDone && !geoFailed && !missingCoords;
  const showSvgError = geoDone && (geoFailed || missingCoords);
  const showSchematicOnly = geoDone && !missingCoords && !geoFailed && !inView;
  const showPulse = inView && !geoDone;

  const linePositions = useMemo((): [number, number][] => {
    if (!pickupLL || !dropoffLL) return [];
    return [
      [pickupLL.lat, pickupLL.lng],
      [dropoffLL.lat, dropoffLL.lng],
    ];
  }, [pickupLL, dropoffLL]);

  const fitPositions = useMemo((): [number, number][] => {
    if (!pickupLL || !dropoffLL) return pickupLL ? [[pickupLL.lat, pickupLL.lng]] : [];
    return linePositions;
  }, [pickupLL, dropoffLL, linePositions]);

  return (
    <div
      ref={rootRef}
      className={`relative isolate h-full min-h-[96px] w-full overflow-hidden rounded-xl bg-slate-100 sm:min-h-[96px] ${className}`}
      role="img"
      aria-label={t('routePreview')}
    >
      {!showLeaflet ? (
        <div className="absolute inset-0 z-0">
          {showSvgError ? (
            <div className="relative h-full w-full">
              {routeSvgFallback(trip.id)}
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-white/90 px-1 py-0.5 text-center text-[9px] font-semibold leading-tight text-slate-600">
                {t('mapPreviewUnavailable')}
              </div>
            </div>
          ) : showSchematicOnly ? (
            routeSvgFallback(trip.id)
          ) : showPulse ? (
            <div className="h-full w-full animate-pulse bg-slate-200/70" />
          ) : (
            <div className="h-full w-full bg-slate-200/40" />
          )}
        </div>
      ) : null}

      {showLeaflet && pickupLL && dropoffLL ? (
        <div className="gw-driver-leaflet-mini relative z-[1] h-full min-h-[96px] w-full">
          <MapContainer
            key={`gw-mini-${trip.id}`}
            center={[pickupLL.lat, pickupLL.lng]}
            zoom={12}
            style={{ height: '96px', width: '100%', minHeight: '96px' }}
            className="z-0 rounded-xl"
            zoomControl={false}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            boxZoom={false}
            keyboard={false}
            attributionControl
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Polyline positions={linePositions} pathOptions={{ color: '#1a73e8', weight: 4, opacity: 0.9 }} />
            <CircleMarker
              center={[pickupLL.lat, pickupLL.lng]}
              radius={7}
              pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#16a34a', fillOpacity: 1 }}
            />
            <CircleMarker
              center={[dropoffLL.lat, dropoffLL.lng]}
              radius={7}
              pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#dc2626', fillOpacity: 1 }}
            />
            <FitTripBounds positions={fitPositions} />
          </MapContainer>
        </div>
      ) : null}
    </div>
  );
};

export default DriverTripRouteMiniMap;
