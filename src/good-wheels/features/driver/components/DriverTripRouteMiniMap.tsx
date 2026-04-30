import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Trip } from '../../trips/tripTypes';
import { useGoogleMaps } from '../../map/useGoogleMaps';
import { geocodeAddress, midpoint } from '../../map/mapUtils';
import type { LatLng } from '../../map/mapTypes';
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

/**
 * Compact pickup → drop-off preview for driver queue/dashboard cards.
 * Lazy-loads Google Maps when scrolled into view; falls back to SVG if the key is missing or geocoding fails.
 */
const DriverTripRouteMiniMap: React.FC<{ trip: Trip; className?: string }> = ({ trip, className = '' }) => {
  const t = useGwLang((s) => s.t);
  const { google: g, ready, error: mapsError } = useGoogleMaps();
  const rootRef = useRef<HTMLDivElement>(null);
  const mapElRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [pickupLL, setPickupLL] = useState<LatLng | null>(() => (trip.pickup.point as LatLng | undefined) ?? null);
  const [dropoffLL, setDropoffLL] = useState<LatLng | null>(() => (trip.dropoff.point as LatLng | undefined) ?? null);
  const [geoDone, setGeoDone] = useState(() => Boolean(trip.pickup.point && trip.dropoff.point));
  const [geoFailed, setGeoFailed] = useState(false);
  const [mapTilesReady, setMapTilesReady] = useState(false);

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
    if (!ready || !g) return;
    let cancelled = false;
    setGeoDone(false);
    setGeoFailed(false);
    (async () => {
      try {
        const [p, d] = await Promise.all([
          trip.pickup.point ? Promise.resolve(trip.pickup.point as LatLng) : pickupAddress ? geocodeAddress(g, pickupAddress) : Promise.resolve(null),
          trip.dropoff.point ? Promise.resolve(trip.dropoff.point as LatLng) : dropoffAddress ? geocodeAddress(g, dropoffAddress) : Promise.resolve(null),
        ]);
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
    };
  }, [inView, ready, g, trip.id, trip.pickup.point, trip.dropoff.point, pickupAddress, dropoffAddress]);

  const missingCoords = !pickupLL || !dropoffLL;
  const showLiveMap = inView && ready && !mapsError && !missingCoords && !geoFailed;
  const showSvgError = Boolean(mapsError) || (geoDone && (geoFailed || missingCoords));
  /** Geocoding / waiting for Maps JS */
  const showPulse = inView && !mapsError && !geoDone;
  /** Resolved coords but card not intersecting yet — schematic route strip */
  const showSchematicOnly = geoDone && !missingCoords && !geoFailed && !mapsError && !inView;
  const showLoadingOverlay = inView && !showLiveMap && !showSvgError && (!ready || !geoDone);

  const mapCenter = useMemo(() => {
    if (pickupLL && dropoffLL) return midpoint(pickupLL, dropoffLL);
    return pickupLL ?? dropoffLL ?? { lat: 40.7128, lng: -74.006 };
  }, [pickupLL, dropoffLL]);

  useEffect(() => {
    if (!showLiveMap) {
      setMapTilesReady(false);
      return;
    }
    if (!mapElRef.current || !g || !pickupLL || !dropoffLL) return;

    const el = mapElRef.current;
    setMapTilesReady(false);
    const map = new g.maps.Map(el, {
      center: mapCenter,
      zoom: 11,
      disableDefaultUI: true,
      gestureHandling: 'none',
      draggable: false,
      scrollwheel: false,
      keyboardShortcuts: false,
      clickableIcons: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    const pickupMarker = new g.maps.Marker({
      map,
      position: pickupLL,
      zIndex: 3,
      icon: {
        path: g.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: '#16a34a',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });
    const dropMarker = new g.maps.Marker({
      map,
      position: dropoffLL,
      zIndex: 3,
      icon: {
        path: g.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: '#dc2626',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });

    const dr = new g.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#1a73e8', strokeOpacity: 0.95, strokeWeight: 4 },
    });

    let fallbackLine: google.maps.Polyline | null = null;
    const svc = new g.maps.DirectionsService();
    svc.route(
      {
        origin: pickupLL,
        destination: dropoffLL,
        travelMode: g.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result?.routes?.[0]) {
          dr.setMap(map);
          dr.setDirections(result);
        } else {
          dr.setMap(null);
          fallbackLine = new g.maps.Polyline({
            map,
            path: [pickupLL, dropoffLL],
            strokeColor: '#1a73e8',
            strokeOpacity: 0.9,
            strokeWeight: 4,
            geodesic: true,
          });
        }
        const b = new g.maps.LatLngBounds();
        b.extend(pickupLL);
        b.extend(dropoffLL);
        map.fitBounds(b, 20);
      },
    );

    const idleListener = g.maps.event.addListenerOnce(map, 'idle', () => {
      setMapTilesReady(true);
    });

    return () => {
      g.maps.event.removeListener(idleListener);
      pickupMarker.setMap(null);
      dropMarker.setMap(null);
      fallbackLine?.setMap(null);
      dr.setMap(null);
      setMapTilesReady(false);
    };
  }, [showLiveMap, g, pickupLL, dropoffLL, mapCenter, trip.id]);

  return (
    <div
      ref={rootRef}
      className={`relative isolate h-full min-h-[96px] w-full overflow-hidden rounded-xl bg-slate-100 sm:min-h-[96px] ${className}`}
      role="img"
      aria-label={t('routePreview')}
    >
      {!showLiveMap ? (
        <div className="absolute inset-0 z-0">
          {showSvgError ? (
            <div className="relative h-full w-full">
              {routeSvgFallback(trip.id)}
              {mapsError ? (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-white/90 px-1 py-0.5 text-center text-[9px] font-semibold leading-tight text-slate-600">
                  {t('mapPreviewUnavailable')}
                </div>
              ) : null}
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

      {showLoadingOverlay ? (
        <div className="absolute inset-0 z-[2] flex items-center justify-center bg-slate-100/85">
          <span className="text-[10px] font-semibold text-slate-500">{t('loading')}</span>
        </div>
      ) : null}

      {showLiveMap ? (
        <>
          <div ref={mapElRef} className="relative z-[1] h-full min-h-[96px] w-full" />
          {!mapTilesReady ? (
            <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-slate-100/80">
              <span className="text-[10px] font-semibold text-slate-500">{t('loading')}</span>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

export default DriverTripRouteMiniMap;
