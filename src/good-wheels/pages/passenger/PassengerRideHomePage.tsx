import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGwLang } from '../../i18n/useGwLang';
import { GW_PATHS } from '../../routes/paths';
import { useGoogleMaps } from '../../features/map/useGoogleMaps';
import { useTripStore } from '../../features/trips/tripStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useDriverStore } from '../../features/driver/driverStore';
import type { LatLng } from '../../features/map/mapTypes';
import { GOOD_WHEELS_DEMO_MODE } from '../../app/appConfig';
import FareBreakdownCard from '../../features/trips/components/FareBreakdownCard';
import { calculateDonationAmount } from '../../features/charity/utils';
import { calculateGoodWheelsFareSplit, formatMoneyFromCents } from '../../features/trips/utils/fareSplit';
import CauseDiscoveryPanel from '../../features/charity/components/CauseDiscoveryPanel';
import type { CauseOrganization } from '../../features/charity/types';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type VehicleType = 'car' | 'comfort' | 'moto' | 'large';
type ActiveField = 'pickup' | 'dropoff' | null;
type SheetState  = 'home' | 'search' | 'options';
type NegotiationState = 'idle' | 'pending' | 'countered' | 'accepted';

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
   Saved places
───────────────────────────────────────────── */
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
  { id: 'ride'      as const, key: 'ride' as const, icon: '🚗' },
  { id: 'charities' as const, key: 'charities' as const, icon: '❤️' },
  { id: 'donations' as const, key: 'donations' as const, icon: '🤝' },
  { id: 'profile'   as const, key: 'profile' as const, icon: '👤' },
];

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
const PassengerRideHomePage: React.FC = () => {
  const navigate   = useNavigate();
  const t          = useGwLang((s) => s.t);
  const tf         = useGwLang((s) => s.tf);
  const user       = useAuthStore((s) => s.user);
  const draft      = useTripStore((s) => s.draft);
  const activeTrip = useTripStore((s) => s.activeTrip);
  const setDraft   = useTripStore((s) => s.setDraft);
  const requestRide = useTripStore((s) => s.requestRide);
  const hydrateTrips = useTripStore((s) => s.hydrate);
  const clearActiveTrip = useTripStore((s) => s.clearActiveTrip);
  const clearDraft = useTripStore((s) => s.clearDraft);
  /* Driver vehicle — used so the map shows the driver's real car color */
  const driverVehicle = useDriverStore((s) => s.vehicle);
  const { google: g, ready } = useGoogleMaps();

  /* Map refs */
  const mapRef              = useRef<HTMLDivElement>(null);
  const mapObjRef           = useRef<google.maps.Map | null>(null);
  const directionsRendRef   = useRef<google.maps.DirectionsRenderer | null>(null);
  const fallbackLineRef     = useRef<google.maps.Polyline | null>(null);
  const pickupMarkerRef     = useRef<google.maps.Marker | null>(null);
  const dropoffMarkerRef    = useRef<google.maps.Marker | null>(null);
  const vehicleMarkerRef    = useRef<google.maps.Marker | null>(null);
  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  /* UI state */
  const [sheet, setSheet]           = useState<SheetState>('home');
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [pickupCategoryKey, setPickupCategoryKey] = useState<string>('current_location');
  const [dropoffCategoryKey, setDropoffCategoryKey] = useState<string>('home');
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
  const [selectedCause, setSelectedCause] = useState<CauseOrganization | null>(null);
  const [expandedVehicleId, setExpandedVehicleId] = useState<VehicleType | null>('car');
  const [optionsPanelCollapsed, setOptionsPanelCollapsed] = useState(false);
  const [homePanelCollapsed, setHomePanelCollapsed] = useState(false);
  const [negotiationState, setNegotiationState] = useState<NegotiationState>('idle');
  const [driverCounterOffer, setDriverCounterOffer] = useState<number | null>(null);
  const [negotiationNote, setNegotiationNote] = useState<string | null>(null);
  /** Driving route failed (Directions API / quota) — see `services/googleMapsLoader.ts` */
  const [directionsError, setDirectionsError] = useState<string | null>(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [routeDurationMinutes, setRouteDurationMinutes] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const bothReady = Boolean(pickupLL && dropoffLL);
  const bothSet = bothReady;

  useEffect(() => {
    // Reset compact mode when returning to search/home.
    if (sheet !== 'options') setOptionsPanelCollapsed(false);
  }, [sheet]);


  useEffect(() => {
    // Changing price or vehicle starts a fresh negotiation.
    setNegotiationState('idle');
    setDriverCounterOffer(null);
    setNegotiationNote(null);
  }, [maxPrice, vehicleType]);

  const keepPointVisible = useCallback((pt: LatLng) => {
    if (!mapObjRef.current || !g) return;
    mapObjRef.current.panTo(pt);
    // Lift the focal point so it is not hidden behind the bottom sheet.
    g.maps.event.addListenerOnce(mapObjRef.current, 'idle', () => {
      mapObjRef.current?.panBy(0, -160);
    });
  }, [g]);

  /* Load driver vehicle data so we have the real vehicle color for the map marker */
  const hydrateDriver = useDriverStore((s) => s.hydrate);
  useEffect(() => {
    if (!driverVehicle) void hydrateDriver();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!bothSet) return;
    const suggested = BASE_FARE * (VEHICLES.find((v) => v.id === vehicleType)?.mult ?? 1);
    if (!maxPrice) setMaxPrice(suggested.toFixed(2));
  }, [bothSet, maxPrice, vehicleType]);

  const listedFareUsd = useMemo(() => {
    const mult = VEHICLES.find((v) => v.id === vehicleType)?.mult ?? 1;
    const suggested = BASE_FARE * mult;
    const entered = Number(maxPrice);
    if (Number.isFinite(entered) && entered > 0) return entered;
    return suggested;
  }, [vehicleType, maxPrice]);

  /** Preview: when a charity is selected, UI shows a 10% add-on on listed fare (passenger-only; does not change driver split). */
  const charityAddonPreviewUsd = useMemo(() => {
    if (!selectedCause) return 0;
    return calculateDonationAmount(listedFareUsd, { type: 'percentage', value: 10 });
  }, [selectedCause, listedFareUsd]);

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

  /* ── Map click listener for pin mode (search sheet only; when both pins exist, toolbar / focus picks pickup vs dropoff, else default dropoff) ── */
  useEffect(() => {
    if (mapClickListenerRef.current) { mapClickListenerRef.current.remove(); mapClickListenerRef.current = null; }
    if (sheet !== 'search' || !g || !mapObjRef.current) {
      mapObjRef.current?.setOptions({ draggableCursor: '' });
      return;
    }
    let inferredMode: ActiveField;
    if (activeField === 'pickup' || activeField === 'dropoff') {
      inferredMode = activeField;
    } else if (!pickupLL) {
      inferredMode = 'pickup';
    } else if (!dropoffLL) {
      inferredMode = 'dropoff';
    } else {
      inferredMode = 'dropoff';
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
        if (inferredMode === 'pickup') {
          setPickupText(addr); setPickupLL(pt); setPickupPreds([]);
          setDraft({ pickup: { label: t('pickupLabel'), addressLine: addr, point: pt } });
          keepPointVisible(pt);
          if (!dropoffLL) setActiveField('dropoff');
        } else {
          setDropoffText(addr); setDropoffLL(pt); setDropoffPreds([]);
          setDraft({ dropoff: { label: t('destinationLabel'), addressLine: addr, point: pt } });
          keepPointVisible(pt);
        }
      });
    });
    return () => { mapClickListenerRef.current?.remove(); mapClickListenerRef.current = null; mapObjRef.current?.setOptions({ draggableCursor: '' }); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, activeField, keepPointVisible, setDraft, t, dropoffLL, pickupLL, sheet]);

  /* ── Markers + route ── */
  useEffect(() => {
    if (!g || !mapObjRef.current) return;

    /* ── Pickup pin ── */
    if (pickupLL) {
      if (!pickupMarkerRef.current) pickupMarkerRef.current = new g.maps.Marker({ map: mapObjRef.current!, title: 'Pickup', zIndex: 10 });
      pickupMarkerRef.current.setPosition(pickupLL);
      pickupMarkerRef.current.setTitle(t('pickupLabel'));
      pickupMarkerRef.current.setIcon({
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(getPinSvg('P', '#16A34A'))}`,
        scaledSize: new g.maps.Size(38, 50),
        anchor: new g.maps.Point(19, 50),
      });
    } else { pickupMarkerRef.current?.setMap(null); pickupMarkerRef.current = null; }

    /* ── Dropoff pin ── */
    if (dropoffLL) {
      if (!dropoffMarkerRef.current) dropoffMarkerRef.current = new g.maps.Marker({ map: mapObjRef.current!, title: 'Dropoff', zIndex: 10 });
      dropoffMarkerRef.current.setPosition(dropoffLL);
      dropoffMarkerRef.current.setTitle(t('dropoff'));
      dropoffMarkerRef.current.setIcon({
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(getPinSvg('D', '#DC2626'))}`,
        scaledSize: new g.maps.Size(38, 50),
        anchor: new g.maps.Point(19, 50),
      });
    } else { dropoffMarkerRef.current?.setMap(null); dropoffMarkerRef.current = null; }

    if (!pickupLL || !dropoffLL) {
      setDirectionsError(null);
      setRouteDistanceKm(null);
      setRouteDurationMinutes(null);
      if (directionsRendRef.current) directionsRendRef.current.setDirections({ routes: [] } as any);
      fallbackLineRef.current?.setMap(null);
      fallbackLineRef.current = null;
      vehicleMarkerRef.current?.setMap(null);
      vehicleMarkerRef.current = null;
      if (pickupLL) mapObjRef.current?.panTo(pickupLL);
      return;
    }

    /* ── Route preview ── */
    if (pickupLL && dropoffLL && directionsRendRef.current) {
      new g.maps.DirectionsService().route(
        { origin: pickupLL, destination: dropoffLL, travelMode: g.maps.TravelMode.DRIVING },
        (result, status) => {
          if (status === 'OK' && result && directionsRendRef.current) {
            setDirectionsError(null);
            directionsRendRef.current.setDirections(result);
            fallbackLineRef.current?.setMap(null);
            fallbackLineRef.current = null;
            const leg = result.routes[0]?.legs?.[0];
            if (leg) {
              setRouteDistanceKm(typeof leg.distance?.value === 'number' ? Number((leg.distance.value / 1000).toFixed(1)) : null);
              setRouteDurationMinutes(typeof leg.duration?.value === 'number' ? Math.max(1, Math.round(leg.duration.value / 60)) : null);
            } else {
              setRouteDistanceKm(null);
              setRouteDurationMinutes(null);
            }

            const bounds = new g.maps.LatLngBounds();
            bounds.extend(pickupLL); bounds.extend(dropoffLL);
            mapObjRef.current?.fitBounds(bounds, { top: 80, bottom: 340, left: 32, right: 32 });
          } else {
            const msg = `${t('routePreview')} — ${t('finalRouteAfterAccept')}`;
            console.warn('[PassengerRideHomePage]', msg);
            setDirectionsError(msg);
            setRouteDistanceKm(Number((Math.hypot(dropoffLL.lat - pickupLL.lat, dropoffLL.lng - pickupLL.lng) * 111).toFixed(1)));
            setRouteDurationMinutes(null);
            directionsRendRef.current?.setDirections({ routes: [] } as any);
            fallbackLineRef.current?.setMap(null);
            fallbackLineRef.current = new g.maps.Polyline({
              map: mapObjRef.current!,
              path: [pickupLL, dropoffLL],
              geodesic: true,
              strokeColor: '#2563EB',
              strokeOpacity: 0.8,
              strokeWeight: 4,
            });
          }
        }
      );
    }

    const showDriverMarker = Boolean(
      activeTrip?.driverId &&
      [
        'accepted',
        'driver_en_route',
        'driver_arriving',
        'driver_arrived',
        'arrived',
        'passenger_onboard',
        'in_progress',
        'support_in_progress',
      ].includes(activeTrip.status),
    );
    if (!showDriverMarker) {
      vehicleMarkerRef.current?.setMap(null);
      vehicleMarkerRef.current = null;
    } else {
      if (!vehicleMarkerRef.current) {
        vehicleMarkerRef.current = new g.maps.Marker({ map: mapObjRef.current!, zIndex: 21, title: 'Driver vehicle' });
      }
      vehicleMarkerRef.current.setPosition(pickupLL);
      vehicleMarkerRef.current.setIcon({
        path: g.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: '#FACC15',
        fillOpacity: 1,
        strokeColor: '#713F12',
        strokeWeight: 1.5,
      });
    }

    return () => {
      fallbackLineRef.current?.setMap(null);
      fallbackLineRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, pickupLL, dropoffLL, t, activeTrip]);

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
            setDraft({ pickup: { label: t('pickupLabel'), addressLine: addr, point } });
            if (point) keepPointVisible(point);
            if (!dropoffLL) setActiveField('dropoff');
          } else {
            setDropoffText(addr); if (point) setDropoffLL(point); setDropoffPreds([]);
            setDraft({ dropoff: { label: t('destinationLabel'), addressLine: addr, point } });
            if (point) keepPointVisible(point);
          }
        }
      );
    },
    [g, keepPointVisible, setDraft, t, dropoffLL]
  );

  /* ── GPS ── */
  const gpsGeocode = (lat: number, lng: number, onAddr: (addr: string) => void) => {
    if (!g) { onAddr(`${lat.toFixed(5)}, ${lng.toFixed(5)}`); return; }
    new g.maps.Geocoder().geocode({ location: { lat, lng } }, (results, status) => {
      onAddr(status === 'OK' && results?.[0]?.formatted_address ? results[0].formatted_address : `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    });
  };

  const handlePickupGps = () => {
    if (!navigator.geolocation) {
      setGpsError(t('browserNoGeolocation'));
      return;
    }
    setLocatingPickup(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const pt: LatLng = { lat: coords.latitude, lng: coords.longitude };
        gpsGeocode(pt.lat, pt.lng, (addr) => {
          setPickupText(addr); setPickupLL(pt); setPickupPreds([]);
          setPickupCategoryKey('current_location');
          setDraft({ pickup: { label: t('yourLocationLabel'), addressLine: addr, point: pt } });
          keepPointVisible(pt);
          setLocatingPickup(false);
        });
      },
      (err) => {
        setLocatingPickup(false);
        setGpsError(err.code === err.PERMISSION_DENIED ? t('locationPermissionDenied') : t('locationUnavailable'));
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleUseCurrentLocation = () => {
    setActiveField('pickup');
    handlePickupGps();
  };

  const handleDropoffGps = () => {
    if (!navigator.geolocation) {
      setGpsError(t('browserNoGeolocation'));
      return;
    }
    setLocatingDropoff(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const pt: LatLng = { lat: coords.latitude, lng: coords.longitude };
        gpsGeocode(pt.lat, pt.lng, (addr) => {
          setDropoffText(addr); setDropoffLL(pt); setDropoffPreds([]);
          setDraft({ dropoff: { label: t('destinationLabel'), addressLine: addr, point: pt } });
          keepPointVisible(pt);
          setLocatingDropoff(false);
        });
      },
      (err) => {
        setLocatingDropoff(false);
        setGpsError(err.code === err.PERMISSION_DENIED ? t('locationPermissionDenied') : t('locationUnavailable'));
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleBroadcast = async () => {
    setActiveField(null);
    setBroadcasting(true);
    const charityNote = selectedCause
      ? ` | ${t('charities')}: ${selectedCause.name} (${selectedCause.category})`
      : '';
    setDraft({
      notes: `${tf('negotiation_yourOffer', { amount: Number(maxPrice || 0).toFixed(2) })} ${vehicleLabel(selVehicle.label)}${charityNote}`,
      pickupCategoryKey,
      dropoffCategoryKey,
      estimatePreview:
        routeDistanceKm != null
          ? { distanceKm: routeDistanceKm, etaMinutes: routeDurationMinutes != null ? routeDurationMinutes : 8 }
          : undefined,
      routeSummaryPreview:
        routeDistanceKm != null && routeDurationMinutes != null
          ? { distanceKm: routeDistanceKm, durationMinutes: routeDurationMinutes }
          : undefined,
    });
    await requestRide();
    setBroadcasting(false);
    navigate(GW_PATHS.passenger.active);
  };

  const handleSendOffer = () => {
    const offer = Number(maxPrice);
    if (!Number.isFinite(offer) || offer <= 0) return;
    setNegotiationState('pending');
    setNegotiationNote(`${t('negotiation_offerSent')} · ${t('negotiation_driverReviewing')}`);
    window.setTimeout(() => {
      // Driver hears the broadcast first, then either accepts or counters.
      const requestedFare = BASE_FARE * (VEHICLES.find((v) => v.id === vehicleType)?.mult ?? 1);
      if (offer >= requestedFare) {
        setNegotiationState('accepted');
        setNegotiationNote(`${tf('negotiation_youOffered', { amount: offer.toFixed(2) })} · ${t('negotiation_confirmRide')}`);
        void handleBroadcast();
        return;
      }
      const counter = Number((requestedFare).toFixed(2));
      setDriverCounterOffer(counter);
      setNegotiationState('countered');
      setNegotiationNote(`${tf('negotiation_driverCountered', { amount: counter.toFixed(2) })} · ${t('negotiation_waitingResponse')}`);
    }, 900);
  };

  const handleAcceptCounter = async () => {
    if (!driverCounterOffer) return;
    setMaxPrice(driverCounterOffer.toFixed(2));
    setNegotiationState('accepted');
    setNegotiationNote(`${t('negotiation_acceptCounteroffer')}: $${driverCounterOffer.toFixed(2)} · ${t('negotiation_confirmRide')}`);
    await handleBroadcast();
  };

  const handleKeepMyOffer = async () => {
    const offer = Number(maxPrice);
    if (!Number.isFinite(offer) || offer <= 0) return;
    setNegotiationState('accepted');
    setNegotiationNote(`${t('negotiation_sendNewOffer')}: $${offer.toFixed(2)} · ${t('negotiation_confirmRide')}`);
    await handleBroadcast();
  };

  const handleTabClick = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === 'charities') navigate(GW_PATHS.passenger.charities);
    else if (tab === 'donations') navigate(GW_PATHS.passenger.donations);
    else if (tab === 'profile') navigate(GW_PATHS.auth.profile);
  };

  const handleCancelRideState = () => {
    clearActiveTrip();
    clearDraft();
    setPickupText('');
    setDropoffText('');
    setPickupLL(null);
    setDropoffLL(null);
    setPickupPreds([]);
    setDropoffPreds([]);
    setSheet('home');
    setNegotiationState('idle');
    setDriverCounterOffer(null);
    setNegotiationNote(`${t('cancelRideLabel')}. ${t('requestRide')}.`);
  };

  const handleRefreshRideState = async () => {
    if (!user?.id) return;
    setNegotiationNote(`${t('refreshRide')}...`);
    await hydrateTrips(user.id);
    setNegotiationState('idle');
    setDriverCounterOffer(null);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('goodMorning');
    if (h < 18) return t('goodAfternoon');
    return t('goodEvening');
  };

  const userName = (user as any)?.displayName ?? (user as any)?.email?.split('@')[0] ?? 'there';

  const selVehicle = VEHICLES.find((v) => v.id === vehicleType) ?? VEHICLES[0];
  const vehicleLabel = (label: string) => {
    if (label === 'Standard') return t('vehicle_standard');
    if (label === 'Comfort') return t('vehicle_comfort');
    if (label === 'Moto') return t('vehicle_moto');
    if (label === 'Large') return t('vehicle_large');
    return label;
  };
  const vehicleSub = (sub: string) => {
    if (sub === 'Sedan / Compact') return t('vehicle_standard_sub');
    if (sub === 'Larger Sedan') return t('vehicle_comfort_sub');
    if (sub === 'Motorcycle') return t('vehicle_moto_sub');
    if (sub === 'SUV / Van') return t('vehicle_large_sub');
    return sub;
  };
  const vehicleEta = (eta: string) => {
    const minutes = Number.parseInt(eta, 10);
    return Number.isFinite(minutes) ? tf('eta_min', { minutes }) : eta;
  };
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
    pinHint: {
      position: 'absolute' as const,
      top: 76,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(255, 255, 255, 0.55)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderRadius: 24,
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.6)',
      zIndex: 25,
      whiteSpace: 'nowrap' as const,
      fontSize: 13,
      fontWeight: 600,
      color: '#111827',
    },

    /* Bottom sheet wrapper */
    sheet: {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      background: 'white',
      borderRadius: '20px 20px 0 0',
      zIndex: 30,
      boxShadow: '0 -4px 30px rgba(0,0,0,0.12)',
      maxHeight: sheet === 'search' ? '42dvh' : (sheet === 'options' ? (optionsPanelCollapsed ? '24dvh' : '50dvh') : '58dvh'),
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column' as const,
    },
    sheetSearchGlass: {
      background: 'rgba(248, 250, 252, 0.45)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      boxShadow: '0 -8px 40px rgba(15, 23, 42, 0.08)',
      borderTop: '1px solid rgba(255, 255, 255, 0.55)',
    },
    handle: { width: 36, height: 4, background: '#E5E7EB', borderRadius: 2, margin: '10px auto 0' },
    handleSearch: { width: 36, height: 4, background: 'rgba(148, 163, 184, 0.45)', borderRadius: 2, margin: '10px auto 0' },

    /* Search input row */
    inputRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 12, background: '#F9FAFB', border: '1px solid #E5E7EB' },
    inputRowGlass: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 16px',
      borderRadius: 12,
      background: 'rgba(255, 255, 255, 0.78)',
      border: '1px solid rgba(255, 255, 255, 0.9)',
      boxShadow: '0 1px 8px rgba(15, 23, 42, 0.06)',
    },
    input: { flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 15, color: '#111827', fontWeight: 500, fontFamily: 'inherit' },

    /* Saved place row */
    placeRow: { display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', cursor: 'pointer', borderBottom: '1px solid #F3F4F6' },
    placeIcon: (color: string) => ({ width: 42, height: 42, borderRadius: '50%', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }),

    /* Vehicle option row */
    vehicleRow: (selected: boolean) => ({ display: 'flex', alignItems: 'center', padding: '14px 20px', cursor: 'pointer', background: selected ? '#EFF6FF' : 'white', borderBottom: '1px solid #F3F4F6', transition: 'background 0.12s', gap: 14 }),
    vehicleEmoji: { fontSize: 28, width: 44, textAlign: 'center' as const },
    vehicleInfo: { flex: 1 },
    vehiclePrice: (selected: boolean) => ({ fontSize: 15, fontWeight: 900, color: selected ? '#0077C8' : '#111827' }),
    vehicleExpandBtn: { width: 26, height: 26, borderRadius: 8, border: '1px solid #CBD5E1', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 as const },
    vehicleDetailsWrap: { padding: '0 20px 12px 78px', background: '#F8FAFC', borderBottom: '1px solid #F3F4F6' },
    vehicleDetailsChip: { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '4px 10px', background: '#E0F2FE', color: '#0369A1', fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' as const, marginRight: 6 },
    routeCollapseBtn: { width: 34, height: 34, borderRadius: 8, border: '1px solid #CBD5E1', background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 as const },
    centerCollapseBtn: { width: 36, height: 24, borderRadius: 999, border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '6px auto 8px', boxShadow: '0 1px 6px rgba(15,23,42,0.08)' },

    /* Confirm button */
    confirmBtn: (disabled: boolean) => ({ width: '100%', height: 54, borderRadius: 14, background: disabled ? '#9CA3AF' : '#0077C8', border: 'none', color: 'white', fontSize: 16, fontWeight: 800, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s' }),

    /* Bottom tabs */
    tabBar: { display: 'flex', borderTop: '1px solid #F3F4F6', background: 'white' },
    tabBarGlass: {
      display: 'flex',
      borderTop: '1px solid rgba(255, 255, 255, 0.45)',
      background: 'rgba(255, 255, 255, 0.5)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    },
    tab: (active: boolean) => ({ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2, padding: '10px 0 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 10, fontWeight: active ? 700 : 500, color: active ? '#0077C8' : '#9CA3AF' }),
    homeCollapseBtn: { width: 34, height: 34, borderRadius: 8, border: '1px solid #CBD5E1', background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 as const },
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
          <div style={{ fontSize: 14, fontWeight: 600, color: '#6B7280' }}>{t('loadingMap')}</div>
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
      {ready && GOOD_WHEELS_DEMO_MODE && (
        <div
          style={{
            position: 'absolute',
            bottom: 84,
            left: 14,
            zIndex: 18,
            background: 'rgba(14,116,144,0.92)',
            border: '1px solid rgba(103,232,249,0.8)',
            borderRadius: 999,
            padding: '6px 12px',
            fontSize: 11,
            fontWeight: 800,
            color: '#ecfeff',
          }}
        >
          {t('demoRidePreview')}
        </div>
      )}
      {ready && (
        <div
          style={{
            position: 'absolute',
            bottom: 84,
            right: 14,
            zIndex: 18,
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            padding: '8px 10px',
            fontSize: 10,
            fontWeight: 800,
            color: '#334155',
            maxWidth: 250,
            lineHeight: 1.45,
          }}
        >
          <div>{t('legendGreenPickup')}</div>
          <div>{t('legendRedDropoff')}</div>
          <div>{t('legendDriverAfterAcceptance')}</div>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div style={S.topBar}>
        <button style={S.topBarBtn} title={t('menu')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect y="3" width="20" height="2" rx="1" fill="#111827" />
            <rect y="9" width="20" height="2" rx="1" fill="#111827" />
            <rect y="15" width="20" height="2" rx="1" fill="#111827" />
          </svg>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
          <button
            type="button"
            onClick={() => void handleRefreshRideState()}
            style={{ ...S.topBarBtn, width: 42, height: 42 }}
            title={t('refreshRide')}
            aria-label={t('refreshRide')}
          >
            <span style={{ fontSize: 15 }}>↻</span>
          </button>
          <button
            type="button"
            onClick={handleCancelRideState}
            style={{ ...S.topBarBtn, width: 42, height: 42 }}
            title={t('cancelRideLabel')}
            aria-label={t('cancelRideLabel')}
          >
            <span style={{ fontSize: 13 }}>✕</span>
          </button>
          <button
            style={S.topBarBtn}
            title={t('useCurrentLocation')}
            onClick={handleUseCurrentLocation}
          >
            {locatingPickup ? <Spinner /> : <GpsIcon size={20} color="#0077C8" />}
          </button>
        </div>
      </div>

      {/* ── MAP SELECTION MODE (search only) ── */}
      {sheet === 'search' && (
      <div style={{ ...S.pinHint, borderLeft: `3px solid ${activeField === 'dropoff' ? '#DC2626' : '#16A34A'}` }}>
        <button
          type="button"
          onClick={() => setActiveField('pickup')}
          style={{
            border: '1px solid rgba(255,255,255,0.65)',
            borderRadius: 999,
            background: activeField === 'pickup' ? 'rgba(220, 252, 231, 0.92)' : 'rgba(255, 255, 255, 0.45)',
            color: activeField === 'pickup' ? '#166534' : '#374151',
            padding: '6px 10px',
            fontSize: 11,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          {t('setPickup')}
        </button>
        <button
          type="button"
          onClick={() => setActiveField('dropoff')}
          style={{
            border: '1px solid rgba(255,255,255,0.65)',
            borderRadius: 999,
            background: activeField === 'dropoff' ? 'rgba(254, 226, 226, 0.92)' : 'rgba(255, 255, 255, 0.45)',
            color: activeField === 'dropoff' ? '#B91C1C' : '#374151',
            padding: '6px 10px',
            fontSize: 11,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          {t('setDestination')}
        </button>
        <span style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>
          {reverseGeoLoading ? `${t('readingLocation')}` : t('clickMapSetPickupDropoff')}
        </span>
      </div>
      )}

      {/* ── BOTTOM SHEET ── */}
      <div style={{ ...S.sheet, ...(sheet === 'search' ? S.sheetSearchGlass : {}) }}>
        <div style={sheet === 'search' ? S.handleSearch : S.handle} />

        {/* ════ STATE: HOME ════ */}
        {sheet === 'home' && (
          <div style={{ padding: '16px 20px 0' }}>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 2px', fontWeight: 500 }}>{greeting()}, {userName}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 900, color: '#111827', margin: 0, lineHeight: 1.2 }}>{t('planYourRide')}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{t('choosePickupDestination')}</p>
              </div>
              <button
                type="button"
                aria-label={homePanelCollapsed ? 'Expand home panel' : 'Collapse home panel'}
                onClick={() => setHomePanelCollapsed((prev) => !prev)}
                style={S.homeCollapseBtn}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: homePanelCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                  <path d="M3 5l4 4 4-4" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Search trigger */}
            <button
              type="button"
              onClick={() => { setSheet('search'); setActiveField('pickup'); }}
              style={{ ...S.inputRow, width: '100%', textAlign: 'left', cursor: 'text', marginBottom: 16 }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="9" cy="9" r="7" stroke="#9CA3AF" strokeWidth="2" />
                <path d="M14 14l4 4" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: 15, color: '#9CA3AF', fontWeight: 500, fontFamily: 'inherit' }}>{t('startByChoosingWhereYouAre')}</span>
            </button>

            {!homePanelCollapsed && (
              <div style={{ marginBottom: 16, borderRadius: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 12px' }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#334155' }}>
                  {t('thenChooseWhereGoing')}
                </p>
                <button
                  type="button"
                  onClick={() => { setSheet('search'); setActiveField('pickup'); }}
                  style={{ marginTop: 8, width: '100%', border: 'none', borderRadius: 10, padding: '10px 12px', background: '#EFF6FF', color: '#0369A1', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                >
                  {t('startPlacingAB')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ════ STATE: SEARCH ════ */}
        {sheet === 'search' && (
          <div style={{ padding: '8px 20px 0', overflowY: 'auto' }}>
            {gpsError && (
              <div style={{ marginBottom: 8, border: '1px solid rgba(252, 165, 165, 0.6)', background: 'rgba(254, 242, 242, 0.85)', color: '#B91C1C', borderRadius: 10, padding: '8px 10px', fontSize: 11, fontWeight: 700 }}>
                {gpsError}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => { setSheet('home'); setPickupPreds([]); setDropoffPreds([]); }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.55)',
                  border: '1px solid rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M13 4l-6 6 6 6" stroke="#111827" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                style={{
                  flex: 1,
                  border: '1px solid rgba(255, 255, 255, 0.75)',
                  background: 'rgba(255, 255, 255, 0.4)',
                  color: '#1e3a5f',
                  borderRadius: 10,
                  padding: '8px 10px',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {locatingPickup ? t('readingLocation') : t('useCurrentLocation')}
              </button>
            </div>

            <div style={{ fontSize: 11, fontWeight: 800, color: '#166534', marginBottom: 4, letterSpacing: '0.02em' }}>{t('mapSheet_pickup')}</div>
            <div
              style={{
                ...S.inputRowGlass,
                marginBottom: 6,
                border: activeField === 'pickup' ? '1.5px solid rgba(22, 163, 74, 0.85)' : '1px solid rgba(226, 232, 240, 0.9)',
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16A34A', flexShrink: 0, display: 'inline-block' }} />
              <input
                style={S.input}
                placeholder={t('placeholderPickup')}
                value={pickupText}
                autoFocus={activeField === 'pickup'}
                onFocus={() => setActiveField('pickup')}
                onChange={(e) => {
                  const v = e.target.value; setPickupText(v);
                  setDraft({ pickup: { label: t('pickupLabel'), addressLine: v, point: pickupLL ?? undefined } });
                  fetchPredictions(v, setPickupPreds);
                }}
              />
              <button type="button" onClick={handlePickupGps} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}>
                {locatingPickup ? <Spinner /> : <GpsIcon size={17} color="#111827" />}
              </button>
            </div>
            {pickupPreds.length > 0 && (
              <div style={{ background: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(8px)', border: '1px solid rgba(226, 232, 240, 0.95)', borderRadius: 12, marginBottom: 8, overflow: 'hidden' }}>
                {pickupPreds.map((p) => (
                  <button key={p.place_id} type="button" onClick={() => applyPrediction(p, 'pickup')} style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14 }}>📍</span>
                    <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{p.description}</span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ fontSize: 11, fontWeight: 800, color: '#B91C1C', marginBottom: 4, marginTop: 4, letterSpacing: '0.02em' }}>{t('mapSheet_dropoff')}</div>
            <div
              style={{
                ...S.inputRowGlass,
                marginBottom: 6,
                border: activeField === 'dropoff' ? '1.5px solid rgba(220, 38, 38, 0.85)' : '1px solid rgba(226, 232, 240, 0.9)',
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#DC2626', flexShrink: 0, display: 'inline-block' }} />
              <input
                style={S.input}
                placeholder={t('whereAreYouGoing')}
                value={dropoffText}
                autoFocus={activeField === 'dropoff'}
                onFocus={() => setActiveField('dropoff')}
                onChange={(e) => {
                  const v = e.target.value; setDropoffText(v);
                  setDraft({ dropoff: { label: t('destinationLabel'), addressLine: v, point: dropoffLL ?? undefined } });
                  fetchPredictions(v, setDropoffPreds);
                }}
              />
              <button type="button" onClick={handleDropoffGps} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}>
                {locatingDropoff ? <Spinner /> : <GpsIcon size={17} color="#0077C8" />}
              </button>
            </div>
            {dropoffPreds.length > 0 && (
              <div style={{ background: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(8px)', border: '1px solid rgba(226, 232, 240, 0.95)', borderRadius: 12, marginBottom: 8, overflow: 'hidden' }}>
                {dropoffPreds.map((p) => (
                  <button key={p.place_id} type="button" onClick={() => applyPrediction(p, 'dropoff')} style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14 }}>📍</span>
                    <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{p.description}</span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ height: 6 }} />
          </div>
        )}

        {/* ════ STATE: RIDE OPTIONS ════ */}
        {sheet === 'options' && (
          <div style={{ overflowY: 'auto' }}>
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
                  {t('pickupLabel')}: {pickupText.split(',')[0]}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <span style={{ fontSize: 9, background: '#16A34A', color: 'white', borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>P</span>
                  <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
                  <span style={{ fontSize: 9, background: '#DC2626', color: 'white', borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>D</span>
                </div>
                <div style={{ fontSize: 13, color: '#DC2626', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t('destinationLabel')}: {dropoffText.split(',')[0]}
                </div>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, marginTop: 3 }}>
                  {routeDistanceKm !== null ? `${routeDistanceKm} km` : '--'} · {routeDurationMinutes !== null ? `${routeDurationMinutes} min` : t('routePreview')}
                </div>
                <div style={{ marginTop: 10 }}>
                  <FareBreakdownCard
                    variant="passenger"
                    totalFareUsd={listedFareUsd}
                    t={t}
                    titleKey="rideEstimate"
                    showTransparentHint
                    className="text-left"
                    optionalDonationUsd={charityAddonPreviewUsd > 0 ? charityAddonPreviewUsd : null}
                  />
                </div>
              </div>
              <button
                type="button"
                aria-label={optionsPanelCollapsed ? 'Expand ride options' : 'Collapse ride options'}
                onClick={() => setOptionsPanelCollapsed((prev) => !prev)}
                style={S.routeCollapseBtn}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: optionsPanelCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                  <path d="M3 5l4 4 4-4" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Extra center collapse control */}
            <button
              type="button"
              aria-label={optionsPanelCollapsed ? 'Expand options panel' : 'Collapse options panel'}
              onClick={() => setOptionsPanelCollapsed((prev) => !prev)}
              style={S.centerCollapseBtn}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: optionsPanelCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                <path d="M3 5l4 4 4-4" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Vehicle options */}
            {!optionsPanelCollapsed && (
            <div>
              {VEHICLES.map((v) => {
                const sel = v.id === vehicleType;
                const price = (BASE_FARE * v.mult).toFixed(2);
                const isExpanded = expandedVehicleId === v.id;
                const vehicleFareUsd = BASE_FARE * v.mult;
                const donationEstimate = calculateDonationAmount(vehicleFareUsd, { type: 'percentage', value: 10 }).toFixed(2);
                return (
                  <div key={v.id}>
                    <div
                      style={S.vehicleRow(sel)}
                      onClick={() => {
                        setVehicleType(v.id as VehicleType);
                      }}
                    >
                      <div style={S.vehicleEmoji}>{v.emoji}</div>
                      <div style={S.vehicleInfo}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{vehicleLabel(v.label)}</div>
                        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>{vehicleSub(v.sub)} · {vehicleEta(v.eta)}</div>
                      </div>
                      <div style={S.vehiclePrice(sel)}>${price}</div>
                      {sel && (
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#0077C8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                      )}
                      <button
                        type="button"
                        aria-label={isExpanded ? `${t('collapse')} ${vehicleLabel(v.label)} ${t('readDetails').toLowerCase()}` : `${t('expand')} ${vehicleLabel(v.label)} ${t('readDetails').toLowerCase()}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedVehicleId((prev) => (prev === v.id ? null : v.id));
                        }}
                        style={S.vehicleExpandBtn}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                          <path d="M2 4l4 4 4-4" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                    {isExpanded && (
                      <div style={S.vehicleDetailsWrap}>
                        <span style={S.vehicleDetailsChip}>ETA {vehicleEta(v.eta)}</span>
                        <span style={S.vehicleDetailsChip}>Fare x{v.mult.toFixed(2)}</span>
                        <span style={S.vehicleDetailsChip}>{tf('donationAddonExampleChip', { amount: `$${donationEstimate}` })}</span>
                        {(() => {
                          const vs = calculateGoodWheelsFareSplit(Math.round(Number(price) * 100));
                          return (
                            <span style={S.vehicleDetailsChip}>
                              {t('driverReceives')}: {formatMoneyFromCents(vs.driverPayoutCents)}
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}

            <div style={{ borderTop: '1px solid #F3F4F6', padding: '14px 20px 10px' }}>
              <CauseDiscoveryPanel
                compact
                pickupLabel={pickupText}
                dropoffLabel={dropoffText}
                routeDistanceKm={routeDistanceKm}
                routeDurationMinutes={routeDurationMinutes}
                onAttachToRide={(cause) => {
                  setSelectedCause(cause);
                  setDraft({
                    attachedCause: {
                      id: cause.id,
                      name: cause.name,
                      category: cause.category,
                      city: cause.city,
                      country: cause.country,
                      canDonate: cause.canDonate,
                    },
                    notes: `${t('supportCause')}: ${cause.name} (${cause.category})`,
                  });
                }}
                onSupportCause={(cause) => {
                  setSelectedCause(cause);
                  setDraft({
                    attachedCause: {
                      id: cause.id,
                      name: cause.name,
                      category: cause.category,
                      city: cause.city,
                      country: cause.country,
                      canDonate: cause.canDonate,
                    },
                  });
                }}
                onUseAsLocation={(cause) => {
                  const confirmed = window.confirm(t('causeUseAsDestinationConfirm'));
                  if (!confirmed) return;
                  const causeAddress = `${cause.address}, ${cause.city}, ${cause.country}`;
                  const nextDropoff = { lat: cause.coordinates.lat, lng: cause.coordinates.lng };
                  setSelectedCause(cause);
                  setDropoffText(causeAddress);
                  setDropoffLL(nextDropoff);
                  setDraft({
                    dropoff: { label: t('destinationLabel'), addressLine: causeAddress, point: nextDropoff },
                    attachedCause: {
                      id: cause.id,
                      name: cause.name,
                      category: cause.category,
                      city: cause.city,
                      country: cause.country,
                      canDonate: cause.canDonate,
                    },
                    notes: `${t('supportCause')}: ${cause.name} (${cause.category})`,
                  });
                }}
              />
            </div>

            {/* Payment row + max offer */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', gap: 12, borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <span style={{ fontSize: 20 }}>💵</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{t('cash')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F3F4F6', borderRadius: 10, padding: '6px 12px', flex: 1 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>$</span>
                <input
                  type="number"
                  min="1"
                  placeholder={t('maxOffer')}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, fontWeight: 600, color: '#111827', width: '100%', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            {/* Confirm CTA */}
            <div style={{ padding: '14px 20px 6px' }}>
              {!optionsPanelCollapsed && (
                <>
                  <button
                    type="button"
                    style={S.confirmBtn(broadcasting || !maxPrice || negotiationState === 'pending')}
                    disabled={broadcasting || !bothSet || negotiationState === 'pending'}
                    onClick={handleSendOffer}
                  >
                    {negotiationState === 'pending'
                      ? <><Spinner color="white" /> {t('negotiating')}</>
                      : (broadcasting
                        ? <><Spinner color="white" /> {t('broadcasting')}</>
                        : t('requestRideAction'))}
                  </button>
                  {negotiationState === 'countered' && driverCounterOffer !== null && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => void handleAcceptCounter()}
                        style={{ flex: 1, border: 'none', borderRadius: 10, background: '#0077C8', color: '#fff', padding: '10px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                      >
                        {t('acceptCounter')} ${driverCounterOffer.toFixed(2)}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleKeepMyOffer()}
                        style={{ flex: 1, border: '1px solid #CBD5E1', borderRadius: 10, background: '#fff', color: '#111827', padding: '10px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                      >
                        {t('keepMyOffer')}
                      </button>
                    </div>
                  )}
                </>
              )}
              {Number(maxPrice) > 0 && Number.isFinite(Number(maxPrice)) && (
                <div style={{ padding: '0 14px 10px' }}>
                  <FareBreakdownCard
                    variant="passenger"
                    totalFareUsd={Number(maxPrice)}
                    t={t}
                    titleKey="offerBreakdown"
                    showTransparentHint={false}
                    optionalDonationUsd={
                      selectedCause && Number(maxPrice) > 0
                        ? calculateDonationAmount(Number(maxPrice), { type: 'percentage', value: 10 })
                        : null
                    }
                  />
                </div>
              )}
              {negotiationState === 'countered' && driverCounterOffer !== null && driverCounterOffer > 0 && (
                <div style={{ padding: '0 14px 10px' }}>
                  <FareBreakdownCard
                    variant="passenger"
                    totalFareUsd={driverCounterOffer}
                    t={t}
                    titleKey="counteroffer"
                    optionalDonationUsd={
                      selectedCause ? calculateDonationAmount(driverCounterOffer, { type: 'percentage', value: 10 }) : null
                    }
                  />
                </div>
              )}
              {negotiationNote && (
                <p style={{ textAlign: 'center', fontSize: 11, color: '#334155', fontWeight: 700, margin: '8px 0 2px' }}>
                  {negotiationNote}
                </p>
              )}
              {selectedCause ? (
                <div
                  style={{
                    marginTop: 8,
                    borderRadius: 10,
                    border: '1px solid #86efac',
                    background: '#f0fdf4',
                    padding: '8px 10px',
                  }}
                >
                  <p style={{ textAlign: 'center', fontSize: 11, color: '#166534', fontWeight: 800, margin: '0 0 2px' }}>
                    {selectedCause.name} · {selectedCause.category} · {selectedCause.city}
                  </p>
                  <p style={{ textAlign: 'center', fontSize: 11, color: '#15803d', fontWeight: 700, margin: 0 }}>
                    {tf('passengerCharityAddonFooter', {
                      name: selectedCause?.name ?? t('charities'),
                      amount: `$${charityAddonPreviewUsd.toFixed(2)}`,
                    })}
                  </p>
                </div>
              ) : (
                <p style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', fontWeight: 500, margin: '8px 0 2px' }}>
                  {t('selectCharityHint')}
                </p>
              )}
              <p style={{ textAlign: 'center', fontSize: 11, color: '#334155', fontWeight: 700, margin: '8px 0 2px' }}>
                {t('rideNotActiveUntilAccepted')}
              </p>
              <p style={{ textAlign: 'center', fontSize: 11, color: '#64748B', fontWeight: 600, margin: '6px 0 2px' }}>
                {t('rideSignalSent')} · {t('waitingAcceptance')}
              </p>
            </div>
          </div>
        )}

        {/* ── Bottom tab bar ── */}
        {!(sheet === 'options' && optionsPanelCollapsed) && (
          <nav style={sheet === 'search' ? S.tabBarGlass : S.tabBar}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                style={S.tab(activeTab === tab.id)}
                onClick={() => handleTabClick(tab.id)}
              >
                <span style={{ fontSize: 22 }}>{tab.icon}</span>
                <span>{t(tab.key)}</span>
              </button>
            ))}
          </nav>
        )}
      </div>

      {sheet === 'search' && bothSet && (
        <button
          type="button"
          onClick={() => setSheet('options')}
          aria-label={t('continueToRideOptions')}
          title={t('continueToRideOptions')}
          style={{
            position: 'absolute',
            bottom: 96,
            right: 18,
            zIndex: 35,
            width: 52,
            height: 52,
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.75)',
            background: 'rgba(255, 255, 255, 0.55)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            color: '#0f172a',
            fontSize: 22,
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: '0 6px 22px rgba(15, 23, 42, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          →
        </button>
      )}

      <style>{`@keyframes gw-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default PassengerRideHomePage;
