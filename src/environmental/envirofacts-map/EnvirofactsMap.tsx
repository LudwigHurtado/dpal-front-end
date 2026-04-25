import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet/dist/leaflet.css';
import type { EnvirofactsRecord } from '../../types/envirofactsTypes';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 11, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14, animate: true });
  }, [map, positions]);
  return null;
}

type ClusterProps = {
  rows: EnvirofactsRecord[];
  onOpen: (id: string) => void;
  onAddEvidence: (id: string) => void;
  onCompareSatellite?: (id: string) => void;
  onCreateInvestigation?: (id: string) => void;
};

function ClusteredMarkers({ rows, onOpen, onAddEvidence, onCompareSatellite, onCreateInvestigation }: ClusterProps) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);
  const onOpenRef = useRef(onOpen);
  const onAddRef = useRef(onAddEvidence);
  const onSatRef = useRef(onCompareSatellite);
  const onInvRef = useRef(onCreateInvestigation);
  onOpenRef.current = onOpen;
  onAddRef.current = onAddEvidence;
  onSatRef.current = onCompareSatellite;
  onInvRef.current = onCreateInvestigation;

  useEffect(() => {
    const container = map.getContainer();
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('[data-ef-action]');
      if (!el) return;
      e.preventDefault();
      const action = el.getAttribute('data-ef-action');
      const id = el.getAttribute('data-ef-id');
      if (!id) return;
      if (action === 'open') onOpenRef.current(id);
      else if (action === 'evidence') onAddRef.current(id);
      else if (action === 'satellite') onSatRef.current?.(id);
      else if (action === 'investigate') onInvRef.current?.(id);
    };
    container.addEventListener('click', onClick);
    return () => container.removeEventListener('click', onClick);
  }, [map]);

  useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 52,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
    });
    groupRef.current = group;
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
      groupRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearLayers();
    const pinnable = rows.filter((r) => r.pinnable && r.latitude != null && r.longitude != null);
    for (const row of pinnable) {
      const m = L.marker([row.latitude as number, row.longitude as number]);
      const name = row.facilityName || row.recordName || 'EPA Record';
      const line1 = [row.address, row.city, row.county, row.state, row.zip].filter(Boolean).join(', ');
      const flags = row.sourceFlags.length ? row.sourceFlags.join(', ') : '—';
      const reg = row.recordId || '—';
      const html = `
        <div style="font-size:12px;line-height:1.35;min-width:220px;color:#0f172a">
          <p style="font-weight:600;margin:0 0 6px">${escapeHtml(name)}</p>
          <p style="margin:0 0 4px">${escapeHtml(line1 || 'Address not listed')}</p>
          <p style="margin:0 0 4px"><strong>Registry ID:</strong> ${escapeHtml(reg)}</p>
          <p style="margin:0 0 4px"><strong>EPA source flags:</strong> ${escapeHtml(flags)}</p>
          <p style="margin:0 0 4px"><strong>Category:</strong> ${escapeHtml(row.environmentalCategory)}</p>
          <p style="margin:0 0 4px"><strong>Coordinates:</strong> ${row.latitude}, ${row.longitude}</p>
          <p style="margin:0 0 8px"><strong>DPAL review:</strong> ${escapeHtml(row.dpalReviewStatus)}</p>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            <button type="button" data-ef-action="open" data-ef-id="${escapeHtml(row.id)}" style="cursor:pointer;padding:4px 8px;border-radius:6px;border:1px solid #0e7490;background:#ecfeff;font-size:11px">Open Details</button>
            <button type="button" data-ef-action="evidence" data-ef-id="${escapeHtml(row.id)}" style="cursor:pointer;padding:4px 8px;border-radius:6px;border:1px solid #047857;background:#ecfdf5;font-size:11px">Add to Evidence Packet</button>
            <button type="button" data-ef-action="satellite" data-ef-id="${escapeHtml(row.id)}" style="cursor:pointer;padding:4px 8px;border-radius:6px;border:1px solid #b45309;background:#fffbeb;font-size:11px">Compare Satellite Data</button>
            <button type="button" data-ef-action="investigate" data-ef-id="${escapeHtml(row.id)}" style="cursor:pointer;padding:4px 8px;border-radius:6px;border:1px solid #4338ca;background:#eef2ff;font-size:11px">Create Investigation</button>
          </div>
        </div>`;
      m.bindPopup(html);
      group.addLayer(m);
    }
  }, [rows]);

  return null;
}

type Props = {
  rows: EnvirofactsRecord[];
  onOpen: (recordId: string) => void;
  onAddEvidence: (recordId: string) => void;
  noCoordinateCount: number;
  recordCount: number;
  onCompareSatellite?: (id: string) => void;
  onCreateInvestigation?: (id: string) => void;
};

const EnvirofactsMap: React.FC<Props> = ({
  rows,
  onOpen,
  onAddEvidence,
  noCoordinateCount,
  recordCount,
  onCompareSatellite,
  onCreateInvestigation,
}) => {
  const withCoords = rows.filter((row) => row.pinnable && row.latitude != null && row.longitude != null);
  const positions = withCoords.map((row) => [row.latitude as number, row.longitude as number] as [number, number]);

  return (
    <section className="rounded-xl border border-slate-700/90 bg-slate-900/80 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-700/80 px-4 py-3 md:px-5">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-100">Geographic map</h2>
          <p className="mt-0.5 max-w-2xl text-xs text-slate-400">
            Pins use coordinates from the active EPA table. Records without valid coordinates remain in the results table.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {recordCount > 0 && withCoords.length > 0 ? (
            <span className="rounded border border-emerald-800/60 bg-emerald-950/40 px-2 py-1 text-emerald-200/90">Coordinates Available</span>
          ) : null}
          {noCoordinateCount > 0 ? (
            <span className="rounded border border-amber-800/50 bg-amber-950/30 px-2 py-1 text-amber-100/90">Coordinates Unavailable · {noCoordinateCount}</span>
          ) : null}
        </div>
      </div>
      <div className="relative w-full overflow-hidden rounded-b-xl border-t border-slate-800/80">
        <div className="h-[min(520px,62vh)] w-full min-h-[360px]">
          <MapContainer center={[39.5, -98.35]} zoom={4} scrollWheelZoom className="h-full w-full" style={{ background: '#0f172a' }}>
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FitBounds positions={positions} />
            <ClusteredMarkers
              rows={rows}
              onOpen={onOpen}
              onAddEvidence={onAddEvidence}
              onCompareSatellite={onCompareSatellite}
              onCreateInvestigation={onCreateInvestigation}
            />
          </MapContainer>
        </div>
      </div>
    </section>
  );
};

export default EnvirofactsMap;
