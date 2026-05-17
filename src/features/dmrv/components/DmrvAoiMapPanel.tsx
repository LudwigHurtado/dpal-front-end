import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Polygon, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Layout, Trash2 } from '../../../../components/icons';
import {
  computePolygonAreaKm2,
  computePolygonCentroid,
  parseManualPolygonJson,
  polygonRingFromPoints,
  type LatLngPoint,
  type PolygonRing,
} from '../utils/dmrvAoiMapUtils';

const ESRI_IMAGERY =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_LABELS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

const DEFAULT_CENTER = { lat: 37.25, lng: -119.8 };

function MapClickDrawer({
  drawingPolygon,
  onAddPoint,
  onPickCenter,
}: {
  drawingPolygon: boolean;
  onAddPoint: (p: LatLngPoint) => void;
  onPickCenter: (p: LatLngPoint) => void;
}): null {
  useMapEvents({
    click(e) {
      const point = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (drawingPolygon) {
        onAddPoint(point);
        return;
      }
      onPickCenter(point);
    },
  });
  return null;
}

function MapViewSync({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }): null {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom, { animate: false });
  }, [center.lat, center.lng, map, zoom]);
  return null;
}

function LeafletMapSizeFixer(): null {
  const map = useMap();
  useEffect(() => {
    const run = () => map.invalidateSize({ animate: false });
    run();
    const t1 = window.setTimeout(run, 120);
    const t2 = window.setTimeout(run, 400);
    window.addEventListener('resize', run);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', run);
    };
  }, [map]);
  return null;
}

