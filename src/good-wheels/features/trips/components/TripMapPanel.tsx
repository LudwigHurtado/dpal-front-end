import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Trip } from '../tripTypes';
import { useGoogleMaps } from '../../map/useGoogleMaps';
import { geocodeAddress, midpoint } from '../../map/mapUtils';
import type { LatLng } from '../../map/mapTypes';

const TripMapPanel: React.FC<{
  trip: Trip;
  variant?: 'passenger' | 'driver' | 'worker';
  pinMode?: 'pickup' | 'dropoff' | null;
  onPinSelect?: (args: { lat: number; lng: number; addressLine: string; mode: 'pickup' | 'dropoff' }) => void;
}> = ({ trip, variant = 'passenger', pinMode = null, onPinSelect }) => {
  const title = variant === 'driver' ? 'Navigation' : variant === 'worker' ? 'Coordination map' : 'Trip map';
  const { google: g, ready, error } = useGoogleMaps();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObjRef = useRef<google.maps.Map | null>(null);
  const directionsRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);
  const driverTickRef = useRef<number | null>(null);
  const nearbyCarsRef = useRef<google.maps.Marker[]>([]);
  const [pickupLL, setPickupLL] = useState<LatLng | null>(null);
  const [dropoffLL, setDropoffLL] = useState<LatLng | null>(null);
  /** Set when DirectionsService fails (e.g. Directions API disabled in GCP). */
  const [directionsError, setDirectionsError] = useState<string | null>(null);

  const placeAtMapCenter = () => {
    if (!g || !onPinSelect || !pinMode) return;
    const map = mapObjRef.current;
    const centerPt = map?.getCenter();
    const lat = centerPt?.lat();
    const lng = centerPt?.lng();
    if (typeof lat !== 'number' || typeof lng !== 'number') return;
    const geocoder = new g.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      const addressLine =
        status === 'OK' && results && results[0]?.formatted_address
          ? results[0].formatted_address
          : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      onPinSelect({ lat, lng, addressLine, mode: pinMode });
    });
  };

  const pickupAddress = trip.pickup.addressLine;
  const dropoffAddress = trip.dropoff.addressLine;

  const fallbackCenter = useMemo<LatLng>(() => ({ lat: 40.7128, lng: -74.006 }), []);
  const center = useMemo<LatLng>(() => {
    if (pickupLL && dropoffLL) return midpoint(pickupLL, dropoffLL);
    return pickupLL ?? dropoffLL ?? fallbackCenter;
  }, [pickupLL, dropoffLL, fallbackCenter]);

  useEffect(() => {
    if (!ready || !g) return;
    if (!mapRef.current) return;
    if (mapObjRef.current) return;
    mapObjRef.current = new g.maps.Map(mapRef.current, {
      center,
      zoom: 13,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
      draggableCursor: pinMode ? 'crosshair' : undefined,
      mapId: undefined,
    });
    directionsRef.current = new g.maps.DirectionsRenderer({
      map: mapObjRef.current,
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#FEC345', strokeOpacity: 0.95, strokeWeight: 6 },
    });
  }, [ready, g, center]);

  useEffect(() => {
    const map = mapObjRef.current;
    if (!map) return;
    map.setOptions({ draggableCursor: pinMode ? 'crosshair' : undefined });
  }, [pinMode]);

  useEffect(() => {
    if (!ready || !g) return;
    let cancelled = false;
    (async () => {
      const [p, d] = await Promise.all([
        trip.pickup.point ? Promise.resolve(trip.pickup.point) : geocodeAddress(g, pickupAddress),
        trip.dropoff.point ? Promise.resolve(trip.dropoff.point) : geocodeAddress(g, dropoffAddress),
      ]);
      if (cancelled) return;
      setPickupLL(p);
      setDropoffLL(d);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, g, pickupAddress, dropoffAddress]);

  useEffect(() => {
    if (!ready || !g) return;
    const map = mapObjRef.current;
    if (!map) return;
    map.setCenter(center);

    // Clear markers by re-creating lightweight markers each time (simple demo mode).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (map as any).__gwMarkers?.forEach((m: google.maps.Marker) => m.setMap(null));

    const markers: google.maps.Marker[] = [];
    if (pickupLL) {
      markers.push(
        new g.maps.Marker({
          map,
          position: pickupLL,
          label: { text: 'P', color: '#ffffff', fontWeight: '800' },
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#ef4444',
            fillOpacity: 0.85,
            strokeColor: '#7f1d1d',
            strokeWeight: 2,
          },
        })
      );
    }
    if (dropoffLL) {
      markers.push(
        new g.maps.Marker({
          map,
          position: dropoffLL,
          label: { text: 'D', color: '#ffffff', fontWeight: '800' },
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#22c55e',
            fillOpacity: 0.9,
            strokeColor: '#14532d',
            strokeWeight: 2,
          },
        })
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (map as any).__gwMarkers = markers;

    nearbyCarsRef.current.forEach((m) => m.setMap(null));
    nearbyCarsRef.current = [];
    const shouldShowNearbyCars =
      variant === 'passenger' &&
      (trip.status === 'draft' || trip.status === 'requested' || trip.status === 'matched');
    if (shouldShowNearbyCars && pickupLL) {
      const offsets = [
        { lat: 0.003, lng: 0.0025 },
        { lat: -0.002, lng: 0.0032 },
        { lat: 0.0015, lng: -0.0028 },
      ];
      nearbyCarsRef.current = offsets.map((o, i) =>
        new g.maps.Marker({
          map,
          position: { lat: pickupLL.lat + o.lat, lng: pickupLL.lng + o.lng },
          title: `Nearby car ${i + 1}`,
          icon: {
            path: g.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 4.8,
            fillColor: '#2FB344',
            fillOpacity: 0.95,
            strokeColor: '#14532d',
            strokeWeight: 1,
          },
        })
      );
    }

    const dr = directionsRef.current;
    if (!dr || !pickupLL || !dropoffLL) {
      setDirectionsError(null);
      return;
    }

    const svc = new g.maps.DirectionsService();
    svc.route(
      {
        origin: pickupLL,
        destination: dropoffLL,
        travelMode: g.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          dr.setDirections(result);
          setDirectionsError(null);
          return;
        }
        const msg = `Driving route unavailable (${String(status)}). Enable **Directions API** for this key in Google Cloud.`;
        console.warn('[Good Wheels TripMapPanel]', msg);
        setDirectionsError(msg);
        dr.setDirections({ routes: [] } as unknown as google.maps.DirectionsResult);
      }
    );
  }, [ready, g, center, pickupLL, dropoffLL, trip.status, variant]);

  useEffect(() => {
    if (!ready || !g) return;
    const map = mapObjRef.current;
    if (!map || !pickupLL || !dropoffLL) return;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setMap(null);
      driverMarkerRef.current = null;
    }
    if (driverTickRef.current) {
      window.clearInterval(driverTickRef.current);
      driverTickRef.current = null;
    }

    const shouldTrack =
      trip.status === 'driver_assigned' ||
      trip.status === 'driver_arriving' ||
      trip.status === 'arrived' ||
      trip.status === 'in_progress';
    if (!shouldTrack) return;

    const marker = new g.maps.Marker({
      map,
      position: pickupLL,
      icon: {
        path: g.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 5,
        fillColor: '#0077C8',
        fillOpacity: 1,
        strokeColor: '#0D3B66',
        strokeWeight: 1,
      },
      title: 'Driver',
    });
    driverMarkerRef.current = marker;

    let step = trip.status === 'in_progress' ? 0.6 : trip.status === 'arrived' ? 0.98 : 0.15;
    const delta = trip.status === 'driver_assigned' ? 0.02 : trip.status === 'driver_arriving' ? 0.035 : 0.01;
    const id = window.setInterval(() => {
      step = Math.min(1, step + delta);
      const lat = pickupLL.lat + (dropoffLL.lat - pickupLL.lat) * step;
      const lng = pickupLL.lng + (dropoffLL.lng - pickupLL.lng) * step;
      marker.setPosition({ lat, lng });
      if (step >= 1 && driverTickRef.current) {
        window.clearInterval(driverTickRef.current);
        driverTickRef.current = null;
      }
    }, 1200);
    driverTickRef.current = id;

    return () => {
      if (driverTickRef.current) {
        window.clearInterval(driverTickRef.current);
        driverTickRef.current = null;
      }
    };
  }, [ready, g, pickupLL, dropoffLL, trip.status]);

  useEffect(() => {
    if (!ready || !g) return;
    const map = mapObjRef.current;
    if (!map) return;
    if (clickListenerRef.current) {
      clickListenerRef.current.remove();
      clickListenerRef.current = null;
    }
    if (!pinMode || !onPinSelect) return;

    clickListenerRef.current = map.addListener('click', (ev: google.maps.MapMouseEvent) => {
      const lat = ev.latLng?.lat();
      const lng = ev.latLng?.lng();
      if (typeof lat !== 'number' || typeof lng !== 'number') return;
      const geocoder = new g.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        const addressLine =
          status === 'OK' && results && results[0]?.formatted_address
            ? results[0].formatted_address
            : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        onPinSelect({ lat, lng, addressLine, mode: pinMode });
      });
    });

    return () => {
      if (clickListenerRef.current) {
        clickListenerRef.current.remove();
        clickListenerRef.current = null;
      }
    };
  }, [ready, g, pinMode, onPinSelect]);

  return (
    <div className="gw-card p-5 space-y-3">
      <div className="gw-card-title">{title}</div>
      <div className="text-sm text-slate-600">
        <strong className="text-slate-800">{trip.pickup.label}</strong> →{' '}
        <strong className="text-slate-800">{trip.dropoff.label}</strong>
      </div>
      {pinMode && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs font-bold text-slate-600">
            Pin mode: <span className="text-[#0077C8]">{pinMode}</span> — click map or place at center.
          </div>
          <button type="button" className="gw-button gw-button-secondary" onClick={placeAtMapCenter}>
            Place {pinMode} at center
          </button>
        </div>
      )}
      {!pinMode && (
        <div className="text-xs font-bold text-slate-600">
          Marker legend: <span style={{ color: '#ef4444' }}>Red = Pickup</span> ·{' '}
          <span style={{ color: '#22c55e' }}>Green = Dropoff</span> ·{' '}
          <span style={{ color: '#d97706' }}>Yellow = Route</span> (Maps Directions API)
        </div>
      )}
      {directionsError && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          {directionsError}
        </div>
      )}
      <div
        className="gw-map-canvas"
        style={{
          borderRadius: 18,
          overflow: 'hidden',
          border: '1px solid rgba(15,23,42,0.10)',
          minHeight: 220,
          background: 'rgba(241,245,249,0.7)',
        }}
      >
        {error ? (
          <div className="gw-map-placeholder" style={{ minHeight: 220 }}>
            Could not load Google Maps. Check `VITE_GOOGLE_MAPS_API_KEY` referrer settings.
          </div>
        ) : ready ? (
          <div ref={mapRef} style={{ width: '100%', height: 240 }} />
        ) : (
          <div className="gw-map-placeholder" style={{ minHeight: 220 }}>
            Loading map…
          </div>
        )}
      </div>
    </div>
  );
};

export default TripMapPanel;

