/**
 * WaterGlobe — World map view for DPAL Water Monitor
 *
 * Shows registered water projects as coloured pins on a dark satellite-style
 * world map. Free, no API key — uses CartoDB Dark Matter tiles + react-leaflet.
 *
 * Pin colours:
 *   teal    → monitoring / active
 *   emerald → approved / credited
 *   amber   → under_review / submitted
 *   rose    → rejected / draft
 *
 * Click a pin to see project name, type, status and "View Project" button.
 */

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface WaterProjectPin {
  projectId: string;
  projectName: string;
  projectType: string;
  status: string;
  country: string;
  city?: string;
  totalAcres: number;
  lat: number;
  lng: number;
  soilMoisture?: number;  // latest snapshot value if available
  droughtRisk?: number;
}

interface WaterGlobeProps {
  projects: WaterProjectPin[];
  onSelectProject?: (projectId: string) => void;
  height?: string;
}

// ── Status → colour mapping ────────────────────────────────────────────────────

function pinColor(status: string): string {
  if (status === 'approved' || status === 'credited')  return '#10b981'; // emerald
  if (status === 'monitoring')                          return '#14b8a6'; // teal
  if (status === 'under_review' || status === 'submitted') return '#f59e0b'; // amber
  if (status === 'rejected')                           return '#f43f5e'; // rose
  return '#64748b'; // slate / draft
}

function pinLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function makeWaterPin(status: string, soilMoisture?: number) {
  const color = pinColor(status);
  // Outer ring pulses for high drought-risk projects
  const pulse = soilMoisture != null && soilMoisture < 0.25
    ? `animation:dpal-ping 1.4s cubic-bezier(0,0,0.2,1) infinite;`
    : '';
  const html = `
    <div style="position:relative;width:22px;height:22px;">
      <span style="
        display:block;width:14px;height:14px;
        border-radius:50%;background:${color};
        border:2.5px solid rgba(255,255,255,0.85);
        position:absolute;top:4px;left:4px;
        box-shadow:0 0 8px ${color}88;
      "></span>
      <span style="
        display:block;width:22px;height:22px;
        border-radius:50%;border:2px solid ${color}66;
        position:absolute;top:0;left:0;
        ${pulse}
      "></span>
    </div>`;
  return L.divIcon({
    html,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
    className: '',
  });
}

// ── Pulse keyframe injection ───────────────────────────────────────────────────

function PulseStyle() {
  useEffect(() => {
    const id = 'dpal-water-globe-style';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = `
        @keyframes dpal-ping {
          75%, 100% { transform: scale(1.8); opacity: 0; }
        }
        .leaflet-popup-content-wrapper {
          background: #0f172a !important;
          border: 1px solid #334155 !important;
          border-radius: 12px !important;
          color: #e2e8f0 !important;
          font-family: ui-monospace, monospace !important;
          padding: 0 !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important;
        }
        .leaflet-popup-tip { background: #0f172a !important; }
        .leaflet-popup-content { margin: 0 !important; }
      `;
      document.head.appendChild(style);
    }
  }, []);
  return null;
}

// ── Fit bounds when projects change ────────────────────────────────────────────

const FitBounds: React.FC<{ projects: WaterProjectPin[] }> = ({ projects }) => {
  const map = useMap();
  useEffect(() => {
    if (projects.length === 0) return;
    if (projects.length === 1) {
      map.flyTo([projects[0].lat, projects[0].lng], 6, { duration: 1.2 });
      return;
    }
    const bounds = L.latLngBounds(projects.map((p) => [p.lat, p.lng]));
    map.flyToBounds(bounds.pad(0.3), { duration: 1.4, maxZoom: 8 });
  }, [map, projects]);
  return null;
};

// ── Main component ─────────────────────────────────────────────────────────────

const PROJECT_TYPE_EMOJI: Record<string, string> = {
  farm_irrigation:        '🌾',
  reservoir_monitoring:   '🏞️',
  wetland_restoration:    '🦆',
  leak_reduction:         '🔧',
  community_conservation: '🏘️',
  drought_response:       '🌵',
  school_or_facility_savings: '🏫',
  other:                  '💧',
};

