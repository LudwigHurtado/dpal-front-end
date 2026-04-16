/**
 * GibsTileViewer — Interactive NASA GIBS satellite imagery viewer
 *
 * Renders a Leaflet map with any of 18 NASA GIBS WMTS layers
 * (true color, NDVI, SMAP soil moisture, LST, water vapor, etc.)
 * over a dark CartoDB base.
 *
 * Features:
 *  - Layer category tabs + full layer grid
 *  - Date picker (default yesterday; safe for all daily products)
 *  - Project boundary ring / polygon overlay
 *  - NASA GIBS attribution as required by usage guidelines
 */

import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  gibsTileUrl, gibsDefaultDate, GIBS_LAYERS, GIBS_ATTRIBUTION,
  GIBS_CATEGORY_LABEL, type GibsCategory, type GibsLayerDef,
} from '../services/gibsService';
import {
  Globe, MapPin, RefreshCw, ChevronDown, ChevronUp, Eye,
} from './icons';

// ── Category ordering ──────────────────────────────────────────────────────────
const CATEGORY_ORDER: GibsCategory[] = [
  'true_color', 'vegetation', 'soil_moisture', 'temperature', 'water', 'atmosphere', 'reference',
];

const CAT_ACTIVE_CLS = 'bg-teal-600/30 border-teal-500/60 text-teal-300';
const CAT_IDLE_CLS   = 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300';

interface Props {
  lat: number;
  lng: number;
  polygon?: { lat: number; lng: number }[];
  projectName?: string;
  totalAcres?: number;
  /** Pre-select a specific layer on mount */
  defaultLayerId?: string;
  /** Show layer picker open by default */
  defaultPickerOpen?: boolean;
  height?: number;
}

