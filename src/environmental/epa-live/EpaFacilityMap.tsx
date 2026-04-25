import React from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import type { EpaFacilityProfile } from '../../types/epa';
import 'leaflet/dist/leaflet.css';

const markerIcon = L.divIcon({
  className: 'dpal-epa-marker',
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:#06b6d4;border:2px solid #fff;box-shadow:0 0 0 3px rgba(6,182,212,0.25)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

type Props = {
  rows: EpaFacilityProfile[];
  onOpenFacility: (facilityId: string) => void;
};

const DEFAULT_CENTER: [number, number] = [39.5, -98.35];

const EpaFacilityMap: React.FC<Props> = ({ rows, onOpenFacility }) => {
  const positioned = rows.filter((entry) => entry.facility.latitude != null && entry.facility.longitude != null);
  return (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4 md:p-5">
      <h2 className="text-base font-bold text-slate-100">EPA Facility Map</h2>
      <p className="mt-1 text-xs text-slate-400">Pins show official reported facility points (LATITUDE/LONGITUDE) with DPAL review actions.</p>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-700">
        <MapContainer center={DEFAULT_CENTER} zoom={4} style={{ height: '420px', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {positioned.map((entry) => (
            <Marker
              key={entry.facility.facilityId}
              icon={markerIcon}
              position={[entry.facility.latitude as number, entry.facility.longitude as number]}
            >
              <Popup>
                <div className="space-y-1 text-xs">
                  <p><strong>{entry.facility.facilityName}</strong></p>
                  <p>Parent: {entry.facility.parentCompany || 'Not reported'}</p>
                  <p>Industry: {entry.facility.reportedIndustryTypes || 'Not reported'}</p>
                  <p>Facility ID: {entry.facility.facilityId}</p>
                  <p>CO2e: {entry.emissions.totalCo2e?.toLocaleString() ?? 'Not available'}</p>
                  <button
                    type="button"
                    onClick={() => onOpenFacility(entry.facility.facilityId)}
                    className="mt-1 rounded border border-cyan-500/50 bg-cyan-900/30 px-2 py-1 text-[11px] font-semibold text-cyan-100"
                  >
                    Open Evidence Packet
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      {positioned.length === 0 ? <p className="mt-3 text-xs text-amber-200">No facilities with coordinates for current filters.</p> : null}
    </section>
  );
};

export default EpaFacilityMap;
