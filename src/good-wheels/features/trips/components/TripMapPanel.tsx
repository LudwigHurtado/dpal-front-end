import React, { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Trip } from '../tripTypes';
import type { LatLng } from '../../map/mapTypes';
import { nominatimForwardGeocode } from '../../map/nominatimForwardGeocode';

type Props = {
  trip: Trip;
  variant?: 'passenger' | 'driver' | 'worker';
  pinMode?: 'pickup' | 'dropoff' | null;
  onPinSelect?: (args: { lat: number; lng: number; addressLine: string; mode: 'pickup' | 'dropoff' }) => void;
};

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    const b = L.latLngBounds(points);
    if (b.isValid()) map.fitBounds(b, { padding: [16, 16], maxZoom: 15 });
  }, [map, points]);
  return null;
}

function PassengerFollow({ follow, driverPos }: { follow: boolean; driverPos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!follow || !driverPos) return;
    map.panTo(driverPos, { animate: true });
  }, [follow, driverPos, map]);
  return null;
}

function PinCapture({ pinMode, onPinSelect }: { pinMode: Props['pinMode']; onPinSelect?: Props['onPinSelect'] }) {
  useMapEvents({
    click(ev) {
      if (!pinMode || !onPinSelect) return;
      const lat = ev.latlng.lat;
      const lng = ev.latlng.lng;
      onPinSelect({
        lat,
        lng,
        mode: pinMode,
        addressLine: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      });
    },
  });
  return null;
}

