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
type VehicleType = 'car' | 'moto' | 'truck';
type ActiveField = 'pickup' | 'dropoff' | null;

/* ─────────────────────────────────────────────
   Futuristic SVG icons
───────────────────────────────────────────── */

/** GPS / crosshair scanner icon */
const GpsIcon = ({ color = '#0077C8', size = 18 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" strokeOpacity="0.25" />
    <circle cx="12" cy="12" r="4.5" stroke={color} strokeWidth="1.8" />
    <circle cx="12" cy="12" r="1.8" fill={color} />
    {/* crosshair arms */}
    <line x1="12" y1="2" x2="12" y2="5.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <line x1="12" y1="18.5" x2="12" y2="22" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <line x1="2" y1="12" x2="5.5" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <line x1="18.5" y1="12" x2="22" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/** Futuristic teardrop pin */
const PinIcon = ({ color = '#6B7280', size = 15 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 28" fill="none">
    <path
      d="M12 1C7.03 1 3 5.03 3 10c0 6.6 9 17 9 17s9-10.4 9-17c0-4.97-4.03-9-9-9z"
      fill={color}
      stroke="white"
      strokeWidth="1.5"
    />
    <circle cx="12" cy="10" r="3.2" fill="white" fillOpacity="0.9" />
    <circle cx="12" cy="10" r="1.5" fill={color} />
  </svg>
);

/** Car side-profile (futuristic sedan) */
const CarIcon = ({ color = 'white' }: { color?: string }) => (
  <svg viewBox="0 0 52 26" fill="none" width="46" height="22">
    {/* body */}
    <path d="M4 18 L6 10 L46 10 L48 18 Z" fill={color} fillOpacity="0.92" />
    {/* roof */}
    <path d="M11 10 L16 4 L36 4 L41 10 Z" fill={color} fillOpacity="0.7" />
    {/* windshield tint */}
    <path d="M17 10 L21 5 L35 5 L39 10 Z" fill="#7dd3fc" fillOpacity="0.55" />
    {/* wheels */}
    <circle cx="13" cy="19" r="4.5" fill="#1e293b" stroke={color} strokeWidth="1.4" />
    <circle cx="13" cy="19" r="2" fill="#475569" />
    <circle cx="39" cy="19" r="4.5" fill="#1e293b" stroke={color} strokeWidth="1.4" />
    <circle cx="39" cy="19" r="2" fill="#475569" />
    {/* headlight */}
    <ellipse cx="47.5" cy="15" rx="2.2" ry="1.4" fill="#fde68a" fillOpacity="0.95" />
    <ellipse cx="47.5" cy="15" rx="5" ry="3" fill="#fde68a" fillOpacity="0.12" />
    {/* tail light */}
    <rect x="3" y="14" width="3" height="3.5" rx="1" fill="#f87171" fillOpacity="0.9" />
  </svg>
);

/** Motorcycle side-profile */
const MotoIcon = ({ color = 'white' }: { color?: string }) => (
  <svg viewBox="0 0 52 30" fill="none" width="46" height="26">
    {/* frame */}
    <path d="M14 20 L24 8 L34 8 L38 14 L38 20" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fillOpacity="0" />
    {/* tank */}
    <ellipse cx="28" cy="11" rx="6" ry="3.5" fill={color} fillOpacity="0.75" />
    {/* fairing */}
    <path d="M34 8 L40 10 L40 16 L38 14" fill={color} fillOpacity="0.55" />
    {/* handlebars */}
    <path d="M32 8 L35 5 M32 8 L35 10" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    {/* seat */}
    <path d="M20 8 L30 8 L30 10 L20 10 Z" fill={color} fillOpacity="0.65" rx="2" />
    {/* wheels */}
    <circle cx="12" cy="21" r="6" fill="#1e293b" stroke={color} strokeWidth="1.4" />
    <circle cx="12" cy="21" r="2.5" fill="#475569" />
    <circle cx="40" cy="21" r="6" fill="#1e293b" stroke={color} strokeWidth="1.4" />
    <circle cx="40" cy="21" r="2.5" fill="#475569" />
    {/* headlight */}
    <circle cx="42" cy="13" r="2" fill="#fde68a" fillOpacity="0.9" />
  </svg>
);

/** Large / SUV / truck side-profile */
const TruckIcon = ({ color = 'white' }: { color?: string }) => (
  <svg viewBox="0 0 58 28" fill="none" width="50" height="24">
    {/* body — tall boxy shape */}
    <rect x="3" y="8" width="46" height="14" rx="3" fill={color} fillOpacity="0.88" />
    {/* roof rack */}
    <rect x="5" y="5" width="42" height="4" rx="2" fill={color} fillOpacity="0.55" />
    {/* windows */}
    <rect x="8" y="9" width="14" height="7" rx="1.5" fill="#7dd3fc" fillOpacity="0.5" />
    <rect x="24" y="9" width="18" height="7" rx="1.5" fill="#7dd3fc" fillOpacity="0.5" />
    {/* trailer hitch / rear */}
    <rect x="49" y="14" width="5" height="4" rx="1.2" fill={color} fillOpacity="0.6" />
    {/* wheels */}
    <circle cx="13" cy="23" r="4.5" fill="#1e293b" stroke={color} strokeWidth="1.4" />
    <circle cx="13" cy="23" r="2" fill="#475569" />
    <circle cx="37" cy="23" r="4.5" fill="#1e293b" stroke={color} strokeWidth="1.4" />
    <circle cx="37" cy="23" r="2" fill="#475569" />
    {/* headlight */}
    <ellipse cx="50.5" cy="15" rx="2" ry="1.5" fill="#fde68a" fillOpacity="0.95" />
    <ellipse cx="50.5" cy="15" rx="4.5" ry="3" fill="#fde68a" fillOpacity="0.12" />
    {/* tail light */}
    <rect x="2" y="13" width="2.5" height="4" rx="1" fill="#f87171" fillOpacity="0.9" />
  </svg>
);

/** Map marker SVG — futuristic hexagon-ish */
function getPinSvg(label: string, bg: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
    <defs>
      <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <path d="M16 1C8.82 1 3 6.82 3 14c0 3.44 1.3 6.57 3.43 8.93L16 41l9.57-18.07A11.96 11.96 0 0 0 29 14C29 6.82 23.18 1 16 1z"
      fill="${bg}" stroke="white" stroke-width="2" filter="url(#glow)"/>
    <circle cx="16" cy="14" r="7" fill="white" fill-opacity="0.18"/>
    <circle cx="16" cy="14" r="5.5" fill="white"/>
    <text x="16" y="18" text-anchor="middle" font-size="7.5" font-weight="900" fill="${bg}" font-family="sans-serif">${label}</text>
  </svg>`;
}

/** Vehicle marker on map */
function getVehicleSvg(type: VehicleType) {
  const colors: Record<VehicleType, string> = { car: '#0077C8', moto: '#7C3AED', truck: '#059669' };
  const bg = colors[type];
  const label = type === 'car' ? '🚗' : type === 'moto' ? '🏍' : '🚙';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 46 46" width="46" height="46">
    <defs>
      <radialGradient id="vbg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${bg}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${bg}" stop-opacity="0.75"/>
      </radialGradient>
      <filter id="vs"><feGaussianBlur stdDeviation="2.5"/></filter>
    </defs>
    <circle cx="23" cy="23" r="21" fill="${bg}" fill-opacity="0.15" filter="url(#vs)"/>
    <circle cx="23" cy="23" r="18" fill="url(#vbg)" stroke="white" stroke-width="2.5"/>
    <circle cx="23" cy="23" r="14" fill="none" stroke="white" stroke-width="1" stroke-opacity="0.35"/>
    <text x="23" y="29" text-anchor="middle" font-size="16" font-family="sans-serif">${label}</text>
  </svg>`;
}

const VEHICLE_OPTIONS: { id: VehicleType; label: string; sub: string }[] = [
  { id: 'car',   label: 'Car',       sub: 'Sedan / Compact' },
  { id: 'moto',  label: 'Moto',      sub: 'Motorcycle' },
  { id: 'truck', label: 'Large',     sub: 'SUV / Truck' },
];

const VEHICLE_ACCENT: Record<VehicleType, string> = {
  car:   '#0077C8',
  moto:  '#7C3AED',
  truck: '#059669',
};

const TABS = [
  { id: 'ride'      as const, label: 'Ride',      icon: '🚗' },
  { id: 'charities' as const, label: 'Charities', icon: '❤️' },
  { id: 'donations' as const, label: 'Donations', icon: '🤝' },
  { id: 'profile'   as const, label: 'Profile',   icon: '👤' },
];

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
const PassengerRideHomePage: React.FC = () => {
  const navigate   = useNavigate();
  const signOut    = useAuthStore((s) => s.signOut);
  const draft      = useTripStore((s) => s.draft);
  const setDraft   = useTripStore((s) => s.setDraft);
  const { google: g, ready } = useGoogleMaps();

  /* Map refs */
  const mapRef             = useRef<HTMLDivElement>(null);
  const mapObjRef          = useRef<google.maps.Map | null>(null);
  const directionsRendRef  = useRef<google.maps.DirectionsRenderer | null>(null);
  const pickupMarkerRef    = useRef<google.maps.Marker | null>(null);
  const dropoffMarkerRef   = useRef<google.maps.Marker | null>(null);
  const vehicleMarkerRef   = useRef<google.maps.Marker | null>(null);
  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  /* UI state */
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [maxPrice, setMaxPrice]       = useState('');
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [pickupText,  setPickupText]  = useState(draft.pickup?.addressLine  ?? '');
  const [dropoffText, setDropoffText] = useState(draft.dropoff?.addressLine ?? '');
  const [pickupLL,    setPickupLL]    = useState<LatLng | null>(draft.pickup?.point  ?? null);
  const [dropoffLL,   setDropoffLL]   = useState<LatLng | null>(draft.dropoff?.point ?? null);
  const [pickupPreds,  setPickupPreds]  = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [dropoffPreds, setDropoffPreds] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [locatingPickup,  setLocatingPickup]  = useState(false);
  const [locatingDropoff, setLocatingDropoff] = useState(false);
  const [reverseGeoLoading, setReverseGeoLoading] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
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
        { featureType: 'poi',     stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'road',    elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
      ],
    });
    directionsRendRef.current = new g.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#F4A300', strokeWeight: 5, strokeOpacity: 0.9 },
    });
    directionsRendRef.current.setMap(mapObjRef.current);
  }, [ready, g]);

  /* ── Map click listener ── */
  useEffect(() => {
    if (mapClickListenerRef.current) {
      mapClickListenerRef.current.remove();
      mapClickListenerRef.current = null;
    }
    if (!g || !mapObjRef.current || !activeField) {
      if (mapObjRef.current) mapObjRef.current.setOptions({ draggableCursor: '' });
      return;
    }
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
            setPickupText(addr); setPickupLL(pt); setPickupPreds([]);
            setDraft({ pickup: { label: 'Pickup', addressLine: addr, point: pt } });
          } else {
            setDropoffText(addr); setDropoffLL(pt); setDropoffPreds([]);
            setDraft({ dropoff: { label: 'Dropoff', addressLine: addr, point: pt } });
          }
          setActiveField(null);
        });
      }
    );
    return () => {
      mapClickListenerRef.current?.remove();
      mapClickListenerRef.current = null;
      mapObjRef.current?.setOptions({ draggableCursor: '' });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, activeField]);

  /* ── Markers + route ── */
  useEffect(() => {
    if (!g || !mapObjRef.current) return;

    // Pickup marker — futuristic red A pin
    if (pickupLL) {
      if (!pickupMarkerRef.current) {
        pickupMarkerRef.current = new g.maps.Marker({ map: mapObjRef.current, title: 'Pickup', zIndex: 10 });
      }
      pickupMarkerRef.current.setPosition(pickupLL);
      pickupMarkerRef.current.setIcon({
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(getPinSvg('A', '#ef4444'))}`,
        scaledSize: new g.maps.Size(32, 42),
        anchor: new g.maps.Point(16, 42),
      });
    } else {
      pickupMarkerRef.current?.setMap(null);
      pickupMarkerRef.current = null;
    }

    // Dropoff marker — futuristic green B pin
    if (dropoffLL) {
      if (!dropoffMarkerRef.current) {
        dropoffMarkerRef.current = new g.maps.Marker({ map: mapObjRef.current, title: 'Dropoff', zIndex: 10 });
      }
      dropoffMarkerRef.current.setPosition(dropoffLL);
      dropoffMarkerRef.current.setIcon({
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(getPinSvg('B', '#22c55e'))}`,
        scaledSize: new g.maps.Size(32, 42),
        anchor: new g.maps.Point(16, 42),
      });
    } else {
      dropoffMarkerRef.current?.setMap(null);
      dropoffMarkerRef.current = null;
    }

    // Route + vehicle marker — vehicle placed at PICKUP location
    if (pickupLL && dropoffLL && directionsRendRef.current) {
      const dirSvc = new g.maps.DirectionsService();
      dirSvc.route(
        { origin: pickupLL, destination: dropoffLL, travelMode: g.maps.TravelMode.DRIVING },
        (result, status) => {
          if (status === 'OK' && result && directionsRendRef.current) {
            directionsRendRef.current.setDirections(result);

            // Place vehicle marker AT pickup (driver is heading to pick up the passenger)
            if (!vehicleMarkerRef.current) {
              vehicleMarkerRef.current = new g.maps.Marker({
                map: mapObjRef.current!,
                title: 'Vehicle',
                zIndex: 20,
              });
            }
            vehicleMarkerRef.current.setPosition(pickupLL);
            vehicleMarkerRef.current.setIcon({
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(getVehicleSvg(vehicleType))}`,
              scaledSize: new g.maps.Size(46, 46),
              anchor: new g.maps.Point(23, 23),
            });

            const bounds = new g.maps.LatLngBounds();
            bounds.extend(pickupLL);
            bounds.extend(dropoffLL);
            mapObjRef.current?.fitBounds(bounds, { top: 120, bottom: 260, left: 32, right: 32 });
          }
        }
      );
    } else {
      if (directionsRendRef.current) directionsRendRef.current.setDirections({ routes: [] } as any);
      vehicleMarkerRef.current?.setMap(null);
      vehicleMarkerRef.current = null;
      if (pickupLL) mapObjRef.current?.panTo(pickupLL);
    }
  }, [g, pickupLL, dropoffLL, vehicleType]);

  /* ── Vehicle icon refresh on type change ── */
  useEffect(() => {
    if (!g || !vehicleMarkerRef.current) return;
    vehicleMarkerRef.current.setIcon({
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(getVehicleSvg(vehicleType))}`,
      scaledSize: new g.maps.Size(46, 46),
      anchor: new g.maps.Point(23, 23),
    });
  }, [g, vehicleType]);

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
        const lat = loc?.lat(); const lng = loc?.lng();
        const addr = place.formatted_address ?? pred.description;
        const point: LatLng | undefined =
          typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : undefined;
        if (mode === 'pickup') {
          setPickupText(addr); if (point) setPickupLL(point); setPickupPreds([]);
          setDraft({ pickup: { label: 'Pickup', addressLine: addr, point } });
          setActiveField('dropoff');
        } else {
          setDropoffText(addr); if (point) setDropoffLL(point); setDropoffPreds([]);
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
      const addr = status === 'OK' && results?.[0]?.formatted_address
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
          setPickupText(addr); setPickupLL(pt); setPickupPreds([]);
          setDraft({ pickup: { label: 'My Location', addressLine: addr, point: pt } });
          setLocatingPickup(false); setActiveField('dropoff');
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
          setDropoffText(addr); setDropoffLL(pt); setDropoffPreds([]);
          setDraft({ dropoff: { label: 'My Location', addressLine: addr, point: pt } });
          setLocatingDropoff(false); setActiveField(null);
        });
      },
      () => setLocatingDropoff(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const requestRide = useTripStore((s) => s.requestRide);
  const bothSet = pickupText.trim().length > 0 && dropoffText.trim().length > 0;

  const handleBroadcast = async () => {
    setActiveField(null);
    setBroadcasting(true);
    await requestRide();
    setBroadcasting(false);
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
              {/* Futuristic globe / wheel logo */}
              <svg viewBox="0 0 28 28" fill="none" width="26" height="26">
                <circle cx="14" cy="14" r="12" stroke="white" strokeWidth="1.8" strokeOpacity="0.9"/>
                <circle cx="14" cy="14" r="5.5" fill="white" fillOpacity="0.18" stroke="white" strokeWidth="1.4"/>
                <line x1="14" y1="2" x2="14" y2="26" stroke="white" strokeWidth="1.2" strokeOpacity="0.6"/>
                <line x1="2" y1="14" x2="26" y2="14" stroke="white" strokeWidth="1.2" strokeOpacity="0.6"/>
                <ellipse cx="14" cy="14" rx="6" ry="12" stroke="white" strokeWidth="1.1" strokeOpacity="0.45"/>
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
        <div ref={mapRef} className="gw-ride-map-canvas" />

        {!ready && (
          <div className="gw-ride-map-loading">
            <div className="gw-ride-map-loading-inner">
              <div style={{ fontSize: 36, marginBottom: 8 }}>🗺️</div>
              <div style={{ fontWeight: 700, color: '#6B7280' }}>Loading map…</div>
            </div>
          </div>
        )}

        {/* ── Pin-mode hint pill ── */}
        {activeField && (
          <div
            className={`gw-map-pin-hint ${activeField === 'pickup' ? 'gw-map-pin-hint--pickup' : 'gw-map-pin-hint--dropoff'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <PinIcon color={activeField === 'pickup' ? '#ef4444' : '#22c55e'} size={14} />
            <span>
              {reverseGeoLoading
                ? 'Reading location…'
                : activeField === 'pickup'
                ? 'Tap map to set pickup point'
                : 'Tap map to set dropoff point'}
            </span>
            <button type="button" className="gw-map-pin-hint-cancel" onClick={() => setActiveField(null)}>✕</button>
          </div>
        )}

        {/* ── Floating address card ── */}
        <div className="gw-trip-addr-card" onClick={(e) => e.stopPropagation()}>

          {/* Pickup */}
          <div className={`gw-addr-field${activeField === 'pickup' ? ' gw-addr-field--pickup-active' : ''}`}>
            <div className="gw-addr-row">
              <div className="gw-addr-dot"><PinIcon color="#ef4444" size={15} /></div>
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
              <button
                type="button"
                className={`gw-addr-gps-btn${locatingPickup ? ' gw-addr-gps-btn--loading' : ''}`}
                title="Use GPS as pickup"
                onClick={handlePickupGps}
                disabled={locatingPickup}
              >
                {locatingPickup ? <span className="gw-addr-gps-spinner" /> : <GpsIcon color="#0077C8" size={17} />}
              </button>
            </div>
            {activeField === 'pickup' && <div className="gw-addr-active-bar gw-addr-active-bar--pickup" />}
            {pickupPreds.length > 0 && (
              <div className="gw-addr-preds">
                {pickupPreds.map((p) => (
                  <button key={p.place_id} type="button" className="gw-addr-pred-item" onClick={() => applyPrediction(p, 'pickup')}>
                    <span className="gw-addr-pred-pin" style={{ color: '#ef4444' }}>📍</span>
                    <span className="gw-addr-pred-text">{p.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="gw-addr-connector"><div className="gw-addr-connector-line" /></div>

          {/* Dropoff */}
          <div className={`gw-addr-field${activeField === 'dropoff' ? ' gw-addr-field--dropoff-active' : ''}`}>
            <div className="gw-addr-row">
              <div className="gw-addr-dot"><PinIcon color="#22c55e" size={15} /></div>
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
              <button
                type="button"
                className={`gw-addr-gps-btn${locatingDropoff ? ' gw-addr-gps-btn--loading' : ''}`}
                title="Use GPS as dropoff"
                onClick={handleDropoffGps}
                disabled={locatingDropoff}
              >
                {locatingDropoff ? <span className="gw-addr-gps-spinner" /> : <GpsIcon color="#22c55e" size={17} />}
              </button>
            </div>
            {activeField === 'dropoff' && <div className="gw-addr-active-bar gw-addr-active-bar--dropoff" />}
            {dropoffPreds.length > 0 && (
              <div className="gw-addr-preds">
                {dropoffPreds.map((p) => (
                  <button key={p.place_id} type="button" className="gw-addr-pred-item" onClick={() => applyPrediction(p, 'dropoff')}>
                    <span className="gw-addr-pred-pin" style={{ color: '#22c55e' }}>📍</span>
                    <span className="gw-addr-pred-text">{p.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map-tap shortcuts */}
          {!activeField && !(pickupLL && dropoffLL) && (
            <div className="gw-addr-map-hints">
              {!pickupLL && (
                <button type="button" className="gw-addr-map-hint-btn gw-addr-map-hint-btn--pickup" onClick={() => setActiveField('pickup')}>
                  📍 Tap map for pickup
                </button>
              )}
              {!dropoffLL && (
                <button type="button" className="gw-addr-map-hint-btn gw-addr-map-hint-btn--dropoff" onClick={() => setActiveField('dropoff')}>
                  📍 Tap map for dropoff
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Bid panel — only shown once both addresses are set ── */}
        {bothSet && (
          <div className="gw-bid-card" onClick={(e) => e.stopPropagation()}>

            {/* Route summary */}
            <div className="gw-bid-route">
              <span className="gw-bid-pin gw-bid-pin--a">A</span>
              <span className="gw-bid-route-addr">{pickupText.split(',')[0]}</span>
              <span className="gw-bid-arrow">→</span>
              <span className="gw-bid-pin gw-bid-pin--b">B</span>
              <span className="gw-bid-route-addr">{dropoffText.split(',')[0]}</span>
            </div>

            {/* Vehicle type selector */}
            <div className="gw-bid-section-label">Select vehicle</div>
            <div className="gw-bid-vehicles">
              {VEHICLE_OPTIONS.map((v) => {
                const sel = v.id === vehicleType;
                const accent = VEHICLE_ACCENT[v.id];
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={`gw-bid-vehicle-btn${sel ? ' gw-bid-vehicle-btn--sel' : ''}`}
                    style={sel ? { borderColor: accent, background: `${accent}12` } : {}}
                    onClick={() => setVehicleType(v.id)}
                  >
                    <div className="gw-bid-vehicle-icon" style={{ background: sel ? accent : '#f1f5f9' }}>
                      {v.id === 'car'   && <CarIcon   color={sel ? 'white' : '#64748b'} />}
                      {v.id === 'moto'  && <MotoIcon  color={sel ? 'white' : '#64748b'} />}
                      {v.id === 'truck' && <TruckIcon color={sel ? 'white' : '#64748b'} />}
                    </div>
                    <div className="gw-bid-vehicle-label">{v.label}</div>
                    <div className="gw-bid-vehicle-sub">{v.sub}</div>
                  </button>
                );
              })}
            </div>

            {/* Max price bid */}
            <div className="gw-bid-section-label" style={{ marginTop: 4 }}>Your max offer</div>
            <div className="gw-bid-price-row">
              <div className="gw-bid-price-field">
                <span className="gw-bid-price-dollar">$</span>
                <input
                  type="number"
                  min="1"
                  className="gw-bid-price-input"
                  placeholder="e.g. 15"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
              <p className="gw-bid-price-hint">First driver to accept wins the ride</p>
            </div>

            {/* Broadcast CTA */}
            <button
              type="button"
              className="gw-bid-broadcast-btn"
              disabled={broadcasting || !maxPrice}
              onClick={handleBroadcast}
            >
              {broadcasting
                ? <><span className="gw-addr-gps-spinner" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} /> Broadcasting…</>
                : <><span className="gw-bid-broadcast-icon">📡</span> Broadcast Ride Request</>}
            </button>
            <p className="gw-bid-broadcast-note">10% of fare supports a local charity · built-in, no extra cost</p>
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
