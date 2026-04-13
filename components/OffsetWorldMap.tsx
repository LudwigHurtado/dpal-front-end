/**
 * OffsetWorldMap — Leaflet world map showing global carbon credit projects.
 * Lazy-loaded to avoid importing leaflet CSS synchronously (prevents flicker).
 * Free tiles: CartoDB dark. No API key needed.
 */
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface OffsetMapProject {
  projectId: string;
  name: string;
  location: string;
  country: string;
  lat: number;
  lng: number;
  ecosystemType: string;
  availableUnits: number;
  pricePerTonne: number;
  status: string;
  ecosystemColor: string;
}

interface OffsetWorldMapProps {
  projects: OffsetMapProject[];
  selectedId: string;
  onSelect: (projectId: string) => void;
}

const FlyTo: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], 5, { duration: 1.2 });
  }, [lat, lng, map]);
  return null;
};

const OffsetWorldMap: React.FC<OffsetWorldMapProps> = ({ projects, selectedId, onSelect }) => {
  const selected = projects.find((p) => p.projectId === selectedId);

  return (
    <MapContainer
      center={[15, 10]}
      zoom={2}
      minZoom={2}
      maxZoom={12}
      style={{ height: '100%', width: '100%', background: '#0f172a' }}
      zoomControl={true}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />

      {selected && selected.lat && <FlyTo lat={selected.lat} lng={selected.lng} />}

      {projects.map((p) => {
        if (!p.lat || !p.lng) return null;
        const isSelected = p.projectId === selectedId;
        return (
          <CircleMarker
            key={p.projectId}
            center={[p.lat, p.lng]}
            radius={isSelected ? 14 : 9}
            pathOptions={{
              color: isSelected ? '#fff' : p.ecosystemColor,
              fillColor: p.ecosystemColor,
              fillOpacity: isSelected ? 1 : 0.75,
              weight: isSelected ? 3 : 1.5,
            }}
            eventHandlers={{ click: () => onSelect(p.projectId) }}
          >
            <Popup className="offset-popup">
              <div style={{ minWidth: 180, fontFamily: 'sans-serif' }}>
                <p style={{ fontWeight: 800, fontSize: 13, color: '#fff', margin: '0 0 4px' }}>{p.name}</p>
                <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 6px' }}>{p.location}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: '#34d399', fontSize: 11, fontWeight: 700 }}>{p.availableUnits.toLocaleString()} tCO2e</span>
                  <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700 }}>${p.pricePerTonne}/t</span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
};

export default OffsetWorldMap;