function LeafletZoomScale(): null {
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

export type DmrvAoiMapPanelProps = {
  latitude: string;
  longitude: string;
  savedPoints: LatLngPoint[];
  onSavedPointsChange: (points: LatLngPoint[]) => void;
  onApplyToProject: (points: LatLngPoint[]) => void;
  onClearProject?: () => void;
  drawTrigger?: number;
  uploadTrigger?: number;
  /** When true and no saved polygon, drawing mode starts on mount. */
  autoStartDrawing?: boolean;
  onLocationCommitted?: (payload: { points: LatLngPoint[]; kind: 'center' | 'polygon' }) => void;
};

export function DmrvAoiMapPanel({
  latitude,
  longitude,
  savedPoints,
  onSavedPointsChange,
  onApplyToProject,
  onClearProject,
  drawTrigger = 0,
  uploadTrigger = 0,
  autoStartDrawing = false,
  onLocationCommitted,
}: DmrvAoiMapPanelProps): React.ReactElement {
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [drawingPolygon, setDrawingPolygon] = useState(false);
  const [draftPoints, setDraftPoints] = useState<LatLngPoint[]>([]);
  const [mapNotice, setMapNotice] = useState<string | null>(null);
  const [tileError, setTileError] = useState(false);

  const mapCenter = useMemo(() => {
    const latN = Number(latitude.trim());
    const lngN = Number(longitude.trim());
    if (Number.isFinite(latN) && Number.isFinite(lngN)) return { lat: latN, lng: lngN };
    const c = computePolygonCentroid(savedPoints);
    if (c) return c;
    return DEFAULT_CENTER;
  }, [latitude, longitude, savedPoints]);

  const mapZoom = savedPoints.length >= 3 ? 12 : 8;

  const savedRing = useMemo(
    (): PolygonRing | null => (savedPoints.length >= 3 ? polygonRingFromPoints(savedPoints) : null),
    [savedPoints],
  );
  const draftRing = useMemo(
    (): PolygonRing | null => (draftPoints.length >= 2 ? polygonRingFromPoints(draftPoints) : null),
    [draftPoints],
  );

  const areaKm2 = useMemo(() => computePolygonAreaKm2(savedPoints), [savedPoints]);
  const centroid = useMemo(() => computePolygonCentroid(savedPoints), [savedPoints]);

  useEffect(() => {
    if (drawTrigger > 0) {
      setDrawingPolygon(true);
      setDraftPoints([]);
      setMapNotice('Click the map to place boundary points. Use Finish polygon when done.');
    }
  }, [drawTrigger]);

  useEffect(() => {
    if (uploadTrigger > 0) fileInputRef.current?.click();
  }, [uploadTrigger]);

  useEffect(() => {
    if (!autoStartDrawing || savedPoints.length >= 3) return;
    setDrawingPolygon(true);
    setMapNotice('Drawing mode is on — click the map to outline your project AOI, then Finish polygon.');
  }, [autoStartDrawing, savedPoints.length]);

  const finishPolygon = useCallback(() => {
    if (draftPoints.length < 3) {
      setMapNotice('Add at least 3 points before finishing the polygon.');
      return;
    }
    onSavedPointsChange(draftPoints);
    onApplyToProject(draftPoints);
    onLocationCommitted?.({ points: draftPoints, kind: 'polygon' });
    setDrawingPolygon(false);
    setMapNotice('AOI polygon saved to project location fields.');
  }, [draftPoints, onApplyToProject, onLocationCommitted, onSavedPointsChange]);

  const clearAoi = useCallback(() => {
    setDraftPoints([]);
    onSavedPointsChange([]);
    onClearProject?.();
    setDrawingPolygon(false);
    setMapNotice('AOI cleared from map.');
  }, [onClearProject, onSavedPointsChange]);

  const useGps = useCallback(() => {
    if (!navigator.geolocation) {
      setMapNotice('GPS is not available in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onApplyToProject([point]);
        onLocationCommitted?.({ points: [point], kind: 'center' });
        setMapNotice('Map centered on your GPS location.');
      },
      () => setMapNotice('Could not read GPS — check location permissions.'),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }, [onApplyToProject, onLocationCommitted]);

  const handleGeoJsonFile = useCallback(
    (file: File | null) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? '');
        try {
          const geo = JSON.parse(text) as {
            type?: string;
            features?: Array<{ geometry?: { type?: string; coordinates?: unknown } }>;
            geometry?: { type?: string; coordinates?: unknown };
            coordinates?: unknown;
          };
          let ring: number[][] | null = null;
          if (geo.type === 'FeatureCollection' && geo.features?.[0]?.geometry) {
            const g = geo.features[0].geometry;
            if (g.type === 'Polygon' && Array.isArray(g.coordinates)) {
              const polyCoords = g.coordinates as unknown[];
              if (Array.isArray(polyCoords[0])) {
                ring = polyCoords[0] as number[][];
              }
            }
          } else if (geo.type === 'Feature' && geo.geometry?.type === 'Polygon') {
            const featureCoords = geo.geometry.coordinates;
            if (Array.isArray(featureCoords) && Array.isArray(featureCoords[0])) {
              ring = featureCoords[0] as number[][];
            }
          } else if (geo.type === 'Polygon' && Array.isArray(geo.coordinates)) {
            ring = geo.coordinates[0] as number[][];
          }
          if (!ring || ring.length < 3) {
            const manual = parseManualPolygonJson(text);
            if (manual.error || manual.points.length < 3) {
              setMapNotice(manual.error ?? 'GeoJSON must contain a Polygon with at least 3 vertices.');
              return;
            }
            onSavedPointsChange(manual.points);
            onApplyToProject(manual.points);
            onLocationCommitted?.({ points: manual.points, kind: 'polygon' });
            setMapNotice('Polygon imported from coordinate list.');
            return;
          }
          const points: LatLngPoint[] = ring
            .map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) }))
            .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
          if (points.length < 3) {
            setMapNotice('GeoJSON polygon did not contain enough valid coordinates.');
            return;
          }
          const deduped =
            points.length > 1 &&
            points[0].lat === points[points.length - 1].lat &&
            points[0].lng === points[points.length - 1].lng
              ? points.slice(0, -1)
              : points;
          onSavedPointsChange(deduped);
          onApplyToProject(deduped);
          onLocationCommitted?.({ points: deduped, kind: 'polygon' });
          setMapNotice(`Imported polygon (${deduped.length} vertices) from GeoJSON.`);
        } catch {
          setMapNotice('Could not parse GeoJSON file.');
        }
      };
      reader.readAsText(file);
    },
    [onApplyToProject, onSavedPointsChange],
  );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <div>
          <h3 className="text-sm font-bold text-[#1e3a5f]">Project location map</h3>
          <p className="text-[11px] text-slate-600">
            Colored satellite imagery · click the map to set center · Draw polygon for AOI boundary
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={useGps}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-slate-50"
          >
            <Crosshair className="h-3.5 w-3.5" />
            Use GPS
          </button>
          <button
            type="button"
            onClick={() => {
              setDrawingPolygon(true);
              setDraftPoints([]);
              setMapNotice('Drawing mode — click the map to add vertices.');
            }}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
              drawingPolygon
                ? 'bg-[#1e3a5f] text-white'
                : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Layout className="h-3.5 w-3.5" />
            Draw polygon
          </button>
          <button
            type="button"
            disabled={draftPoints.length < 3}
            onClick={finishPolygon}
            className="rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-[11px] font-bold text-sky-900 hover:bg-sky-100 disabled:opacity-40"
          >
            Finish polygon
          </button>
          <button
            type="button"
            onClick={clearAoi}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-slate-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      </div>

      {tileError ? (
        <p className="border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-950">
          Satellite tiles are slow or blocked — try refreshing. You can still draw the AOI boundary.
        </p>
      ) : null}

      {drawingPolygon ? (
        <p className="border-b border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-medium text-sky-950">
          Drawing mode active — {draftPoints.length} point{draftPoints.length === 1 ? '' : 's'} placed. Add at least 3,
          then Finish polygon.
        </p>
      ) : null}

      <div ref={mapHostRef} className="relative w-full bg-slate-200">
        <div
          className="h-[min(52vh,420px)] min-h-[320px] w-full sm:min-h-[360px]"
          style={{ minHeight: 320 }}
        >
          <MapContainer
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={mapZoom}
            scrollWheelZoom
            zoomControl={false}
            className="z-0 h-full w-full"
            style={{ height: '100%', width: '100%', minHeight: 320 }}
          >
            <TileLayer
              url={ESRI_IMAGERY}
              attribution="Tiles &copy; Esri"
              maxZoom={20}
              eventHandlers={{ tileerror: () => setTileError(true) }}
            />
            <TileLayer url={ESRI_LABELS} maxZoom={20} />
            {savedRing ? (
              <Polygon
                positions={savedRing}
                pathOptions={{
                  color: '#047857',
                  weight: 3,
                  fillColor: '#10b981',
                  fillOpacity: 0.28,
                }}
              />
            ) : null}
            {draftRing && drawingPolygon ? (
              <Polygon
                positions={draftRing}
                pathOptions={{
                  color: '#0369a1',
                  weight: 2,
                  dashArray: '6 4',
                  fillColor: '#0ea5e9',
                  fillOpacity: 0.2,
                }}
              />
            ) : null}
            {!savedRing ? (
              <CircleMarker
                center={[mapCenter.lat, mapCenter.lng]}
                radius={9}
                pathOptions={{
                  color: '#b45309',
                  weight: 2,
                  fillColor: '#fbbf24',
                  fillOpacity: 0.95,
                }}
              />
            ) : null}
            <MapClickDrawer
              drawingPolygon={drawingPolygon}
              onAddPoint={(p) => setDraftPoints((prev) => [...prev, p])}
              onPickCenter={(p) => {
                onApplyToProject([p]);
                onLocationCommitted?.({ points: [p], kind: 'center' });
                setMapNotice('Project center updated from map click.');
              }}
            />
            <MapViewSync center={mapCenter} zoom={mapZoom} />
            <LeafletMapSizeFixer />
            <LeafletZoomScale />
          </MapContainer>
        </div>
      </div>

      <div className="grid gap-2 border-t border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700 sm:grid-cols-4">
        <div>
          <span className="text-slate-500">Center</span>
          <p className="font-mono font-semibold text-slate-900">
            {centroid ? `${centroid.lat.toFixed(5)}, ${centroid.lng.toFixed(5)}` : '—'}
          </p>
        </div>
        <div>
          <span className="text-slate-500">Vertices</span>
          <p className="font-semibold text-slate-900">{savedPoints.length || '—'}</p>
        </div>
        <div>
          <span className="text-slate-500">Area (approx.)</span>
          <p className="font-semibold text-slate-900">
            {areaKm2 > 0 ? `~${areaKm2.toFixed(2)} km²` : '—'}
          </p>
        </div>
        <div>
          <span className="text-slate-500">AOI status</span>
          <p className="font-semibold text-emerald-800">
            {savedPoints.length >= 3 ? 'Polygon saved' : 'Draw or upload'}
          </p>
        </div>
      </div>

      {mapNotice ? (
        <p className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-700">{mapNotice}</p>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept=".geojson,.json,application/geo+json,application/json"
        className="hidden"
        onChange={(e) => {
          handleGeoJsonFile(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />
    </div>
  );
}
