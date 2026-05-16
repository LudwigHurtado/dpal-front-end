import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, Polygon, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Layout, Maximize2, Search, Trash2 } from '../../../../components/icons';
import type { PlasticMapLayers } from '../types';
import PlasticLayerControl from './PlasticLayerControl';
import {
  computePolygonAreaKm2,
  computePolygonCentroid,
  polygonRingFromPoints,
  type LatLngPoint,
  type PolygonRing,
} from '../utils/plasticAoiUtils';

type Props = {
  center: { lat: number; lng: number };
  onCenterChange: (c: { lat: number; lng: number }) => void;
  layers: PlasticMapLayers;
  onLayersChange: (layers: PlasticMapLayers) => void;
  drawingPolygon: boolean;
  onDrawingPolygonChange: (v: boolean) => void;
  draftPoints: LatLngPoint[];
  onDraftPointsChange: (points: LatLngPoint[]) => void;
  savedPoints: LatLngPoint[];
  onSavedPointsChange: (points: LatLngPoint[]) => void;
  aoiLabel: string;
  onAoiLabelChange: (label: string) => void;
  searchText: string;
  onSearchTextChange: (v: string) => void;
  searchBusy: boolean;
  searchNotice: string | null;
  onSearch: () => void;
  manualPolygonJson: string;
  onManualPolygonJsonChange: (v: string) => void;
  manualPolygonError: string | null;
  onApplyManualPolygon: () => void;
  scanDisabled: boolean;
  scanBusy: boolean;
  onRunScan: () => void;
  layoutKey: string;
};

function MapPolygonDrawer({
  enabled,
  onAddPoint,
}: {
  enabled: boolean;
  onAddPoint: (p: LatLngPoint) => void;
}) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onAddPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function LeafletZoomScale() {
  const map = useMap();
  useEffect(() => {
    const zoom = L.control.zoom({ position: 'topright' });
    const scale = L.control.scale({ imperial: false, metric: true, position: 'bottomleft' });
    zoom.addTo(map);
    scale.addTo(map);
    return () => {
      map.removeControl(zoom);
      map.removeControl(scale);
    };
  }, [map]);
  return null;
}

function MapViewSync({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom(), { animate: false });
  }, [center.lat, center.lng, map]);
  return null;
}

function LeafletMapSizeFixer({ layoutKey }: { layoutKey: string }) {
  const map = useMap();
  useEffect(() => {
    const run = () => map.invalidateSize({ animate: false });
    run();
    const t1 = window.setTimeout(run, 100);
    const t2 = window.setTimeout(run, 350);
    window.addEventListener('resize', run);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', run);
    };
  }, [map, layoutKey]);
  return null;
}

function LeafletMapResizeObserver({ containerRef }: { containerRef: React.RefObject<HTMLElement | null> }) {
  const map = useMap();
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [map, containerRef]);
  return null;
}

