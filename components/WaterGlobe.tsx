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

export interface WaterAlertPin {
  id: string;
  title: string;
  description?: string;
  lat: number;
  lng: number;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  source: string;
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

function makeAlertPin(severity: WaterAlertPin['severity'], isReference?: boolean) {
  const color = isReference ? '#22d3ee' : severityColor(severity);
  const pulse = (severity === 'critical' || severity === 'high') && !isReference
    ? `animation:dpal-ping 1s cubic-bezier(0,0,0.2,1) infinite;`
    : '';
  // Warning-flag style: triangle body
  const html = `
    <div style="position:relative;width:26px;height:26px;">
      <svg viewBox="0 0 26 26" width="26" height="26" style="position:absolute;top:0;left:0;filter:drop-shadow(0 0 4px ${color}88)">
        <polygon points="13,3 24,22 2,22" fill="${color}" fill-opacity="0.92" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
        <text x="13" y="19" text-anchor="middle" font-size="10" font-weight="900" fill="${isReference ? '#0f172a' : '#fff'}">!</text>
      </svg>
      <span style="
        display:block;width:26px;height:26px;
        border-radius:50%;border:2px solid ${color}55;
        position:absolute;top:0;left:0;
        ${pulse}
      "></span>
    </div>`;
  return L.divIcon({ html, iconSize: [26, 26], iconAnchor: [13, 22], popupAnchor: [0, -24], className: '' });
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
          <Marker key={a.id} position={[a.lat, a.lng]} icon={makeAlertPin(a.severity, a.isReference)}>
            <Popup minWidth={200} maxWidth={260}>
              <div className="p-3 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                    style={{ background: `${severityColor(a.severity)}20`, color: severityColor(a.severity), border: `1px solid ${severityColor(a.severity)}40` }}
                  >
                    {a.isReference ? 'Reference Station' : a.severity}
                  </span>
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
          <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Alerts</p>
          {[
            { color: '#22d3ee', label: 'Reference station' },
            { color: '#f97316', label: 'Hazard signal' },
            { color: '#f43f5e', label: 'Critical alert' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <svg viewBox="0 0 10 9" width="10" height="9"><polygon points="5,1 9,8 1,8" fill={color} /></svg>
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
