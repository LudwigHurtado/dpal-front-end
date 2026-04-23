import React, { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import QRCode from 'qrcode';
import { CircleMarker, MapContainer, Marker, Polygon, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AiError, isAiEnabled, runGeminiPrompt } from '../services/geminiService';
import {
  AlertTriangle, CheckCircle, Cpu, Database, FileText, Globe, Map, MapPin,
  Plus, QrCode, RefreshCw, Search, ShieldCheck, Sparkles, Target, Upload,
} from './icons';

type BiomassMode = 'linear_ndvi' | 'exponential_ndvi' | 'hybrid' | 'manual_agb';
type BaselineMode = 'manual' | 'historical_flat' | 'percent_growth';
type DeductionMode = 'percent' | 'absolute';
type ProjectType = 'reforestation' | 'avoided_deforestation' | 'agroforestry' | 'restoration';
type EcosystemType = 'amazon_forest' | 'dry_forest' | 'agroforestry_zone' | 'grassland' | 'wetland';
type DataLayer = 'ndvi' | 'canopy' | 'disturbance' | 'terrain';
type LatLngTuple = [number, number];
type BoundaryPoint = { lat: number; lng: number };

interface DpalCarbonViuCalculatorProps {
  onLaunchMission?: () => void;
  onRunMrv?: () => void;
  onPreparePackage?: () => void;
}

interface PlacePreset {
  label: string;
  lat: number;
  lng: number;
  country: string;
  region: string;
  ecosystem: EcosystemType;
  siteName?: string;
  hectares?: number;
  projectName?: string;
  projectCode?: string;
  projectType?: ProjectType;
  communityPartner?: string;
  landControlBasis?: string;
  interventionType?: string;
  projectSummary?: string;
  boundaryName?: string;
  boundaryEvidence?: string;
  aoiId?: string;
}

const defaultCoefficients: Record<EcosystemType, { a: number; b: number; c: number; d: number; e: number }> = {
  amazon_forest: { a: 8, b: 90, c: 1.8, d: 0.35, e: 1 },
  dry_forest: { a: 5, b: 70, c: 1.3, d: 0.25, e: 0.8 },
  agroforestry_zone: { a: 4, b: 62, c: 1.2, d: 0.22, e: 0.7 },
  grassland: { a: 1.2, b: 16, c: 0.35, d: 0.08, e: 0.3 },
  wetland: { a: 3.5, b: 44, c: 0.8, d: 0.18, e: 0.6 },
};

const riskBufferBands = [
  { label: 'Low', min: 0, max: 30, bufferPct: 5 },
  { label: 'Moderate', min: 31, max: 60, bufferPct: 12 },
  { label: 'High', min: 61, max: 80, bufferPct: 20 },
  { label: 'Very High', min: 81, max: 100, bufferPct: 30 },
];

const projectTypeLabels: Record<ProjectType, string> = {
  reforestation: 'Reforestation',
  avoided_deforestation: 'Avoided Deforestation',
  agroforestry: 'Agroforestry',
  restoration: 'Land Restoration',
};

const ecosystemLabels: Record<EcosystemType, string> = {
  amazon_forest: 'Amazon Forest',
  dry_forest: 'Dry Forest',
  agroforestry_zone: 'Agroforestry Zone',
  grassland: 'Grassland',
  wetland: 'Wetland',
};

const defaultBoundaryOffsets = [
  { latOffset: 0.052, lngOffset: -0.034 },
  { latOffset: 0.066, lngOffset: -0.009 },
  { latOffset: 0.041, lngOffset: 0.043 },
  { latOffset: -0.029, lngOffset: 0.038 },
  { latOffset: -0.054, lngOffset: -0.014 },
  { latOffset: -0.012, lngOffset: -0.04 },
];

function createDefaultBoundary(center: BoundaryPoint): BoundaryPoint[] {
  return defaultBoundaryOffsets.map((point) => ({
    lat: round(center.lat + point.latOffset, 6),
    lng: round(center.lng + point.lngOffset, 6),
  }));
}

const placePresets: PlacePreset[] = [
  {
    label: 'Bolivia Amazon AOI',
    lat: -11.2331,
    lng: -67.8894,
    country: 'Bolivia',
    region: 'Pando / Northern Amazon',
    ecosystem: 'amazon_forest' as EcosystemType,
    siteName: 'Parcel A',
    hectares: 100,
    projectName: 'Bolivia Amazon Pilot 001',
    projectCode: 'DPAL-AMZ-001',
    projectType: 'reforestation',
    communityPartner: 'Regional community cooperative',
    landControlBasis: 'Community consent + partner agreement',
    interventionType: 'Native species reforestation and restoration',
    projectSummary: 'Restore degraded land through community planting, maintenance, monitoring, and long-term protection with DPAL evidence capture and verification-ready records.',
    boundaryName: 'Pilot Polygon A',
    boundaryEvidence: 'GPS walkthrough, field photos, land sketch, local approval note',
    aoiId: 'AOI-DPAL-AMZ-001-A',
  },
  {
    label: 'Santa Cruz Dry Forest',
    lat: -16.3618,
    lng: -60.9601,
    country: 'Bolivia',
    region: 'Santa Cruz / Chiquitano',
    ecosystem: 'dry_forest' as EcosystemType,
    siteName: 'Chiquitano Parcel B',
    hectares: 82.4,
    projectName: 'Santa Cruz Dry Forest Recovery',
    projectCode: 'DPAL-SCF-002',
    projectType: 'restoration',
    communityPartner: 'Chiquitano stewardship council',
    landControlBasis: 'Community stewardship agreement',
    interventionType: 'Dry forest restoration and fire recovery planting',
    projectSummary: 'Restore dry forest structure, reduce disturbance pressure, and monitor recovery through AOI-linked evidence and verification-ready MRV.',
    boundaryName: 'Dry Forest Block B',
    boundaryEvidence: 'Community walkover, parcel sketch, and restoration boundary notes',
    aoiId: 'AOI-DPAL-SCF-002-B',
  },
  {
    label: 'Antioquia Agroforestry',
    lat: 5.6012,
    lng: -75.8194,
    country: 'Colombia',
    region: 'Antioquia / Jardin',
    ecosystem: 'agroforestry_zone' as EcosystemType,
    siteName: 'Agroforestry Parcel C',
    hectares: 46.2,
    projectName: 'Antioquia Agroforestry Transition',
    projectCode: 'DPAL-ANT-003',
    projectType: 'agroforestry',
    communityPartner: 'Regional coffee cooperative',
    landControlBasis: 'Farmer enrollment and parcel agreements',
    interventionType: 'Agroforestry transition with shade cover improvement',
    projectSummary: 'Convert production land into an agroforestry system with higher canopy cover, stronger biodiversity value, and auditable field evidence.',
    boundaryName: 'Agroforestry Parcel C',
    boundaryEvidence: 'Farm parcel map, photo transects, and enrollment records',
    aoiId: 'AOI-DPAL-ANT-003-C',
  },
  {
    label: 'Patagonia Wetland',
    lat: -43.512,
    lng: -65.812,
    country: 'Argentina',
    region: 'Patagonia wetland corridor',
    ecosystem: 'wetland' as EcosystemType,
    siteName: 'Wetland Parcel D',
    hectares: 128.5,
    projectName: 'Patagonia Wetland Corridor Pilot',
    projectCode: 'DPAL-PWC-004',
    projectType: 'restoration',
    communityPartner: 'Wetland conservation network',
    landControlBasis: 'Conservation easement and partner stewardship agreement',
    interventionType: 'Wetland restoration and hydrology protection',
    projectSummary: 'Protect and restore wetland function through mapped hydrology zones, field verification, and AOI-linked monitoring records.',
    boundaryName: 'Wetland Corridor D',
    boundaryEvidence: 'Hydrology survey, field imagery, and stewardship notes',
    aoiId: 'AOI-DPAL-PWC-004-D',
  },
  {
    label: 'Washoe County 160 Acres',
    lat: 40.9871,
    lng: -119.892812,
    country: 'United States',
    region: 'Washoe County, Nevada',
    ecosystem: 'grassland' as EcosystemType,
    siteName: 'Parcel 040-060-030 A',
    hectares: 64.75,
    projectName: 'Washoe County Rangeland Pilot',
    projectCode: 'DPAL-WCN-005',
    projectType: 'restoration',
    communityPartner: 'Washoe land stewardship group',
    landControlBasis: 'Parcel control and local stewardship agreement',
    interventionType: 'Rangeland restoration and disturbance reduction',
    projectSummary: 'Restore degraded rangeland through boundary-linked monitoring, vegetation recovery tracking, and evidence-backed AOI reporting.',
    boundaryName: 'Washoe Parcel A',
    boundaryEvidence: 'Parcel record, field check, and map reference notes',
    aoiId: 'AOI-DPAL-WCN-005-A',
  },
];

const aoiColorOptions = [
  { label: 'Emerald', value: '#10b981' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Rose', value: '#f43f5e' },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function safeNumber(value: string | number, fallback = 0) {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function polygonArea(coords: Array<{ x: number; y: number }>) {
  if (coords.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < coords.length; i += 1) {
    const next = coords[(i + 1) % coords.length];
    area += coords[i].x * next.y;
    area -= next.x * coords[i].y;
  }
  return Math.abs(area / 2);
}

function getPolygonCenter(points: BoundaryPoint[]): BoundaryPoint {
  if (points.length === 0) return { lat: 0, lng: 0 };
  const totals = points.reduce((acc, point) => ({
    lat: acc.lat + point.lat,
    lng: acc.lng + point.lng,
  }), { lat: 0, lng: 0 });
  return {
    lat: totals.lat / points.length,
    lng: totals.lng / points.length,
  };
}

function shiftPolygon(points: BoundaryPoint[], targetCenter: BoundaryPoint): BoundaryPoint[] {
  if (points.length === 0) return createDefaultBoundary(targetCenter);
  const currentCenter = getPolygonCenter(points);
  const latDelta = targetCenter.lat - currentCenter.lat;
  const lngDelta = targetCenter.lng - currentCenter.lng;
  return points.map((point) => ({
    lat: round(point.lat + latDelta, 6),
    lng: round(point.lng + lngDelta, 6),
  }));
}

function approximatePolygonAreaHectares(points: BoundaryPoint[]) {
  if (points.length < 3) return 0;
  const meanLatRadians = (points.reduce((sum, point) => sum + point.lat, 0) / points.length) * (Math.PI / 180);
  const metersPerLat = 111_320;
  const metersPerLng = 111_320 * Math.cos(meanLatRadians);
  const planar = points.map((point) => ({
    x: point.lng * metersPerLng,
    y: point.lat * metersPerLat,
  }));
  const squareMeters = polygonArea(planar);
  return squareMeters / 10_000;
}

function approximatePolygonPerimeterKm(points: BoundaryPoint[]) {
  if (points.length < 2) return 0;
  const meanLatRadians = (points.reduce((sum, point) => sum + point.lat, 0) / points.length) * (Math.PI / 180);
  const metersPerLat = 111_320;
  const metersPerLng = 111_320 * Math.cos(meanLatRadians);
  let totalMeters = 0;
  for (let i = 0; i < points.length; i += 1) {
    const next = points[(i + 1) % points.length];
    const dx = (next.lng - points[i].lng) * metersPerLng;
    const dy = (next.lat - points[i].lat) * metersPerLat;
    totalMeters += Math.sqrt(dx * dx + dy * dy);
  }
  return totalMeters / 1000;
}

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
}

function deterministicUnit(seed: number) {
  return (Math.sin(seed) + 1) / 2;
}

function formatCoordinate(value: number, axis: 'lat' | 'lng') {
  const suffix = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  return `${Math.abs(value).toFixed(5)}° ${suffix}`;
}

function disclosureTemplate(isCertified: boolean) {
  return isCertified
    ? 'This record may be represented as externally certified only where approved third-party validation, verification, and registry issuance are complete for this AOI and monitoring period.'
    : 'This AOI output is an internal DPAL Verified Impact Unit preview backed by map-linked evidence, AI reading context, and registry-ready calculations. It is not represented as a certified carbon offset unless externally validated, verified, and issued through an approved standard.';
}

function monthsBetweenDates(startValue: string, endValue: string) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 12;
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(1, months || 12);
}

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
  help?: string;
}> = ({ label, value, onChange, type = 'number', help }) => (
  <label className="block">
    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
    />
    {help ? <span className="mt-1 block text-xs text-slate-500">{help}</span> : null}
  </label>
);

