/**
 * WaterGlobe — World map view for DPAL Water Monitor
 *
 * Shows:
 *  • Registered water projects as coloured pins (teal/emerald/amber/rose)
 *  • Hazard alert pins from GlobalSignals / reference stations (orange warning flags)
 *  • Pulsing ring on any pin with soil moisture < 0.25 (drought stress)
 *
 * Free, no API key — CartoDB Dark Matter tiles + react-leaflet.
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
  soilMoisture?: number;
  droughtRisk?: number;
}

export type WaterAlertType =
  | 'fire'
  | 'drought'
  | 'flood'
  | 'pollution'
  | 'climate_risk'
  | 'earthquake'
  | 'water_scarcity'
  | 'infrastructure'
  | 'reference'
  | 'hazard';

export interface WaterAlertPin {
  id: string;
  title: string;
  description?: string;
  lat: number;
  lng: number;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  source: string;
  type?: WaterAlertType;
  isReference?: boolean; // global monitoring reference station
}

interface WaterGlobeProps {
  projects: WaterProjectPin[];
  alertPins?: WaterAlertPin[];
  onSelectProject?: (projectId: string) => void;
  height?: string;
}

// ── Status → colour mapping ────────────────────────────────────────────────────

function pinColor(status: string): string {
  if (status === 'approved' || status === 'credited')      return '#10b981'; // emerald
  if (status === 'monitoring')                              return '#14b8a6'; // teal
  if (status === 'under_review' || status === 'submitted') return '#f59e0b'; // amber
  if (status === 'rejected')                               return '#f43f5e'; // rose
  return '#64748b'; // slate / draft
}

function pinLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function severityColor(s: WaterAlertPin['severity']): string {
  if (s === 'critical') return '#f43f5e';
  if (s === 'high')     return '#f97316';
  if (s === 'moderate') return '#f59e0b';
  return '#64748b';
}

function makeWaterPin(status: string, soilMoisture?: number) {
  const color = pinColor(status);
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
  return L.divIcon({ html, iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -14], className: '' });
}

// Returns the SVG body for each alert type
function alertSvgBody(type: WaterAlertType | undefined, color: string, isReference: boolean): string {
  const tf = `fill="${color}" fill-opacity="0.92" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"`;

  if (isReference) {
    // Cyan diamond for reference stations
    return `
      <polygon points="13,2 24,13 13,24 2,13" ${tf}/>
      <text x="13" y="17" text-anchor="middle" font-size="9" font-weight="900" fill="#0f172a">★</text>`;
  }

  switch (type) {
    case 'fire':
      // Flame shape
      return `
        <path d="M13 2 C13 2 18 8 16 12 C19 10 20 14 18 17 C17 21 10 23 8 19 C6 15 9 13 9 13 C9 16 11 16 12 14 C10 12 11 8 13 2Z" ${tf}/>`;

    case 'drought':
      // Sun with rays
      return `
        <circle cx="13" cy="13" r="5" ${tf}/>
        <line x1="13" y1="2" x2="13" y2="5" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
        <line x1="13" y1="21" x2="13" y2="24" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
        <line x1="2" y1="13" x2="5" y2="13" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
        <line x1="21" y1="13" x2="24" y2="13" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
        <line x1="5" y1="5" x2="7" y2="7" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
        <line x1="19" y1="19" x2="21" y2="21" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
        <line x1="21" y1="5" x2="19" y2="7" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
        <line x1="5" y1="21" x2="7" y2="19" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;

    case 'flood':
      // Water drop
      return `
        <path d="M13 2 C13 2 4 14 4 17 C4 21 8 25 13 25 C18 25 22 21 22 17 C22 14 13 2 13 2Z" ${tf}/>`;

    case 'pollution':
      // Cloud with dot
      return `
        <path d="M19 16 C21 16 23 14 23 12 C23 10 21 8 19 8 C18.5 6 17 4 14.5 4 C12 4 10 6 9.5 8 C8 8 5 10 5 13 C5 15 7 17 9 17 Z" ${tf}/>
        <circle cx="13" cy="21" r="2" fill="${color}" fill-opacity="0.9"/>`;

    case 'climate_risk':
      // Lightning bolt
      return `
        <path d="M15 2 L7 14 L13 14 L11 24 L19 12 L13 12 Z" ${tf}/>`;

    case 'earthquake':
      // Seismic zigzag
      return `
        <polyline points="2,13 5,13 7,7 10,19 13,10 16,16 19,13 24,13"
          fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;

    case 'water_scarcity':
      // Droplet with slash
      return `
        <path d="M13 3 C13 3 5 14 5 17 C5 21 9 24 13 24 C17 24 21 21 21 17 C21 14 13 3 13 3Z"
          fill="${color}" fill-opacity="0.5" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
        <line x1="6" y1="6" x2="20" y2="20" stroke="rgba(255,255,255,0.9)" stroke-width="2.5" stroke-linecap="round"/>`;

    case 'infrastructure':
      // Wrench/gear
      return `
        <rect x="5" y="11" width="16" height="4" rx="2" ${tf}/>
        <rect x="11" y="5" width="4" height="16" rx="2" ${tf}/>`;

    default:
      // Default warning triangle with !
      return `
        <polygon points="13,3 24,22 2,22" ${tf}/>
        <text x="13" y="19" text-anchor="middle" font-size="10" font-weight="900" fill="#fff">!</text>`;
  }
}

function makeAlertPin(severity: WaterAlertPin['severity'], isReference?: boolean, type?: WaterAlertType) {
  const color = isReference ? '#22d3ee' : severityColor(severity);
  const pulse = (severity === 'critical' || severity === 'high') && !isReference
    ? `animation:dpal-ping 1s cubic-bezier(0,0,0.2,1) infinite;`
    : '';
  const svgBody = alertSvgBody(type, color, !!isReference);
  const html = `
    <div style="position:relative;width:28px;height:28px;">
      <svg viewBox="0 0 26 26" width="28" height="28" style="position:absolute;top:0;left:0;filter:drop-shadow(0 0 4px ${color}99)">
        ${svgBody}
      </svg>
      <span style="
        display:block;width:28px;height:28px;
        border-radius:50%;border:2px solid ${color}55;
        position:absolute;top:0;left:0;
        ${pulse}
      "></span>
    </div>`;
  return L.divIcon({ html, iconSize: [28, 28], iconAnchor: [14, 24], popupAnchor: [0, -26], className: '' });
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
          75%, 100% { transform: scale(1.9); opacity: 0; }
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
        .leaflet-control-zoom a {
          background: #1e293b !important;
          color: #94a3b8 !important;
          border-color: #334155 !important;
        }
        .leaflet-control-zoom a:hover {
          background: #334155 !important;
          color: #e2e8f0 !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);
  return null;
}

// ── Auto-fit bounds ────────────────────────────────────────────────────────────

const FitBounds: React.FC<{ projects: WaterProjectPin[]; alerts: WaterAlertPin[] }> = ({ projects, alerts }) => {
  const map = useMap();
  useEffect(() => {
    const allPoints: [number, number][] = [
      ...projects.map((p): [number, number] => [p.lat, p.lng]),
      ...alerts.map((a): [number, number] => [a.lat, a.lng]),
    ];
    if (allPoints.length === 0) return;
    if (allPoints.length === 1) {
      map.flyTo(allPoints[0], 5, { duration: 1 });
      return;
    }
    const bounds = L.latLngBounds(allPoints);
    map.flyToBounds(bounds.pad(0.25), { duration: 1.2, maxZoom: 7 });
  }, [map, projects, alerts]);
  return null;
};

// ── Project type icons ─────────────────────────────────────────────────────────

const PROJECT_TYPE_EMOJI: Record<string, string> = {
  farm_irrigation:            '🌾',
  reservoir_monitoring:       '🏞️',
  wetland_restoration:        '🦆',
  leak_reduction:             '🔧',
  community_conservation:     '🏘️',
  drought_response:           '🌵',
  school_or_facility_savings: '🏫',
  other:                      '💧',
};

// ── Main component ─────────────────────────────────────────────────────────────

export const WaterGlobe: React.FC<WaterGlobeProps> = ({
  projects,
  alertPins = [],
  onSelectProject,
  height = 'h-[440px]',
}) => {
  const hasAny = projects.length > 0 || alertPins.length > 0;

  return (
    <div className={`relative ${height} rounded-xl overflow-hidden border border-slate-700/60`}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={1}
        maxZoom={18}
        style={{ height: '100%', width: '100%', background: '#0a0f1a' }}
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
      >
        <PulseStyle />

        {/* CartoDB Dark Matter — no API key */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />

        {hasAny && <FitBounds projects={projects} alerts={alertPins} />}

        {/* ── Registered water project pins ── */}
        {projects.map((p) => (
          <Marker key={p.projectId} position={[p.lat, p.lng]} icon={makeWaterPin(p.status, p.soilMoisture)}>
            <Popup minWidth={220} maxWidth={260}>
              <div className="p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xl shrink-0 mt-0.5">{PROJECT_TYPE_EMOJI[p.projectType] ?? '💧'}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-100 text-sm leading-tight">{p.projectName}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{p.city ? `${p.city}, ` : ''}{p.country}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border"
                    style={{ color: pinColor(p.status), borderColor: `${pinColor(p.status)}55`, background: `${pinColor(p.status)}15` }}
                  >
                    {pinLabel(p.status)}
                  </span>
                  <span className="text-[9px] text-slate-500">{p.totalAcres.toLocaleString()} acres</span>
                </div>

                {(p.soilMoisture != null || p.droughtRisk != null) && (
                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-700/60">
                    {p.soilMoisture != null && (
                      <div className="bg-slate-800/60 rounded px-2 py-1">
                        <p className="text-[8px] text-slate-500 uppercase tracking-wide">Soil moisture</p>
                        <p className={`text-xs font-bold ${p.soilMoisture >= 0.4 ? 'text-emerald-400' : p.soilMoisture >= 0.25 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {(p.soilMoisture * 100).toFixed(0)}%
                          {p.soilMoisture < 0.25 && <span className="ml-1 text-rose-300">⚠</span>}
                        </p>
                      </div>
                    )}
                    {p.droughtRisk != null && (
                      <div className="bg-slate-800/60 rounded px-2 py-1">
                        <p className="text-[8px] text-slate-500 uppercase tracking-wide">Drought risk</p>
                        <p className={`text-xs font-bold ${p.droughtRisk < 0.3 ? 'text-emerald-400' : p.droughtRisk < 0.6 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {(p.droughtRisk * 100).toFixed(0)}%
                          {p.droughtRisk >= 0.6 && <span className="ml-1 text-rose-300">⚠</span>}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {onSelectProject && (
                  <button
                    onClick={() => onSelectProject(p.projectId)}
                    className="w-full mt-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg
                      bg-teal-700/30 hover:bg-teal-600/40 border border-teal-600/40 text-teal-300 transition-colors"
                  >
                    View Project →
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* ── Hazard / reference alert pins ── */}
        {alertPins.map((a) => (
          <Marker key={a.id} position={[a.lat, a.lng]} icon={makeAlertPin(a.severity, a.isReference, a.isReference ? 'reference' : a.type)}>
            <Popup minWidth={200} maxWidth={260}>
              <div className="p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {a.isReference ? (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: '#22d3ee20', color: '#22d3ee', border: '1px solid #22d3ee40' }}>
                      Reference Station
                    </span>
                  ) : (
                    <>
                      <span
                        className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                        style={{ background: `${severityColor(a.severity)}20`, color: severityColor(a.severity), border: `1px solid ${severityColor(a.severity)}40` }}
                      >
                        {a.severity}
                      </span>
                      {a.type && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300 border border-slate-600/40">
                          {a.type.replace(/_/g, ' ')}
                        </span>
                      )}
                    </>
                  )}
                  <span className="text-[9px] text-slate-500">{a.source}</span>
                </div>
                <p className="text-xs font-semibold text-slate-200 leading-snug">{a.title}</p>
                {a.description && (
                  <p className="text-[10px] text-slate-400 leading-relaxed">{a.description}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Empty state overlay */}
        {!hasAny && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div className="bg-slate-900/80 border border-slate-700 rounded-xl px-5 py-4 text-center backdrop-blur-sm">
              <p className="text-2xl mb-2">💧</p>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wide">No data loaded</p>
              <p className="text-[10px] text-slate-500 mt-1">Register a water project or import signals</p>
            </div>
          </div>
        )}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-sm border border-slate-700/60 rounded-lg px-3 py-2 space-y-1.5">
        <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Projects</p>
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
        <div className="border-t border-slate-700/60 pt-1 mt-1">
          <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Alert Types</p>
          {[
            { color: '#22d3ee', label: 'Reference',   icon: <svg viewBox="0 0 12 12" width="11" height="11"><polygon points="6,1 11,6 6,11 1,6" fill="#22d3ee"/></svg> },
            { color: '#f43f5e', label: 'Fire',        icon: <svg viewBox="0 0 12 12" width="11" height="11"><path d="M6 1C6 1 9 4.5 8 6.5C9.5 5.5 10 7 9 8.5C8.5 10 5 11 4 9C3 7 4.5 6 4.5 6C4.5 7.5 5.5 7.5 6 6.5C5 5.5 5.5 3.5 6 1Z" fill="#f43f5e" fillOpacity="0.9" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/></svg> },
            { color: '#f59e0b', label: 'Drought',     icon: <svg viewBox="0 0 12 12" width="11" height="11"><circle cx="6" cy="6" r="2.5" fill="#f59e0b"/><line x1="6" y1="1" x2="6" y2="2.5" stroke="#f59e0b" strokeWidth="1.2"/><line x1="6" y1="9.5" x2="6" y2="11" stroke="#f59e0b" strokeWidth="1.2"/><line x1="1" y1="6" x2="2.5" y2="6" stroke="#f59e0b" strokeWidth="1.2"/><line x1="9.5" y1="6" x2="11" y2="6" stroke="#f59e0b" strokeWidth="1.2"/></svg> },
            { color: '#3b82f6', label: 'Flood',       icon: <svg viewBox="0 0 12 12" width="11" height="11"><path d="M6 1C6 1 2 6 2 8C2 10 4 12 6 12C8 12 10 10 10 8C10 6 6 1 6 1Z" fill="#3b82f6" fillOpacity="0.9" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/></svg> },
            { color: '#a78bfa', label: 'Pollution',   icon: <svg viewBox="0 0 12 12" width="11" height="11"><path d="M9 7.5C10 7.5 11 6.5 11 5.5C11 4.5 10 3.5 9 3.5C8.8 2.5 8 1.5 7 1.5C6 1.5 5 2.5 4.8 3.5C4 3.5 2.5 4.5 2.5 6C2.5 7 3.5 8 4.5 8Z" fill="#a78bfa" fillOpacity="0.9"/></svg> },
            { color: '#f97316', label: 'Climate',     icon: <svg viewBox="0 0 12 12" width="11" height="11"><path d="M7 1L3 7H6L5 11L9 5H6Z" fill="#f97316" fillOpacity="0.9" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"/></svg> },
            { color: '#fb923c', label: 'Earthquake',  icon: <svg viewBox="0 0 12 12" width="11" height="11"><polyline points="1,6 2.5,6 3.5,3 5,9 6.5,5 8,8 9,6 11,6" fill="none" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
          ].map(({ color, label, icon }) => (
            <div key={label} className="flex items-center gap-2">
              {icon}
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
            </div>
          ))}
        </div>
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
