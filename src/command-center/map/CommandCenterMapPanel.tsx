/**
 * Command Center operational map — Leaflet + OSM only.
 *
 * - Locator / Lost & Found continues to use Google Maps (`services/googleMapsLoader.ts`).
 * - Good Wheels keeps its existing React-Leaflet + OSRM surfaces (unchanged).
 * - WRI MapBuilder is intended as a future **Environmental Atlas** tab, not the core engine here.
 *
 * This panel does not call live environmental provider APIs; tiles are public OSM only.
 */

import React from 'react';
import { Circle, CircleMarker, MapContainer, Polygon, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export type CommandCenterMapEvidenceMarker = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  type?: string;
};

export type CommandCenterMapPanelProps = {
  center?: { lat: number; lng: number };
  radiusKm?: number;
  evidenceMarkers?: CommandCenterMapEvidenceMarker[];
  /** Optional AOI ring in lat/lng order; ring is auto-closed if needed. */
  aoiPolygon?: Array<{ lat: number; lng: number }>;
};

const OSM_TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function zoomForRadiusKm(radiusKm: number): number {
  if (radiusKm <= 5) return 12;
  if (radiusKm <= 15) return 11;
  if (radiusKm <= 40) return 10;
  if (radiusKm <= 100) return 8;
  return 6;
}

function toPolygonRing(points: Array<{ lat: number; lng: number }>): [number, number][] {
  if (points.length < 3) return [];
  const ring: [number, number][] = points.map((p) => [p.lat, p.lng]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }
  return ring;
}

export const CommandCenterMapPanel: React.FC<CommandCenterMapPanelProps> = ({
  center,
  radiusKm,
  evidenceMarkers = [],
  aoiPolygon,
}) => {
  const hasValidCenter =
    center != null && Number.isFinite(center.lat) && Number.isFinite(center.lng) && Math.abs(center.lat) <= 90 && Math.abs(center.lng) <= 180;

  if (!hasValidCenter || !center) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
        <p className="text-sm font-semibold text-slate-800">No map center selected</p>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-600">
          Enter latitude and longitude in the shared context above. This Leaflet view is for Command Center evidence layout
          only — it does not replace Locator (Google Maps) or Good Wheels maps.
        </p>
      </div>
    );
  }

  const rKm = typeof radiusKm === 'number' && Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : undefined;
  const zoom = zoomForRadiusKm(rKm ?? 25);
  const ring = aoiPolygon && aoiPolygon.length >= 3 ? toPolygonRing(aoiPolygon) : null;

  return (
    <div className="h-[min(420px,55vh)] min-h-[260px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <MapContainer
        key={`${center.lat.toFixed(5)},${center.lng.toFixed(5)}`}
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom
        className="h-full w-full"
        style={{ height: '100%', width: '100%', background: '#e2e8f0' }}
      >
        <TileLayer attribution={OSM_ATTR} url={OSM_TILE} maxZoom={19} />
        {rKm != null ? (
          <Circle
            center={[center.lat, center.lng]}
            radius={rKm * 1000}
            pathOptions={{ color: '#0f766e', weight: 2, fillColor: '#14b8a6', fillOpacity: 0.08 }}
          />
        ) : null}
        {ring ? (
          <Polygon
            positions={ring}
            pathOptions={{ color: '#0369a1', weight: 2, fillColor: '#0ea5e9', fillOpacity: 0.12 }}
          />
        ) : null}
        <CircleMarker
          center={[center.lat, center.lng]}
          radius={11}
          pathOptions={{ color: '#047857', weight: 2, fillColor: '#10b981', fillOpacity: 1 }}
        >
          <Popup>
            <span className="text-xs font-semibold">Command center focus</span>
          </Popup>
        </CircleMarker>
        {evidenceMarkers
          .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng))
          .map((m) => (
            <CircleMarker
              key={m.id}
              center={[m.lat, m.lng]}
              radius={8}
              pathOptions={{
                color: m.type === 'situationRoom' ? '#7c3aed' : '#b45309',
                weight: 2,
                fillColor: m.type === 'situationRoom' ? '#a78bfa' : '#fbbf24',
                fillOpacity: 0.95,
              }}
            >
              <Popup>
                <div className="max-w-[220px] text-xs">
                  {m.type ? <p className="font-semibold text-slate-800">{m.type}</p> : null}
                  <p className="text-slate-700">{m.label}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>
    </div>
  );
};

export default CommandCenterMapPanel;