const TextAreaField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  help?: string;
}> = ({ label, value, onChange, rows = 3, help }) => (
  <label className="block">
    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
    <textarea
      value={value}
      rows={rows}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
    />
    {help ? <span className="mt-1 block text-xs text-slate-500">{help}</span> : null}
  </label>
);

const SelectField = <T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) => (
  <label className="block">
    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </label>
);

const SwitchRow: React.FC<{ label: string; note: string; checked: boolean; onChange: (checked: boolean) => void }> = ({
  label,
  note,
  checked,
  onChange,
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="flex w-full items-center justify-between gap-4 rounded-lg border border-slate-700 bg-slate-950 p-3 text-left"
  >
    <span>
      <span className="block text-sm font-bold text-white">{label}</span>
      <span className="mt-1 block text-xs text-slate-500">{note}</span>
    </span>
    <span className={`flex h-6 w-11 items-center rounded-full p-1 transition ${checked ? 'bg-emerald-500' : 'bg-slate-700'}`}>
      <span className={`h-4 w-4 rounded-full bg-white transition ${checked ? 'translate-x-5' : ''}`} />
    </span>
  </button>
);

const Panel: React.FC<{ title: string; description?: string; children: React.ReactNode; className?: string }> = ({
  title,
  description,
  children,
  className = '',
}) => (
  <section className={`rounded-lg border border-slate-800 bg-slate-900/80 p-4 shadow-lg ${className}`}>
    <div className="mb-4">
      <h2 className="text-lg font-black text-white">{title}</h2>
      {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
    </div>
    {children}
  </section>
);

const SummaryRow: React.FC<{ label: string; value: string; help?: string }> = ({ label, value, help }) => (
  <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
    <div>
      <p className="text-sm font-bold text-slate-200">{label}</p>
      {help ? <p className="mt-1 text-xs text-slate-500">{help}</p> : null}
    </div>
    <div className="text-right text-sm font-black text-white">{value}</div>
  </div>
);

const ResultTile: React.FC<{ label: string; value: string; note: string; icon: React.ReactNode; tone?: string }> = ({
  label,
  value,
  note,
  icon,
  tone = 'text-emerald-300',
}) => (
  <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
    <div className={`flex items-center gap-2 text-sm font-bold ${tone}`}>{icon}{label}</div>
    <div className="mt-2 text-3xl font-black text-white">{value}</div>
    <div className="mt-1 text-xs text-slate-500">{note}</div>
  </div>
);

const QrCodeImage: React.FC<{ payload: object; size?: number }> = ({ payload, size = 144 }) => {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(JSON.stringify(payload), {
      width: size,
      margin: 1,
      color: { dark: '#22d3ee', light: '#020617' },
    })
      .then((nextUrl) => {
        if (!cancelled) setDataUrl(nextUrl);
      })
      .catch(() => {
        if (!cancelled) setDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [payload, size]);

  if (!dataUrl) {
    return <div style={{ width: size, height: size }} className="animate-pulse rounded-lg border border-slate-800 bg-slate-900" />;
  }

  return <img src={dataUrl} alt="AOI location QR code" style={{ width: size, height: size }} className="rounded-lg border border-slate-800 bg-slate-950 p-2" />;
};

const AoiMapEvents: React.FC<{ onPick: (point: { lat: number; lng: number }) => void }> = ({ onPick }) => {
  useMapEvents({
    click(event) {
      onPick({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });
  return null;
};

const AoiMapRecenter: React.FC<{ center: LatLngTuple }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
};

const AoiLeafletMap: React.FC<{
  center: LatLngTuple;
  polygon: LatLngTuple[];
  activeLayer: DataLayer;
  aoiColor: string;
  onPick: (point: { lat: number; lng: number }) => void;
  onVertexDrag: (index: number, point: { lat: number; lng: number }) => void;
  label: string;
}> = ({ center, polygon, activeLayer, aoiColor, onPick, onVertexDrag, label }) => (
  <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
    <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: '430px', width: '100%' }}>
      <AoiMapRecenter center={center} />
      <AoiMapEvents onPick={onPick} />
      {activeLayer === 'terrain' ? (
        <TileLayer
          attribution="Tiles &copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
        />
      ) : (
        <TileLayer
          attribution="Tiles &copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
      )}
      {activeLayer !== 'terrain' ? (
        <TileLayer
          attribution="Labels &copy; Esri"
          url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          opacity={0.82}
        />
      ) : null}
      <Polygon
        positions={polygon}
        smoothFactor={1.4}
        pathOptions={{
          color: aoiColor,
          fillColor: activeLayer === 'disturbance' ? '#f59e0b' : activeLayer === 'canopy' ? '#06b6d4' : aoiColor,
          fillOpacity: activeLayer === 'terrain' ? 0.2 : 0.34,
          weight: 3,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      >
        <Popup>
          <strong>{label}</strong>
          <br />
          AOI polygon linked to this calculation.
        </Popup>
      </Polygon>
      {polygon.map((point, index) => (
        <Marker
          key={`${point[0]}-${point[1]}-${index}`}
          position={point}
          draggable
          icon={L.divIcon({
            className: '',
            html: `<div style="width:16px;height:16px;border-radius:9999px;background:${aoiColor};border:2px solid #ffffff;box-shadow:0 0 0 2px rgba(15,23,42,0.65);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          })}
          eventHandlers={{
            dragend(event) {
              const marker = event.target;
              const nextPoint = marker.getLatLng();
              onVertexDrag(index, {
                lat: Number(nextPoint.lat.toFixed(6)),
                lng: Number(nextPoint.lng.toFixed(6)),
              });
            },
          }}
        >
          <Popup>
            Vertex {index + 1}
            <br />
            Drag to reshape AOI
          </Popup>
        </Marker>
      ))}
      <CircleMarker
        center={center}
        radius={8}
        pathOptions={{ color: '#ffffff', fillColor: '#38bdf8', fillOpacity: 0.95, weight: 2 }}
      >
        <Popup>
          AOI center
          <br />
          {center[0].toFixed(6)}, {center[1].toFixed(6)}
        </Popup>
      </CircleMarker>
    </MapContainer>
  </div>
);

const InstructorHelper: React.FC<{
  title: string;
  context: string;
  suggestedQuestions: string[];
  backTests: string[];
  reportContext: string;
}> = ({ title, context, suggestedQuestions, backTests, reportContext }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [understood, setUnderstood] = useState<'yes' | 'no' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [helperMode, setHelperMode] = useState<'google-ai' | 'guided-fallback'>(() => (isAiEnabled() ? 'google-ai' : 'guided-fallback'));
  const [errorNote, setErrorNote] = useState('');

  const buildFallbackResponse = (prompt: string) => {
    const normalized = prompt.toLowerCase();
    let response = `${context} This section is part of the same AOI-linked report, so changes here affect the calculation, the disclosure, and the registry package.`;

    if (normalized.includes('why')) {
      response = `${context} We calculate this because DPAL needs every output to be traceable: project purpose, mapped AOI, monitoring dates, evidence quality, and calculation method all have to support the final VIU number.`;
    } else if (normalized.includes('number') || normalized.includes('result') || normalized.includes('viu')) {
      response = `${context} The number is produced by estimating project CO2e gain, subtracting baseline CO2e, then applying leakage, uncertainty, buffer, and other adjustments. The final floor value becomes indicative VIUs.`;
    } else if (normalized.includes('verify') || normalized.includes('test') || normalized.includes('back')) {
      response = `${context} Suggested back-tests: ${backTests.join(' ')} These checks help prove the reading is not just a nice-looking estimate.`;
    } else if (normalized.includes('coordinate') || normalized.includes('map') || normalized.includes('aoi') || normalized.includes('location')) {
      response = `${context} The AOI coordinates and polygon bind the report to a real place. If the AOI changes, the hectares, imagery window, AI scan context, and registry payload should be reviewed before trusting the output.`;
    } else if (normalized.includes('risk') || normalized.includes('buffer')) {
      response = `${context} Risk and buffer logic protects against over-issuance. Higher fire, land-use, governance, duplicate-claim, or weak-evidence risk should reduce or pause issuance.`;
    } else if (normalized.includes('what is aoi') || normalized.includes('what is aoI') || normalized.includes('what is the aoi') || normalized.includes('what is aoi?') || normalized.includes('aoi meaning')) {
      response = `${context} AOI means Area of Interest. In this calculator it is the exact mapped parcel or monitoring zone the report belongs to, including the center coordinates, polygon boundary, imagery dates, and linked evidence.`;
    } else if (normalized.includes('what is')) {
      response = `${context} In this section, the best way to read "${prompt}" is to explain the term in relation to the AOI-linked report, then connect it to what changes in the calculation and how to verify it with the back-tests shown below.`;
    }

    return response;
  };

  const explainQuestion = async (prompt: string) => {
    const trimmedPrompt = prompt.trim() || suggestedQuestions[0];
    setQuestion(trimmedPrompt);
    setUnderstood(null);
    setErrorNote('');

    if (!isAiEnabled()) {
      setHelperMode('guided-fallback');
      setAnswer(buildFallbackResponse(trimmedPrompt));
      return;
    }

    setIsLoading(true);
    try {
      const response = await runGeminiPrompt(`
You are an AI instructor embedded inside the DPAL AFOLU carbon calculator.
Answer the user's question about the specific section they are viewing.

Section title: ${title}
Section context: ${context}
Whole report context: ${reportContext}
Suggested back-tests: ${backTests.join(' ')}
User question: ${trimmedPrompt}

Instructions:
- Be directly responsive to the user's exact question.
- If they ask what a term means, define it plainly first.
- Keep the answer grounded in this section and this report.
- Explain why it matters to the calculation or registry result.
- End with 2 short suggested follow-up questions labeled "Suggested questions:".
- Keep the answer under 170 words.
- Do not invent external facts not implied by the report context.
      `);
      setHelperMode('google-ai');
      setAnswer(response.trim() || buildFallbackResponse(trimmedPrompt));
    } catch (error) {
      const message = error instanceof AiError ? error.message : 'Google AI helper unavailable right now.';
      setHelperMode('guided-fallback');
      setErrorNote(message);
      setAnswer(buildFallbackResponse(trimmedPrompt));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-cyan-400/20 bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-2 text-cyan-200 shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-white">AI Instructor: {title}</p>
            <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${helperMode === 'google-ai' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/15 text-amber-200'}`}>
              {helperMode === 'google-ai' ? 'Google AI Live' : 'Guided Fallback'}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-300">{context}</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Ask about definitions, why a number changed, how the section affects VIUs, or how to verify the reading.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {suggestedQuestions.map((item) => (
          <button
            key={item}
            onClick={() => { void explainQuestion(item); }}
            className="rounded-lg border border-cyan-400/20 bg-slate-950 px-3 py-2 text-left text-xs font-bold text-cyan-100 hover:border-cyan-300"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask what AOI means, why this number changed, or how to verify this section..."
          className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
        />
        <button
          onClick={() => { void explainQuestion(question || suggestedQuestions[0]); }}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-black text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
        >
          {isLoading ? 'Thinking...' : 'Explain'}
        </button>
      </div>

      {errorNote ? (
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100">
          Google AI was unavailable for this reply, so the helper used a guided local explanation instead.
        </div>
      ) : null}

      {answer ? (
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/90 p-4">
          <p className="text-sm leading-6 text-slate-300">{answer}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Do you understand this section?</span>
            <button onClick={() => setUnderstood('yes')} className="rounded-md border border-emerald-500/30 px-2 py-1 text-xs font-bold text-emerald-200">Yes</button>
            <button onClick={() => setUnderstood('no')} className="rounded-md border border-amber-500/30 px-2 py-1 text-xs font-bold text-amber-200">Not yet</button>
          </div>
          {understood === 'yes' ? <p className="mt-2 text-xs text-emerald-300">Good. Next, check whether the back-tests support the same conclusion.</p> : null}
          {understood === 'no' ? <p className="mt-2 text-xs text-amber-300">Try one of the suggested questions or ask what part of the number feels unclear.</p> : null}
        </div>
      ) : null}

      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/90 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">Suggested back-tests</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-400">
          {backTests.map((test) => <li key={test}>{test}</li>)}
        </ul>
      </div>
    </div>
  );
};

const DpalCarbonViuCalculator: React.FC<DpalCarbonViuCalculatorProps> = ({
  onLaunchMission,
  onRunMrv,
  onPreparePackage,
}) => {
  const [projectName, setProjectName] = useState('Bolivia Amazon Pilot 001');
  const [projectCode, setProjectCode] = useState('DPAL-AMZ-001');
  const [projectType, setProjectType] = useState<ProjectType>('reforestation');
  const [ecosystem, setEcosystem] = useState<EcosystemType>('amazon_forest');
  const [country, setCountry] = useState('Bolivia');
  const [region, setRegion] = useState('Pando / Northern Amazon');
  const [communityPartner, setCommunityPartner] = useState('Regional community cooperative');
  const [landControlBasis, setLandControlBasis] = useState('Community consent + partner agreement');
  const [interventionType, setInterventionType] = useState('Native species reforestation and restoration');
  const [projectSummary, setProjectSummary] = useState('Restore degraded land through community planting, maintenance, monitoring, and long-term protection with DPAL evidence capture and verification-ready records.');
  const [hectares, setHectares] = useState('100');
  const [biomassMode, setBiomassMode] = useState<BiomassMode>('hybrid');
  const [baselineMode, setBaselineMode] = useState<BaselineMode>('percent_growth');
  const [deductionMode, setDeductionMode] = useState<DeductionMode>('percent');
  const [boundaryName, setBoundaryName] = useState('Pilot Polygon A');
  const [mapSource, setMapSource] = useState('Satellite + community draw');
  const [boundaryEvidence, setBoundaryEvidence] = useState('GPS walkthrough, field photos, land sketch, local approval note');
  const [boundaryPoints, setBoundaryPoints] = useState<BoundaryPoint[]>(() => createDefaultBoundary({ lat: -11.2331, lng: -67.8894 }));
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [siteName, setSiteName] = useState('Parcel A');
  const [aoiId, setAoiId] = useState('AOI-DPAL-AMZ-001-A');
  const [latitude, setLatitude] = useState('-11.2331');
  const [longitude, setLongitude] = useState('-67.8894');
  const [mapViewportCenter, setMapViewportCenter] = useState<LatLngTuple>([-11.2331, -67.8894]);
  const [placeSearch, setPlaceSearch] = useState('Bolivia Amazon AOI');
  const [imageryStartDate, setImageryStartDate] = useState('2025-01-01');
  const [imageryEndDate, setImageryEndDate] = useState('2026-01-01');
  const [dataSourceStack, setDataSourceStack] = useState('Sentinel-2 NDVI + canopy height + field correction + verifier package');
  const [aiModelVersion, setAiModelVersion] = useState('DPAL-AOI-MRV-v0.3');
  const [lastAiScanAt, setLastAiScanAt] = useState('2026-04-23 09:15');
  const [lastHumanVerifiedAt, setLastHumanVerifiedAt] = useState('2026-04-20 14:30');
  const [activeMapLayer, setActiveMapLayer] = useState<DataLayer>('ndvi');
  const [aoiColor, setAoiColor] = useState('#10b981');
  const [ndviStart, setNdviStart] = useState('0.42');
  const [ndviEnd, setNdviEnd] = useState('0.56');
  const [canopyHeightStart, setCanopyHeightStart] = useState('8');
  const [canopyHeightEnd, setCanopyHeightEnd] = useState('11');
  const [canopyCoverStart, setCanopyCoverStart] = useState('38');
  const [canopyCoverEnd, setCanopyCoverEnd] = useState('52');
  const [fieldCorrectionStart, setFieldCorrectionStart] = useState('0');
  const [fieldCorrectionEnd, setFieldCorrectionEnd] = useState('1.2');
  const [manualAgbStart, setManualAgbStart] = useState('40');
  const [manualAgbEnd, setManualAgbEnd] = useState('55');
  const [carbonFraction, setCarbonFraction] = useState('0.47');
  const [manualBaselineStart, setManualBaselineStart] = useState('38');
  const [manualBaselineEnd, setManualBaselineEnd] = useState('41');
  const [baselineAnnualPct, setBaselineAnnualPct] = useState('3.5');
  const [historicalBaselineDelta, setHistoricalBaselineDelta] = useState('1.5');
  const [leakagePct, setLeakagePct] = useState('5');
  const [uncertaintyPct, setUncertaintyPct] = useState('10');
  const [otherAdjustmentPct, setOtherAdjustmentPct] = useState('0');
  const [leakageAbs, setLeakageAbs] = useState('0');
  const [uncertaintyAbs, setUncertaintyAbs] = useState('0');
  const [bufferAbs, setBufferAbs] = useState('0');
  const [otherAdjustmentAbs, setOtherAdjustmentAbs] = useState('0');
  const [bufferPctManual, setBufferPctManual] = useState('12');
  const [autoRiskBuffer, setAutoRiskBuffer] = useState(true);
  const [fireRisk, setFireRisk] = useState('30');
  const [landUsePressure, setLandUsePressure] = useState('40');
  const [governanceRisk, setGovernanceRisk] = useState('20');
  const [reversalRiskNotes, setReversalRiskNotes] = useState('Seasonal fire exposure moderate; community agreements strong.');
  const [evidenceCount, setEvidenceCount] = useState('42');
  const [groundVerifierCount, setGroundVerifierCount] = useState('3');
  const [photoConfidence, setPhotoConfidence] = useState('88');
  const [droneCoveragePct, setDroneCoveragePct] = useState('20');
  const [duplicateRiskFlag, setDuplicateRiskFlag] = useState(false);
  const [externalCertification, setExternalCertification] = useState(false);
  const [savedAoiAt, setSavedAoiAt] = useState('Not saved yet');
  const [customA, setCustomA] = useState('');
  const [customB, setCustomB] = useState('');
  const [customC, setCustomC] = useState('');
  const [customD, setCustomD] = useState('');
  const [customE, setCustomE] = useState('');

  const coeffBase = defaultCoefficients[ecosystem];
  const coeff = {
    a: customA === '' ? coeffBase.a : safeNumber(customA, coeffBase.a),
    b: customB === '' ? coeffBase.b : safeNumber(customB, coeffBase.b),
    c: customC === '' ? coeffBase.c : safeNumber(customC, coeffBase.c),
    d: customD === '' ? coeffBase.d : safeNumber(customD, coeffBase.d),
    e: customE === '' ? coeffBase.e : safeNumber(customE, coeffBase.e),
  };

  const hectaresNum = Math.max(0, safeNumber(hectares, 0));
  const monthsNum = useMemo(() => monthsBetweenDates(imageryStartDate, imageryEndDate), [imageryEndDate, imageryStartDate]);
  const carbonFractionNum = clamp(safeNumber(carbonFraction, 0.47), 0, 1);
  const ndviStartNum = clamp(safeNumber(ndviStart, 0), -1, 1);
  const ndviEndNum = clamp(safeNumber(ndviEnd, 0), -1, 1);
  const latitudeNum = clamp(safeNumber(latitude, -11.2331), -90, 90);
  const longitudeNum = clamp(safeNumber(longitude, -67.8894), -180, 180);
  const coordinateWarning = safeNumber(latitude, latitudeNum) !== latitudeNum || safeNumber(longitude, longitudeNum) !== longitudeNum
    ? 'Entered coordinates were outside valid GPS ranges and are being clamped for map display.'
    : '';
  const polygonCenter = useMemo(() => getPolygonCenter(boundaryPoints), [boundaryPoints]);
  const boundaryAreaUnits = useMemo(() => approximatePolygonAreaHectares(boundaryPoints), [boundaryPoints]);
  const hectaresFromBoundary = round(boundaryAreaUnits, 2);
  const boundaryPerimeter = useMemo(() => round(approximatePolygonPerimeterKm(boundaryPoints), 2), [boundaryPoints]);
  const mapCenter = mapViewportCenter;
  const aoiPolygonLatLngs = useMemo<LatLngTuple[]>(() => (
    boundaryPoints.map((point) => [point.lat, point.lng])
  ), [boundaryPoints]);
  const boundaryPreviewPoints = useMemo(() => {
    if (boundaryPoints.length === 0) return [];
    const minLat = Math.min(...boundaryPoints.map((point) => point.lat));
    const maxLat = Math.max(...boundaryPoints.map((point) => point.lat));
    const minLng = Math.min(...boundaryPoints.map((point) => point.lng));
    const maxLng = Math.max(...boundaryPoints.map((point) => point.lng));
    const latSpan = Math.max(maxLat - minLat, 0.0001);
    const lngSpan = Math.max(maxLng - minLng, 0.0001);
    return boundaryPoints.map((point) => ({
      x: round(30 + ((point.lng - minLng) / lngSpan) * 240, 1),
      y: round(25 + ((maxLat - point.lat) / latSpan) * 190, 1),
    }));
  }, [boundaryPoints]);
  const boundaryPolygon = boundaryPreviewPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const hasMappedAoi = Number.isFinite(latitudeNum) && Number.isFinite(longitudeNum) && boundaryPoints.length >= 3 && hectaresNum > 0;
  const mapLayerClass = activeMapLayer === 'ndvi'
    ? 'from-emerald-950 via-lime-950 to-slate-950'
    : activeMapLayer === 'canopy'
      ? 'from-cyan-950 via-slate-900 to-slate-950'
      : activeMapLayer === 'disturbance'
        ? 'from-amber-950 via-slate-900 to-stone-950'
        : 'from-stone-950 via-slate-900 to-slate-950';
  const layerLabel = {
    ndvi: 'NDVI trend',
    canopy: 'Canopy structure',
    disturbance: 'Disturbance scan',
    terrain: 'Terrain context',
  }[activeMapLayer];
  const liveReading = useMemo(() => {
    const seed = latitudeNum * 127.1 + longitudeNum * 311.7 + hectaresNum * 0.17 + imageryEndDate.length;
    const ndviTrend = round((deterministicUnit(seed) - 0.38) * 0.26, 3);
    const canopySignal = round(42 + deterministicUnit(seed + 8.4) * 38, 1);
    const disturbanceRisk = round(deterministicUnit(seed + 15.2) * 100, 1);
    const restorationSignal = round(clamp(55 + ndviTrend * 140 + deterministicUnit(seed + 2.8) * 18, 0, 100), 1);
    const evidenceLift = clamp(safeNumber(evidenceCount, 0), 0, 100) * 0.04 + clamp(safeNumber(photoConfidence, 0), 0, 100) * 0.04;
    const confidence = round(clamp(62 + deterministicUnit(seed + 4.6) * 24 + evidenceLift, 0, 100), 1);
    const anomalyFlags = [
      disturbanceRisk > 68 ? 'Disturbance watch' : 'No major disturbance',
      confidence < 72 ? 'Needs stronger evidence' : 'Evidence alignment acceptable',
      Math.abs(ndviTrend) < 0.015 ? 'Low vegetation movement' : ndviTrend > 0 ? 'Positive vegetation trend' : 'Negative vegetation trend',
    ];
    return { ndviTrend, canopySignal, disturbanceRisk, restorationSignal, confidence, anomalyFlags };
  }, [evidenceCount, hectaresNum, imageryEndDate.length, latitudeNum, longitudeNum, photoConfidence]);
  const scanReadiness = round(clamp(
    liveReading.confidence * 0.45 +
    (clamp(safeNumber(evidenceCount, 0), 0, 100) * 0.12 + clamp(safeNumber(photoConfidence, 0), 0, 100) * 0.13) +
    (100 - liveReading.disturbanceRisk) * 0.15 +
    liveReading.restorationSignal * 0.15,
    0,
    100,
  ), 1);

  const calcBiomass = (ndvi: number, height: number, cover: number, correction: number, manualAgb: number) => {
    if (biomassMode === 'linear_ndvi') return coeff.a + coeff.b * ndvi;
    if (biomassMode === 'exponential_ndvi') return coeff.a * Math.exp(ndvi * coeff.e);
    if (biomassMode === 'manual_agb') return manualAgb;
    return coeff.a + coeff.b * ndvi + coeff.c * height + coeff.d * cover + coeff.e * correction;
  };

  const projectAgbStart = Math.max(0, calcBiomass(ndviStartNum, safeNumber(canopyHeightStart), safeNumber(canopyCoverStart), safeNumber(fieldCorrectionStart), safeNumber(manualAgbStart)));
  const projectAgbEnd = Math.max(0, calcBiomass(ndviEndNum, safeNumber(canopyHeightEnd), safeNumber(canopyCoverEnd), safeNumber(fieldCorrectionEnd), safeNumber(manualAgbEnd)));
  const projectAgbDeltaPerHa = Math.max(0, projectAgbEnd - projectAgbStart);

  const baselineAgb = useMemo(() => {
    if (baselineMode === 'manual') {
      return { start: safeNumber(manualBaselineStart, projectAgbStart), end: safeNumber(manualBaselineEnd, projectAgbEnd) };
    }
    if (baselineMode === 'historical_flat') {
      return { start: projectAgbStart, end: projectAgbStart + safeNumber(historicalBaselineDelta, 0) };
    }
    const years = monthsNum / 12;
    return { start: projectAgbStart, end: projectAgbStart * (1 + (safeNumber(baselineAnnualPct, 0) / 100) * years) };
  }, [baselineMode, baselineAnnualPct, historicalBaselineDelta, manualBaselineEnd, manualBaselineStart, monthsNum, projectAgbEnd, projectAgbStart]);

  const projectCo2eDeltaPerHa = projectAgbDeltaPerHa * carbonFractionNum * (44 / 12);
  const baselineCo2eDeltaPerHa = Math.max(0, baselineAgb.end - baselineAgb.start) * carbonFractionNum * (44 / 12);
  const grossProjectCo2e = projectCo2eDeltaPerHa * hectaresNum;
  const grossBaselineCo2e = baselineCo2eDeltaPerHa * hectaresNum;
  const preDeductionNetCo2e = Math.max(0, grossProjectCo2e - grossBaselineCo2e);

  const riskScore = useMemo(() => {
    const fire = clamp(safeNumber(fireRisk, 0), 0, 100);
    const land = clamp(safeNumber(landUsePressure, 0), 0, 100);
    const gov = clamp(safeNumber(governanceRisk, 0), 0, 100);
    return round(clamp(fire * 0.4 + land * 0.35 + gov * 0.25, 0, 100), 1);
  }, [fireRisk, landUsePressure, governanceRisk]);

  const autoBufferBand = riskBufferBands.find((band) => riskScore >= band.min && riskScore <= band.max) ?? riskBufferBands[1];
  const appliedBufferPct = autoRiskBuffer ? autoBufferBand.bufferPct : safeNumber(bufferPctManual, 12);

  const deductionBreakdown = useMemo(() => {
    if (deductionMode === 'absolute') {
      return {
        leakage: Math.max(0, safeNumber(leakageAbs, 0)),
        uncertainty: Math.max(0, safeNumber(uncertaintyAbs, 0)),
        buffer: autoRiskBuffer ? preDeductionNetCo2e * (appliedBufferPct / 100) : Math.max(0, safeNumber(bufferAbs, 0)),
        other: Math.max(0, safeNumber(otherAdjustmentAbs, 0)),
      };
    }
    return {
      leakage: preDeductionNetCo2e * (Math.max(0, safeNumber(leakagePct, 0)) / 100),
      uncertainty: preDeductionNetCo2e * (Math.max(0, safeNumber(uncertaintyPct, 0)) / 100),
      buffer: preDeductionNetCo2e * (Math.max(0, appliedBufferPct) / 100),
      other: preDeductionNetCo2e * (Math.max(0, safeNumber(otherAdjustmentPct, 0)) / 100),
    };
  }, [appliedBufferPct, autoRiskBuffer, bufferAbs, deductionMode, leakageAbs, leakagePct, otherAdjustmentAbs, otherAdjustmentPct, preDeductionNetCo2e, uncertaintyAbs, uncertaintyPct]);

  const totalDeductions = deductionBreakdown.leakage + deductionBreakdown.uncertainty + deductionBreakdown.buffer + deductionBreakdown.other;
  const netCreditableCo2e = Math.max(0, preDeductionNetCo2e - totalDeductions);
  const viuEligible = Math.floor(netCreditableCo2e);
  const withheldBufferUnits = Math.ceil(deductionBreakdown.buffer);

  const evidenceScore = useMemo(() => {
    const ev = clamp(safeNumber(evidenceCount, 0), 0, 100) * 0.35;
    const gv = clamp(safeNumber(groundVerifierCount, 0) * 10, 0, 100) * 0.2;
    const pc = clamp(safeNumber(photoConfidence, 0), 0, 100) * 0.3;
    const dc = clamp(safeNumber(droneCoveragePct, 0), 0, 100) * 0.15;
    return round(clamp(ev + gv + pc + dc, 0, 100), 1);
  }, [droneCoveragePct, evidenceCount, groundVerifierCount, photoConfidence]);

  const integrityScore = useMemo(() => {
    const duplicatePenalty = duplicateRiskFlag ? 25 : 0;
    return round(clamp(evidenceScore - duplicatePenalty - riskScore * 0.15 + 20, 0, 100), 1);
  }, [duplicateRiskFlag, evidenceScore, riskScore]);

  const readinessStatus = useMemo(() => {
    if (duplicateRiskFlag) return { label: 'Hold', className: 'border-rose-500/40 bg-rose-500/15 text-rose-200', note: 'Resolve duplicate or conflicting claim flags before issuance.' };
    if (integrityScore >= 80 && netCreditableCo2e > 0) return { label: 'Issuance Ready', className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200', note: 'Strong evidence stack and acceptable integrity for internal VIU issuance.' };
    if (integrityScore >= 60 && netCreditableCo2e > 0) return { label: 'Verification Ready', className: 'border-amber-500/40 bg-amber-500/15 text-amber-200', note: 'Needs validator review or stronger evidence before internal issuance.' };
    return { label: 'Needs Work', className: 'border-slate-600 bg-slate-800 text-slate-200', note: 'Strengthen baseline, evidence quality, or deductions before proceeding.' };
  }, [duplicateRiskFlag, integrityScore, netCreditableCo2e]);

  const serialPreview = useMemo(() => {
    const projectSlug = (projectCode || projectName || 'UNTITLED').replace(/[^a-z0-9]+/gi, '-').toUpperCase().slice(0, 12);
    const end = Math.max(1, viuEligible);
    return `DPAL-VIU-${new Date().getFullYear()}-${projectSlug}-00001..${String(end).padStart(5, '0')}`;
  }, [projectCode, projectName, viuEligible]);

  const calculationNarrative = [
    `AOI = ${aoiId} / ${siteName}`,
    `Center = ${latitudeNum.toFixed(5)}, ${longitudeNum.toFixed(5)}`,
    `Boundary area = ${round(hectaresNum)} ha (${hectaresFromBoundary} ha polygon estimate)`,
    `Imagery window = ${imageryStartDate} to ${imageryEndDate}`,
    `Source stack = ${dataSourceStack}`,
    `Model version = ${aiModelVersion}`,
    `Project gross CO2e gain = ${round(grossProjectCo2e)} tCO2e`,
    `Baseline CO2e gain = ${round(grossBaselineCo2e)} tCO2e`,
    `Pre-deduction net = ${round(preDeductionNetCo2e)} tCO2e`,
    `Leakage deduction = ${round(deductionBreakdown.leakage)} tCO2e`,
    `Uncertainty deduction = ${round(deductionBreakdown.uncertainty)} tCO2e`,
    `Buffer deduction = ${round(deductionBreakdown.buffer)} tCO2e`,
    `Other adjustment = ${round(deductionBreakdown.other)} tCO2e`,
    `Net creditable CO2e = ${round(netCreditableCo2e)} tCO2e`,
    `Indicative VIUs eligible = ${viuEligible}`,
  ].join('\n');
  const reportAnchorPayload = useMemo(() => ({
    reportType: 'DPAL_AOI_VIU_PREVIEW',
    projectCode,
    projectName,
    aoiId,
    siteName,
    coordinates: {
      latitude: latitudeNum,
      longitude: longitudeNum,
      formatted: `${formatCoordinate(latitudeNum, 'lat')} / ${formatCoordinate(longitudeNum, 'lng')}`,
    },
    region,
    country,
    boundary: {
      name: boundaryName,
      hectares: hectaresNum,
      polygonEstimateHa: hectaresFromBoundary,
      points: boundaryPoints,
      gpsPolygon: aoiPolygonLatLngs.map(([lat, lng]) => ({ lat, lng })),
      color: aoiColor,
    },
    monitoringPeriod: {
      start: imageryStartDate,
      end: imageryEndDate,
      months: monthsNum,
    },
    aiReading: {
      modelVersion: aiModelVersion,
      sourceStack: dataSourceStack,
      activeLayer: layerLabel,
      scanReadiness,
      confidence: liveReading.confidence,
      lastScanAt: lastAiScanAt,
    },
    result: {
      grossProjectCo2e: round(grossProjectCo2e),
      grossBaselineCo2e: round(grossBaselineCo2e),
      netCreditableCo2e: round(netCreditableCo2e),
      viuEligible,
      readiness: readinessStatus.label,
    },
  }), [
    aiModelVersion,
    aoiId,
    aoiColor,
    aoiPolygonLatLngs,
    boundaryName,
    boundaryPoints,
    country,
    dataSourceStack,
    grossBaselineCo2e,
    grossProjectCo2e,
    hectaresFromBoundary,
    hectaresNum,
    imageryEndDate,
    imageryStartDate,
    lastAiScanAt,
    latitudeNum,
    layerLabel,
    liveReading.confidence,
    longitudeNum,
    monthsNum,
    netCreditableCo2e,
    projectCode,
    projectName,
    readinessStatus.label,
    region,
    scanReadiness,
    siteName,
    viuEligible,
  ]);
  const reportAnchorJson = JSON.stringify(reportAnchorPayload, null, 2);

  const wholeReportContext = `Current report: ${projectName} / ${aoiId} at ${latitudeNum.toFixed(5)}, ${longitudeNum.toFixed(5)}, ${round(hectaresNum)} ha, ${imageryStartDate} to ${imageryEndDate}, ${dataSourceStack}, net ${round(netCreditableCo2e)} tCO2e and ${viuEligible} indicative VIUs.`;

  const addBoundaryPoint = () => {
    const last = boundaryPoints[boundaryPoints.length - 1] ?? { lat: latitudeNum, lng: longitudeNum };
    setBoundaryPoints([
      ...boundaryPoints,
      {
        lat: round(last.lat + 0.012, 6),
        lng: round(last.lng + 0.016, 6),
      },
    ]);
  };

  const updateBoundaryPoint = (index: number, key: 'lat' | 'lng', value: string) => {
    const next = [...boundaryPoints];
    const fallback = next[index]?.[key] ?? (key === 'lat' ? latitudeNum : longitudeNum);
    next[index] = {
      ...next[index],
      [key]: clamp(safeNumber(value, fallback), key === 'lat' ? -90 : -180, key === 'lat' ? 90 : 180),
    };
    setBoundaryPoints(next);
    const nextCenter = getPolygonCenter(next);
    setLatitude(nextCenter.lat.toFixed(6));
    setLongitude(nextCenter.lng.toFixed(6));
  };

  const removeBoundaryPoint = (index: number) => {
    if (boundaryPoints.length <= 3) return;
    const next = boundaryPoints.filter((_, pointIndex) => pointIndex !== index);
    setBoundaryPoints(next);
    const nextCenter = getPolygonCenter(next);
    setLatitude(nextCenter.lat.toFixed(6));
    setLongitude(nextCenter.lng.toFixed(6));
    setSelectedPoint(null);
  };

  const useBoundaryArea = () => {
    if (hectaresFromBoundary > 0) {
      setHectares(String(hectaresFromBoundary));
    }
    setSavedAoiAt(new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }));
  };

  const applyPlaceSearch = () => {
    const normalized = placeSearch.trim().toLowerCase();
    const coordinateMatch = placeSearch.match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
    const preset = placePresets.find((place) => {
      const label = place.label.toLowerCase();
      const site = (place.siteName || '').toLowerCase();
      return normalized === label || label.includes(normalized) || normalized.includes(label) || site.includes(normalized);
    });
    if (!preset && coordinateMatch) {
      const nextLat = clamp(safeNumber(coordinateMatch[1], latitudeNum), -90, 90);
      const nextLng = clamp(safeNumber(coordinateMatch[2], longitudeNum), -180, 180);
      setBoundaryPoints((current) => shiftPolygon(current, { lat: nextLat, lng: nextLng }));
      setLatitude(nextLat.toFixed(6));
      setLongitude(nextLng.toFixed(6));
      setMapViewportCenter([nextLat, nextLng]);
      setMapSource('Manual coordinate search');
      return;
    }
    if (!preset) {
      setMapSource('Place not found - enter coordinates or choose a preset');
      return;
    }
    setBoundaryPoints((current) => shiftPolygon(current, { lat: preset.lat, lng: preset.lng }));
    setLatitude(String(preset.lat));
    setLongitude(String(preset.lng));
    setMapViewportCenter([preset.lat, preset.lng]);
    setCountry(preset.country);
    setRegion(preset.region);
    setEcosystem(preset.ecosystem);
    setSiteName(preset.siteName || preset.label.replace(' AOI', '').replace('Wetland', 'Wetland Parcel'));
    setProjectName(preset.projectName || preset.label);
    setProjectCode(preset.projectCode || `DPAL-${preset.country.slice(0, 3).toUpperCase()}-${String(Math.abs(Math.round(preset.lat * 10))).padStart(3, '0')}`);
    setProjectType(preset.projectType || 'restoration');
    setCommunityPartner(preset.communityPartner || 'Regional community cooperative');
    setLandControlBasis(preset.landControlBasis || 'Community consent + partner agreement');
    setInterventionType(preset.interventionType || 'Landscape restoration and monitoring');
    setProjectSummary(preset.projectSummary || `AOI-linked project for ${preset.label} with mapped boundary, monitoring window, and registry-ready reporting.`);
    setBoundaryName(preset.boundaryName || `${preset.siteName || preset.label} Boundary`);
    setBoundaryEvidence(preset.boundaryEvidence || 'Preset AOI search result linked to mapped coordinates and evidence references.');
    setAoiId(preset.aoiId || `AOI-${(preset.projectCode || preset.label).replace(/[^a-z0-9]+/gi, '-').toUpperCase()}`);
    if (preset.hectares) setHectares(String(preset.hectares));
    setMapSource('Satellite + searched AOI');
  };

  const handleMapPick = (point: { lat: number; lng: number }) => {
    setBoundaryPoints((current) => shiftPolygon(current, point));
    setLatitude(point.lat.toFixed(6));
    setLongitude(point.lng.toFixed(6));
    setMapViewportCenter([point.lat, point.lng]);
    setMapSource('Manual map click + polygon');
  };

  const handleVertexDrag = (index: number, point: { lat: number; lng: number }) => {
    const next = [...boundaryPoints];
    next[index] = point;
    setBoundaryPoints(next);
    const nextCenter = getPolygonCenter(next);
    setLatitude(nextCenter.lat.toFixed(6));
    setLongitude(nextCenter.lng.toFixed(6));
    setSelectedPoint(index);
    setMapSource('Manual polygon reshape');
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-emerald-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/50 p-5">
        <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-200">DPAL Carbon / VIU Calculator</span>
              <span className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-bold text-slate-300">Project Intake + Boundary + Registry Logic</span>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-5xl">From project boundary to verification-ready impact numbers.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Register the project, sketch the operating boundary, connect evidence assumptions, and calculate indicative DPAL Verified Impact Units with disclosure-safe outputs.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {[
                ['1. Select AOI', 'Search place, set GPS, shape boundary, save location anchor.'],
                ['2. Define Project', 'Link the mapped AOI to project identity, partner, and methodology.'],
                ['3. Review Readings', 'Check imagery dates, AI scan context, evidence, and measured outputs.'],
                ['4. Issue Result', 'Apply baseline, deductions, disclosure, registry payload, and VIU preview.'],
              ].map(([step, note]) => (
                <div key={step} className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-300">{step}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{note}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={onLaunchMission} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-500">Launch Evidence Mission</button>
              <button onClick={onRunMrv} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-black text-slate-200 hover:border-emerald-500">Run MRV Review</button>
              <button onClick={onPreparePackage} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-black text-slate-200 hover:border-emerald-500">Prepare Buyer Package</button>
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
            <p className="text-sm font-black text-white">Program Snapshot</p>
            <div className="mt-3 space-y-2">
              <SummaryRow label="Project" value={projectName || 'Untitled'} />
              <SummaryRow label="Project Code" value={projectCode || 'Uncoded'} />
              <SummaryRow label="Type" value={projectTypeLabels[projectType]} />
              <SummaryRow label="Ecosystem" value={ecosystemLabels[ecosystem]} />
              <SummaryRow label="Boundary" value={boundaryName} />
              <SummaryRow label="Area" value={`${formatNumber(hectaresNum)} ha`} help={`Boundary estimate: ${hectaresFromBoundary} ha`} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 rounded-lg border border-slate-800 bg-slate-900/80 p-4 shadow-lg xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <Field type="text" label="Search or select place" value={placeSearch} onChange={setPlaceSearch} />
            </div>
            <button onClick={applyPlaceSearch} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-500">
              <Search className="mr-2 inline h-4 w-4" />Use Place
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Latitude" value={latitude} onChange={setLatitude} help={formatCoordinate(latitudeNum, 'lat')} />
            <Field label="Longitude" value={longitude} onChange={setLongitude} help={formatCoordinate(longitudeNum, 'lng')} />
            <Field type="text" label="Site / parcel name" value={siteName} onChange={setSiteName} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field type="text" label="Imagery start date" value={imageryStartDate} onChange={setImageryStartDate} />
            <Field type="text" label="Imagery end date" value={imageryEndDate} onChange={setImageryEndDate} />
            <div className="md:col-span-2">
              <Field type="text" label="Data source stack" value={dataSourceStack} onChange={setDataSourceStack} />
            </div>
            <Field type="text" label="AI model version" value={aiModelVersion} onChange={setAiModelVersion} />
            <Field type="text" label="AOI ID" value={aoiId} onChange={setAoiId} />
          </div>

          <div className="flex flex-wrap gap-2">
            {(['ndvi', 'canopy', 'disturbance', 'terrain'] as DataLayer[]).map((layer) => (
              <button
                key={layer}
                onClick={() => setActiveMapLayer(layer)}
                className={`rounded-lg border px-3 py-2 text-xs font-black capitalize transition ${
                  activeMapLayer === layer
                    ? 'border-emerald-400 bg-emerald-500/15 text-emerald-100'
                    : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                }`}
              >
                {layer}
              </button>
            ))}
            <button onClick={useBoundaryArea} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-black text-slate-200 hover:border-emerald-500">
              Save AOI Boundary + QR
            </button>
            <span className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-black text-slate-300">
              AOI color
              {aoiColorOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setAoiColor(option.value)}
                  title={option.label}
                  aria-label={`Set AOI color ${option.label}`}
                  className={`h-5 w-5 rounded-full border ${aoiColor === option.value ? 'border-white ring-2 ring-white/30' : 'border-slate-500'}`}
                  style={{ backgroundColor: option.value }}
                />
              ))}
            </span>
          </div>

          <div className={`rounded-lg border border-slate-800 bg-gradient-to-br ${mapLayerClass} p-4 shadow-inner`}>
            <AoiLeafletMap
              center={mapCenter}
              polygon={aoiPolygonLatLngs}
              activeLayer={activeMapLayer}
              aoiColor={aoiColor}
              onPick={handleMapPick}
              onVertexDrag={handleVertexDrag}
              label={`${aoiId} / ${siteName}`}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>Map centered at {latitudeNum.toFixed(6)}, {longitudeNum.toFixed(6)} / polygon center {polygonCenter.lat.toFixed(6)}, {polygonCenter.lng.toFixed(6)} / {layerLabel}</span>
              <span>Click the map to move the AOI. Drag any boundary handle or edit its GPS values below to reshape it.</span>
            </div>
            {coordinateWarning ? (
              <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-bold text-amber-200">
                {coordinateWarning}
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Location Context</p>
            <h2 className="mt-1 text-2xl font-black text-white">No calculation without a mapped AOI.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Every VIU output below is tied to this site, center point, boundary, imagery window, and source stack.
            </p>
          </div>
          <SummaryRow label="AOI ID" value={aoiId} />
          <SummaryRow label="Center coordinates" value={`${latitudeNum.toFixed(5)}, ${longitudeNum.toFixed(5)}`} help={`${formatCoordinate(latitudeNum, 'lat')} / ${formatCoordinate(longitudeNum, 'lng')}`} />
          <SummaryRow label="Boundary hectares" value={`${round(hectaresNum)} ha`} help={`Polygon estimate: ${hectaresFromBoundary} ha`} />
          <SummaryRow label="Region / Country" value={`${region}, ${country}`} />
          <SummaryRow label="Imagery dates" value={`${imageryStartDate} to ${imageryEndDate}`} />
          <SummaryRow label="Data sources" value={dataSourceStack} />
          <SummaryRow label="Active data layer" value={layerLabel} />
          <SummaryRow label="AI scan" value={lastAiScanAt} help={aiModelVersion} />
          <SummaryRow label="Human verification" value={lastHumanVerifiedAt} help={communityPartner} />
          <SummaryRow label="Saved AOI boundary" value={savedAoiAt} help="Updated when you save the mapped AOI boundary." />
          <div className={`rounded-lg border p-3 ${hasMappedAoi ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/10'}`}>
            <div className="flex items-center gap-2 text-sm font-black text-white">
              {hasMappedAoi ? <CheckCircle className="h-4 w-4 text-emerald-300" /> : <AlertTriangle className="h-4 w-4 text-rose-300" />}
              {hasMappedAoi ? 'AOI-linked calculation ready' : 'Map an AOI before issuing'}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Required: saved center coordinates, polygon boundary, monitoring dates, data stack, and evidence references.
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-center gap-2 text-sm font-black text-white">
              <QrCode className="h-4 w-4 text-cyan-300" />
              QR / coordinate report anchor
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              This is the payload the QR or registry anchor should point to. It includes AOI ID, GPS center, polygon points, imagery dates, AI model version, and calculation result.
            </p>
            <div className="mt-3 flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
              <QrCodeImage payload={reportAnchorPayload} size={136} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white">{aoiId}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Scan to recover the AOI location anchor, polygon coordinates, monitoring window, AI reading context, and current VIU preview.
                </p>
                <p className="mt-2 text-xs text-cyan-200">
                  {latitudeNum.toFixed(6)}, {longitudeNum.toFixed(6)} / {round(hectaresNum)} ha
                </p>
              </div>
            </div>
            <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-slate-800 bg-black/30 p-3 text-[11px] leading-5 text-cyan-100">{reportAnchorJson}</pre>
          </div>
          <InstructorHelper
            title="Location and AOI"
            context={`${wholeReportContext} The location section proves which parcel or mission area the calculation belongs to.`}
            suggestedQuestions={[
              'Why do coordinates matter?',
              'How do I verify this AOI?',
              'What should the QR payload prove?',
            ]}
            backTests={[
              'Scan or open the QR payload and confirm the same AOI ID, lat/lng, dates, and VIU result are present.',
              'Compare the center coordinates against the polygon and project documents.',
              'Check that the imagery date window matches the monitoring period used in the calculation.',
            ]}
            reportContext={wholeReportContext}
          />
        </aside>
      </section>

      <section className="grid gap-3 rounded-lg border border-slate-800 bg-slate-900/80 p-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-emerald-300"><RefreshCw className="h-4 w-4" />Live AI Reading</div>
          <p className="mt-2 text-2xl font-black text-white">{liveReading.confidence}%</p>
          <p className="mt-1 text-xs text-slate-500">Confidence for selected AOI</p>
        </div>
        <SummaryRow label="NDVI trend" value={`${liveReading.ndviTrend >= 0 ? '+' : ''}${liveReading.ndviTrend}`} help={`${imageryStartDate} to ${imageryEndDate}`} />
        <SummaryRow label="Canopy signal" value={`${liveReading.canopySignal}%`} help={`Active layer: ${layerLabel}`} />
        <SummaryRow label="Disturbance flags" value={liveReading.anomalyFlags[0]} help={liveReading.anomalyFlags.slice(1).join(' / ')} />
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 md:col-span-4">
          <div className="mb-2 flex justify-between text-xs font-bold text-slate-300">
            <span>AOI scan readiness</span>
            <span>{scanReadiness}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800">
            <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${scanReadiness}%` }} />
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-5">
        <ResultTile label="Project Area" value={`${formatNumber(hectaresNum)} ha`} note={`${hectaresFromBoundary} ha from boundary`} icon={<Map className="h-4 w-4" />} tone="text-lime-300" />
        <ResultTile label="Gross Project CO2e" value={formatNumber(round(grossProjectCo2e), 1)} note={`${aoiId}, ${monthsNum} months`} icon={<Globe className="h-4 w-4" />} />
        <ResultTile label="Net Creditable CO2e" value={formatNumber(round(netCreditableCo2e), 1)} note="AOI-linked after deductions" icon={<ShieldCheck className="h-4 w-4" />} tone="text-cyan-300" />
        <ResultTile label="Indicative VIUs" value={formatNumber(viuEligible)} note={`For ${siteName}, not a detached estimate`} icon={<Database className="h-4 w-4" />} tone="text-amber-300" />
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-300"><CheckCircle className="h-4 w-4" />Readiness</div>
          <div className={`mt-3 inline-flex rounded-lg border px-3 py-1 text-sm font-black ${readinessStatus.className}`}>{readinessStatus.label}</div>
          <p className="mt-2 text-xs leading-5 text-slate-500">{readinessStatus.note}</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <Panel title="Project Setup And Method" description="Project identity, ownership, intervention, and method settings linked to the AOI above">
            <div className="grid gap-4 md:grid-cols-2">
              <Field type="text" label="Project name" value={projectName} onChange={setProjectName} />
              <Field type="text" label="Project code" value={projectCode} onChange={setProjectCode} />
              <SelectField label="Project type" value={projectType} onChange={setProjectType} options={Object.entries(projectTypeLabels).map(([value, label]) => ({ value: value as ProjectType, label }))} />
              <SelectField label="Ecosystem type" value={ecosystem} onChange={setEcosystem} options={Object.entries(ecosystemLabels).map(([value, label]) => ({ value: value as EcosystemType, label }))} />
              <Field type="text" label="Community / partner" value={communityPartner} onChange={setCommunityPartner} />
              <Field type="text" label="Land control basis" value={landControlBasis} onChange={setLandControlBasis} />
              <div className="md:col-span-2">
                <Field type="text" label="Intervention type" value={interventionType} onChange={setInterventionType} />
              </div>
              <div className="md:col-span-2">
                <TextAreaField label="Project summary" value={projectSummary} onChange={setProjectSummary} rows={4} />
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Linked AOI</p>
                <p className="mt-2 text-sm font-black text-white">{aoiId} / {siteName}</p>
                <p className="mt-1 text-xs text-slate-500">{region}, {country}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Mapped Area</p>
                <p className="mt-2 text-sm font-black text-white">{round(hectaresNum)} ha</p>
                <p className="mt-1 text-xs text-slate-500">AOI boundary and coordinate context are managed in Search / Select Place above.</p>
              </div>
              <SelectField label="Biomass model" value={biomassMode} onChange={setBiomassMode} options={[
                { value: 'hybrid', label: 'Hybrid: NDVI + height + cover + field' },
                { value: 'linear_ndvi', label: 'Linear NDVI' },
                { value: 'exponential_ndvi', label: 'Exponential NDVI' },
                { value: 'manual_agb', label: 'Manual AGB override' },
              ]} />
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Monitoring window</p>
                <p className="mt-2 text-sm font-black text-white">{monthsNum} months</p>
                <p className="mt-1 text-xs text-slate-500">Derived from imagery start and end dates in the AOI selection section.</p>
              </div>
              <SelectField label="Baseline mode" value={baselineMode} onChange={setBaselineMode} options={[
                { value: 'percent_growth', label: 'Percent growth' },
                { value: 'historical_flat', label: 'Historical flat delta' },
                { value: 'manual', label: 'Manual baseline AGB' },
              ]} />
              <Field label="Carbon fraction" value={carbonFraction} onChange={setCarbonFraction} help="Common default is 0.47." />
            </div>
            <div className="mt-4">
              <InstructorHelper
                title="Project Setup And Method"
                context={`${wholeReportContext} This section should not ask for the place again. It defines who is responsible for the project, what intervention is being claimed, and which methodology assumptions apply to the AOI already selected above.`}
                suggestedQuestions={[
                  'Why do project type and ecosystem matter?',
                  'How does this section connect to the AOI above?',
                  'What should I verify before accepting this project?',
                ]}
                backTests={[
                  'Confirm project name, partner, land-control basis, and intervention type match signed project documents.',
                  'Check that the selected ecosystem matches the AOI land cover and not just the project story.',
                  'Confirm one project can later contain multiple AOIs without mixing their calculations.',
                ]}
                reportContext={wholeReportContext}
              />
            </div>
          </Panel>

          <Panel title="Map Boundary" description="Define the project polygon, evidence basis, and area link into the calculator">
            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field type="text" label="Boundary name" value={boundaryName} onChange={setBoundaryName} />
                  <Field type="text" label="Boundary source" value={mapSource} onChange={setMapSource} />
                  <div className="md:col-span-2">
                    <TextAreaField label="Boundary evidence notes" value={boundaryEvidence} onChange={setBoundaryEvidence} rows={3} />
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 shadow-inner">
                  <svg viewBox="0 0 300 240" className="h-80 w-full rounded-lg bg-slate-900">
                    <defs>
                      <pattern id="viu-boundary-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="300" height="240" fill="url(#viu-boundary-grid)" />
                    <circle cx="245" cy="42" r="28" fill="rgba(245, 158, 11, 0.14)" />
                    <circle cx="50" cy="58" r="18" fill="rgba(56, 189, 248, 0.12)" />
                    <circle cx="205" cy="185" r="34" fill="rgba(34, 197, 94, 0.10)" />
                    <polygon points={boundaryPolygon} fill="rgba(16, 185, 129, 0.28)" stroke="rgba(255,255,255,0.88)" strokeWidth="2.3" />
                    {boundaryPreviewPoints.map((point, index) => (
                      <g key={`${point.x}-${point.y}-${index}`}>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={selectedPoint === index ? 6.5 : 5}
                          fill={selectedPoint === index ? '#fbbf24' : '#ffffff'}
                          stroke="#0f172a"
                          strokeWidth="1.5"
                          className="cursor-pointer"
                          onClick={() => setSelectedPoint(index)}
                        />
                        <text x={point.x + 8} y={point.y - 8} fill="rgba(255,255,255,0.9)" fontSize="10">
                          P{index + 1}
                        </text>
                      </g>
                    ))}
                    <text x="18" y="24" fill="rgba(255,255,255,0.8)" fontSize="11">DPAL boundary preview</text>
                  </svg>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button onClick={addBoundaryPoint} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-500">
                    <Plus className="mr-2 inline h-4 w-4" />Add Point
                  </button>
                  <button onClick={useBoundaryArea} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-black text-slate-200 hover:border-emerald-500">
                    Use Boundary Area
                  </button>
                  <button type="button" className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-black text-slate-200 hover:border-emerald-500">
                    <Upload className="mr-2 inline h-4 w-4" />GeoJSON Later
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <SummaryRow label="Boundary area estimate" value={`${hectaresFromBoundary} ha`} />
                <SummaryRow label="Perimeter estimate" value={`${boundaryPerimeter} km`} />
                <SummaryRow label="Point count" value={String(boundaryPoints.length)} />
                <SummaryRow label="Current calculator area" value={`${round(hectaresNum)} ha`} />
                <SummaryRow label="Map source" value={mapSource} />

                <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950 p-3">
                  <p className="text-sm font-black text-white">Boundary editor</p>
                  {boundaryPoints.map((point, index) => (
                    <div key={`editor-${index}`} className={`rounded-lg border p-3 ${selectedPoint === index ? 'border-amber-400 bg-amber-500/10' : 'border-slate-800 bg-slate-900'}`}>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-300">Point {index + 1}</p>
                        <div className="flex gap-2">
                          <button onClick={() => setSelectedPoint(index)} className="rounded-md border border-slate-700 px-2 py-1 text-[11px] font-bold text-slate-200 hover:border-emerald-500">Select</button>
                          <button onClick={() => removeBoundaryPoint(index)} className="rounded-md border border-rose-500/30 px-2 py-1 text-[11px] font-bold text-rose-200 hover:border-rose-400">Remove</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          aria-label={`Point ${index + 1} latitude`}
                          value={point.lat}
                          onChange={(event) => updateBoundaryPoint(index, 'lat', event.target.value)}
                          className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-white outline-none focus:border-emerald-400"
                        />
                        <input
                          aria-label={`Point ${index + 1} longitude`}
                          value={point.lng}
                          onChange={(event) => updateBoundaryPoint(index, 'lng', event.target.value)}
                          className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-white outline-none focus:border-emerald-400"
                        />
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500">
                        {formatCoordinate(point.lat, 'lat')} / {formatCoordinate(point.lng, 'lng')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <InstructorHelper
                title="Map Boundary"
                context={`${wholeReportContext} The boundary converts the project from a label into a mapped AOI. Its area feeds the hectares used by the calculation.`}
                suggestedQuestions={[
                  'How is boundary area connected to credits?',
                  'What if the polygon is wrong?',
                  'How do I back-test the map boundary?',
                ]}
                backTests={[
                  'Compare polygon points to a field GPS walk, GeoJSON/KML file, or parcel document.',
                  'Use boundary area in the calculator and confirm hectares update before trusting VIUs.',
                  'Check whether photos, missions, and verifier notes fall inside the AOI.',
                ]}
                reportContext={wholeReportContext}
              />
            </div>
          </Panel>

          <Panel title="Monitoring Inputs" description="Satellite, canopy, field correction, and evidence variables">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="NDVI start" value={ndviStart} onChange={setNdviStart} />
              <Field label="NDVI end" value={ndviEnd} onChange={setNdviEnd} />
              <Field label="Canopy height start" value={canopyHeightStart} onChange={setCanopyHeightStart} />
              <Field label="Canopy height end" value={canopyHeightEnd} onChange={setCanopyHeightEnd} />
              <Field label="Canopy cover start (%)" value={canopyCoverStart} onChange={setCanopyCoverStart} />
              <Field label="Canopy cover end (%)" value={canopyCoverEnd} onChange={setCanopyCoverEnd} />
              <Field label="Field correction start" value={fieldCorrectionStart} onChange={setFieldCorrectionStart} />
              <Field label="Field correction end" value={fieldCorrectionEnd} onChange={setFieldCorrectionEnd} />
              {biomassMode === 'manual_agb' ? (
                <>
                  <Field label="Manual AGB start" value={manualAgbStart} onChange={setManualAgbStart} />
                  <Field label="Manual AGB end" value={manualAgbEnd} onChange={setManualAgbEnd} />
                </>
              ) : null}
              <Field label="Evidence files" value={evidenceCount} onChange={setEvidenceCount} />
              <Field label="Ground verifiers" value={groundVerifierCount} onChange={setGroundVerifierCount} />
              <Field label="Photo confidence (%)" value={photoConfidence} onChange={setPhotoConfidence} />
              <Field label="Drone coverage (%)" value={droneCoveragePct} onChange={setDroneCoveragePct} />
            </div>
            <div className="mt-4">
              <InstructorHelper
                title="Monitoring Inputs"
                context={`${wholeReportContext} Monitoring inputs describe what changed in the AOI: NDVI, canopy height, canopy cover, field correction, and evidence quality drive the project-side CO2e estimate.`}
                suggestedQuestions={[
                  'How do NDVI and canopy affect the result?',
                  'Why do evidence files matter?',
                  'What reading should I verify first?',
                ]}
                backTests={[
                  'Compare NDVI start/end values with the imagery date window.',
                  'Check canopy height and cover against drone or field plot records.',
                  'Increase/decrease field correction and confirm the output changes in the expected direction.',
                ]}
                reportContext={wholeReportContext}
              />
            </div>
          </Panel>

          <Panel title="Baseline And Risk" description="Counterfactual scenario plus reversal-risk buffer controls">
            <div className="grid gap-4 md:grid-cols-2">
              {baselineMode === 'manual' ? (
                <>
                  <Field label="Manual baseline AGB start" value={manualBaselineStart} onChange={setManualBaselineStart} />
                  <Field label="Manual baseline AGB end" value={manualBaselineEnd} onChange={setManualBaselineEnd} />
                </>
              ) : baselineMode === 'historical_flat' ? (
                <Field label="Historical baseline delta / ha" value={historicalBaselineDelta} onChange={setHistoricalBaselineDelta} />
              ) : (
                <Field label="Annual baseline growth rate (%)" value={baselineAnnualPct} onChange={setBaselineAnnualPct} />
              )}
              <Field label="Fire risk (0-100)" value={fireRisk} onChange={setFireRisk} />
              <Field label="Land-use pressure (0-100)" value={landUsePressure} onChange={setLandUsePressure} />
              <Field label="Governance risk (0-100)" value={governanceRisk} onChange={setGovernanceRisk} />
              <label className="block md:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Risk notes</span>
                <textarea
                  value={reversalRiskNotes}
                  onChange={(event) => setReversalRiskNotes(event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                />
              </label>
            </div>
            <div className="mt-4">
              <InstructorHelper
                title="Baseline and Risk"
                context={`${wholeReportContext} Baseline and risk answer the counterfactual: what would happen without the project, and how likely the benefit is to be reversed or overstated.`}
                suggestedQuestions={[
                  'Why subtract a baseline?',
                  'How does risk change the VIU result?',
                  'What should I back-test for baseline?',
                ]}
                backTests={[
                  'Compare baseline growth against historical imagery or previous monitoring snapshots.',
                  'Run a conservative baseline and confirm the project still produces a credible net result.',
                  'Review fire, land-use, and governance risk notes before allowing issuance.',
                ]}
                reportContext={wholeReportContext}
              />
            </div>
          </Panel>

          <Panel title="Deductions And Buffers" description="Leakage, uncertainty, reversal buffer, other adjustments, and claim holds">
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField label="Deduction mode" value={deductionMode} onChange={setDeductionMode} options={[
                { value: 'percent', label: 'Percent of pre-deduction net' },
                { value: 'absolute', label: 'Absolute tCO2e amounts' },
              ]} />
              <SwitchRow label="Auto risk buffer" note="Uses weighted risk score to assign a buffer band." checked={autoRiskBuffer} onChange={setAutoRiskBuffer} />
              {deductionMode === 'percent' ? (
                <>
                  <Field label="Leakage (%)" value={leakagePct} onChange={setLeakagePct} />
                  <Field label="Uncertainty (%)" value={uncertaintyPct} onChange={setUncertaintyPct} />
                  <Field label="Other adjustment (%)" value={otherAdjustmentPct} onChange={setOtherAdjustmentPct} />
                  {!autoRiskBuffer ? <Field label="Manual buffer (%)" value={bufferPctManual} onChange={setBufferPctManual} /> : null}
                </>
              ) : (
                <>
                  <Field label="Leakage (tCO2e)" value={leakageAbs} onChange={setLeakageAbs} />
                  <Field label="Uncertainty (tCO2e)" value={uncertaintyAbs} onChange={setUncertaintyAbs} />
                  <Field label="Other adjustment (tCO2e)" value={otherAdjustmentAbs} onChange={setOtherAdjustmentAbs} />
                  {!autoRiskBuffer ? <Field label="Manual buffer (tCO2e)" value={bufferAbs} onChange={setBufferAbs} /> : null}
                </>
              )}
              <SwitchRow label="Duplicate / conflicting claim flag" note="Blocks issuance until no-double-counting checks are clear." checked={duplicateRiskFlag} onChange={setDuplicateRiskFlag} />
              <SwitchRow label="External-certified claim mode" note="Use only after external validation, verification, and registry issuance." checked={externalCertification} onChange={setExternalCertification} />
            </div>
            <div className="mt-4">
              <InstructorHelper
                title="Deductions and Buffers"
                context={`${wholeReportContext} Deductions reduce the pre-deduction net so the output is conservative: leakage, uncertainty, reversal buffer, and claim conflicts all protect against over-crediting.`}
                suggestedQuestions={[
                  'Why are deductions necessary?',
                  'What happens if duplicate claim is on?',
                  'How do I test the buffer?',
                ]}
                backTests={[
                  'Toggle auto buffer off and compare manual buffer scenarios.',
                  'Set duplicate claim on and confirm readiness moves to Hold.',
                  'Stress-test leakage and uncertainty at higher values and confirm VIUs decline.',
                ]}
                reportContext={wholeReportContext}
              />
            </div>
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel title="Formula Profile" description="Current methodology path selected inside the calculator">
            <pre className="whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-300">
{`${biomassMode === 'hybrid' ? 'AGB = a + b*NDVI + c*CanopyHeight + d*CanopyCover + e*FieldCorrection' : ''}
${biomassMode === 'linear_ndvi' ? 'AGB = a + b*NDVI' : ''}
${biomassMode === 'exponential_ndvi' ? 'AGB = a*e^(NDVI*e)' : ''}
${biomassMode === 'manual_agb' ? 'AGB = manual field estimate' : ''}
Carbon = AGB * carbon fraction
CO2e = Carbon * 44/12
Net = Project Gain - Baseline Gain - Leakage - Uncertainty - Buffer - Other`}
            </pre>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {[
                ['a', customA, setCustomA, coeffBase.a],
                ['b', customB, setCustomB, coeffBase.b],
                ['c', customC, setCustomC, coeffBase.c],
                ['d', customD, setCustomD, coeffBase.d],
                ['e', customE, setCustomE, coeffBase.e],
              ].map(([key, value, setter, fallback]) => (
                <input
                  key={String(key)}
                  aria-label={`Coefficient ${key}`}
                  placeholder={`${key} (${fallback})`}
                  value={value as string}
                  onChange={(event) => (setter as React.Dispatch<React.SetStateAction<string>>)(event.target.value)}
                  className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-white outline-none focus:border-emerald-400"
                />
              ))}
            </div>
            <div className="mt-4">
              <InstructorHelper
                title="Formula Profile"
                context={`${wholeReportContext} The formula profile shows exactly how the AOI reading becomes biomass, carbon, CO2e, and finally net creditable units.`}
                suggestedQuestions={[
                  'How does this formula produce CO2e?',
                  'When should I use manual AGB?',
                  'What should I verify in coefficients?',
                ]}
                backTests={[
                  'Switch biomass modes and confirm the calculation responds predictably.',
                  'Compare custom coefficients to the selected ecosystem defaults.',
                  'Have a reviewer confirm carbon fraction and 44/12 conversion assumptions.',
                ]}
                reportContext={wholeReportContext}
              />
            </div>
          </Panel>

          <Panel title="Measured Outputs">
            <div className="space-y-2">
              <SummaryRow label="Project AGB start" value={`${round(projectAgbStart)} Mg/ha`} />
              <SummaryRow label="Project AGB end" value={`${round(projectAgbEnd)} Mg/ha`} />
              <SummaryRow label="Project AGB delta / ha" value={`${round(projectAgbDeltaPerHa)} Mg/ha`} />
              <SummaryRow label="Project CO2e delta / ha" value={`${round(projectCo2eDeltaPerHa)} tCO2e/ha`} />
              <SummaryRow label="Baseline CO2e total" value={`${round(grossBaselineCo2e)} tCO2e`} />
              <SummaryRow label="Risk score" value={`${riskScore} / 100`} help={`Auto band: ${autoBufferBand.label} (${appliedBufferPct}%)`} />
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span>Reversal risk</span>
                  <span>{riskScore}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-800">
                  <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${riskScore}%` }} />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <InstructorHelper
                title="Measured Outputs"
                context={`${wholeReportContext} Measured outputs show the project-side reading before and after baseline subtraction. This is where users can see whether the AOI actually gained measurable carbon value.`}
                suggestedQuestions={[
                  'Why did gross project CO2e change?',
                  'How do I know the output belongs to this AOI?',
                  'What result should trigger verifier review?',
                ]}
                backTests={[
                  'Confirm gross project CO2e uses the same hectares shown in the AOI report anchor.',
                  'Compare measured outputs against the calculation log in the registry package.',
                  'Flag verifier review if integrity score, scan readiness, or evidence score is weak.',
                ]}
                reportContext={wholeReportContext}
              />
            </div>
          </Panel>

          <Panel title="Deduction Results">
            <div className="space-y-2">
              <SummaryRow label="Pre-deduction net" value={`${round(preDeductionNetCo2e)} tCO2e`} />
              <SummaryRow label="Leakage" value={`${round(deductionBreakdown.leakage)} tCO2e`} />
              <SummaryRow label="Uncertainty" value={`${round(deductionBreakdown.uncertainty)} tCO2e`} />
              <SummaryRow label="Buffer" value={`${round(deductionBreakdown.buffer)} tCO2e`} />
              <SummaryRow label="Other adjustment" value={`${round(deductionBreakdown.other)} tCO2e`} />
              <SummaryRow label="Total deductions" value={`${round(totalDeductions)} tCO2e`} />
            </div>
          </Panel>

          <Panel title="Issuance Preview">
            <div className="space-y-2">
              <SummaryRow label="Eligible VIUs" value={String(viuEligible)} />
              <SummaryRow label="Buffer withheld units" value={String(withheldBufferUnits)} />
              <SummaryRow label="Indicative serial range" value={serialPreview} />
              <SummaryRow label="Registry status" value={readinessStatus.label} />
              <SummaryRow label="Evidence score" value={`${evidenceScore} / 100`} />
              <SummaryRow label="Integrity score" value={`${integrityScore} / 100`} />
            </div>
          </Panel>

          <Panel title="Registry Package">
            <div className="space-y-3">
              <div className="grid gap-2">
              <SummaryRow label="Calculated for AOI" value={`${aoiId} / ${siteName}`} />
              <SummaryRow label="Coordinates" value={`${latitudeNum.toFixed(5)}, ${longitudeNum.toFixed(5)}`} />
              <SummaryRow label="Monitoring period" value={`${imageryStartDate} to ${imageryEndDate}`} />
              <SummaryRow label="Source stack" value={dataSourceStack} />
              <SummaryRow label="AI analysis version" value={aiModelVersion} />
              <SummaryRow label="Active data layer" value={layerLabel} />
              <SummaryRow label="AOI scan readiness" value={`${scanReadiness}%`} />
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-200"><FileText className="h-4 w-4" />Disclosure preview</div>
                <p className="text-sm leading-6 text-slate-400">{disclosureTemplate(externalCertification)}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-200"><Cpu className="h-4 w-4" />Calculation log</div>
                <textarea value={calculationNarrative} readOnly rows={9} className="w-full resize-none border-0 bg-transparent text-xs leading-6 text-slate-400 outline-none" />
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-black text-amber-200"><AlertTriangle className="h-4 w-4" />Positioning</div>
                <p className="text-sm leading-6 text-amber-100/80">
                  Internal DPAL VIUs are verification-preparation assets, not certified carbon offsets unless the external validation and issuance path is complete.
                </p>
              </div>
              <InstructorHelper
                title="Issuance and Registry"
                context={`${wholeReportContext} The registry package is the final explanation layer: it ties the QR payload, AOI coordinates, reading dates, model version, disclosure, and final VIU result into one auditable record.`}
                suggestedQuestions={[
                  'What does the QR report prove?',
                  'Can this be sold as an offset?',
                  'What must be verified before issuance?',
                ]}
                backTests={[
                  'Open the report anchor and confirm it matches the visible AOI and calculation.',
                  'Confirm external-certified mode is off unless third-party issuance exists.',
                  'Have a verifier compare the registry payload against evidence files and boundary records.',
                ]}
                reportContext={wholeReportContext}
              />
            </div>
          </Panel>

          <Panel title="Next Build Hooks">
            <div className="grid gap-4">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-emerald-300">Now In Place</p>
                <div className="mt-3 grid gap-2">
                  <SummaryRow label="GPS coordinates" value="Added" />
                  <SummaryRow label="AOI identity" value="Added" />
                  <SummaryRow label="Boundary-linked area" value="Added" />
                  <SummaryRow label="Imagery date range" value="Added" />
                  <SummaryRow label="AI scan metadata" value="Added" />
                  <SummaryRow label="AOI-specific disclosure" value="Added" />
                </div>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-cyan-300">Next Recommended Build</p>
                <div className="mt-3 grid gap-2">
                  <SummaryRow label="Evidence Vault" value="Upload, hash, geo-tag, and link evidence directly to the AOI" />
                  <SummaryRow label="Timeline slider" value="Compare imagery snapshots by date and show AOI change over time" />
                  <SummaryRow label="Live API integration" value="Replace prototype readings with MRV responses and live analysis metadata" />
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <button onClick={onLaunchMission} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-black text-slate-200 hover:border-emerald-500"><Target className="mr-2 inline h-4 w-4" />Mission</button>
              <button onClick={onRunMrv} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-black text-slate-200 hover:border-emerald-500"><ShieldCheck className="mr-2 inline h-4 w-4" />MRV</button>
              <button onClick={onPreparePackage} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-black text-slate-200 hover:border-emerald-500"><MapPin className="mr-2 inline h-4 w-4" />Package</button>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
};

export default DpalCarbonViuCalculator;
