import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Trip } from '../tripTypes';
import { useGoogleMaps } from '../../map/useGoogleMaps';
import { geocodeAddress, midpoint } from '../../map/mapUtils';
import type { LatLng } from '../../map/mapTypes';

const TripMapPanel: React.FC<{ trip: Trip; variant?: 'passenger' | 'driver' | 'worker' }> = ({ trip, variant = 'passenger' }) => {
  const title = variant === 'driver' ? 'Navigation' : variant === 'worker' ? 'Coordination map' : 'Trip map';
  const { google: g, ready } = useGoogleMaps();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObjRef = useRef<google.maps.Map | null>(null);
  const directionsRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [pickupLL, setPickupLL] = useState<LatLng | null>(null);
  const [dropoffLL, setDropoffLL] = useState<LatLng | null>(null);

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
      mapId: undefined,
    });
    directionsRef.current = new g.maps.DirectionsRenderer({
      map: mapObjRef.current,
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#0077C8', strokeOpacity: 0.9, strokeWeight: 5 },
    });
  }, [ready, g, center]);

  useEffect(() => {
    if (!ready || !g) return;
    let cancelled = false;
    (async () => {
      const [p, d] = await Promise.all([geocodeAddress(g, pickupAddress), geocodeAddress(g, dropoffAddress)]);
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
          label: { text: 'P', color: '#0f172a', fontWeight: '800' },
        })
      );
    }
    if (dropoffLL) {
      markers.push(
        new g.maps.Marker({
          map,
          position: dropoffLL,
          label: { text: 'D', color: '#0f172a', fontWeight: '800' },
        })
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (map as any).__gwMarkers = markers;

    const dr = directionsRef.current;
    if (!dr || !pickupLL || !dropoffLL) return;

    const svc = new g.maps.DirectionsService();
    svc.route(
      {
        origin: pickupLL,
        destination: dropoffLL,
        travelMode: g.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result) dr.setDirections(result);
      }
    );
  }, [ready, g, center, pickupLL, dropoffLL]);

  return (
    <div className="gw-card p-5 space-y-3">
      <div className="gw-card-title">{title}</div>
      <div className="text-sm text-slate-600">
        <strong className="text-slate-800">{trip.pickup.label}</strong> →{' '}
        <strong className="text-slate-800">{trip.dropoff.label}</strong>
      </div>
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
        {ready ? (
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