export const WaterGlobe: React.FC<WaterGlobeProps> = ({
  projects,
  onSelectProject,
  height = 'h-[420px]',
}) => {
  return (
    <div className={`relative ${height} rounded-xl overflow-hidden border border-slate-700/60`}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={1}
        maxZoom={14}
        style={{ height: '100%', width: '100%', background: '#0a0f1a' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <PulseStyle />

        {/* CartoDB Dark Matter — no API key */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />

        {projects.length > 0 && <FitBounds projects={projects} />}

        {projects.map((p) => (
          <Marker
            key={p.projectId}
            position={[p.lat, p.lng]}
            icon={makeWaterPin(p.status, p.soilMoisture)}
          >
            <Popup minWidth={220} maxWidth={260}>
              <div className="p-3 space-y-2">
                {/* Title row */}
                <div className="flex items-start gap-2">
                  <span className="text-xl shrink-0 mt-0.5">
                    {PROJECT_TYPE_EMOJI[p.projectType] ?? '💧'}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-100 text-sm leading-tight truncate">
                      {p.projectName}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {p.city ? `${p.city}, ` : ''}{p.country}
                    </p>
                  </div>
                </div>

                {/* Status + acreage */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border"
                    style={{
                      color: pinColor(p.status),
                      borderColor: `${pinColor(p.status)}55`,
                      background: `${pinColor(p.status)}15`,
                    }}
                  >
                    {pinLabel(p.status)}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {p.totalAcres.toLocaleString()} acres
                  </span>
                </div>

                {/* Live metrics if available */}
                {(p.soilMoisture != null || p.droughtRisk != null) && (
                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-700/60">
                    {p.soilMoisture != null && (
                      <div className="bg-slate-800/60 rounded px-2 py-1">
                        <p className="text-[8px] text-slate-500 uppercase tracking-wide">Soil moisture</p>
                        <p className={`text-xs font-bold ${p.soilMoisture >= 0.4 ? 'text-emerald-400' : p.soilMoisture >= 0.25 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {(p.soilMoisture * 100).toFixed(0)}%
                        </p>
                      </div>
                    )}
                    {p.droughtRisk != null && (
                      <div className="bg-slate-800/60 rounded px-2 py-1">
                        <p className="text-[8px] text-slate-500 uppercase tracking-wide">Drought risk</p>
                        <p className={`text-xs font-bold ${p.droughtRisk < 0.3 ? 'text-emerald-400' : p.droughtRisk < 0.6 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {(p.droughtRisk * 100).toFixed(0)}%
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* View button */}
                {onSelectProject && (
                  <button
                    onClick={() => onSelectProject(p.projectId)}
                    className="w-full mt-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg
                      bg-teal-700/30 hover:bg-teal-600/40 border border-teal-600/40 text-teal-300
                      transition-colors"
                  >
                    View Project →
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Empty state overlay */}
        {projects.length === 0 && (
          <div
            style={{
              position: 'absolute', inset: 0, zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div className="bg-slate-900/80 border border-slate-700 rounded-xl px-5 py-4 text-center backdrop-blur-sm">
              <p className="text-2xl mb-2">💧</p>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wide">No projects registered</p>
              <p className="text-[10px] text-slate-500 mt-1">Register a water project to see it on the map</p>
            </div>
          </div>
        )}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-sm border border-slate-700/60 rounded-lg px-3 py-2 space-y-1">
        {[
          { color: '#10b981', label: 'Approved' },
          { color: '#14b8a6', label: 'Monitoring' },
          { color: '#f59e0b', label: 'Under review' },
          { color: '#64748b', label: 'Draft' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
          </div>
        ))}
      </div>

      {/* Source credit */}
      <div className="absolute bottom-3 right-3 z-[1000]">
        <span className="text-[8px] text-slate-600 bg-slate-900/80 px-2 py-0.5 rounded">
          OpenStreetMap · CARTO
        </span>
      </div>
    </div>
  );
};

export default WaterGlobe;