export function GibsTileViewer({
  lat,
  lng,
  polygon,
  projectName,
  totalAcres,
  defaultLayerId = 'MODIS_Terra_CorrectedReflectance_TrueColor',
  defaultPickerOpen = false,
  height = 360,
}: Props) {
  const [activeLayerId, setActiveLayerId]     = useState(defaultLayerId);
  const [date, setDate]                       = useState(gibsDefaultDate());
  const [showPicker, setShowPicker]           = useState(defaultPickerOpen);
  const [activeCategory, setActiveCategory]   = useState<GibsCategory | 'all'>('all');

  const activeLayer: GibsLayerDef =
    GIBS_LAYERS.find(l => l.id === activeLayerId) ?? GIBS_LAYERS[0];

  const tileUrl = useMemo(
    () => gibsTileUrl(activeLayer.id, date, activeLayer.tileMatrixLevel, activeLayer.format),
    [activeLayer, date]
  );

  const filteredLayers = useMemo(
    () => activeCategory === 'all'
      ? GIBS_LAYERS
      : GIBS_LAYERS.filter(l => l.category === activeCategory),
    [activeCategory]
  );

  // Boundary radius: rough circle from acres
  const radiusM = totalAcres ? Math.sqrt(totalAcres * 4047) * 0.9 : 4000;

  const polyPositions = polygon && polygon.length >= 3
    ? polygon.map(p => [p.lat, p.lng] as [number, number])
    : null;

  const hasCoords = lat && lng && (lat !== 0 || lng !== 0);

  if (!hasCoords) {
    return (
      <div className="h-48 flex items-center justify-center bg-slate-800/50 rounded-xl border border-dashed border-slate-700 text-center px-4">
        <div>
          <Globe className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm font-medium">No GPS coordinates set</p>
          <p className="text-xs text-slate-600 mt-1">Use "Edit GPS" to set a location</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-200 truncate">{activeLayer.label}</span>
          <span className={`hidden sm:inline text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${activeLayer.badgeColor}`}>
            {GIBS_CATEGORY_LABEL[activeLayer.category]}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Date picker */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
            <RefreshCw className="w-3 h-3 text-slate-500" />
            <input
              type="date"
              value={date}
              max={gibsDefaultDate()}
              min="2000-01-01"
              onChange={e => setDate(e.target.value)}
              className="bg-transparent text-slate-300 text-[10px] outline-none w-[90px]"
            />
          </div>

          {/* Toggle layer picker */}
          <button
            onClick={() => setShowPicker(v => !v)}
            className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 hover:border-teal-600/50 rounded-lg px-3 py-1.5 text-slate-300 text-xs transition"
          >
            <Eye className="w-3 h-3" />
            Layers
            {showPicker
              ? <ChevronUp className="w-3 h-3" />
              : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* ── Layer picker ─────────────────────────────────────────── */}
      {showPicker && (
        <div className="bg-slate-800/80 border-b border-slate-700 p-4 space-y-3">

          {/* Category tabs */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveCategory('all')}
              className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold uppercase tracking-wide transition
                ${activeCategory === 'all' ? CAT_ACTIVE_CLS : CAT_IDLE_CLS}`}
            >
              All
            </button>
            {CATEGORY_ORDER.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold uppercase tracking-wide transition
                  ${activeCategory === cat ? CAT_ACTIVE_CLS : CAT_IDLE_CLS}`}
              >
                {GIBS_CATEGORY_LABEL[cat]}
              </button>
            ))}
          </div>

          {/* Layer grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
            {filteredLayers.map(layer => (
              <button
                key={layer.id}
                onClick={() => { setActiveLayerId(layer.id); setShowPicker(false); }}
                className={`text-left rounded-lg border px-3 py-2 transition
                  ${activeLayerId === layer.id
                    ? 'bg-teal-600/20 border-teal-500/50 text-teal-100'
                    : 'border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 bg-slate-900/50'}`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${layer.badgeColor} leading-none`}>
                    {GIBS_CATEGORY_LABEL[layer.category]}
                  </span>
                  <span className="text-[9px] text-slate-600 uppercase tracking-wide">{layer.temporal}</span>
                </div>
                <p className="text-xs font-medium leading-tight">{layer.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{layer.description}</p>
              </button>
            ))}
          </div>

          <p className="text-[10px] text-slate-600 italic">
            {GIBS_LAYERS.length} NASA products · Daily products update within 3–5 hrs of satellite observation
          </p>
        </div>
      )}

      {/* ── Map ─────────────────────────────────────────────────── */}
      <div style={{ height }}>
        <MapContainer
          key={`${lat.toFixed(4)},${lng.toFixed(4)}`}
          center={[lat, lng]}
          zoom={Math.min(8, activeLayer.maxNativeZoom)}
          maxZoom={activeLayer.maxNativeZoom + 4}
          style={{ height: '100%', width: '100%', background: '#0f172a' }}
          zoomControl={true}
        >
          {/* Dark base layer */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution={GIBS_ATTRIBUTION}
            maxZoom={20}
          />

          {/* GIBS imagery overlay */}
          <TileLayer
            key={`${activeLayer.id}-${date}`}
            url={tileUrl}
            opacity={activeLayer.opacity}
            maxNativeZoom={activeLayer.maxNativeZoom}
            maxZoom={activeLayer.maxNativeZoom + 4}
            tms={false}
          />

          {/* Project boundary */}
          {polyPositions ? (
            <Polygon
              positions={polyPositions}
              pathOptions={{ color: '#14b8a6', weight: 2, fillColor: '#14b8a6', fillOpacity: 0.08 }}
            />
          ) : (
            <Circle
              center={[lat, lng]}
              radius={radiusM}
              pathOptions={{ color: '#14b8a6', weight: 2, fillColor: '#14b8a6', fillOpacity: 0.07 }}
            />
          )}
        </MapContainer>
      </div>

      {/* ── Footer attribution ──────────────────────────────────── */}
      <div className="px-4 py-2 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between gap-3">
        <p className="text-[10px] text-slate-600 leading-tight">
          We acknowledge the use of imagery provided by services from{' '}
          <a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noopener"
            className="text-teal-600 hover:text-teal-400 underline">
            NASA's Global Imagery Browse Services (GIBS)
          </a>
          , part of NASA's Earth Science Data and Information System (ESDIS).
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {projectName && (
            <span className="text-[10px] text-slate-600 hidden sm:block truncate max-w-[140px]">{projectName}</span>
          )}
          <span className="text-[10px] text-slate-600 font-mono">{date}</span>
        </div>
      </div>
    </div>
  );
}
