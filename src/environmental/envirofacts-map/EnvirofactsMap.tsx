import React from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { EnvirofactsRecord } from '../../types/envirofactsTypes';

const icon = L.divIcon({
  className: 'dpal-env-marker',
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:#0ea5e9;border:2px solid #fff;box-shadow:0 0 0 3px rgba(14,165,233,0.28)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

type Props = {
  rows: EnvirofactsRecord[];
  onOpen: (recordId: string) => void;
  onAddEvidence: (recordId: string) => void;
};

const EnvirofactsMap: React.FC<Props> = ({ rows, onOpen, onAddEvidence }) => {
  const withCoords = rows.filter((row) => row.latitude != null && row.longitude != null);
  return (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4 md:p-5">
      <h2 className="text-base font-bold text-slate-100">Envirofacts Geographic Map</h2>
      <p className="mt-1 text-xs text-slate-400">Records without coordinates are still shown in the table as “coordinates unavailable.”</p>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-700">
        <MapContainer center={[39.5, -98.35]} zoom={4} style={{ height: '420px', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
          {withCoords.map((row) => (
            <Marker key={row.id} icon={icon} position={[row.latitude as number, row.longitude as number]}>
              <Popup>
                <div className="space-y-1 text-xs">
                  <p><strong>{row.facilityName || row.recordName || 'EPA Record'}</strong></p>
                  <p>Source: {row.sourceDatabase}</p>
                  <p>Category: {row.environmentalCategory || 'Facilities'}</p>
                  <p>Flags: {row.sourceFlags.join(', ') || 'Facilities'}</p>
                  <p>{[row.address, row.city, row.county, row.state].filter(Boolean).join(', ')}</p>
                  <p>Coordinates: {row.latitude}, {row.longitude}</p>
                  <p>DPAL review: Verification Needed</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <button type="button" onClick={() => onOpen(row.id)} className="rounded border border-cyan-500/60 bg-cyan-900/30 px-2 py-1 text-[11px] text-cyan-100">Open Details</button>
                    <button type="button" onClick={() => onAddEvidence(row.id)} className="rounded border border-emerald-500/60 bg-emerald-900/30 px-2 py-1 text-[11px] text-emerald-100">Add to Evidence</button>
                    <button type="button" className="rounded border border-amber-500/60 bg-amber-900/30 px-2 py-1 text-[11px] text-amber-100">Compare Satellite Data</button>
                    <button type="button" className="rounded border border-indigo-500/60 bg-indigo-900/30 px-2 py-1 text-[11px] text-indigo-100">Create Investigation</button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </section>
  );
};

export default EnvirofactsMap;
