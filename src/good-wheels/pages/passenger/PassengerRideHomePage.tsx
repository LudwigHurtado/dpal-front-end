import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GW_PATHS } from '../../routes/paths';
import { useGoogleMaps } from '../../features/map/useGoogleMaps';
import { useTripStore } from '../../features/trips/tripStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { LatLng } from '../../features/map/mapTypes';

type RideTier = 'economy' | 'comfort' | 'xl';

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

const BG_COLORS: Record<RideTier, string> = {
  economy: '#0077C8',
  comfort: '#0D3B66',
  xl: '#2FB344',
};

function getCarSvg(tier: RideTier): string {
  const bg = BG_COLORS[tier];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
    <circle cx="20" cy="20" r="18" fill="${bg}" stroke="white" stroke-width="2.5"/>
    <rect x="10" y="17" width="20" height="10" rx="3" fill="white" opacity="0.92"/>
    <rect x="13" y="13" width="14" height="8" rx="2" fill="white" opacity="0.70"/>
    <circle cx="14" cy="27.5" r="2.5" fill="${bg}" stroke="white" stroke-width="1"/>
    <circle cx="26" cy="27.5" r="2.5" fill="${bg}" stroke="white" stroke-width="1"/>
  </svg>`;
}

const TABS = [
  { id: 'ride' as const, label: 'Ride', icon: '🚗' },
  { id: 'charities' as const, label: 'Charities', icon: '❤️' },
  { id: 'donations' as const, label: 'Donations', icon: '🤝' },
  { id: 'profile' as const, label: 'Profile', icon: '👤' },
];

const PassengerRideHomePage: React.FC = () => {
  const navigate = useNavigate();
  const signOut = useAuthStore((s) => s.signOut);
  const draft = useTripStore((s) => s.draft);
  const setDraft = useTripStore((s) => s.setDraft);
  const { google: g, ready } = useGoogleMaps();

  const mapRef = useRef<HTMLDivElement>(null);
  const mapObjRef = useRef<google.maps.Map | null>(null);
  const directionsRendRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
  const dropoffMarkerRef = useRef<google.maps.Marker | null>(null);
  const vehicleMarkerRef = useRef<google.maps.Marker | null>(null);

  const [selectedRideId, setSelectedRideId] = useState<RideTier>('economy');
  const [pickupText, setPickupText] = useState(draft.pickup?.addressLine ?? '');
  const [dropoffText, setDropoffText] = useState(draft.dropoff?.addressLine ?? '');
  const [pickupLL, setPickupLL] = useState<LatLng | null>(draft.pickup?.point ?? null);
  const [dropoffLL, setDropoffLL] = useState<LatLng | null>(draft.dropoff?.point ?? null);
  const [pickupPreds, setPickupPreds] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [dropoffPreds, setDropoffPreds] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [activeTab, setActiveTab] = useState<'ride' | 'charities' | 'donations' | 'profile'>('ride');

  // Init map
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
      polylineOptions: {
        strokeColor: '#F4A300',
        strokeWeight: 5,
        strokeOpacity: 0.85,
      },
    });
    directionsRendRef.current.setMap(mapObjRef.current);
  }, [ready, g]);

  // Update markers and route whenever points change
  useEffect(() => {
    if (!g || !mapObjRef.current) return;

    // Pickup marker (red)
    if (pickupLL) {
      if (!pickupMarkerRef.current) {
        pickupMarkerRef.current = new g.maps.Marker({
          map: mapObjRef.current,
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2.5,
          },
          title: 'Pickup',
          zIndex: 10,
        });
      }
      pickupMarkerRef.current.setPosition(pickupLL);
    } else {
      pickupMarkerRef.current?.setMap(null);
      pickupMarkerRef.current = null;
    }

    // Dropoff marker (green)
    if (dropoffLL) {
      if (!dropoffMarkerRef.current) {
        dropoffMarkerRef.current = new g.maps.Marker({
          map: mapObjRef.current,
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#22c55e',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2.5,
          },
          title: 'Dropoff',
          zIndex: 10,
        });
      }
      dropoffMarkerRef.current.setPosition(dropoffLL);
    } else {
      dropoffMarkerRef.current?.setMap(null);
      dropoffMarkerRef.current = null;
    }

    // Route + vehicle preview
    if (pickupLL && dropoffLL && directionsRendRef.current) {
      const dirSvc = new g.maps.DirectionsService();
      dirSvc.route(
        {
          origin: pickupLL,
          destination: dropoffLL,
          travelMode: g.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === 'OK' && result && directionsRendRef.current) {
            directionsRendRef.current.setDirections(result);
            // Place vehicle marker at ~25% of the route path
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
            // Fit bounds
            const bounds = new g.maps.LatLngBounds();
            bounds.extend(pickupLL);
            bounds.extend(dropoffLL);
            mapObjRef.current?.fitBounds(bounds, { top: 120, bottom: 280, left: 32, right: 32 });
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

  // Update vehicle icon when tier changes without re-routing
  useEffect(() => {
    if (!g || !vehicleMarkerRef.current) return;
    vehicleMarkerRef.current.setIcon({
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(getCarSvg(selectedRideId))}`,
      scaledSize: new g.maps.Size(40, 40),
      anchor: new g.maps.Point(20, 20),
    });
  }, [g, selectedRideId]);

  const fetchPredictions = (
    input: string,
    cb: (preds: google.maps.places.AutocompletePrediction[]) => void
  ) => {
    if (!g || !input.trim()) { cb([]); return; }
    const svc = new g.maps.places.AutocompleteService();
    svc.getPlacePredictions({ input }, (preds, status) => {
      if (status !== g.maps.places.PlacesServiceStatus.OK || !preds) { cb([]); return; }
      cb(preds.slice(0, 5));
    });
  };

  const applyPrediction = (
    pred: google.maps.places.AutocompletePrediction,
    mode: 'pickup' | 'dropoff'
  ) => {
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
      } else {
        setDropoffText(addr);
        if (point) setDropoffLL(point);
        setDropoffPreds([]);
        setDraft({ dropoff: { label: 'Dropoff', addressLine: addr, point } });
      }
    });
  };

  const canConfirm = pickupText.trim().length > 0 && dropoffText.trim().length > 0;

  const handleConfirmRide = () => {
    navigate(GW_PATHS.passenger.request);
  };

  const handleTabClick = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === 'charities') navigate(GW_PATHS.passenger.charities);
    else if (tab === 'donations') navigate(GW_PATHS.passenger.donations);
    else if (tab === 'profile') navigate(GW_PATHS.auth.profile);
  };

  return (
    <div className="gw-ride-home">
      {/* ── Blue brand header ── */}
      <header className="gw-ride-header">
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

      {/* ── Map stage (everything floats here) ── */}
      <div className="gw-ride-map-stage">
        {/* Map canvas */}
        <div ref={mapRef} className="gw-ride-map-canvas" />

        {/* Map loading placeholder */}
        {!ready && (
          <div className="gw-ride-map-loading">
            <div className="gw-ride-map-loading-inner">
              <div style={{ fontSize: 36, marginBottom: 8 }}>🗺️</div>
              <div style={{ fontWeight: 700, color: '#6B7280' }}>Loading map…</div>
            </div>
          </div>
        )}

        {/* ── Floating trip address input card ── */}
        <div className="gw-trip-addr-card">
          {/* Pickup row */}
          <div className="gw-addr-row">
            <div className="gw-addr-icon gw-addr-icon-pickup">
              <svg viewBox="0 0 10 10" width="10" height="10" fill="#ef4444"><circle cx="5" cy="5" r="4" /></svg>
            </div>
            <input
              className="gw-addr-input"
              placeholder="Where from? (pickup)"
              value={pickupText}
              onChange={(e) => {
                const v = e.target.value;
                setPickupText(v);
                setDraft({ pickup: { label: 'Pickup', addressLine: v, point: pickupLL ?? undefined } });
                fetchPredictions(v, setPickupPreds);
              }}
            />
          </div>
          {pickupPreds.length > 0 && (
            <div className="gw-addr-preds">
              {pickupPreds.map((p) => (
                <button
                  key={p.place_id}
                  type="button"
                  className="gw-addr-pred-item"
                  onClick={() => applyPrediction(p, 'pickup')}
                >
                  <span style={{ marginRight: 6 }}>📍</span>
                  {p.description}
                </button>
              ))}
            </div>
          )}

          <div className="gw-addr-divider" />

          {/* Dropoff row */}
          <div className="gw-addr-row">
            <div className="gw-addr-icon gw-addr-icon-dropoff">
              <svg viewBox="0 0 10 10" width="10" height="10" fill="#22c55e"><circle cx="5" cy="5" r="4" /></svg>
            </div>
            <input
              className="gw-addr-input"
              placeholder="Enter destination (dropoff)"
              value={dropoffText}
              onChange={(e) => {
                const v = e.target.value;
                setDropoffText(v);
                setDraft({ dropoff: { label: 'Dropoff', addressLine: v, point: dropoffLL ?? undefined } });
                fetchPredictions(v, setDropoffPreds);
              }}
            />
          </div>
          {dropoffPreds.length > 0 && (
            <div className="gw-addr-preds">
              {dropoffPreds.map((p) => (
                <button
                  key={p.place_id}
                  type="button"
                  className="gw-addr-pred-item"
                  onClick={() => applyPrediction(p, 'dropoff')}
                >
                  <span style={{ marginRight: 6 }}>📍</span>
                  {p.description}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Floating ride options + confirm ── */}
        <div className="gw-ride-opts-card">
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
                {/* Vehicle icon */}
                <div
                  className="gw-ride-opt-icon"
                  style={{ background: BG_COLORS[opt.id] }}
                >
                  <svg viewBox="0 0 24 14" fill="none" width="28" height="16">
                    <rect x="1" y="5" width="22" height="8" rx="2" fill="white" opacity="0.85" />
                    <rect x="4" y="1" width="16" height="8" rx="2" fill="white" opacity="0.65" />
                    <circle cx="5" cy="13" r="2" fill={BG_COLORS[opt.id]} stroke="white" strokeWidth="1.2" />
                    <circle cx="19" cy="13" r="2" fill={BG_COLORS[opt.id]} stroke="white" strokeWidth="1.2" />
                  </svg>
                </div>
                <div className="gw-ride-opt-info">
                  <div className="gw-ride-opt-name">{opt.label}</div>
                  <div className="gw-ride-opt-eta">{opt.etaMin} min away</div>
                </div>
                <div className="gw-ride-opt-price">${opt.price}</div>
                {sel && <div className="gw-ride-opt-check">✓</div>}
              </button>
            );
          })}

          {/* Charity banner */}
          <div className="gw-ride-charity-banner">
            <span>❤️</span>
            <span>Every ride supports a local cause</span>
            <button
              type="button"
              className="gw-ride-charity-link"
              onClick={() => navigate(GW_PATHS.passenger.charities)}
            >
              Choose →
            </button>
          </div>

          {/* Confirm Ride CTA */}
          <button
            type="button"
            className="gw-ride-confirm-btn"
            disabled={!canConfirm}
            onClick={handleConfirmRide}
          >
            {canConfirm ? 'Confirm Ride' : 'Enter pickup & destination'}
          </button>
        </div>
      </div>

      {/* ── Bottom tab bar ── */}
      <nav className="gw-ride-bottom-tabs" aria-label="Main navigation">
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
