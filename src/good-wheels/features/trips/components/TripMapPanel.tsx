import React, { useEffect, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Trip } from '../tripTypes';
import type { LatLng } from '../../map/mapTypes';
import { nominatimForwardGeocode } from '../../map/nominatimForwardGeocode';

type Props = {
  trip: Trip;
  variant?: 'passenger' | 'driver' | 'worker';
  height?: number | string;
};

const PICKUP_COLOR = '#16a34a';
const DROPOFF_COLOR = '#dc2626';
const DRIVER_COLOR = '#0077C8';
const ROUTE_SHADOW = '#0b1f3a';
const ROUTE_BLUE = '#1a73e8';

async function fetchOsrmRoute(
  pickup: LatLng,
  dropoff: LatLng,
  signal: AbortSignal,
): Promise<[number, number][]> {
  const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('OSRM route fetch failed');
  const data = (await res.json()) as {
    routes?: { geometry?: { coordinates?: [number, number][] } }[];
  };
  const coords = data.routes?.[0]?.geometry?.coordinates;
  if (!coords || coords.length < 2) throw new Error('No route returned');
  return coords.map(([lng, lat]) => [lat, lng]);
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const lastRef = useRef('');
  useEffect(() => {
    if (!points.length) return;
    const sig = JSON.stringify(points.map(([a, b]) => [+a.toFixed(4), +b.toFixed(4)]));
    if (lastRef.current === sig) return;
    lastRef.current = sig;
    if (points.length === 1) { map.setView(points[0], 14); return; }
    const b = L.latLngBounds(points);
    if (b.isValid()) map.fitBounds(b, { padding: [40, 40], maxZoom: 15 });
  }, [map, points]);
  return null;
}

function FollowDriver({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  const lastRef = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (!pos) return;
    const last = lastRef.current;
    if (last && Math.abs(last[0] - pos[0]) < 0.0002 && Math.abs(last[1] - pos[1]) < 0.0002) return;
    lastRef.current = pos;
    map.panTo(pos, { animate: true });
  }, [map, pos]);
  return null;
}

const TripMapPanel: React.FC<Props> = ({ trip, variant = 'passenger', height = '100%' }) => {
  const [pickupLL, setPickupLL] = useState<LatLng | null>(trip.pickup.point ?? null);
  const [dropoffLL, setDropoffLL] = useState<LatLng | null>(trip.dropoff.point ?? null);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);

  // Geocode pickup/dropoff if coordinates are missing
  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    (async () => {
      const pu = trip.pickup.point ?? (await nominatimForwardGeocode(trip.pickup.addressLine ?? '', ac.signal));
      if (cancelled) return;
      const dr = trip.dropoff.point ?? (await nominatimForwardGeocode(trip.dropoff.addressLine ?? '', ac.signal));
      if (cancelled) return;
      setPickupLL(pu);
      setDropoffLL(dr);
    })();
    return () => { cancelled = true; ac.abort(); };
  }, [trip.id, trip.pickup.point, trip.dropoff.point, trip.pickup.addressLine, trip.dropoff.addressLine]);

  // Fetch real OSRM route whenever both points are known
  useEffect(() => {
    if (!pickupLL || !dropoffLL) { setRoutePoints([]); return; }
    let cancelled = false;
    const ac = new AbortController();
    setRoutePoints([[pickupLL.lat, pickupLL.lng], [dropoffLL.lat, dropoffLL.lng]]); // straight-line fallback while loading
    (async () => {
      try {
        const pts = await fetchOsrmRoute(pickupLL, dropoffLL, ac.signal);
        if (!cancelled) setRoutePoints(pts);
      } catch {
        // keep the straight-line fallback silently
      }
    })();
    return () => { cancelled = true; ac.abort(); };
  }, [pickupLL?.lat, pickupLL?.lng, dropoffLL?.lat, dropoffLL?.lng]);

  const driverPos: [number, number] | null =
    trip.driverLocation &&
    Number.isFinite(trip.driverLocation.lat) &&
    Number.isFinite(trip.driverLocation.lng)
      ? [trip.driverLocation.lat, trip.driverLocation.lng]
      : null;

  const center: [number, number] = pickupLL
    ? [pickupLL.lat, pickupLL.lng]
    : [40.7128, -74.006];

  const fitPoints: [number, number][] = [
    ...(pickupLL ? [[pickupLL.lat, pickupLL.lng] as [number, number]] : []),
    ...(dropoffLL ? [[dropoffLL.lat, dropoffLL.lng] as [number, number]] : []),
    ...(driverPos ? [driverPos] : []),
  ];

  const isFollowingDriver = variant === 'passenger' && !!driverPos;

  return (
    <div style={{ width: '100%', height, position: 'relative', overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        {/* OSM tiles — same colorful map as the dashboard */}
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />

        {/* Route: dark shadow + bright blue overlay (OSRM-calculated) */}
        {routePoints.length > 1 && (
          <>
            <Polyline
              positions={routePoints}
              pathOptions={{ color: ROUTE_SHADOW, weight: 8, opacity: 0.30, lineCap: 'round', lineJoin: 'round' }}
            />
            <Polyline
              positions={routePoints}
              pathOptions={{ color: ROUTE_BLUE, weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
            />
          </>
        )}

        {/* Pickup marker — green ring + center dot */}
        {pickupLL && (
          <>
            <CircleMarker
              center={[pickupLL.lat, pickupLL.lng]}
              radius={18}
              pathOptions={{ color: PICKUP_COLOR, weight: 3, opacity: 0.85, fillColor: PICKUP_COLOR, fillOpacity: 0.14 }}
            />
            <CircleMarker
              center={[pickupLL.lat, pickupLL.lng]}
              radius={8}
              pathOptions={{ color: '#fff', weight: 2.5, fillColor: PICKUP_COLOR, fillOpacity: 1 }}
            />
          </>
        )}

        {/* Dropoff marker — red ring + center dot */}
        {dropoffLL && (
          <>
            <CircleMarker
              center={[dropoffLL.lat, dropoffLL.lng]}
              radius={18}
              pathOptions={{ color: DROPOFF_COLOR, weight: 3, opacity: 0.85, fillColor: DROPOFF_COLOR, fillOpacity: 0.14 }}
            />
            <CircleMarker
              center={[dropoffLL.lat, dropoffLL.lng]}
              radius={8}
              pathOptions={{ color: '#fff', weight: 2.5, fillColor: DROPOFF_COLOR, fillOpacity: 1 }}
            />
          </>
        )}

        {/* Driver position — blue pulsing dot */}
        {driverPos && (
          <>
            <CircleMarker
              center={driverPos}
              radius={18}
              pathOptions={{ color: DRIVER_COLOR, weight: 0, fillColor: DRIVER_COLOR, fillOpacity: 0.18 }}
            />
            <CircleMarker
              center={driverPos}
              radius={9}
              pathOptions={{ color: '#fff', weight: 3, fillColor: DRIVER_COLOR, fillOpacity: 1 }}
            />
          </>
        )}

        <FitBounds points={fitPoints} />
        {isFollowingDriver && <FollowDriver pos={driverPos} />}
      </MapContainer>
    </div>
  );
};

export default TripMapPanel;
