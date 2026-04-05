import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GW_PATHS } from '../../routes/paths';
import { useGoogleMaps } from '../../features/map/useGoogleMaps';
import { useTripStore } from '../../features/trips/tripStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useDriverStore } from '../../features/driver/driverStore';
import { makeVehicleMarkerUrl } from '../../services/vehicleMapMarker';
import type { LatLng } from '../../features/map/mapTypes';
import type { VehicleMapType } from '../../features/driver/driverTypes';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type VehicleType = 'car' | 'comfort' | 'moto' | 'large';
type ActiveField = 'pickup' | 'dropoff' | null;
type SheetState  = 'home' | 'search' | 'options';

/* ─────────────────────────────────────────────
   Map pin SVGs
───────────────────────────────────────────── */
function getPinSvg(label: string, bg: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
    <defs><filter id="glow"><feGaussianBlur stdDeviation="2" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <path d="M16 1C8.82 1 3 6.82 3 14c0 3.44 1.3 6.57 3.43 8.93L16 41l9.57-18.07A11.96 11.96 0 0 0 29 14C29 6.82 23.18 1 16 1z"
      fill="${bg}" stroke="white" stroke-width="2" filter="url(#glow)"/>
    <circle cx="16" cy="14" r="7" fill="white" fill-opacity="0.18"/>
    <circle cx="16" cy="14" r="5.5" fill="white"/>
    <text x="16" y="18" text-anchor="middle" font-size="7.5" font-weight="900" fill="${bg}" font-family="sans-serif">${label}</text>
  </svg>`;
}

/** Map passenger vehicle category → VehicleMapType for the marker renderer */
function toVehicleMapType(vt: VehicleType): VehicleMapType {
  if (vt === 'moto')  return 'moto';
  if (vt === 'large') return 'truck';
  return 'car';   // 'car' | 'comfort'
}

/**
 * Calculate the compass bearing (0–360°) from point A to point B.
 * 0 = north, 90 = east, 180 = south, 270 = west.
 * Used to rotate the vehicle SVG so it faces along the road.
 */
function calcBearing(
  from: { lat: number; lng: number },
  to:   { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(from.lat);
  const φ2 = toRad(to.lat);
  const Δλ = toRad(to.lng - from.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

/* ─────────────────────────────────────────────
   Vehicle options
───────────────────────────────────────────── */
const VEHICLES: { id: VehicleType; label: string; sub: string; emoji: string; mult: number; eta: string }[] = [
  { id: 'car',     label: 'Standard',  sub: 'Sedan / Compact',  emoji: '🚗', mult: 1.0,  eta: '3 min' },
  { id: 'comfort', label: 'Comfort',   sub: 'Larger Sedan',     emoji: '🚙', mult: 1.22, eta: '5 min' },
  { id: 'moto',    label: 'Moto',      sub: 'Motorcycle',       emoji: '🏍', mult: 0.7,  eta: '2 min' },
  { id: 'large',   label: 'Large',     sub: 'SUV / Van',        emoji: '🚐', mult: 1.9,  eta: '6 min' },
];

const BASE_FARE = 5.40;

/* ─────────────────────────────────────────────
   Charities
───────────────────────────────────────────── */
interface Charity {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  color: string;
  bg: string;
  category: string;
}

const CHARITIES: Charity[] = [
  { id: 'paws',      name: 'Paws Rescue',      emoji: '🐾', tagline: 'Animal shelter & rescue',       color: '#EA580C', bg: '#FFF7ED', category: 'Animals'   },
  { id: 'golden',    name: 'Golden Years',      emoji: '👴', tagline: 'Senior transport & care',        color: '#7C3AED', bg: '#F5F3FF', category: 'Seniors'   },
  { id: 'hope',      name: 'Hope Shelter',      emoji: '🏠', tagline: 'Homeless housing support',       color: '#0077C8', bg: '#EFF6FF', category: 'Housing'   },
  { id: 'children',  name: 'Hope for Children', emoji: '👶', tagline: 'Food, school & safe homes',      color: '#059669', bg: '#F0FDF4', category: 'Children'  },
  { id: 'green',     name: 'Green Future',       emoji: '🌱', tagline: 'Urban reforestation & parks',   color: '#16A34A', bg: '#F0FDF4', category: 'Environ.'  },
  { id: 'medaid',    name: 'MedAid Local',       emoji: '🏥', tagline: 'Free clinic & medicine access', color: '#DC2626', bg: '#FEF2F2', category: 'Medical'   },
];

/* ─────────────────────────────────────────────
   Saved places
───────────────────────────────────────────── */
const SAVED_PLACES = [
  { icon: '🏠', label: 'Home',       sub: 'Add home address',    color: '#0077C8' },
  { icon: '💼', label: 'Add work',   sub: 'Save work address',   color: '#6B7280' },
  { icon: '🎓', label: 'School',     sub: '5400 E Harrison St',  color: '#7C3AED' },
  { icon: '💪', label: 'Gym',        sub: '623 19th Ave E',      color: '#059669' },
];

/* ─────────────────────────────────────────────
   GPS icon (small inline)
───────────────────────────────────────────── */
const GpsIcon = ({ size = 17, color = '#0077C8' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" strokeOpacity="0.25" />
    <circle cx="12" cy="12" r="4.5" stroke={color} strokeWidth="1.8" />
    <circle cx="12" cy="12" r="1.8" fill={color} />
    <line x1="12" y1="2" x2="12" y2="5.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <line x1="12" y1="18.5" x2="12" y2="22" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <line x1="2" y1="12" x2="5.5" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <line x1="18.5" y1="12" x2="22" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/* ─────────────────────────────────────────────
   Spinner
───────────────────────────────────────────── */
const Spinner = ({ color = '#0077C8' }: { color?: string }) => (
  <span style={{ display: 'inline-block', width: 16, height: 16, border: `2px solid rgba(0,0,0,0.1)`, borderTopColor: color, borderRadius: '50%', animation: 'gw-spin 0.7s linear infinite', flexShrink: 0 }} />
);

/* ─────────────────────────────────────────────
   Bottom tab bar config
───────────────────────────────────────────── */
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
  const user       = useAuthStore((s) => s.user);
  const draft      = useTripStore((s) => s.draft);
  const setDraft   = useTripStore((s) => s.setDraft);
  const requestRide = useTripStore((s) => s.requestRide);
  /* Driver vehicle — used so the map shows the driver's real car color */
  const driverVehicle = useDriverStore((s) => s.vehicle);
  const { google: g, ready } = useGoogleMaps();

  /* Map refs */
  const mapRef              = useRef<HTMLDivElement>(null);
  const mapObjRef           = useRef<google.maps.Map | null>(null);
  const directionsRendRef   = useRef<google.maps.DirectionsRenderer | null>(null);
  const pickupMarkerRef     = useRef<google.maps.Marker | null>(null);
  const dropoffMarkerRef    = useRef<google.maps.Marker | null>(null);
  const vehicleMarkerRef    = useRef<google.maps.Marker | null>(null);
  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  /* Route animation — stores polyline path + animation state */
  const routePathRef        = useRef<google.maps.LatLng[]>([]);
  const animStepRef         = useRef(0);
  const animTimerRef        = useRef<ReturnType<typeof setInterval> | null>(null);

  /* UI state */
  const [sheet, setSheet]           = useState<SheetState>('home');
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [maxPrice, setMaxPrice]       = useState('');
  const [pickupText,  setPickupText]  = useState(draft.pickup?.addressLine  ?? '');
  const [dropoffText, setDropoffText] = useState(draft.dropoff?.addressLine ?? '');
  const [pickupLL,    setPickupLL]    = useState<LatLng | null>(draft.pickup?.point  ?? null);
  const [dropoffLL,   setDropoffLL]   = useState<LatLng | null>(draft.dropoff?.point ?? null);
  const [pickupPreds,  setPickupPreds]  = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [dropoffPreds, setDropoffPreds] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [locatingPickup,  setLocatingPickup]  = useState(false);
  const [locatingDropoff, setLocatingDropoff] = useState(false);
  const [reverseGeoLoading, setReverseGeoLoading] = useState(false);
  const [broadcasting, setBroadcasting]   = useState(false);
  const [activeTab, setActiveTab]         = useState<'ride' | 'charities' | 'donations' | 'profile'>('ride');
  const [selectedCharity, setSelectedCharity] = useState<string | null>(null);
  /** Driving route failed (Directions API / quota) — see `services/googleMapsLoader.ts` */
  const [directionsError, setDirectionsError] = useState<string | null>(null);

  const bothSet = pickupText.trim().length > 0 && dropoffText.trim().length > 0;

  /* Load driver vehicle data so we have the real vehicle color for the map marker */
  const hydrateDriver = useDriverStore((s) => s.hydrate);
  useEffect(() => {
    if (!driverVehicle) void hydrateDriver();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Auto-advance to options sheet once both addresses are set */
  useEffect(() => {
    if (bothSet && sheet === 'search') setSheet('options');
  }, [bothSet, sheet]);

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
      polylineOptions: { strokeColor: '#111827', strokeWeight: 5, strokeOpacity: 0.85 },
    });
    directionsRendRef.current.setMap(mapObjRef.current);
  }, [ready, g]);

  /* ── Map click listener for pin mode ── */
  useEffect(() => {
    if (mapClickListenerRef.current) { mapClickListenerRef.current.remove(); mapClickListenerRef.current = null; }
    if (!g || !mapObjRef.current || !activeField) {
      mapObjRef.current?.setOptions({ draggableCursor: '' });
      return;
    }
    mapObjRef.current.setOptions({ draggableCursor: 'crosshair' });
    mapClickListenerRef.current = mapObjRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
      const lat = e.latLng?.lat(); const lng = e.latLng?.lng();
      if (typeof lat !== 'number' || typeof lng !== 'number') return;
      const pt: LatLng = { lat, lng };
      setReverseGeoLoading(true);
      new g.maps.Geocoder().geocode({ location: pt }, (results, status) => {
        const addr = status === 'OK' && results?.[0]?.formatted_address
          ? results[0].formatted_address : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setReverseGeoLoading(false);
        if (activeField === 'pickup') {
          setPickupText(addr); setPickupLL(pt); setPickupPreds([]);
          setDraft({ pickup: { label: 'Pickup', addressLine: addr, point: pt } });
          setActiveField('dropoff');
        } else {
          setDropoffText(addr); setDropoffLL(pt); setDropoffPreds([]);
          setDraft({ dropoff: { label: 'Dropoff', addressLine: addr, point: pt } });
          setActiveField(null);
        }
      });
    });
    return () => { mapClickListenerRef.current?.remove(); mapClickListenerRef.current = null; mapObjRef.current?.setOptions({ draggableCursor: '' }); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, activeField]);

  /* ── Stop route animation helper ── */
  const stopRouteAnimation = useCallback(() => {
    if (animTimerRef.current) { clearInterval(animTimerRef.current); animTimerRef.current = null; }
  }, []);

  /* ── Start route animation: marker crawls along polyline, stays on road ── */
  const startRouteAnimation = useCallback((path: google.maps.LatLng[]) => {
    if (!g || !vehicleMarkerRef.current || path.length < 2) return;
    stopRouteAnimation();
    animStepRef.current = 0;

    /* Sub-sample: insert interpolated points so animation is smooth at any zoom */
    const dense: google.maps.LatLng[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const steps = 6;
      for (let t = 0; t < steps; t++) {
        const f = t / steps;
        dense.push(new g.maps.LatLng(
          a.lat() + (b.lat() - a.lat()) * f,
          a.lng() + (b.lng() - a.lng()) * f,
        ));
      }
    }
    dense.push(path[path.length - 1]);

    const markerVehicleType = driverVehicle?.vehicleType ?? toVehicleMapType(vehicleType);
    const markerColor = driverVehicle?.color ?? '#0077C8';

    animTimerRef.current = setInterval(() => {
      const idx = animStepRef.current;
      if (idx >= dense.length) {
        /* Loop: reset to start so animation keeps running */
        animStepRef.current = 0;
        return;
      }
      const pos = dense[idx];
      vehicleMarkerRef.current?.setPosition(pos);

      /* Rotate to face direction of travel */
      if (idx < dense.length - 1) {
        const next = dense[idx + 1];
        const bearing = calcBearing(
          { lat: pos.lat(), lng: pos.lng() },
          { lat: next.lat(), lng: next.lng() },
        );
        const url = makeVehicleMarkerUrl(markerVehicleType, markerColor, 60, bearing);
        vehicleMarkerRef.current?.setIcon({ url, scaledSize: new g.maps.Size(60, 60), anchor: new g.maps.Point(30, 30) });
      }
      animStepRef.current += 1;
    }, 80); // ~12 fps crawl — adjust for speed feel
  }, [g, driverVehicle, vehicleType, stopRouteAnimation]);

  /* ── Markers + route ── */
  useEffect(() => {
    if (!g || !mapObjRef.current) return;

    /* ── Pickup pin ── */
    if (pickupLL) {
      if (!pickupMarkerRef.current) pickupMarkerRef.current = new g.maps.Marker({ map: mapObjRef.current!, title: 'Pickup', zIndex: 10 });
      pickupMarkerRef.current.setPosition(pickupLL);
      pickupMarkerRef.current.setIcon({ url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(getPinSvg('A', '#111827'))}`, scaledSize: new g.maps.Size(32, 42), anchor: new g.maps.Point(16, 42) });
    } else { pickupMarkerRef.current?.setMap(null); pickupMarkerRef.current = null; }

    /* ── Dropoff pin ── */
    if (dropoffLL) {
      if (!dropoffMarkerRef.current) dropoffMarkerRef.current = new g.maps.Marker({ map: mapObjRef.current!, title: 'Dropoff', zIndex: 10 });
      dropoffMarkerRef.current.setPosition(dropoffLL);
      dropoffMarkerRef.current.setIcon({ url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(getPinSvg('B', '#0077C8'))}`, scaledSize: new g.maps.Size(32, 42), anchor: new g.maps.Point(16, 42) });
    } else { dropoffMarkerRef.current?.setMap(null); dropoffMarkerRef.current = null; }

    /* ── Route + animated vehicle marker ── */
    if (pickupLL && dropoffLL && directionsRendRef.current) {
      new g.maps.DirectionsService().route(
        { origin: pickupLL, destination: dropoffLL, travelMode: g.maps.TravelMode.DRIVING },
        (result, status) => {
          if (status === 'OK' && result && directionsRendRef.current) {
            setDirectionsError(null);
            directionsRendRef.current.setDirections(result);

            /* Collect ALL path points from every step of every leg
               → this keeps the marker glued to the actual road geometry */
            const path: google.maps.LatLng[] = [];
            for (const leg of result.routes[0]?.legs ?? []) {
              for (const step of leg.steps ?? []) {
                /* Each step has a path array of road-snapped LatLngs */
                const stepPath = (step as any).path as google.maps.LatLng[] | undefined;
                if (stepPath?.length) {
                  path.push(...stepPath);
                } else {
                  /* Fallback: use step start/end if geometry library unavailable */
                  path.push(step.start_location, step.end_location);
                }
              }
            }
            routePathRef.current = path;

            /* Create vehicle marker at route start */
            if (!vehicleMarkerRef.current) {
              vehicleMarkerRef.current = new g.maps.Marker({ map: mapObjRef.current!, zIndex: 20 });
            }
            vehicleMarkerRef.current.setPosition(path[0] ?? pickupLL);

            /* Initial icon with bearing toward first step */
            const markerVehicleType = driverVehicle?.vehicleType ?? toVehicleMapType(vehicleType);
            const markerColor = driverVehicle?.color ?? '#0077C8';
            let initialBearing = 0;
            if (path.length >= 2) {
              initialBearing = calcBearing(
                { lat: path[0].lat(), lng: path[0].lng() },
                { lat: path[1].lat(), lng: path[1].lng() },
              );
            }
            const markerUrl = makeVehicleMarkerUrl(markerVehicleType, markerColor, 60, initialBearing);
            vehicleMarkerRef.current.setIcon({ url: markerUrl, scaledSize: new g.maps.Size(60, 60), anchor: new g.maps.Point(30, 30) });

            /* Start crawling along the road */
            startRouteAnimation(path);

            const bounds = new g.maps.LatLngBounds();
            bounds.extend(pickupLL); bounds.extend(dropoffLL);
            mapObjRef.current?.fitBounds(bounds, { top: 80, bottom: 340, left: 32, right: 32 });
          } else {
            const msg = `Driving route failed (${String(status)}). Enable Directions API for your Maps key.`;
            console.warn('[PassengerRideHomePage]', msg);
            setDirectionsError(msg);
          }
        }
      );
    } else {
      setDirectionsError(null);
      stopRouteAnimation();
      if (directionsRendRef.current) directionsRendRef.current.setDirections({ routes: [] } as any);
      vehicleMarkerRef.current?.setMap(null); vehicleMarkerRef.current = null;
      routePathRef.current = [];
      if (pickupLL) mapObjRef.current?.panTo(pickupLL);
    }

    return () => stopRouteAnimation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, pickupLL, dropoffLL, vehicleType, driverVehicle]);

  /* ── Autocomplete ── */
  const fetchPredictions = useCallback(
    (input: string, cb: (p: google.maps.places.AutocompletePrediction[]) => void) => {
      if (!g || !input.trim()) { cb([]); return; }
      new g.maps.places.AutocompleteService().getPlacePredictions({ input }, (preds, status) => {
        cb(status !== g.maps.places.PlacesServiceStatus.OK || !preds ? [] : preds.slice(0, 5));
      });
    },
    [g]
  );

  const applyPrediction = useCallback(
    (pred: google.maps.places.AutocompletePrediction, mode: 'pickup' | 'dropoff') => {
      if (!g) return;
      new g.maps.places.PlacesService(document.createElement('div')).getDetails(
        { placeId: pred.place_id, fields: ['geometry', 'formatted_address'] },
        (place, status) => {
          if (status !== g.maps.places.PlacesServiceStatus.OK || !place) return;
          const loc = place.geometry?.location;
          const lat = loc?.lat(); const lng = loc?.lng();
          const addr = place.formatted_address ?? pred.description;
          const point: LatLng | undefined = typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : undefined;
          if (mode === 'pickup') {
            setPickupText(addr); if (point) setPickupLL(point); setPickupPreds([]);
            setDraft({ pickup: { label: 'Pickup', addressLine: addr, point } });
            setActiveField('dropoff');
          } else {
            setDropoffText(addr); if (point) setDropoffLL(point); setDropoffPreds([]);
            setDraft({ dropoff: { label: 'Dropoff', addressLine: addr, point } });
            setActiveField(null);
          }
        }
      );
    },
    [g, setDraft]
  );

  /* ── GPS ── */
  const gpsGeocode = (lat: number, lng: number, onAddr: (addr: string) => void) => {
    if (!g) { onAddr(`${lat.toFixed(5)}, ${lng.toFixed(5)}`); return; }
    new g.maps.Geocoder().geocode({ location: { lat, lng } }, (results, status) => {
      onAddr(status === 'OK' && results?.[0]?.formatted_address ? results[0].formatted_address : `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
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
      () => setLocatingPickup(false), { enableHighAccuracy: true, timeout: 8000 }
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
      () => setLocatingDropoff(false), { enableHighAccuracy: true, timeout: 8000 }
    );
  };

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

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = (user as any)?.displayName ?? (user as any)?.email?.split('@')[0] ?? 'there';

  const selVehicle = VEHICLES.find((v) => v.id === vehicleType) ?? VEHICLES[0];
  const confirmLabel = `Confirm ${selVehicle.label}`;

  /* ─────────────────────────────────────────────
     Styles (shared inline)
  ───────────────────────────────────────────── */
  const S = {
    root: { position: 'relative' as const, width: '100%', height: '100dvh', overflow: 'hidden', background: '#e5e7eb', fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif" },
    map:  { position: 'absolute' as const, inset: 0 },
    mapLoading: { position: 'absolute' as const, inset: 0, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' as const, gap: 10, zIndex: 5 },

    /* Top bar */
    topBar: { position: 'absolute' as const, top: 0, left: 0, right: 0, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 20, pointerEvents: 'none' as const },
    topBarBtn: { width: 44, height: 44, borderRadius: '50%', background: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', pointerEvents: 'auto' as const },

    /* Map pin hint */
    pinHint: { position: 'absolute' as const, top: 76, left: '50%', transform: 'translateX(-50%)', background: 'white', borderRadius: 24, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 25, whiteSpace: 'nowrap' as const, fontSize: 13, fontWeight: 600, color: '#111827' },

    /* Bottom sheet wrapper */
    sheet: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '20px 20px 0 0', zIndex: 30, boxShadow: '0 -4px 30px rgba(0,0,0,0.12)' },
    handle: { width: 36, height: 4, background: '#E5E7EB', borderRadius: 2, margin: '10px auto 0' },

    /* Search input row */
    inputRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 12, background: '#F9FAFB', border: '1px solid #E5E7EB' },
    input: { flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 15, color: '#111827', fontWeight: 500, fontFamily: 'inherit' },

    /* Saved place row */
    placeRow: { display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', cursor: 'pointer', borderBottom: '1px solid #F3F4F6' },
    placeIcon: (color: string) => ({ width: 42, height: 42, borderRadius: '50%', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }),

    /* Vehicle option row */
    vehicleRow: (selected: boolean) => ({ display: 'flex', alignItems: 'center', padding: '14px 20px', cursor: 'pointer', background: selected ? '#EFF6FF' : 'white', borderBottom: '1px solid #F3F4F6', transition: 'background 0.12s', gap: 14 }),
    vehicleEmoji: { fontSize: 28, width: 44, textAlign: 'center' as const },
    vehicleInfo: { flex: 1 },
    vehiclePrice: (selected: boolean) => ({ fontSize: 15, fontWeight: 900, color: selected ? '#0077C8' : '#111827' }),

    /* Confirm button */
    confirmBtn: (disabled: boolean) => ({ width: '100%', height: 54, borderRadius: 14, background: disabled ? '#9CA3AF' : '#0077C8', border: 'none', color: 'white', fontSize: 16, fontWeight: 800, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s' }),

    /* Bottom tabs */
    tabBar: { display: 'flex', borderTop: '1px solid #F3F4F6', background: 'white' },
    tab: (active: boolean) => ({ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2, padding: '10px 0 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 10, fontWeight: active ? 700 : 500, color: active ? '#0077C8' : '#9CA3AF' }),
  };

  /* ─────────────────────────────────────────────
     Render
  ───────────────────────────────────────────── */
  return (
    <div style={S.root}>
      {/* ── FULL-SCREEN MAP ── */}
      <div ref={mapRef} style={S.map} />
      {!ready && (
        <div style={S.mapLoading}>
          <div style={{ fontSize: 38 }}>🗺️</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#6B7280' }}>Loading map…</div>
        </div>
      )}
      {ready && directionsError && (
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            left: 14,
            right: 14,
            zIndex: 18,
            background: 'rgba(254,243,199,0.96)',
            border: '1px solid #f59e0b',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 12,
            fontWeight: 600,
            color: '#92400e',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          {directionsError}
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div style={S.topBar}>
        <button style={S.topBarBtn} title="Menu">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect y="3" width="20" height="2" rx="1" fill="#111827" />
            <rect y="9" width="20" height="2" rx="1" fill="#111827" />
            <rect y="15" width="20" height="2" rx="1" fill="#111827" />
          </svg>
        </button>
        <button
          style={S.topBarBtn}
          title="My location"
          onClick={handlePickupGps}
        >
          {locatingPickup ? <Spinner /> : <GpsIcon size={20} color="#0077C8" />}
        </button>
      </div>

      {/* ── PIN MODE HINT ── */}
      {activeField && (
        <div style={{ ...S.pinHint, borderLeft: `3px solid ${activeField === 'pickup' ? '#111827' : '#0077C8'}` }}>
          <span>{reverseGeoLoading ? '📍 Reading…' : activeField === 'pickup' ? '📍 Tap map to set pickup' : '📍 Tap map to set dropoff'}</span>
          <button type="button" onClick={() => setActiveField(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 16, lineHeight: 1, padding: 0 }}>✕</button>
        </div>
      )}

      {/* ── BOTTOM SHEET ── */}
      <div style={S.sheet}>
        <div style={S.handle} />

        {/* ════ STATE: HOME ════ */}
        {sheet === 'home' && (
          <div style={{ padding: '16px 20px 0' }}>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 2px', fontWeight: 500 }}>{greeting()}, {userName}</p>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: '#111827', margin: '0 0 16px', lineHeight: 1.2 }}>Where are you going?</h2>

            {/* Search trigger */}
            <button
              type="button"
              onClick={() => setSheet('search')}
              style={{ ...S.inputRow, width: '100%', textAlign: 'left', cursor: 'text', marginBottom: 16 }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="9" cy="9" r="7" stroke="#9CA3AF" strokeWidth="2" />
                <path d="M14 14l4 4" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: 15, color: '#9CA3AF', fontWeight: 500, fontFamily: 'inherit' }}>Search destination</span>
            </button>

            {/* Saved places */}
            <div>
              {SAVED_PLACES.map((p) => (
                <div key={p.label} style={S.placeRow} onClick={() => setSheet('search')}>
                  <div style={S.placeIcon(p.color)}>{p.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{p.label}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>{p.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ STATE: SEARCH ════ */}
        {sheet === 'search' && (
          <div style={{ padding: '12px 20px 0' }}>
            {/* Back + current location bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => { setSheet('home'); setPickupPreds([]); setDropoffPreds([]); }}
                style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M13 4l-6 6 6 6" stroke="#111827" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {pickupText && (
                <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#374151', background: '#F3F4F6', borderRadius: 8, padding: '6px 12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  📍 {pickupText.split(',')[0]}
                </div>
              )}
            </div>

            {/* Pickup row */}
            <div style={{ ...S.inputRow, marginBottom: 8, border: activeField === 'pickup' ? '1.5px solid #111827' : '1px solid #E5E7EB' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#111827', flexShrink: 0, display: 'inline-block' }} />
              <input
                style={S.input}
                placeholder="Pickup location"
                value={pickupText}
                autoFocus={activeField === 'pickup'}
                onFocus={() => setActiveField('pickup')}
                onChange={(e) => {
                  const v = e.target.value; setPickupText(v);
                  setDraft({ pickup: { label: 'Pickup', addressLine: v, point: pickupLL ?? undefined } });
                  fetchPredictions(v, setPickupPreds);
                }}
              />
              <button type="button" onClick={handlePickupGps} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}>
                {locatingPickup ? <Spinner /> : <GpsIcon size={17} color="#111827" />}
              </button>
            </div>
            {pickupPreds.length > 0 && (
              <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, marginBottom: 8, overflow: 'hidden' }}>
                {pickupPreds.map((p) => (
                  <button key={p.place_id} type="button" onClick={() => applyPrediction(p, 'pickup')} style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14 }}>📍</span>
                    <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{p.description}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Dropoff row */}
            <div style={{ ...S.inputRow, marginBottom: 8, border: activeField === 'dropoff' ? '1.5px solid #0077C8' : '1px solid #E5E7EB' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#0077C8', flexShrink: 0, display: 'inline-block' }} />
              <input
                style={S.input}
                placeholder="Where to?"
                value={dropoffText}
                autoFocus={activeField === 'dropoff'}
                onFocus={() => setActiveField('dropoff')}
                onChange={(e) => {
                  const v = e.target.value; setDropoffText(v);
                  setDraft({ dropoff: { label: 'Dropoff', addressLine: v, point: dropoffLL ?? undefined } });
                  fetchPredictions(v, setDropoffPreds);
                }}
              />
              <button type="button" onClick={handleDropoffGps} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}>
                {locatingDropoff ? <Spinner /> : <GpsIcon size={17} color="#0077C8" />}
              </button>
            </div>
            {dropoffPreds.length > 0 && (
              <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 12, marginBottom: 8, overflow: 'hidden' }}>
                {dropoffPreds.map((p) => (
                  <button key={p.place_id} type="button" onClick={() => applyPrediction(p, 'dropoff')} style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14 }}>📍</span>
                    <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{p.description}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Map tap shortcuts */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {!pickupLL && (
                <button type="button" onClick={() => setActiveField('pickup')} style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#374151', background: '#F3F4F6', border: 'none', borderRadius: 8, padding: '9px 12px', cursor: 'pointer' }}>
                  📍 Tap map for pickup
                </button>
              )}
              {!dropoffLL && (
                <button type="button" onClick={() => setActiveField('dropoff')} style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#0077C8', background: '#EFF6FF', border: 'none', borderRadius: 8, padding: '9px 12px', cursor: 'pointer' }}>
                  📍 Tap map for dropoff
                </button>
              )}
            </div>
          </div>
        )}

        {/* ════ STATE: RIDE OPTIONS ════ */}
        {sheet === 'options' && (
          <div>
            {/* Route bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderBottom: '1px solid #F3F4F6' }}>
              <button
                type="button"
                onClick={() => setSheet('search')}
                style={{ width: 34, height: 34, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M13 4l-6 6 6 6" stroke="#111827" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#374151', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pickupText.split(',')[0]}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <span style={{ fontSize: 9, background: '#111827', color: 'white', borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>A</span>
                  <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
                  <span style={{ fontSize: 9, background: '#0077C8', color: 'white', borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>B</span>
                </div>
                <div style={{ fontSize: 13, color: '#0077C8', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {dropoffText.split(',')[0]}
                </div>
              </div>
            </div>

            {/* Vehicle options */}
            <div>
              {VEHICLES.map((v) => {
                const sel = v.id === vehicleType;
                const price = (BASE_FARE * v.mult).toFixed(2);
                return (
                  <div key={v.id} style={S.vehicleRow(sel)} onClick={() => setVehicleType(v.id as VehicleType)}>
                    <div style={S.vehicleEmoji}>{v.emoji}</div>
                    <div style={S.vehicleInfo}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{v.label}</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>{v.sub} · {v.eta}</div>
                    </div>
                    <div style={S.vehiclePrice(sel)}>${price}</div>
                    {sel && (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#0077C8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Charity selector ── */}
            <div style={{ borderTop: '1px solid #F3F4F6', padding: '14px 20px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', margin: 0 }}>Support a cause ❤️</p>
                  <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0 0', fontWeight: 500 }}>
                    10% of your fare is donated — no extra cost to you
                  </p>
                </div>
                {selectedCharity && (
                  <button
                    type="button"
                    onClick={() => setSelectedCharity(null)}
                    style={{ fontSize: 10, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Horizontal charity scroll */}
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                {CHARITIES.map((c) => {
                  const sel = selectedCharity === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCharity(sel ? null : c.id)}
                      style={{
                        flexShrink: 0,
                        width: 112,
                        padding: '10px 10px 8px',
                        borderRadius: 14,
                        border: sel ? `2px solid ${c.color}` : '2px solid transparent',
                        background: sel ? c.bg : '#F9FAFB',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                        position: 'relative',
                      }}
                    >
                      {sel && (
                        <div style={{ position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                      )}
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{c.emoji}</div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>{c.name}</div>
                      <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2, fontWeight: 500, lineHeight: 1.3 }}>{c.tagline}</div>
                      <div style={{ marginTop: 5, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: c.color }}>{c.category}</div>
                    </button>
                  );
                })}
              </div>

              {/* Donation preview when charity selected */}
              {selectedCharity && (() => {
                const charity = CHARITIES.find(c => c.id === selectedCharity)!;
                const fare = BASE_FARE * (VEHICLES.find(v => v.id === vehicleType)?.mult ?? 1);
                const donation = (fare * 0.1).toFixed(2);
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '10px 12px', borderRadius: 10, background: charity.bg, border: `1px solid ${charity.color}30` }}>
                    <span style={{ fontSize: 20 }}>{charity.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 800, color: '#111827', margin: 0 }}>{charity.name}</p>
                      <p style={{ fontSize: 11, color: '#6B7280', margin: '1px 0 0', fontWeight: 500 }}>Donating <span style={{ color: charity.color, fontWeight: 900 }}>${donation}</span> with this ride</p>
                    </div>
                    <div style={{ fontSize: 18 }}>✅</div>
                  </div>
                );
              })()}
            </div>

            {/* Payment row + max offer */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', gap: 12, borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <span style={{ fontSize: 20 }}>💵</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Cash</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F3F4F6', borderRadius: 10, padding: '6px 12px', flex: 1 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>$</span>
                <input
                  type="number"
                  min="1"
                  placeholder="Max offer"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, fontWeight: 600, color: '#111827', width: '100%', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            {/* Confirm CTA */}
            <div style={{ padding: '14px 20px 6px' }}>
              <button
                type="button"
                style={S.confirmBtn(broadcasting || !maxPrice)}
                disabled={broadcasting || !maxPrice}
                onClick={handleBroadcast}
              >
                {broadcasting ? <><Spinner color="white" /> Broadcasting…</> : confirmLabel}
              </button>
              {selectedCharity ? (
                <p style={{ textAlign: 'center', fontSize: 11, color: '#10b981', fontWeight: 700, margin: '8px 0 2px' }}>
                  ❤️ {CHARITIES.find(c => c.id === selectedCharity)?.name} will receive 10% of your fare
                </p>
              ) : (
                <p style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', fontWeight: 500, margin: '8px 0 2px' }}>
                  Select a charity above to dedicate 10% of your fare
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Bottom tab bar ── */}
        <nav style={S.tabBar}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              style={S.tab(activeTab === tab.id)}
              onClick={() => handleTabClick(tab.id)}
            >
              <span style={{ fontSize: 22 }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <style>{`@keyframes gw-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default PassengerRideHomePage;