export function PlasticAoiMapPanel({
  center,
  onCenterChange,
  layers,
  onLayersChange,
  drawingPolygon,
  onDrawingPolygonChange,
  draftPoints,
  onDraftPointsChange,
  savedPoints,
  onSavedPointsChange,
  aoiLabel,
  onAoiLabelChange,
  searchText,
  onSearchTextChange,
  searchBusy,
  searchNotice,
  onSearch,
  manualPolygonJson,
  onManualPolygonJsonChange,
  manualPolygonError,
  onApplyManualPolygon,
  scanDisabled,
  scanBusy,
  onRunScan,
  layoutKey,
}: Props): React.ReactElement {
  const mapWrapRef = useRef<HTMLDivElement | null>(null);
  const mapTileHostRef = useRef<HTMLDivElement | null>(null);
  const [layerMenuOpen, setLayerMenuOpen] = React.useState(false);
  const layerMenuRef = useRef<HTMLDivElement | null>(null);

  const savedRing = useMemo(
    (): PolygonRing | null => (savedPoints.length >= 3 ? polygonRingFromPoints(savedPoints) : null),
    [savedPoints],
  );
  const draftRing = useMemo(
    (): PolygonRing | null => (draftPoints.length >= 2 ? polygonRingFromPoints(draftPoints) : null),
    [draftPoints],
  );

  const centroid = useMemo(() => computePolygonCentroid(savedPoints), [savedPoints]);
  const areaKm2 = useMemo(() => computePolygonAreaKm2(savedPoints), [savedPoints]);

  const toggleFullscreen = useCallback(async () => {
    const el = mapWrapRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) await el.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  }, []);

  const useGps = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => onCenterChange({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => undefined,
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }, [onCenterChange]);

  const finishPolygon = useCallback(() => {
    if (draftPoints.length < 3) return;
    onSavedPointsChange(draftPoints);
    onDrawingPolygonChange(false);
    const c = computePolygonCentroid(draftPoints);
    if (c) onCenterChange(c);
  }, [draftPoints, onCenterChange, onDrawingPolygonChange, onSavedPointsChange]);

  const clearAoi = useCallback(() => {
    onDraftPointsChange([]);
    onSavedPointsChange([]);
    onDrawingPolygonChange(false);
  }, [onDraftPointsChange, onDrawingPolygonChange, onSavedPointsChange]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (layerMenuOpen && layerMenuRef.current && !layerMenuRef.current.contains(t)) setLayerMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [layerMenuOpen]);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">2. Location &amp; scan area</h2>
        <p className="mt-1 text-[11px] text-slate-600">
          Click points on the map to create your scan boundary. Finish and save before running a scan.
        </p>

        {drawingPolygon ? (
          <div className="mt-2 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-[11px] font-medium text-sky-950">
            Drawing mode active — click the map to add boundary points ({draftPoints.length} point
            {draftPoints.length === 1 ? '' : 's'}).
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={searchText}
              onChange={(e) => onSearchTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
              placeholder="Search location"
              className="w-full rounded-lg border border-slate-200 py-1.5 pl-7 pr-2 text-xs"
            />
          </div>
          <button
            type="button"
            disabled={searchBusy}
            onClick={onSearch}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            Search
          </button>
          <button
            type="button"
            onClick={useGps}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
          >
            <Crosshair className="h-3.5 w-3.5" />
            Use my GPS
          </button>
          <button
            type="button"
            onClick={() => {
              onDrawingPolygonChange(true);
              onDraftPointsChange([]);
            }}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              drawingPolygon ? 'bg-sky-800 text-white' : 'border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Layout className="h-3.5 w-3.5" />
            Draw Polygon
          </button>
          <button
            type="button"
            disabled={draftPoints.length < 3}
            onClick={finishPolygon}
            className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-900 hover:bg-sky-100 disabled:opacity-40"
          >
            Finish Polygon
          </button>
          <button
            type="button"
            onClick={clearAoi}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear AOI
          </button>
          <button
            type="button"
            disabled={savedPoints.length < 3}
            onClick={() => {
              if (savedPoints.length >= 3) onDrawingPolygonChange(false);
            }}
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 disabled:opacity-40"
          >
            Save AOI
          </button>
          <button
            type="button"
            disabled={scanDisabled || scanBusy}
            onClick={onRunScan}
            className="rounded-lg bg-sky-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-900 disabled:opacity-50"
          >
            {scanBusy ? 'Scanning…' : 'Run Scan'}
          </button>
        </div>

        {searchNotice ? <p className="mt-2 text-[10px] text-amber-700">{searchNotice}</p> : null}

        <label className="mt-3 block text-[10px] font-medium text-slate-500">
          AOI name
          <input
            value={aoiLabel}
            onChange={(e) => onAoiLabelChange(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
          />
        </label>

        {savedPoints.length >= 3 ? (
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-slate-700 sm:grid-cols-4">
            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
              <span className="text-slate-500">Center</span>
              <p className="font-mono font-semibold">
                {centroid ? `${centroid.lat.toFixed(4)}, ${centroid.lng.toFixed(4)}` : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
              <span className="text-slate-500">Points</span>
              <p className="font-semibold">{savedPoints.length}</p>
            </div>
            <AoiAreaStat areaKm2={areaKm2} />
            <div className="rounded-lg bg-emerald-50 px-2 py-1.5 text-emerald-900">
              <span className="text-emerald-700">Status</span>
              <p className="font-semibold">Saved AOI</p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-[10px] text-amber-800">No saved polygon yet — draw at least 3 points and finish.</p>
        )}

        <details className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/80 p-2">
          <summary className="cursor-pointer text-[10px] font-semibold text-slate-700">
            Manual AOI — paste polygon JSON
          </summary>
          <textarea
            value={manualPolygonJson}
            onChange={(e) => onManualPolygonJsonChange(e.target.value)}
            rows={4}
            placeholder='[[-63.18, -17.78], [-63.17, -17.78], [-63.17, -17.79]]'
            className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1 font-mono text-[10px]"
          />
          {manualPolygonError ? <p className="mt-1 text-[10px] text-rose-700">{manualPolygonError}</p> : null}
          <button
            type="button"
            onClick={onApplyManualPolygon}
            className="mt-2 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold hover:bg-slate-100"
          >
            Apply coordinates
          </button>
        </details>

        <div className="mt-3">
          <PlasticLayerControl layers={layers} onChange={onLayersChange} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div ref={mapWrapRef} className="relative w-full min-h-[320px]">
          <div ref={mapTileHostRef} className="h-[320px] w-full md:h-[420px]">
            <MapContainer
              center={[center.lat, center.lng]}
              zoom={10}
              scrollWheelZoom
              zoomControl={false}
              className="z-0 h-full w-full"
              style={{ height: '100%', width: '100%' }}
            >
              {layers.satellite ? (
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={20}
                />
              ) : (
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
              )}
              {layers.labels ? (
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={20}
                />
              ) : null}
              {savedRing ? (
                <Polygon positions={savedRing} pathOptions={{ color: '#0369a1', weight: 3, fillOpacity: 0.15 }} />
              ) : null}
              {draftRing && drawingPolygon ? (
                <Polygon
                  positions={draftRing}
                  pathOptions={{ color: '#0ea5e9', weight: 2, dashArray: '6 4', fillOpacity: 0.08 }}
                />
              ) : null}
              <MapPolygonDrawer
                enabled={drawingPolygon}
                onAddPoint={(p) => onDraftPointsChange([...draftPoints, p])}
              />
              <LeafletZoomScale />
              <MapViewSync center={center} />
              <LeafletMapSizeFixer layoutKey={layoutKey} />
              <LeafletMapResizeObserver containerRef={mapTileHostRef} />
            </MapContainer>
          </div>
          {!drawingPolygon ? (
            <MapCrosshairOverlay />
          ) : null}
          <MapFloatingControls
            layerMenuOpen={layerMenuOpen}
            setLayerMenuOpen={setLayerMenuOpen}
            layerMenuRef={layerMenuRef}
            layers={layers}
            onLayersChange={onLayersChange}
            toggleFullscreen={toggleFullscreen}
          />
        </div>
      </div>
    </div>
  );
}

function AoiAreaStat({ areaKm2 }: { areaKm2: number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
      <span className="text-slate-500">Area</span>
      <p className="font-semibold">{areaKm2 > 0 ? `~${areaKm2.toFixed(2)} km²` : 'area calculation pending'}</p>
    </div>
  );
}

function MapCrosshairOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center">
      <Crosshair className="h-8 w-8 text-sky-700/40 drop-shadow-sm" strokeWidth={2.5} />
    </div>
  );
}

function MapFloatingControls({
  layerMenuOpen,
  setLayerMenuOpen,
  layerMenuRef,
  layers,
  onLayersChange,
  toggleFullscreen,
}: {
  layerMenuOpen: boolean;
  setLayerMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  layerMenuRef: React.RefObject<HTMLDivElement | null>;
  layers: PlasticMapLayers;
  onLayersChange: (l: PlasticMapLayers) => void;
  toggleFullscreen: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-[450] flex flex-col gap-1">
      <div className="relative" ref={layerMenuRef}>
        <button
          type="button"
          onClick={() => setLayerMenuOpen((o) => !o)}
          className="rounded-lg border border-slate-200 bg-white/95 p-2 text-slate-700 shadow-sm hover:bg-white"
          title="Map layers"
        >
          <Layout className="h-4 w-4" />
        </button>
        {layerMenuOpen ? (
          <div className="absolute left-0 top-full z-[460] mt-1 w-56 rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-lg">
            <label className="flex items-center justify-between gap-2 py-1">
              <span>Satellite base</span>
              <input
                type="checkbox"
                checked={layers.satellite}
                onChange={() => onLayersChange({ ...layers, satellite: !layers.satellite })}
              />
            </label>
            <label className="flex items-center justify-between gap-2 py-1">
              <span>Labels</span>
              <input
                type="checkbox"
                checked={layers.labels}
                onChange={() => onLayersChange({ ...layers, labels: !layers.labels })}
              />
            </label>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={toggleFullscreen}
        className="rounded-lg border border-slate-200 bg-white/95 p-2 text-slate-700 shadow-sm hover:bg-white"
        title="Fullscreen map"
      >
        <Maximize2 className="h-4 w-4" />
      </button>
    </div>
  );
}
