/**
 * CarbonWorldMap — Leaflet world map for Carbon MRV project pins.
 * Lazy-loaded. Free CartoDB dark tiles. No API key.
 */
import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const TYPE_COLORS: Record<string, string> = {
  forest: '#22c55e', reforestation: '#4ade80', mangrove: '#06b6d4',
  wetland: '#0ea5e9', peatland: '#60a5fa', grassland: '#a3e635',
  farm: '#facc15', methane: '#f97316', solar: '#fbbf24', other: '#94a3b8',
};

export interface CarbonMapProject {
  projectId: string;
  projectName: string;
  projectType: string;
  country: string;
  lat: number;
  lng: number;
  status: string;
  totalAcres: number;
}

interface CarbonWorldMapProps {
  projects: CarbonMapProject[];
  onSelect?: (projectId: string) => void;
}

const CarbonWorldMap: React.FC<CarbonWorldMapProps> = ({ projects, onSelect }) => (
  <MapContainer
    center={[15, 10]}
    zoom={2}
    minZoom={2}
    maxZoom={12}
    style={{ height: '100%', width: '100%', background: '#0f172a' }}
    scrollWheelZoom
  >
    <TileLayer
      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      attribution='&copy; <a href="https://carto.com">CARTO</a>'
      subdomains="abcd"
      maxZoom={19}
    />
    {projects.filter((p) => p.lat && p.lng).map((p) => (
      <CircleMarker
        key={p.projectId}
        center={[p.lat, p.lng]}
        radius={10}
        pathOptions={{
          color: TYPE_COLORS[p.projectType] || '#94a3b8',
          fillColor: TYPE_COLORS[p.projectType] || '#94a3b8',
          fillOpacity: 0.8,
          weight: 2,
        }}
        eventHandlers={{ click: () => onSelect?.(p.projectId) }}
      >
        <Popup>
          <div style={{ minWidth: 160, fontFamily: 'sans-serif' }}>
            <p style={{ fontWeight: 800, fontSize: 13, color: '#fff', margin: '0 0 3px' }}>{p.projectName}</p>
            <p style={{ color: '#94a3b8', fontSize: 11 }}>{p.country} · {p.totalAcres.toLocaleString()} acres</p>
            <p style={{ color: '#34d399', fontSize: 11, marginTop: 4 }}>{p.status}</p>
          </div>
        </Popup>
      </CircleMarker>
    ))}
  </MapContainer>
);

export default CarbonWorldMap;