function seededUnit(seed: string, idx: number): number {
  const key = `${seed}-${idx}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return ((hash >>> 0) % 1000) / 1000;
}

const TripMapPanel: React.FC<Props> = ({ trip, variant = 'passenger', pinMode = null, onPinSelect }) => {
  const isPassengerView = variant === 'passenger';
  const title = variant === 'driver' ? 'Navigation' : variant === 'worker' ? 'Coordination map' : 'Live map';
  const [pickupLL, setPickupLL] = useState<LatLng | null>(() => trip.pickup.point ?? null);
  const [dropoffLL, setDropoffLL] = useState<LatLng | null>(() => trip.dropoff.point ?? null);
  const [followVehicle, setFollowVehicle] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    (async () => {
      const pickup = trip.pickup.point ?? (await nominatimForwardGeocode(trip.pickup.addressLine ?? '', ac.signal));
      if (cancelled) return;
      const dropoff = trip.dropoff.point ?? (await nominatimForwardGeocode(trip.dropoff.addressLine ?? '', ac.signal));
      if (cancelled) return;
      setPickupLL(pickup);
      setDropoffLL(dropoff);
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [trip.id, trip.pickup.point, trip.dropoff.point, trip.pickup.addressLine, trip.dropoff.addressLine]);

  const driverPos: [number, number] | null =
    trip.driverLocation && Number.isFinite(trip.driverLocation.lat) && Number.isFinite(trip.driverLocation.lng)
      ? [Number(trip.driverLocation.lat), Number(trip.driverLocation.lng)]
      : null;

  const center: [number, number] = pickupLL ? [pickupLL.lat, pickupLL.lng] : [40.7128, -74.006];
  const linePositions = useMemo<[number, number][]>(() => {
    if (!pickupLL || !dropoffLL || isPassengerView) return [];
    return [
      [pickupLL.lat, pickupLL.lng],
      [dropoffLL.lat, dropoffLL.lng],
    ];
  }, [pickupLL, dropoffLL, isPassengerView]);

  const fitPoints = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = [];
    if (pickupLL) pts.push([pickupLL.lat, pickupLL.lng]);
    if (!isPassengerView && dropoffLL) pts.push([dropoffLL.lat, dropoffLL.lng]);
    if (driverPos) pts.push(driverPos);
    return pts;
  }, [pickupLL, dropoffLL, driverPos, isPassengerView]);

  const nearbyCars = useMemo<[number, number][]>(() => {
    const base = pickupLL ?? dropoffLL;
    if (!base) return [];
    const cars: [number, number][] = [];
    for (let i = 0; i < 4; i += 1) {
      const latOffset = (seededUnit(trip.id, i * 2) - 0.5) * 0.01;
      const lngOffset = (seededUnit(trip.id, i * 2 + 1) - 0.5) * 0.01;
      cars.push([base.lat + latOffset, base.lng + lngOffset]);
    }
    return cars;
  }, [trip.id, pickupLL, dropoffLL]);

  const selectedNearbyCar = useMemo<[number, number] | null>(() => {
    if (nearbyCars.length === 0) return null;
    const base = pickupLL ? [pickupLL.lat, pickupLL.lng] : nearbyCars[0];
    let best: [number, number] = nearbyCars[0];
    let bestScore = Number.POSITIVE_INFINITY;
    for (const car of nearbyCars) {
      const dLat = car[0] - base[0];
      const dLng = car[1] - base[1];
      const score = dLat * dLat + dLng * dLng;
      if (score < bestScore) {
        best = car;
        bestScore = score;
      }
    }
    return best;
  }, [nearbyCars, pickupLL]);

  const selectedCarLink = useMemo<[number, number][]>(() => {
    if (!selectedNearbyCar || !pickupLL) return [];
    return [
      [pickupLL.lat, pickupLL.lng],
      selectedNearbyCar,
    ];
  }, [selectedNearbyCar, pickupLL]);

  return (
    <div className="gw-card p-5 space-y-3">
      <div className="gw-card-title">{title}</div>
      <div className="text-sm text-slate-600">
        {isPassengerView ? (
          <strong className="text-slate-800">Live locations: you and your assigned vehicle</strong>
        ) : (
          <>
            <strong className="text-slate-800">{trip.pickup.label}</strong> → <strong className="text-slate-800">{trip.dropoff.label}</strong>
          </>
        )}
      </div>
      {nearbyCars.length > 0 ? (
        <div className="text-xs font-semibold text-slate-600">
          Nearby cars detected. Signal link is shown to the active car for live passenger-driver coordination.
        </div>
      ) : null}
      {isPassengerView && trip.driverId ? (
        <div className="flex justify-end">
          <button type="button" className="gw-button gw-button-secondary" onClick={() => setFollowVehicle((v) => !v)}>
            {followVehicle ? 'Stop following vehicle' : 'Follow vehicle'}
          </button>
        </div>
      ) : null}
      <div className="gw-map-canvas" style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(15,23,42,0.10)', minHeight: 220 }}>
        <MapContainer center={center} zoom={13} style={{ width: '100%', height: 240 }} zoomControl attributionControl>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {pickupLL ? (
            <CircleMarker
              center={[pickupLL.lat, pickupLL.lng]}
              radius={8}
              pathOptions={{ color: '#ffffff', weight: 2, fillColor: isPassengerView ? '#0f766e' : '#16a34a', fillOpacity: 1 }}
            />
          ) : null}
          {!isPassengerView && dropoffLL ? (
            <CircleMarker center={[dropoffLL.lat, dropoffLL.lng]} radius={8} pathOptions={{ color: '#fff', weight: 2, fillColor: '#dc2626', fillOpacity: 1 }} />
          ) : null}
          {linePositions.length > 1 ? <Polyline positions={linePositions} pathOptions={{ color: '#1a73e8', weight: 4, opacity: 0.9 }} /> : null}
          {selectedCarLink.length > 1 ? (
            <>
              <Polyline positions={selectedCarLink} pathOptions={{ color: '#06b6d4', weight: 3, opacity: 0.95, dashArray: '7 7' }} />
              <Polyline positions={selectedCarLink} pathOptions={{ color: '#1d4ed8', weight: 1.5, opacity: 0.8, dashArray: '2 10' }} />
            </>
          ) : null}
          {nearbyCars.map((car, idx) => (
            <CircleMarker
              key={`${trip.id}-nearby-car-${idx}`}
              center={car}
              radius={6}
              pathOptions={{
                color: '#ffffff',
                weight: 2,
                fillColor: selectedNearbyCar && car[0] === selectedNearbyCar[0] && car[1] === selectedNearbyCar[1] ? '#06b6d4' : '#334155',
                fillOpacity: 1,
              }}
            />
          ))}
          {driverPos ? <Marker position={driverPos} /> : null}
          <FitBounds points={fitPoints} />
          <PassengerFollow follow={isPassengerView && followVehicle} driverPos={driverPos} />
          <PinCapture pinMode={pinMode} onPinSelect={onPinSelect} />
        </MapContainer>
      </div>
    </div>
  );
};

export default TripMapPanel;

