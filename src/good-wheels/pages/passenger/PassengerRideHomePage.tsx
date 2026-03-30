import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GW_PATHS } from '../../routes/paths';
import { useGoogleMaps } from '../../features/map/useGoogleMaps';
import { useTripStore } from '../../features/trips/tripStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { LatLng } from '../../features/map/mapTypes';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type RideTier = 'economy' | 'comfort' | 'xl';
type ActiveField = 'pickup' | 'dropoff' | null;

interface RideOption {
  id: RideTier;
  label: string;
  price: number;
  etaMin: number;
}

const RIDE_OPTIONS: RideOption[] = [
  { id: 'economy', label: 'Economy', price: 12, etaMin: 5 },
  { id: 'comfort', label: 'Comfort', price: 18, etaMin: 3 },
  { id: 'xl', label: 'XL', price: 25, etaMin: 6 },
];

const TIER_COLOR: Record<RideTier, string> = {
  economy: '#0077C8',
  comfort: '#0D3B66',
  xl: '#2FB344',
};

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function getCarSvg(tier: RideTier): string {
  const bg = TIER_COLOR[tier];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
    <circle cx="20" cy="20" r="18" fill="${bg}" stroke="white" stroke-width="2.5"/>
    <rect x="10" y="17" width="20" height="10" rx="3" fill="white" opacity="0.92"/>
    <rect x="13" y="13" width="14" height="8" rx="2" fill="white" opacity="0.70"/>
    <circle cx="14" cy="27.5" r="2.5" fill="${bg}" stroke="white" stroke-width="1"/>
    <circle cx="26" cy="27.5" r="2.5" fill="${bg}" stroke="white" stroke-width="1"/>
  </svg>`;
}

/* GPS icon SVG */
const GpsIcon = ({ color = '#0077C8' }: { color?: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    <circle cx="12" cy="12" r="8" strokeOpacity="0.35" />
  </svg>
);

/* Pin icon SVG */
const PinIcon = ({ color = '#6B7280' }: { color?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={color} stroke="white" strokeWidth="1.4">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
    <circle cx="12" cy="9" r="2.5" fill="white" />
  </svg>
);

const TABS = [
  { id: 'ride' as const, label: 'Ride', icon: '🚗' },
  { id: 'charities' as const, label: 'Charities', icon: '❤️' },
  { id: 'donations' as const, label: 'Donations', icon: '🤝' },
  { id: 'profile' as const, label: 'Profile', icon: '👤' },
];

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
const PassengerRideHomePage: React.FC = () => {
  const navigate = useNavigate();
  const signOut = useAuthStore((s) => s.signOut);
  const draft = useTripStore((s) => s.draft);
  const setDraft = useTripStore((s) => s.setDraft);
  const { google: g, ready } = useGoogleMaps();

  /* Map refs */
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObjRef = useRef<google.maps.Map | null>(null);
  const directionsRendRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
  const dropoffMarkerRef = useRef<google.maps.Marker | null>(null);
  const vehicleMarkerRef = useRef<google.maps.Marker | null>(null);
  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  /* UI state */
  const [selectedRideId, setSelectedRideId] = useState<RideTier>('economy');
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [pickupText, setPickupText] = useState(draft.pickup?.addressLine ?? '');
  const [dropoffText, setDropoffText] = useState(draft.dropoff?.addressLine ?? '');
  const [pickupLL, setPickupLL] = useState<LatLng | null>(draft.pickup?.point ?? null);
  const [dropoffLL, setDropoffLL] = useState<LatLng | null>(draft.dropoff?.point ?? null);
  const [pickupPreds, setPickupPreds] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [dropoffPreds, setDropoffPreds] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [locatingPickup, setLocatingPickup] = useState(false);
  const [locatingDropoff, setLocatingDropoff] = useState(false);
  const [reverseGeoLoading, setReverseGeoLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ride' | 'charities' | 'donations' | 'profile'>('ride');

  /* ── Init map ── */
  useEffect(() => {
    if (!ready || !g || !mapRef.current || mapObjRef.current) return;
    mapObjRef.current = new g.maps.Map(mapRef.current, {
      center: { lat: 40.7128, lng: -74.006 },
      zoom: 13,
      disableDefaultUI: true,
      gestureHandling: 'greedy',
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    });
    directionsRendRef.current = new g.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#F4A300', strokeWeight: 5, strokeOpacity: 0.88 },
    });
    directionsRendRef.current.setMap(mapObjRef.current);
  }, [ready, g]);

  /* ── Map click listener: attach/detach based on activeField ── */
  useEffect(() => {
    // Remove previous listener
    if (mapClickListenerRef.current) {
      mapClickListenerRef.current.remove();
      mapClickListenerRef.current = null;
    }
    if (!g || !mapObjRef.current || !activeField) {
      // Reset cursor
      if (mapObjRef.current) mapObjRef.current.setOptions({ draggableCursor: '' });
      return;
    }

    // Crosshair cursor while in pin mode
    mapObjRef.current.setOptions({ draggableCursor: 'crosshair' });

    mapClickListenerRef.current = mapObjRef.current.addListener(
      'click',
      (e: google.maps.MapMouseEvent) => {
        const lat = e.latLng?.lat();
        const lng = e.latLng?.lng();
        if (typeof lat !== 'number' || typeof lng !== 'number') return;
        const pt: LatLng = { lat, lng };

        setReverseGeoLoading(true);
        const geocoder = new g.maps.Geocoder();
        geocoder.geocode({ location: pt }, (results, status) => {
          const addr =
            status === 'OK' && results?.[0]?.formatted_address
              ? results[0].formatted_address
              : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setReverseGeoLoading(false);

          if (activeField === 'pickup') {
            setPickupText(addr);
            setPickupLL(pt);
            setPickupPreds([]);
            setDraft({ pickup: { label: 'Pickup', addressLine: addr, point: pt } });
          } else {
            setDropoffText(addr);
            setDropoffLL(pt);
            setDropoffPreds([]);
            setDraft({ dropoff: { label: 'Dropoff', addressLine: addr, point: pt } });
          }
          // Deactivate field after pin placement
          setActiveField(null);
        });
      }
    );

    return () => {
      if (mapClickListenerRef.current) {
        mapClickListenerRef.current.remove();
        mapClickListenerRef.current = null;
      }
      if (mapObjRef.current) mapObjRef.current.setOptions({ draggableCursor: '' });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, activeField]);

  /* ── Update markers + route ── */
  useEffect(() => {
    if (!g || !mapObjRef.current) return;

    // Pickup marker — red pin
    if (pickupLL) {
      if (!pickupMarkerRef.current) {
        pickupMarkerRef.current = new g.maps.Marker({
          map: mapObjRef.current,
          title: 'Pickup',
          zIndex: 10,
        });
      }
      pickupMarkerRef.current.setPosition(pickupLL);
      pickupMarkerRef.current.setIcon({
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 36" width="28" height="36">
            <path d="M14 0C6.27 0 0 6.27 0 14c0 9.8 14 22 14 22S28 23.8 28 14C28 6.27 21.73 0 14 0z" fill="#ef4444" stroke="white" stroke-width="1.8"/>
            <circle cx="14" cy="13" r="5" fill="white"/>
            <text x="14" y="17" text-anchor="middle" font-size="7" font-weight="900" fill="#ef4444">A</text>
          </svg>`
        )}`,
        scaledSize: new g.maps.Size(28, 36),
        anchor: new g.maps.Point(14, 36),
      });
    } else {
      pickupMarkerRef.current?.setMap(null);
      pickupMarkerRef.current = null;
    }

    // Dropoff marker — green pin
    if (dropoffLL) {
      if (!dropoffMarkerRef.current) {
        dropoffMarkerRef.current = new g.maps.Marker({
          map: mapObjRef.current,
          title: 'Dropoff',
          zIndex: 10,
        });
      }
      dropoffMarkerRef.current.setPosition(dropoffLL);
      dropoffMarkerRef.current.setIcon({
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 36" width="28" height="36">
            <path d="M14 0C6.27 0 0 6.27 0 14c0 9.8 14 22 14 22S28 23.8 28 14C28 6.27 21.73 0 14 0z" fill="#22c55e" stroke="white" stroke-width="1.8"/>
            <circle cx="14" cy="13" r="5" fill="white"/>
            <text x="14" y="17" text-anchor="middle" font-size="7" font-weight="900" fill="#16a34a">B</text>
          </svg>`
        )}`,
        scaledSize: new g.maps.Size(28, 36),
        anchor: new g.maps.Point(14, 36),
      });
    } else {
      dropoffMarkerRef.current?.setMap(null);
      dropoffMarkerRef.current = null;
    }

    // Route + vehicle preview
    if (pickupLL && dropoffLL && directionsRendRef.current) {
      const dirSvc = new g.maps.DirectionsService();
      dirSvc.route(
        { origin: pickupLL, destination: dropoffLL, travelMode: g.maps.TravelMode.DRIVING },
        (result, status) => {
          if (status === 'OK' && result && directionsRendRef.current) {
            directionsRendRef.current.setDirections(result);
            const path = result.routes[0]?.overview_path;
            if (path && path.length > 0) {
              const idx = Math.floor(path.length * 0.25);
              const pt = path[idx];
              if (!vehicleMarkerRef.current) {
                vehicleMarkerRef.current = new g.maps.Marker({
                  map: mapObjRef.current!,
                  title: 'Your driver',
                  zIndex: 20,
                });
              }
              vehicleMarkerRef.current.setPosition(pt);
              vehicleMarkerRef.current.setIcon({
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(getCarSvg(selectedRideId))}`,
                scaledSize: new g.maps.Size(40, 40),
                anchor: new g.maps.Point(20, 20),
              });
            }
            const bounds = new g.maps.LatLngBounds();
            bounds.extend(pickupLL);
            bounds.extend(dropoffLL);
            mapObjRef.current?.fitBounds(bounds, { top: 120, bottom: 290, left: 32, right: 32 });
          }
        }
      );
    } else {
      if (directionsRendRef.current) directionsRendRef.current.setDirections({ routes: [] } as any);
      vehicleMarkerRef.current?.setMap(null);
      vehicleMarkerRef.current = null;
      if (pickupLL) mapObjRef.current?.panTo(pickupLL);
    }
  }, [g, pickupLL, dropoffLL, selectedRideId]);

  /* ── Vehicle icon refresh on tier change ── */
  useEffect(() => {
    if (!g || !vehicleMarkerRef.current) return;
    vehicleMarkerRef.current.setIcon({
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(getCarSvg(selectedRideId))}`,
      scaledSize: new g.maps.Size(40, 40),
      anchor: new g.maps.Point(20, 20),
    });
  }, [g, selectedRideId]);

  /* ── Autocomplete ── */
  const fetchPredictions = useCallback(
    (input: string, cb: (p: google.maps.places.AutocompletePrediction[]) => void) => {
      if (!g || !input.trim()) { cb([]); return; }
      const svc = new g.maps.places.AutocompleteService();
      svc.getPlacePredictions({ input }, (preds, status) => {
        if (status !== g.maps.places.PlacesServiceStatus.OK || !preds) { cb([]); return; }
        cb(preds.slice(0, 5));
      });
    },
    [g]
  );

  const applyPrediction = useCallback(
    (pred: google.maps.places.AutocompletePrediction, mode: 'pickup' | 'dropoff') => {
      if (!g) return;
      const svc = new g.maps.places.PlacesService(document.createElement('div'));
      svc.getDetails({ placeId: pred.place_id, fields: ['geometry', 'formatted_address'] }, (place, status) => {
        if (status !== g.maps.places.PlacesServiceStatus.OK || !place) return;
        const loc = place.geometry?.location;
        const lat = loc?.lat();
        const lng = loc?.lng();
        const addr = place.formatted_address ?? pred.description;
        const point: LatLng | undefined =
          typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : undefined;
        if (mode === 'pickup') {
          setPickupText(addr);
          if (point) setPickupLL(point);
          setPickupPreds([]);
          setDraft({ pickup: { label: 'Pickup', addressLine: addr, point } });
          setActiveField('dropoff'); // auto-advance to dropoff
        } else {
          setDropoffText(addr);
          if (point) setDropoffLL(point);
          setDropoffPreds([]);
          setDraft({ dropoff: { label: 'Dropoff', addressLine: addr, point } });
          setActiveField(null);
        }
      });
    },
    [g, setDraft]
  );

  /* ── GPS handlers ── */
  const gpsGeocode = (lat: number, lng: number, onAddr: (addr: string) => void) => {
    if (!g) { onAddr(`${lat.toFixed(5)}, ${lng.toFixed(5)}`); return; }
    const geocoder = new g.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      const addr =
        status === 'OK' && results?.[0]?.formatted_address
          ? results[0].formatted_address
          : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      onAddr(addr);
    });
  };

  const handlePickupGps = () => {
    if (!navigator.geolocation) return;
    setLocatingPickup(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const pt: LatLng = { lat: coords.latitude, lng: coords.longitude };
        gpsGeocode(pt.lat, pt.lng, (addr) => {
          setPickupText(addr);
          setPickupLL(pt);
          setPickupPreds([]);
          setDraft({ pickup: { label: 'My Location', addressLine: addr, point: pt } });
          setLocatingPickup(false);
          setActiveField('dropoff'); // auto-advance
        });
      },
      () => setLocatingPickup(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleDropoffGps = () => {
    if (!navigator.geolocation) return;
    setLocatingDropoff(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const pt: LatLng = { lat: coords.latitude, lng: coords.longitude };
        gpsGeocode(pt.lat, pt.lng, (addr) => {
          setDropoffText(addr);
          setDropoffLL(pt);
          setDropoffPreds([]);
          setDraft({ dropoff: { label: 'My Location', addressLine: addr, point: pt } });
          setLocatingDropoff(false);
          setActiveField(null);
        });
      },
      () => setLocatingDropoff(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const requestRide = useTripStore((s) => s.requestRide);
  const canConfirm = pickupText.trim().length > 0 && dropoffText.trim().length > 0;

  const handleConfirmRide = async () => {
    setActiveField(null);
    await requestRide();
    navigate(GW_PATHS.passenger.active);
  };

  const handleTabClick = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === 'charities') navigate(GW_PATHS.passenger.charities);
    else if (tab === 'donations') navigate(GW_PATHS.passenger.donations);
    else if (tab === 'profile') navigate(GW_PATHS.auth.profile);
  };

  /* ─────────────────────────────────────────────
     Render
  ───────────────────────────────────────────── */
  return (
    <div className="gw-ride-home" onClick={() => { if (activeField) setActiveField(null); }}>

      {/* ── Blue brand header ── */}
      <header className="gw-ride-header" onClick={(e) => e.stopPropagation()}>
        <div className="gw-ride-header-inner">
          <div className="gw-ride-brand">
            <div className="gw-ride-logo-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                <line x1="2" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            <div>
              <div className="gw-ride-brand-title">Good Wheels</div>
              <div className="gw-ride-brand-sub">by DPAL · Ride with purpose</div>
            </div>
          </div>
          <button
            className="gw-ride-signout-btn"
            onClick={() => void signOut().then(() => navigate(GW_PATHS.public.home))}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Map stage ── */}
      <div className="gw-ride-map-stage">
        {/* Map canvas */}
        <div ref={mapRef} className="gw-ride-map-canvas" />

        {/* Loading placeholder */}
        {!ready && (
          <div className="gw-ride-map-loading">
            <div className="gw-ride-map-loading-inner">
              <div style={{ fontSize: 36, marginBottom: 8 }}>🗺️</div>
              <div style={{ fontWeight: 700, color: '#6B7280' }}>Loading map…</div>
            </div>
          </div>
        )}

        {/* ── Map pin-mode hint pill ── */}
        {activeField && (
          <div
            className={`gw-map-pin-hint ${activeField === 'pickup' ? 'gw-map-pin-hint--pickup' : 'gw-map-pin-hint--dropoff'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <PinIcon color={activeField === 'pickup' ? '#ef4444' : '#22c55e'} />
            <span>
              {reverseGeoLoading
                ? 'Reading location…'
                : activeField === 'pickup'
                ? 'Tap map to set pickup point'
                : 'Tap map to set dropoff point'}
            </span>
            <button
              type="button"
              className="gw-map-pin-hint-cancel"
              onClick={() => setActiveField(null)}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Floating address card ── */}
        <div className="gw-trip-addr-card" onClick={(e) => e.stopPropagation()}>

          {/* Pickup field */}
          <div className={`gw-addr-field${activeField === 'pickup' ? ' gw-addr-field--pickup-active' : ''}`}>
            <div className="gw-addr-row">
              <div className="gw-addr-dot gw-addr-dot--pickup">
                <PinIcon color="#ef4444" />
              </div>
              <input
                className="gw-addr-input"
                placeholder="Where from? (pickup)"
                value={pickupText}
                onFocus={() => setActiveField('pickup')}
                onChange={(e) => {
                  const v = e.target.value;
                  setPickupText(v);
                  setDraft({ pickup: { label: 'Pickup', addressLine: v, point: pickupLL ?? undefined } });
                  fetchPredictions(v, setPickupPreds);
                }}
              />
              {/* GPS button */}
              <button
                type="button"
                className={`gw-addr-gps-btn${locatingPickup ? ' gw-addr-gps-btn--loading' : ''}`}
                title="Use my GPS location as pickup"
                onClick={handlePickupGps}
                disabled={locatingPickup}
              >
                {locatingPickup
                  ? <span className="gw-addr-gps-spinner" />
                  : <GpsIcon color="#0077C8" />}
              </button>
            </div>

            {/* Active indicator bar */}
            {activeField === 'pickup' && (
              <div className="gw-addr-active-bar gw-addr-active-bar--pickup" />
            )}

            {/* Autocomplete suggestions */}
            {pickupPreds.length > 0 && (
              <div className="gw-addr-preds">
                {pickupPreds.map((p) => (
                  <button
                    key={p.place_id}
                    type="button"
                    className="gw-addr-pred-item"
                    onClick={() => applyPrediction(p, 'pickup')}
                  >
                    <span className="gw-addr-pred-pin" style={{ color: '#ef4444' }}>📍</span>
                    <span className="gw-addr-pred-text">{p.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="gw-addr-connector">
            <div className="gw-addr-connector-line" />
          </div>

          {/* Dropoff field */}
          <div className={`gw-addr-field${activeField === 'dropoff' ? ' gw-addr-field--dropoff-active' : ''}`}>
            <div className="gw-addr-row">
              <div className="gw-addr-dot gw-addr-dot--dropoff">
                <PinIcon color="#22c55e" />
              </div>
              <input
                className="gw-addr-input"
                placeholder="Where to? (dropoff)"
                value={dropoffText}
                onFocus={() => setActiveField('dropoff')}
                onChange={(e) => {
                  const v = e.target.value;
                  setDropoffText(v);
                  setDraft({ dropoff: { label: 'Dropoff', addressLine: v, point: dropoffLL ?? undefined } });
                  fetchPredictions(v, setDropoffPreds);
                }}
              />
              {/* GPS button */}
              <button
                type="button"
                className={`gw-addr-gps-btn${locatingDropoff ? ' gw-addr-gps-btn--loading' : ''}`}
                title="Use my GPS location as dropoff"
                onClick={handleDropoffGps}
                disabled={locatingDropoff}
              >
                {locatingDropoff
                  ? <span className="gw-addr-gps-spinner" />
                  : <GpsIcon color="#22c55e" />}
              </button>
            </div>

            {/* Active indicator bar */}
            {activeField === 'dropoff' && (
              <div className="gw-addr-active-bar gw-addr-active-bar--dropoff" />
            )}

            {/* Autocomplete suggestions */}
            {dropoffPreds.length > 0 && (
              <div className="gw-addr-preds">
                {dropoffPreds.map((p) => (
                  <button
                    key={p.place_id}
                    type="button"
                    className="gw-addr-pred-item"
                    onClick={() => applyPrediction(p, 'dropoff')}
                  >
                    <span className="gw-addr-pred-pin" style={{ color: '#22c55e' }}>📍</span>
                    <span className="gw-addr-pred-text">{p.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map-tap shortcut labels — only when no active field and not both set */}
          {!activeField && !(pickupLL && dropoffLL) && (
            <div className="gw-addr-map-hints">
              {!pickupLL && (
                <button
                  type="button"
                  className="gw-addr-map-hint-btn gw-addr-map-hint-btn--pickup"
                  onClick={() => setActiveField('pickup')}
                >
                  📍 Tap map for pickup
                </button>
              )}
              {!dropoffLL && (
                <button
                  type="button"
                  className="gw-addr-map-hint-btn gw-addr-map-hint-btn--dropoff"
                  onClick={() => setActiveField('dropoff')}
                >
                  📍 Tap map for dropoff
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Ride options + confirm — only shown once both pins are placed ── */}
        {pickupLL && dropoffLL && (
          <div className="gw-ride-opts-card" onClick={(e) => e.stopPropagation()}>
            {/* Compact route summary at top */}
            <div className="gw-ride-route-summary">
              <span className="gw-ride-route-dot gw-ride-route-dot--a">A</span>
              <span className="gw-ride-route-label">{pickupText.split(',')[0]}</span>
              <span className="gw-ride-route-arrow">→</span>
              <span className="gw-ride-route-dot gw-ride-route-dot--b">B</span>
              <span className="gw-ride-route-label">{dropoffText.split(',')[0]}</span>
            </div>

            <div className="gw-ride-opts-label">Choose your ride</div>

            {RIDE_OPTIONS.map((opt) => {
              const sel = opt.id === selectedRideId;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={sel ? 'gw-ride-opt-row gw-ride-opt-row--selected' : 'gw-ride-opt-row'}
                  onClick={() => setSelectedRideId(opt.id)}
                >
                  <div className="gw-ride-opt-icon" style={{ background: TIER_COLOR[opt.id] }}>
                    <svg viewBox="0 0 24 14" fill="none" width="24" height="14">
                      <rect x="1" y="5" width="22" height="8" rx="2" fill="white" opacity="0.85" />
                      <rect x="4" y="1" width="16" height="8" rx="2" fill="white" opacity="0.65" />
                      <circle cx="5" cy="13" r="2" fill={TIER_COLOR[opt.id]} stroke="white" strokeWidth="1.2" />
                      <circle cx="19" cy="13" r="2" fill={TIER_COLOR[opt.id]} stroke="white" strokeWidth="1.2" />
                    </svg>
                  </div>
                  <div className="gw-ride-opt-info">
                    <div className="gw-ride-opt-name">{opt.label}</div>
                    <div className="gw-ride-opt-eta">{opt.etaMin} min</div>
                  </div>
                  <div className="gw-ride-opt-price">${opt.price}</div>
                  {sel && <div className="gw-ride-opt-check">✓</div>}
                </button>
              );
            })}

            {/* Confirm CTA */}
            <button
              type="button"
              className="gw-ride-confirm-btn"
              onClick={handleConfirmRide}
            >
              Confirm Ride
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom tabs ── */}
      <nav className="gw-ride-bottom-tabs" aria-label="Main navigation" onClick={(e) => e.stopPropagation()}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? 'gw-ride-tab gw-ride-tab--active' : 'gw-ride-tab'}
            onClick={() => handleTabClick(tab.id)}
          >
            <span className="gw-ride-tab-icon">{tab.icon}</span>
            <span className="gw-ride-tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default PassengerRideHomePage;
