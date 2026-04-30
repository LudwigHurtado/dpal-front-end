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
import { PassengerRideOptionsPanel } from './PassengerRideOptionsPanel';
import type { CauseOrganization } from '../../features/charity/types';
import {
  addressRowChrome,
  locationModeSegment,
  locationModeSegmentBar,
  roleDotColor,
  roleGpsIconColor,
} from './locationSelectionChrome';
import { estimateGoodWheelsListedFareUsd } from '../../features/trips/utils/rideHailFareEstimate';
import { parseUsdInputToCents } from '../../features/trips/utils/moneyInput';
import PassengerDriverCounterofferBlock, {
  passengerHasPendingDriverCounter,
} from '../../features/passenger/components/PassengerDriverCounterofferBlock';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type VehicleType = 'car' | 'comfort' | 'moto' | 'large' | 'delivery';
type ActiveField = 'pickup' | 'dropoff' | null;
type SheetState  = 'search' | 'options';
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
/**
 * Service tiers vs standard car (1.0).
 * **Delivery** (goods/courier) is lowest — no passenger duty-of-care like moving a person.
 * **Moto** (passenger on two wheels) sits above courier, below a closed car.
 */
const VEHICLES: { id: VehicleType; label: string; sub: string; emoji: string; mult: number; eta: string }[] = [
  { id: 'delivery',  label: 'Delivery',  sub: 'Packages & essentials', emoji: '📦', mult: 0.76, eta: '4 min' },
  { id: 'moto',      label: 'Moto',      sub: 'Motorcycle',            emoji: '🏍', mult: 0.9,  eta: '2 min' },
  { id: 'car',       label: 'Standard',  sub: 'Sedan / Compact',       emoji: '🚗', mult: 1.0,  eta: '3 min' },
  { id: 'comfort',   label: 'Comfort',   sub: 'Larger Sedan',          emoji: '🚙', mult: 1.16, eta: '5 min' },
  { id: 'large',     label: 'Large',     sub: 'SUV / Van',             emoji: '🚐', mult: 1.42, eta: '6 min' },
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
  const [sheet, setSheet]           = useState<SheetState>('search');
  const [activeField, setActiveField] = useState<ActiveField>('pickup');
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
  const [selectedCause, setSelectedCause] = useState<CauseOrganization | null>(null);
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
    // Changing price or vehicle starts a fresh negotiation.
    setNegotiationState('idle');
    setDriverCounterOffer(null);
    setNegotiationNote(null);
  }, [maxPrice, vehicleType]);

  const pickupDraftKey =
    draft.pickup == null
      ? '__empty__'
      : `${draft.pickup.addressLine ?? ''}\t${draft.pickup.point?.lat ?? ''}\t${draft.pickup.point?.lng ?? ''}`;
  const dropoffDraftKey =
    draft.dropoff == null
      ? '__empty__'
      : `${draft.dropoff.addressLine ?? ''}\t${draft.dropoff.point?.lat ?? ''}\t${draft.dropoff.point?.lng ?? ''}`;

  /* Keep address inputs + pins aligned with trip draft (store updates, refresh, other flows). */
  useEffect(() => {
    if (draft.pickup) {
      setPickupText(draft.pickup.addressLine ?? '');
      setPickupLL(draft.pickup.point ?? null);
    } else {
      setPickupText('');
      setPickupLL(null);
    }
    if (draft.dropoff) {
      setDropoffText(draft.dropoff.addressLine ?? '');
      setDropoffLL(draft.dropoff.point ?? null);
    } else {
      setDropoffText('');
      setDropoffLL(null);
    }
  }, [pickupDraftKey, dropoffDraftKey, draft.pickup, draft.dropoff]);

  /* When both stops exist on the map, default map taps to drop-off unless the user chose pickup mode. */
  useEffect(() => {
    if (sheet === 'search' && pickupLL && dropoffLL && activeField === null) {
      setActiveField('dropoff');
    }
  }, [sheet, pickupLL, dropoffLL, activeField]);

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
    if (!user?.id || GOOD_WHEELS_DEMO_MODE) return;
    const uid = user.id;
    void hydrateTrips(uid);
    const id = window.setInterval(() => void hydrateTrips(uid), 6000);
    return () => window.clearInterval(id);
  }, [user?.id, hydrateTrips]);

  const estimateFareForVehicle = useCallback(
    (id: VehicleType) =>
      estimateGoodWheelsListedFareUsd({
        distanceKm: routeDistanceKm,
        durationMinutes: routeDurationMinutes,
        serviceTierMultiplier: VEHICLES.find((v) => v.id === id)?.mult ?? 1,
      }),
    [routeDistanceKm, routeDurationMinutes],
  );

  useEffect(() => {
    if (!bothSet) return;
    setMaxPrice(estimateFareForVehicle(vehicleType).toFixed(2));
  }, [bothSet, vehicleType, routeDistanceKm, routeDurationMinutes, estimateFareForVehicle]);

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
          setActiveField('pickup');
          setPickupText(addr); setPickupLL(pt); setPickupPreds([]);
          setDraft({ pickup: { label: t('pickupLabel'), addressLine: addr, point: pt } });
          keepPointVisible(pt);
          if (!dropoffLL) setActiveField('dropoff');
        } else {
          setActiveField('dropoff');
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
            mapObjRef.current?.fitBounds(bounds, { top: 80, bottom: 280, left: 32, right: 32 });
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
            setActiveField('pickup');
            setPickupText(addr); if (point) setPickupLL(point); setPickupPreds([]);
            setDraft({ pickup: { label: t('pickupLabel'), addressLine: addr, point } });
            if (point) keepPointVisible(point);
            if (!dropoffLL) setActiveField('dropoff');
          } else {
            setActiveField('dropoff');
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
          setActiveField('pickup');
          setPickupText(addr); setPickupLL(pt); setPickupPreds([]);
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
    setActiveField('dropoff');
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
    const recUsd = estimateFareForVehicle(vehicleType);
    const fromInputCents = parseUsdInputToCents(maxPrice);
    const recommendedFareCentsBase =
      Number.isFinite(recUsd) && recUsd > 0 ? Math.round(recUsd * 100 + Number.EPSILON) : undefined;
    const passengerOfferCents = fromInputCents ?? recommendedFareCentsBase;
    const recommendedFareCents = recommendedFareCentsBase ?? passengerOfferCents;
    const displayUsd =
      passengerOfferCents != null ? (passengerOfferCents / 100).toFixed(2) : (Number.isFinite(recUsd) && recUsd > 0 ? recUsd.toFixed(2) : '0.00');
    setDraft({
      notes: `${tf('negotiation_yourOffer', { amount: displayUsd })} ${vehicleLabel(selVehicle.label)}${charityNote}`,
      estimatePreview:
        routeDistanceKm != null
          ? { distanceKm: routeDistanceKm, etaMinutes: routeDurationMinutes != null ? routeDurationMinutes : 8 }
          : undefined,
      routeSummaryPreview:
        routeDistanceKm != null && routeDurationMinutes != null
          ? { distanceKm: routeDistanceKm, durationMinutes: routeDurationMinutes }
          : undefined,
      passengerOfferCents,
      recommendedFareCents,
    });
    await requestRide();
    setBroadcasting(false);
    navigate(GW_PATHS.passenger.active);
  };

  const handleSendOffer = (explicitUsd?: number) => {
    const offer = explicitUsd ?? Number(maxPrice);
    if (!Number.isFinite(offer) || offer <= 0) return;
    if (explicitUsd != null) setMaxPrice(offer.toFixed(2));
    setNegotiationState('pending');
    setNegotiationNote(`${t('negotiation_offerSent')} · ${t('negotiation_driverReviewing')}`);
    window.setTimeout(() => {
      const requestedFare = estimateFareForVehicle(vehicleType);
      if (offer >= requestedFare) {
        setNegotiationState('accepted');
        setNegotiationNote(`${tf('negotiation_youOffered', { amount: offer.toFixed(2) })} · ${t('negotiation_confirmRide')}`);
        void handleBroadcast();
        return;
      }
      // Do not label the route-based minimum as a driver counteroffer (no driver response yet).
      setDriverCounterOffer(null);
      setNegotiationState('idle');
      setNegotiationNote(
        tf('negotiation_route_below_guidance', {
          minimum: requestedFare.toFixed(2),
          offered: offer.toFixed(2),
        }),
      );
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

  const clearPickupDropoffLocations = useCallback(() => {
    setPickupPreds([]);
    setDropoffPreds([]);
    setPickupText('');
    setDropoffText('');
    setPickupLL(null);
    setDropoffLL(null);
    setSelectedCause(null);
    setActiveField('pickup');
    setDraft({
      pickup: null,
      dropoff: null,
      attachedCause: undefined,
      notes: undefined,
      estimatePreview: undefined,
      routeSummaryPreview: undefined,
      passengerOfferCents: undefined,
      recommendedFareCents: undefined,
    });
  }, [setDraft]);

  const handleCancelRideState = () => {
    clearActiveTrip();
    clearDraft();
    setPickupText('');
    setDropoffText('');
    setPickupLL(null);
    setDropoffLL(null);
    setPickupPreds([]);
    setDropoffPreds([]);
    setSelectedCause(null);
    setSheet('search');
    setActiveField('pickup');
    setNegotiationState('idle');
    setDriverCounterOffer(null);
    setNegotiationNote(`${t('cancelRideLabel')}. ${t('requestRide')}.`);
  };

  const handleRefreshRideState = async () => {
    if (!user?.id) return;
    setNegotiationNote(`${t('refreshRide')}...`);
    await hydrateTrips(user.id);
    const at = useTripStore.getState().activeTrip;
    if (!passengerHasPendingDriverCounter(at)) {
      setNegotiationState('idle');
      setDriverCounterOffer(null);
    } else {
      setNegotiationNote(t('passengerCounterofferSynced'));
    }
  };

  const selVehicle = VEHICLES.find((v) => v.id === vehicleType) ?? VEHICLES[0];
  const vehicleLabel = (label: string) => {
    if (label === 'Standard') return t('vehicle_standard');
    if (label === 'Comfort') return t('vehicle_comfort');
    if (label === 'Moto') return t('vehicle_moto');
    if (label === 'Large') return t('vehicle_large');
    if (label === 'Delivery') return t('service_delivery');
    return label;
  };
  /* ─────────────────────────────────────────────
     Styles (shared inline)
  ───────────────────────────────────────────── */
  const S = {
    root: {
      position: 'relative' as const,
      width: '100%',
      maxWidth: 1120,
      margin: '0 auto',
      height: 'calc(100dvh - var(--gw-appbar-height, 56px))',
      minHeight: 'calc(100dvh - var(--gw-appbar-height, 56px))',
      overflow: 'hidden',
      background: '#e5e7eb',
      fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
    },
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
      width: 'min(420px, calc(100vw - 24px))',
      background: 'rgba(255, 255, 255, 0.58)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderRadius: 14,
      padding: '8px 10px',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'stretch',
      gap: 6,
      boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.65)',
      zIndex: 25,
      fontSize: 12,
      fontWeight: 600,
      color: '#111827',
    },

    /* Bottom sheet wrapper */
    sheet: {
      position: 'absolute' as const,
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(100%, 720px)',
      background: 'white',
      borderRadius: '20px 20px 0 0',
      zIndex: 30,
      boxShadow: '0 -4px 30px rgba(0,0,0,0.12)',
      maxHeight: sheet === 'search' ? '48dvh' : 'min(48dvh, 70vh)',
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
    sheetOptionsGlass: {
      background: 'rgba(255, 255, 255, 0.22)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow: '0 -6px 28px rgba(15, 23, 42, 0.06)',
      borderTop: '1px solid rgba(255, 255, 255, 0.42)',
    },
    handle: { width: 36, height: 4, background: '#E5E7EB', borderRadius: 2, margin: '10px auto 0' },
    handleSearch: { width: 36, height: 4, background: 'rgba(148, 163, 184, 0.45)', borderRadius: 2, margin: '10px auto 0' },
    handleOptions: { width: 36, height: 4, background: 'rgba(148, 163, 184, 0.4)', borderRadius: 2, margin: '10px auto 0' },

    /* Search input row */
    inputRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 12, background: '#F9FAFB', border: '1px solid #E5E7EB' },
    input: { flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 15, color: '#111827', fontWeight: 500, fontFamily: 'inherit' },
  };

  const vehiclesForOptions = useMemo(
    () =>
      VEHICLES.map((v) => ({
        id: v.id,
        sub: v.sub,
        emoji: v.emoji,
        mult: v.mult,
        eta: v.eta,
        estimatedUsd: estimateFareForVehicle(v.id),
      })),
    [estimateFareForVehicle],
  );

  const recommendedUsd = estimateFareForVehicle(vehicleType);

  const pickupLocActive = activeField === 'pickup';
  const pickupLocHasPlace = Boolean(pickupLL && pickupText.trim());
  const pickupLocProminent = pickupLocActive || pickupLocHasPlace;
  const dropoffLocActive = activeField === 'dropoff';
  const dropoffLocHasPlace = Boolean(dropoffLL && dropoffText.trim());
  const dropoffLocProminent = dropoffLocActive || dropoffLocHasPlace;

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
            bottom: 92,
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
            bottom: 52,
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
      {!GOOD_WHEELS_DEMO_MODE && activeTrip && passengerHasPendingDriverCounter(activeTrip) ? (
        <div
          style={{
            position: 'absolute',
            top: 'max(56px, calc(var(--gw-appbar-height, 56px) + 4px))',
            left: 12,
            right: 12,
            zIndex: 45,
            maxHeight: 'min(46dvh, 380px)',
            overflowY: 'auto',
            pointerEvents: 'auto',
          }}
        >
          <PassengerDriverCounterofferBlock trip={activeTrip} variant="hero" showActiveTripLink />
        </div>
      ) : null}

      {/* ── TOP BAR ── */}
      <div style={S.topBar}>
        <div
          style={{
            pointerEvents: 'auto',
            padding: '8px 14px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(226,232,240,0.95)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            fontSize: 12,
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '0.02em',
          }}
        >
          {t('requestRide')}
        </div>
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
            {locatingPickup ? <Spinner color={roleGpsIconColor('pickup', true)} /> : <GpsIcon size={20} color={roleGpsIconColor('pickup', true)} />}
          </button>
        </div>
      </div>

      {/* ── MAP SELECTION MODE (search only) ── */}
      {sheet === 'search' && (
      <div style={S.pinHint}>
        <div style={locationModeSegmentBar()}>
          <button type="button" onClick={() => setActiveField('pickup')} style={locationModeSegment('pickup', pickupLocActive)}>
            {t('mapSheet_pickup')}
          </button>
          <button type="button" onClick={() => setActiveField('dropoff')} style={locationModeSegment('dropoff', dropoffLocActive)}>
            {t('mapSheet_dropoff')}
          </button>
        </div>
        <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>
          {reverseGeoLoading ? t('readingLocation') : t('clickMapSetPickupDropoff')}
        </span>
      </div>
      )}

      {/* ── BOTTOM SHEET ── */}
      <div
        style={{
          ...S.sheet,
          ...(sheet === 'search' ? S.sheetSearchGlass : sheet === 'options' ? S.sheetOptionsGlass : {}),
        }}
      >
        <div style={sheet === 'search' ? S.handleSearch : sheet === 'options' ? S.handleOptions : S.handle} />

        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* ════ STATE: SEARCH ════ */}
        {sheet === 'search' && (
          <div style={{ padding: '8px 20px 12px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {gpsError && (
              <div style={{ marginBottom: 8, border: '1px solid rgba(252, 165, 165, 0.6)', background: 'rgba(254, 242, 242, 0.85)', color: '#B91C1C', borderRadius: 10, padding: '8px 10px', fontSize: 11, fontWeight: 700 }}>
                {gpsError}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => clearPickupDropoffLocations()}
                title={t('clear')}
                aria-label={t('clear')}
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
                <span style={{ fontSize: 18, fontWeight: 800, color: '#334155', lineHeight: 1 }}>×</span>
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

            <div style={{ ...addressRowChrome('pickup', pickupLocActive, pickupLocHasPlace), marginBottom: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: roleDotColor('pickup', pickupLocProminent), flexShrink: 0, display: 'inline-block' }} />
              <input
                className="gw-loc-ph-pickup"
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
                {locatingPickup ? <Spinner color={roleGpsIconColor('pickup', pickupLocProminent)} /> : <GpsIcon size={17} color={roleGpsIconColor('pickup', pickupLocProminent)} />}
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

            <div style={{ ...addressRowChrome('dropoff', dropoffLocActive, dropoffLocHasPlace), marginTop: 8, marginBottom: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: roleDotColor('dropoff', dropoffLocProminent), flexShrink: 0, display: 'inline-block' }} />
              <input
                className="gw-loc-ph-dropoff"
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
                {locatingDropoff ? <Spinner color={roleGpsIconColor('dropoff', dropoffLocProminent)} /> : <GpsIcon size={17} color={roleGpsIconColor('dropoff', dropoffLocProminent)} />}
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
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <PassengerRideOptionsPanel
            t={t}
            tf={tf}
            onBack={() => setSheet('search')}
            pickupSummary={pickupText.split(',')[0]}
            dropoffSummary={dropoffText.split(',')[0]}
            routeDistanceKm={routeDistanceKm}
            routeDurationMinutes={routeDurationMinutes}
            vehicles={vehiclesForOptions}
            vehicleType={vehicleType}
            onVehicleType={setVehicleType}
            recommendedUsd={recommendedUsd}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            onSendOffer={handleSendOffer}
            broadcasting={broadcasting}
            bothSet={bothSet}
            negotiationState={negotiationState}
            driverCounterOffer={driverCounterOffer}
            onAcceptCounter={handleAcceptCounter}
            onKeepMyOffer={handleKeepMyOffer}
            negotiationNote={negotiationNote}
          />
          </div>
        )}
        </div>
      </div>

      {sheet === 'search' && bothSet && (
        <button
          type="button"
          onClick={() => setSheet('options')}
          aria-label={t('continueToRideOptions')}
          title={t('continueToRideOptions')}
          style={{
            position: 'absolute',
            bottom: 48,
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

      <style>{`
@keyframes gw-spin { to { transform: rotate(360deg); } }
.gw-loc-ph-pickup::placeholder { color: rgba(22, 163, 74, 0.42); }
.gw-loc-ph-dropoff::placeholder { color: rgba(220, 38, 38, 0.42); }
`}</style>
    </div>
  );
};

export default PassengerRideHomePage;
