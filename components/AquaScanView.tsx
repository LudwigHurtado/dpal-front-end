import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, GeoJSON, MapContainer, Polygon, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, CheckCircle, Plus, Waves } from './icons';
import type { Hero } from '../types';
import { GIBS_LAYERS, gibsDefaultDate, gibsTileUrl } from '../services/gibsService';
import {
  getWaterHistory,
  getWaterSnapshotByAOI,
  getWaterSnapshotByPoint,
  type WaterAnalysisResponse,
} from '../services/waterAnalysisService';
import {
  communityImpactOptions,
  concernTypes,
  mockSatelliteLayers,
  suspectedSources,
  waterBodyTypes,
  type AquaScanProject,
  type ConcernType,
  type RiskBand,
  type SatelliteLayer,
  type WaterIndicator,
} from './water/aquaScanMockData';
import { fetchCopernicusSetupState, getCopernicusSetupState } from '../services/copernicus/processService';
import { fetchAoiStatisticsComparison } from '../services/copernicus/statisticsService';
import type {
  CopernicusAoiGeoJson,
  CopernicusIndexType,
  CopernicusStatisticsComparisonResponse,
  CopernicusValidatorStatus,
  SatelliteEvidencePacket,
} from '../services/copernicus/types';
import { apiUrl, API_ROUTES } from '../constants';
import { reverseGeocodeLatLng } from '../services/geocodingService';
import { lookupNearbyEntities, type NearbyEntity } from '../services/entityLookupService';
import {
  fetchFloodWetOverlay,
  fetchFlowDirection,
  fetchNdwiOverlay,
  fetchRiskZones,
  fetchWaterExtentOverlay,
  isOverlayLiveDerived,
} from '../services/aquascan/liveOverlayService';
import type {
  AquaScanOverlayRequest,
  AquaScanOverlayResponse,
  AquaScanOverlayState,
  AquaScanOverlayType,
} from '../services/aquascan/overlayTypes';

interface AquaScanViewProps {
  onReturn: () => void;
  hero?: Hero;
  onOpenWaterOperations?: () => void;
}

interface FocusLocation {
  source: 'search' | 'gps' | 'manual' | 'map_click';
  query: string;
  displayName: string;
  latitude: number;
  longitude: number;
  aoiGeoJson: CopernicusAoiGeoJson | null;
  resolvedAt: string;
}

const DEFAULT_WEST_US_CENTER: [number, number] = [37.25, -119.8];
const AQUASCAN_AOI_STORAGE_KEY = 'dpal_aquascan_saved_aoi_v2';
const RECOMMENDED_COMPARISON_PRESETS = [
  {
    id: 'recent-monthly',
    label: 'Preset A',
    description: 'Recent monthly comparison',
    before: { from: '2026-03-01', to: '2026-03-31' },
    after: { from: '2026-04-01', to: '2026-04-25' },
  },
  {
    id: 'summer-2025',
    label: 'Preset B',
    description: 'Wider historical summer comparison',
    before: { from: '2025-06-01', to: '2025-06-30' },
    after: { from: '2025-07-01', to: '2025-07-31' },
  },
  {
    id: 'fallback-2024',
    label: 'Preset C',
    description: 'Wider fallback test',
    before: { from: '2024-06-01', to: '2024-06-30' },
    after: { from: '2024-07-01', to: '2024-07-31' },
  },
] as const;

interface WaterProjectApiRecord {
  projectId: string;
  projectName: string;
  projectType?: string;
  status?: string;
  evidenceUrls?: string[];
  location?: {
    city?: string;
    country?: string;
    gpsCenter?: {
      lat?: number;
      lng?: number;
    };
  };
}

const concernWeights: Record<ConcernType, number> = {
  Turbidity: 48,
  'Algae Bloom': 52,
  Flooding: 59,
  Drought: 43,
  'Thermal Anomaly': 54,
  'Suspected Contamination': 68,
  Runoff: 51,
  'Industrial Discharge': 72,
};

function clampRisk(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function riskBand(score: number): RiskBand {
  if (score <= 25) return 'Low concern';
  if (score <= 50) return 'Watchlist';
  if (score <= 75) return 'Elevated';
  return 'High Risk';
}

function mapBandToStatus(score: number): WaterIndicator['status'] {
  const band = riskBand(score);
  if (band === 'Low concern') return 'Normal';
  if (band === 'Watchlist') return 'Watchlist';
  if (band === 'Elevated') return 'Elevated';
  return 'High Risk';
}

function buildAiSummary(concernType: ConcernType, locationName: string): string {
  const base = {
    Turbidity:
      'Satellite indicators show elevated turbidity compared to baseline conditions. The strongest anomaly appears downstream of the selected monitoring point.',
    'Algae Bloom':
      'Chlorophyll-style indicators are elevated against seasonal reference values, suggesting potential algae bloom development in low-flow pockets.',
    Flooding:
      'Water extent indicators show expansion beyond expected boundary limits. Radar-compatible flood signatures appear strongest in lower elevation sections.',
    Drought:
      'Basin storage signals and vegetation-water stress indicators suggest a sustained dry trend with reduced surface water persistence.',
    'Thermal Anomaly':
      'Thermal overlays indicate above-baseline surface temperature in localized stretches that may affect oxygen balance and ecosystem stress.',
    'Suspected Contamination':
      'Multi-layer screening indicates unusual patterns near the selected zone, including visible water-color variance and anomaly clustering downstream.',
    Runoff:
      'Edge and turbidity indicators show runoff-like signatures aligned with recent drainage pathways and likely sediment transport corridors.',
    'Industrial Discharge':
      'Combined thermal and optical indicators suggest a concentrated anomaly near probable discharge corridors, with stronger signal intensity downstream.',
  }[concernType];

  return `${base} This does not confirm contamination. Field sampling or lab testing is recommended before making a final determination for ${locationName}.`;
}

function statusTone(status: WaterIndicator['status']): string {
  if (status === 'Normal') return 'text-emerald-300 border-emerald-500/50 bg-emerald-900/20';
  if (status === 'Watchlist') return 'text-amber-200 border-amber-500/50 bg-amber-900/20';
  if (status === 'Elevated') return 'text-orange-200 border-orange-500/50 bg-orange-900/20';
  return 'text-rose-200 border-rose-500/50 bg-rose-900/20';
}

function statusLabel(status: WaterIndicator['status']): string {
  if (status === 'Elevated') return 'Elevated indicator - needs review';
  return status;
}

type BasemapStyle = 'satellite' | 'terrain' | 'dark';

function createOverlayState(overlayType: AquaScanOverlayType): AquaScanOverlayState {
  return {
    ok: false,
    overlayType,
    source: 'unavailable',
    sourceName: 'Unavailable',
    status: 'idle',
    geometry: null,
    rasterTileUrl: null,
    statistics: null,
    confidence: null,
    warnings: [],
  };
}

function createOverlayStateMap(): Record<AquaScanOverlayType, AquaScanOverlayState> {
  return {
    ndwi_water_presence: createOverlayState('ndwi_water_presence'),
    water_extent: createOverlayState('water_extent'),
    flood_wet: createOverlayState('flood_wet'),
    risk_zones: createOverlayState('risk_zones'),
    flow_direction: createOverlayState('flow_direction'),
  };
}

function overlayStatusLabel(overlay: AquaScanOverlayState): string {
  if (overlay.status === 'loading') return 'Loading live-derived overlay...';
  if (overlay.status === 'available') return 'Source: Copernicus-derived';
  if (overlay.status === 'unavailable' || overlay.status === 'error') return 'Live-derived overlay unavailable for this AOI/date.';
  return 'Live-derived overlay unavailable for this AOI/date.';
}

const layerToGibsLayer: Record<string, string> = {
  sentinel2: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
  landsat89: 'MODIS_Terra_CorrectedReflectance_TrueColor',
  sentinel1: 'MODIS_Terra_CorrectedReflectance_Bands367',
  sentinel3: 'MODIS_Aqua_CorrectedReflectance_TrueColor',
  swot: 'MODIS_Terra_Water_Vapor_5km_Day',
  gracefo: 'SMAP_L3_Passive_Day_SoilMoisture_Option1',
  ecostress: 'MODIS_Terra_Land_Surface_Temp_Day',
};

const layerToAnalysisKey: Record<string, string> = {
  sentinel2: 'ndwi',
  landsat89: 'water_extent',
  sentinel1: 'flood_wetness',
  sentinel3: 'chlorophyll_proxy',
  swot: 'surface_water',
  gracefo: 'water_storage',
  ecostress: 'thermal_anomaly',
};

function parseGpsCoords(query: string): { lat: number; lng: number } | null {
  const match = query.trim().match(/^(-?\d{1,3}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function polygonAreaSqKm(points: [number, number][]): number {
  if (points.length < 3) return 0;
  const lat0 = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  const kmPerDegLat = 111.32;
  const kmPerDegLng = 111.32 * Math.cos((lat0 * Math.PI) / 180);
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    const x1km = x1 * kmPerDegLng;
    const x2km = x2 * kmPerDegLng;
    const y1km = y1 * kmPerDegLat;
    const y2km = y2 * kmPerDegLat;
    sum += x1km * y2km - x2km * y1km;
  }
  return Math.abs(sum) / 2;
}

function parseCoordinateInput(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;
  // Allow common pasted formats like "40.1234," or extra spaces.
  const normalized = text.replace(/,/g, '').replace(/[^\d+-.]/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toAoiGeoJson(points: [number, number][] | null): CopernicusAoiGeoJson | null {
  if (!points || points.length < 3) return null;
  const ring = points.map(([lat, lng]) => [lng, lat]);
  const [firstLng, firstLat] = ring[0];
  const [lastLng, lastLat] = ring[ring.length - 1];
  if (firstLng !== lastLng || firstLat !== lastLat) {
    ring.push([firstLng, firstLat]);
  }
  return {
    type: 'Polygon',
    coordinates: [ring],
  };
}

function focusPointFromProject(project: AquaScanProject): [number, number] {
  const parsedLat = parseCoordinateInput(project.latitude);
  const parsedLng = parseCoordinateInput(project.longitude);
  if (parsedLat == null || parsedLng == null) {
    return DEFAULT_WEST_US_CENTER;
  }
  // Gracefully handle accidental lat/lng swap.
  if (Math.abs(parsedLat) > 90 && Math.abs(parsedLng) <= 90) {
    return [parsedLng, parsedLat];
  }
  if (Math.abs(parsedLat) > 90 || Math.abs(parsedLng) > 180 || (parsedLat === 0 && parsedLng === 0)) {
    return DEFAULT_WEST_US_CENTER;
  }
  return [parsedLat, parsedLng];
}

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
    ...opts,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error ?? `HTTP ${response.status}`);
  }
  return payload as T;
}

function mapProjectTypeToWaterBodyType(projectType?: string): AquaScanProject['waterBodyType'] {
  const normalized = String(projectType ?? '').toLowerCase();
  if (normalized.includes('wetland')) return 'Wetland';
  if (normalized.includes('reservoir')) return 'Reservoir';
  if (normalized.includes('coast')) return 'Coastal Area';
  if (normalized.includes('min')) return 'Mining Area';
  if (normalized.includes('industrial')) return 'Industrial Discharge Zone';
  if (normalized.includes('farm') || normalized.includes('irrigation')) return 'Farm Runoff Zone';
  if (normalized.includes('lake')) return 'Lake';
  return 'River';
}

function mapLiveProjectToAquaScanProject(project: WaterProjectApiRecord): AquaScanProject {
  const lat = project.location?.gpsCenter?.lat;
  const lng = project.location?.gpsCenter?.lng;
  return {
    id: project.projectId,
    projectName: project.projectName || 'Untitled project',
    waterBodyType: mapProjectTypeToWaterBodyType(project.projectType),
    locationName: [project.location?.city, project.location?.country].filter(Boolean).join(', ') || 'Unknown location',
    latitude: typeof lat === 'number' ? String(lat) : '',
    longitude: typeof lng === 'number' ? String(lng) : '',
    polygonPlaceholder: '',
    concernType: 'Turbidity',
    suspectedSource: 'Unknown',
    communityImpact: [],
    evidenceCount: Array.isArray(project.evidenceUrls) ? project.evidenceUrls.length : 0,
    hasLabResult: false,
    validatorStatus: project.status === 'approved' ? 'Validated' : project.status === 'monitoring' ? 'Reviewed' : 'Pending',
  };
}

function buildAoiStorageKey(location: FocusLocation | null, projectId: string): string | null {
  if (!location) return null;
  return `${projectId}:${location.latitude.toFixed(6)}:${location.longitude.toFixed(6)}`;
}

function nearbyEntityColor(category: string): string {
  const normalized = category.toLowerCase();
  if (normalized.includes('waste') || normalized.includes('sewage') || normalized.includes('landfill')) return '#f97316';
  if (normalized.includes('fuel') || normalized.includes('petroleum') || normalized.includes('storage')) return '#ef4444';
  if (normalized.includes('farm') || normalized.includes('agric')) return '#eab308';
  if (normalized.includes('water') || normalized.includes('utility')) return '#22c55e';
  return '#38bdf8';
}

function MapViewSync({ center }: { center: [number, number] }): null {
  const map = useMap();
  useEffect(() => {
    map.setView(center, Math.max(6, map.getZoom()));
  }, [center, map]);
  return null;
}

function MapResizeSync({ trigger }: { trigger: number }): null {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => {
      map.invalidateSize();
    }, 120);
    return () => window.clearTimeout(id);
  }, [map, trigger]);
  return null;
}

function MapInteractionCapture({
  drawingAoi,
  onInspect,
  onAoiPoint,
}: {
  drawingAoi: boolean;
  onInspect: (point: [number, number]) => void;
  onAoiPoint: (point: [number, number]) => void;
}): null {
  useMapEvents({
    click(event) {
      const point: [number, number] = [event.latlng.lat, event.latlng.lng];
      if (drawingAoi) {
        onAoiPoint(point);
        return;
      }
      onInspect(point);
    },
  });
  return null;
}

function MapCommandBridge({
  commandTick,
  command,
  center,
}: {
  commandTick: number;
  command: 'none' | 'zoomIn' | 'zoomOut' | 'panNorth' | 'panSouth' | 'panEast' | 'panWest' | 'reset';
  center: [number, number];
}): null {
  const map = useMap();
  useEffect(() => {
    if (!commandTick || command === 'none') return;
    if (command === 'zoomIn') map.zoomIn();
    if (command === 'zoomOut') map.zoomOut();
    if (command === 'panNorth') map.panBy([0, -140]);
    if (command === 'panSouth') map.panBy([0, 140]);
    if (command === 'panEast') map.panBy([140, 0]);
    if (command === 'panWest') map.panBy([-140, 0]);
    if (command === 'reset') map.setView(center, 7);
  }, [commandTick, command, center, map]);
  return null;
}

function AiSectionHelper({
  title,
  quickTip,
  bullets,
  helpersExpanded,
  tone = 'default',
}: {
  title: string;
  quickTip: string;
  bullets: string[];
  helpersExpanded: boolean;
  tone?: 'default' | 'setup' | 'location' | 'analysis' | 'report' | 'workflow';
}): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(helpersExpanded);
  }, [helpersExpanded]);

  const toneClasses: Record<NonNullable<typeof tone>, string> = {
    default: 'border-indigo-500/35 bg-indigo-950/20 text-indigo-100',
    setup: 'border-emerald-500/35 bg-emerald-950/20 text-emerald-100',
    location: 'border-sky-500/35 bg-sky-950/20 text-sky-100',
    analysis: 'border-cyan-500/35 bg-cyan-950/20 text-cyan-100',
    report: 'border-amber-500/35 bg-amber-950/20 text-amber-100',
    workflow: 'border-violet-500/35 bg-violet-950/20 text-violet-100',
  };

  return (
    <details
      open={isOpen}
      onToggle={(event) => setIsOpen((event.currentTarget as HTMLDetailsElement).open)}
      className={`mt-3 rounded-lg border px-3 py-2 text-xs ${toneClasses[tone]}`}
    >
      <summary className="cursor-pointer list-none font-semibold">
        AI helper: {title}
      </summary>
      <p className="mt-2">{quickTip}</p>
      <ul className="mt-2 space-y-1">
        {bullets.map((bullet) => (
          <li key={bullet}>- {bullet}</li>
        ))}
      </ul>
    </details>
  );
}

export default function AquaScanView({ onReturn, onOpenWaterOperations }: AquaScanViewProps) {
  const [projects, setProjects] = useState<AquaScanProject[]>([]);
  const [helpersExpanded, setHelpersExpanded] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('AQ-DRAFT');
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>(mockSatelliteLayers.slice(0, 3).map((l) => l.id));
  const [boundaryDrawn, setBoundaryDrawn] = useState(false);
  const [showPacket, setShowPacket] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [actionNotice, setActionNotice] = useState<string>('');
  const [commandTick, setCommandTick] = useState(0);
  const [mapCommand, setMapCommand] = useState<'none' | 'zoomIn' | 'zoomOut' | 'panNorth' | 'panSouth' | 'panEast' | 'panWest' | 'reset'>('none');
  const [mapExpanded, setMapExpanded] = useState(false);
  const [mapStyle, setMapStyle] = useState<BasemapStyle>('satellite');
  const [gpsMode, setGpsMode] = useState<'Inactive' | 'Active'>('Inactive');
  const [boundaryRevision, setBoundaryRevision] = useState(0);
  const [selectedDate, setSelectedDate] = useState(gibsDefaultDate());
  const [compareDate, setCompareDate] = useState(gibsDefaultDate());
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareOpacity, setCompareOpacity] = useState(35);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_WEST_US_CENTER);
  const [inspectedPoint, setInspectedPoint] = useState<[number, number] | null>(null);
  const [aoiPoints, setAoiPoints] = useState<[number, number][]>([]);
  const [savedAoiPoints, setSavedAoiPoints] = useState<[number, number][]>([]);
  const [drawingAoi, setDrawingAoi] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBusy, setSearchBusy] = useState(false);
  const [imageryLoading, setImageryLoading] = useState(true);
  const [imageryError, setImageryError] = useState<string | null>(null);
  const [beforeImageryError, setBeforeImageryError] = useState<string | null>(null);
  const [partialFailure, setPartialFailure] = useState(false);
  const [failingLayerName, setFailingLayerName] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>(new Date().toLocaleTimeString());
  const [waterApiLoading, setWaterApiLoading] = useState(false);
  const [waterApiError, setWaterApiError] = useState<string | null>(null);
  const [waterApiNotice, setWaterApiNotice] = useState<string | null>(null);
  const [liveDataRequired, setLiveDataRequired] = useState(false);
  const [liveDataReason, setLiveDataReason] = useState<string>('');
  const [liveRetryTick, setLiveRetryTick] = useState(0);
  const [waterApiMode, setWaterApiMode] = useState<'point' | 'aoi'>('point');
  const [waterData, setWaterData] = useState<WaterAnalysisResponse | null>(null);
  const [showRightLayerPanel, setShowRightLayerPanel] = useState(false);
  const [waterHistoryDelta, setWaterHistoryDelta] = useState<string>('Pending history');
  const [layerOpacity, setLayerOpacity] = useState(72);
  const [overlayState, setOverlayState] = useState({
    boundary: true,
    nearbyEntities: true,
  });
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const waterRequestAbortRef = useRef<AbortController | null>(null);
  const waterDebounceRef = useRef<number | null>(null);
  const entityLookupAbortRef = useRef<AbortController | null>(null);
  const overlayAbortRefs = useRef<Partial<Record<AquaScanOverlayType, AbortController>>>({});

  const [nearbyEntities, setNearbyEntities] = useState<NearbyEntity[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [entitiesError, setEntitiesError] = useState<string | null>(null);
  const [showAoiReviewNotice, setShowAoiReviewNotice] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

  const [draftProject, setDraftProject] = useState<AquaScanProject>({
    id: 'AQ-DRAFT',
    projectName: '',
    waterBodyType: 'River',
    locationName: '',
    latitude: '',
    longitude: '',
    polygonPlaceholder: '',
    concernType: 'Turbidity',
    suspectedSource: 'Unknown',
    communityImpact: [],
    evidenceCount: 0,
    hasLabResult: false,
    validatorStatus: 'Pending',
  });
  const [copernicusSetup, setCopernicusSetup] = useState(() => getCopernicusSetupState());
  const [selectedFocusLocation, setSelectedFocusLocation] = useState<FocusLocation | null>(null);
  const [activeTab, setActiveTab] = useState<'intake' | 'layers' | 'mrv' | 'evidence' | 'actions'>('intake');
  const [comparisonIndexType, setComparisonIndexType] = useState<CopernicusIndexType>('NDWI');
  const [comparisonCollection, setComparisonCollection] = useState<'sentinel-2-l2a' | 'sentinel-1-grd'>('sentinel-2-l2a');
  const [beforeRange, setBeforeRange] = useState({ from: gibsDefaultDate(), to: gibsDefaultDate() });
  const [afterRange, setAfterRange] = useState({ from: gibsDefaultDate(), to: gibsDefaultDate() });
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] = useState<CopernicusStatisticsComparisonResponse | null>(null);
  const [validatorGateStatus, setValidatorGateStatus] = useState<CopernicusValidatorStatus>('pending_review');
  const [overlayDateRange, setOverlayDateRange] = useState({ fromDate: '', toDate: '' });
  const [overlayThreshold, setOverlayThreshold] = useState(0.2);
  const [overlayResults, setOverlayResults] = useState<Record<AquaScanOverlayType, AquaScanOverlayState>>(() => createOverlayStateMap());
  const [selectedMeasurementOverlay, setSelectedMeasurementOverlay] = useState<AquaScanOverlayType>('ndwi_water_presence');
  const [calculationHistory, setCalculationHistory] = useState<Array<{
    calculationId: string;
    projectId: string;
    indexType: CopernicusIndexType;
    before: { from: string; to: string };
    after: { from: string; to: string };
    deltaPercent: number | null;
    confidenceScore: number;
    validatorStatus: CopernicusValidatorStatus;
    generatedAt: string;
  }>>([]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? draftProject,
    [projects, selectedProjectId, draftProject],
  );
  const activeGibsLayer = useMemo(
    () =>
      GIBS_LAYERS.find((layer) => layer.id === layerToGibsLayer[selectedLayerIds[0] ?? 'sentinel2'])
      ?? GIBS_LAYERS[0],
    [selectedLayerIds],
  );
  const tileUrl = useMemo(
    () => gibsTileUrl(activeGibsLayer.id, selectedDate, activeGibsLayer.tileMatrixLevel, activeGibsLayer.format),
    [activeGibsLayer, selectedDate],
  );
  const compareTileUrl = useMemo(
    () => gibsTileUrl(activeGibsLayer.id, compareDate, activeGibsLayer.tileMatrixLevel, activeGibsLayer.format),
    [activeGibsLayer, compareDate],
  );
  const selectedAnalysisLayer = layerToAnalysisKey[selectedLayerIds[0] ?? 'sentinel2'] ?? 'ndwi';
  const draftAoiPreview = aoiPoints.length >= 3 ? aoiPoints : null;
  const savedAoi = savedAoiPoints.length >= 3 ? savedAoiPoints : null;
  const savedAoiAreaSqKm = polygonAreaSqKm(savedAoi ?? []);
  const savedAoiAreaHectares = savedAoiAreaSqKm * 100;
  const savedAoiGeoJson = useMemo(() => toAoiGeoJson(savedAoi), [savedAoi]);
  const savedAoiSignature = useMemo(() => JSON.stringify(savedAoi ?? []), [savedAoi]);
  const aoiStorageKey = useMemo(
    () => buildAoiStorageKey(selectedFocusLocation, selectedProjectId),
    [selectedFocusLocation, selectedProjectId],
  );
  const hasSavedAoi = Boolean(savedAoiGeoJson);
  const readySavedAoi = hasSavedAoi && !drawingAoi;
  const overlayBlockReason = !selectedFocusLocation
    ? 'Select a focus location first.'
    : !readySavedAoi
      ? 'Draw and save an AOI before requesting overlays.'
      : !comparisonResult
        ? 'Run a successful AOI comparison first.'
      : !overlayDateRange.fromDate || !overlayDateRange.toDate
        ? 'Select an overlay date range first.'
        : '';

  function clearLiveOverlayState(): void {
    Object.values(overlayAbortRefs.current).forEach((controller) => controller?.abort());
    overlayAbortRefs.current = {};
    setOverlayResults(createOverlayStateMap());
  }

  function clearMeasurementOutputs(): void {
    setComparisonResult(null);
    setComparisonError(null);
    setShowPacket(false);
    setValidatorGateStatus('pending_review');
    clearLiveOverlayState();
  }

  function clearAoiState(options?: { removePersisted?: boolean; notice?: string }): void {
    setAoiPoints([]);
    setSavedAoiPoints([]);
    setDrawingAoi(false);
    setBoundaryDrawn(false);
    setBoundaryRevision((prev) => prev + 1);
    setSelectedFocusLocation((prev) => (prev ? { ...prev, aoiGeoJson: null } : prev));
    clearMeasurementOutputs();
    if (options?.removePersisted && aoiStorageKey) {
      const raw = localStorage.getItem(AQUASCAN_AOI_STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Record<string, [number, number][]>;
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            delete parsed[aoiStorageKey];
            localStorage.setItem(AQUASCAN_AOI_STORAGE_KEY, JSON.stringify(parsed));
          }
        } catch {
          localStorage.removeItem(AQUASCAN_AOI_STORAGE_KEY);
        }
      }
    }
    if (options?.notice) {
      setActionNotice(options.notice);
    }
  }

  function startAoiDrawing(): void {
    if (!selectedFocusLocation) {
      setActionNotice('Select a focus location before drawing an AOI.');
      return;
    }
    if (drawingAoi) {
      setDrawingAoi(false);
      setActionNotice('AOI drawing mode paused.');
      return;
    }
    setAoiPoints([]);
    setDrawingAoi(true);
    setBoundaryDrawn(true);
    clearMeasurementOutputs();
    setActionNotice('AOI drawing mode active. Click points on the map around the area to measure.');
  }

  function applyComparisonPreset(preset: (typeof RECOMMENDED_COMPARISON_PRESETS)[number]): void {
    setBeforeRange({ ...preset.before });
    setAfterRange({ ...preset.after });
    setActionNotice(`Applied ${preset.label}: ${preset.description}.`);
  }

  useEffect(() => {
    if (selectedFocusLocation) {
      setMapCenter([selectedFocusLocation.latitude, selectedFocusLocation.longitude]);
    }
  }, [selectedFocusLocation]);

  useEffect(() => {
    if (!aoiStorageKey) {
      setAoiPoints([]);
      setSavedAoiPoints([]);
      return;
    }
    const stored = localStorage.getItem(AQUASCAN_AOI_STORAGE_KEY);
    if (!stored) {
      setAoiPoints([]);
      setSavedAoiPoints([]);
      return;
    }
    try {
      const parsed = JSON.parse(stored) as Record<string, [number, number][]>;
      const savedPoints = parsed?.[aoiStorageKey];
      if (Array.isArray(savedPoints)) {
        setSavedAoiPoints(savedPoints);
        setBoundaryDrawn(savedPoints.length >= 3);
        setSelectedFocusLocation((prev) => (
          prev && savedPoints.length >= 3
            ? { ...prev, aoiGeoJson: toAoiGeoJson(savedPoints) }
            : prev
        ));
      } else {
        setSavedAoiPoints([]);
        setBoundaryDrawn(false);
        setSelectedFocusLocation((prev) => (prev ? { ...prev, aoiGeoJson: null } : prev));
      }
      setAoiPoints([]);
    } catch {
      setSavedAoiPoints([]);
      setAoiPoints([]);
    }
  }, [aoiStorageKey]);

  useEffect(() => () => {
    if (waterRequestAbortRef.current) {
      waterRequestAbortRef.current.abort();
    }
    if (waterDebounceRef.current) {
      window.clearTimeout(waterDebounceRef.current);
    }
    if (entityLookupAbortRef.current) {
      entityLookupAbortRef.current.abort();
    }
    Object.values(overlayAbortRefs.current).forEach((controller) => controller?.abort());
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchCopernicusSetupState(controller.signal)
      .then((status) => setCopernicusSetup(status))
      .catch(() => {
        setCopernicusSetup((prev) => ({
          ...prev,
          configured: false,
          message: 'Copernicus backend not configured',
        }));
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<{ ok: boolean; projects: WaterProjectApiRecord[] }>(apiUrl(API_ROUTES.WATER_PROJECTS), {
      signal: controller.signal,
    })
      .then((payload) => {
        setProjects(Array.isArray(payload.projects) ? payload.projects.map(mapLiveProjectToAquaScanProject) : []);
      })
      .catch(() => {
        setProjects([]);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const key = `dpal_aquascan_calc_history_${selectedProject.id}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        setCalculationHistory([]);
        return;
      }
      const parsed = JSON.parse(raw) as typeof calculationHistory;
      setCalculationHistory(Array.isArray(parsed) ? parsed : []);
    } catch {
      setCalculationHistory([]);
    }
  }, [selectedProject.id]);

  useEffect(() => {
    const key = `dpal_aquascan_calc_history_${selectedProject.id}`;
    localStorage.setItem(key, JSON.stringify(calculationHistory));
  }, [calculationHistory, selectedProject.id]);

  useEffect(() => {
    clearLiveOverlayState();
  }, [
    selectedFocusLocation?.latitude,
    selectedFocusLocation?.longitude,
    savedAoiSignature,
    overlayDateRange.fromDate,
    overlayDateRange.toDate,
    comparisonCollection,
    comparisonIndexType,
    overlayThreshold,
  ]);

  useEffect(() => {
    if (!selectedFocusLocation) {
      if (waterDebounceRef.current) {
        window.clearTimeout(waterDebounceRef.current);
      }
      if (waterRequestAbortRef.current) {
        waterRequestAbortRef.current.abort();
      }
      setWaterApiLoading(false);
      return;
    }
    const point: [number, number] = inspectedPoint ?? [selectedFocusLocation.latitude, selectedFocusLocation.longitude];
    const shouldUseAoi = Boolean(savedAoi && savedAoi.length >= 3);
    if (waterDebounceRef.current) {
      window.clearTimeout(waterDebounceRef.current);
    }
    if (waterRequestAbortRef.current) {
      waterRequestAbortRef.current.abort();
    }

    waterDebounceRef.current = window.setTimeout(async () => {
      const controller = new AbortController();
      waterRequestAbortRef.current = controller;
      setWaterApiLoading(true);
      setWaterApiError(null);
      setWaterApiNotice('Fetching water intelligence for selected area...');
      setWaterApiMode(shouldUseAoi ? 'aoi' : 'point');
      try {
        const snapshot = shouldUseAoi
          ? await getWaterSnapshotByAOI({
              polygonCoordinates: savedAoi as [number, number][],
              date: selectedDate,
              layer: selectedAnalysisLayer,
              signal: controller.signal,
            })
          : await getWaterSnapshotByPoint({
              lat: point[0],
              lng: point[1],
              date: selectedDate,
              layer: selectedAnalysisLayer,
              signal: controller.signal,
            });
        setWaterData(snapshot);
        setLiveDataRequired(false);
        setLiveDataReason('');

        const history = await getWaterHistory({
          lat: shouldUseAoi ? undefined : point[0],
          lng: shouldUseAoi ? undefined : point[1],
          polygonCoordinates: shouldUseAoi ? (savedAoi as [number, number][]) : undefined,
          startDate: compareEnabled ? compareDate : selectedDate,
          endDate: selectedDate,
          layer: selectedAnalysisLayer,
          signal: controller.signal,
        });
        const [first, last] = [history.points[0], history.points[history.points.length - 1]];
        if (first?.ndwi != null && last?.ndwi != null) {
          const delta = (last.ndwi - first.ndwi).toFixed(2);
          setWaterHistoryDelta(`${delta.startsWith('-') ? '' : '+'}${delta} NDWI from ${first.date} to ${last.date}`);
        } else {
          setWaterHistoryDelta('History available, limited NDWI values');
        }

        if (snapshot.status.qualityFlag === 'Cloudy' || snapshot.status.qualityFlag === 'Partial') {
          setWaterApiNotice('Cloud cover or tile quality may limit confidence.');
        } else if (snapshot.status.qualityFlag === 'Estimated') {
          setWaterApiNotice('Satellite-derived values are estimated for this selection.');
        } else {
          setWaterApiNotice(null);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setWaterApiError(error instanceof Error ? error.message : 'Live water data unavailable for the current selection.');
        setWaterApiNotice('Live water data unavailable. Showing base map and overlays only.');
        setLiveDataRequired(true);
        setLiveDataReason(error instanceof Error ? error.message : 'Required /api/water endpoints are unavailable for this selection.');
      } finally {
        if (!controller.signal.aborted) {
          setWaterApiLoading(false);
          setLastRefreshTime(new Date().toLocaleTimeString());
        }
      }
    }, 320);

    return () => {
      if (waterDebounceRef.current) {
        window.clearTimeout(waterDebounceRef.current);
      }
    };
  }, [compareDate, compareEnabled, inspectedPoint, liveRetryTick, savedAoi, selectedAnalysisLayer, selectedDate, selectedFocusLocation]);

  const validatorStatus = selectedProject.validatorStatus;

  const anomalyLayerCount = selectedLayerIds.length;

  const riskScore = useMemo(() => {
    const base = concernWeights[selectedProject.concernType] ?? 40;
    const evidenceBoost = Math.min(18, selectedProject.evidenceCount * 4);
    const anomalyBoost = anomalyLayerCount >= 5 ? 14 : anomalyLayerCount >= 3 ? 8 : 4;
    const boundaryBoost = readySavedAoi ? 6 : 0;
    const validatorBoost = selectedProject.validatorStatus === 'Validated' ? 8 : selectedProject.validatorStatus === 'Reviewed' ? 4 : 0;
    const labReduction = selectedProject.hasLabResult ? -10 : 0;
    return clampRisk(base + evidenceBoost + anomalyBoost + boundaryBoost + validatorBoost + labReduction);
  }, [selectedProject, anomalyLayerCount, readySavedAoi]);

  const indicators = useMemo<WaterIndicator[]>(() => {
    const status = mapBandToStatus(riskScore);
    const api = waterData?.waterAnalysis;
    const quality = waterData?.status;
    return [
      { id: 'turbidity', label: 'Turbidity Proxy', value: api?.turbidityProxy ?? 'Data unavailable', trend: waterData ? waterHistoryDelta : 'Waiting for live snapshot', status, explanation: 'A satellite-derived screening estimate related to water clarity. It is not a lab turbidity measurement.' },
      { id: 'algae', label: 'Water Presence', value: api?.waterPresence ?? 'Data unavailable', trend: waterData ? 'Derived from selected product' : 'Waiting for live snapshot', status, explanation: 'Indicates whether selected satellite/model layers detect surface water in the selected area.' },
      { id: 'extent', label: 'Surface Water Estimate', value: api?.surfaceWaterEstimate ?? 'Data unavailable', trend: waterData ? waterHistoryDelta : 'Waiting for live snapshot', status, explanation: 'Estimated water extent from satellite/model layers. Medium means water is detected but confidence or coverage may be limited.' },
      { id: 'flood', label: 'Risk Level', value: quality?.riskLevel ?? 'Data unavailable', trend: quality?.qualityFlag ? `Quality: ${quality.qualityFlag}` : 'Awaiting live quality flags', status, explanation: 'Combines water indicators, anomaly status, evidence points, and confidence. It is a review priority, not a legal conclusion.' },
      { id: 'drought', label: 'Drought Stress', value: waterData ? `${Math.round(riskScore * 0.62)}/100` : 'Data unavailable', trend: waterData ? 'Stable over 30 days' : 'Awaiting live trend window', status, explanation: 'Storage and stress patterns from basin-scale indicators.' },
      { id: 'thermal', label: 'Thermal Anomaly', value: api?.thermalAnomaly ?? 'Data unavailable', trend: waterData ? '+3% this week' : 'Awaiting live thermal layer', status, explanation: 'Thermal anomaly indicator detected - review needed.' },
      { id: 'confidence', label: 'Snapshot Confidence', value: api?.confidence != null ? `${Math.round(api.confidence * 100)}%` : 'Data unavailable', trend: `${selectedProject.evidenceCount} evidence item(s) logged`, status, explanation: 'Confidence in the current map snapshot based on layer availability, cloud/coverage quality, and evidence completeness.' },
      { id: 'validator', label: 'Verification Status', value: validatorStatus, trend: validatorStatus === 'Validated' ? 'Validator-approved packet' : 'Awaiting final validation', status, explanation: 'Current verification state of the evidence package.' },
    ];
  }, [anomalyLayerCount, riskScore, selectedProject.evidenceCount, validatorStatus, waterData, waterHistoryDelta]);

  const aiSummary = useMemo(
    () => buildAiSummary(selectedProject.concernType, selectedProject.locationName || 'the selected area'),
    [selectedProject.concernType, selectedProject.locationName],
  );
  const inspectPoint = inspectedPoint ?? mapCenter;
  // Only surface real live values — never fabricate readings when waterData is absent.
  const inspectNdwiEstimate: number | null = waterData?.waterAnalysis.ndwi ?? null;
  const inspectWaterExtentEstimate = waterData?.waterAnalysis.surfaceWaterEstimate ?? 'Pending live data';
  const inspectFloodWetnessEstimate = waterData?.status.riskLevel ?? 'Pending live data';
  const inspectQualityConfidence: number | null = waterData?.waterAnalysis.confidence != null
    ? Math.round(waterData.waterAnalysis.confidence * 100)
    : null;
  const recommendedNextStep = useMemo(() => {
    if (!selectedFocusLocation) return 'Select a focus location to begin.';
    if (drawingAoi) return 'Continue adding AOI points, then save the AOI.';
    if (!readySavedAoi) return 'Draw an AOI to begin measurement.';
    if (!comparisonResult) return 'Select NDWI, apply dates, and calculate comparison.';
    if (riskScore <= 25) return 'Continue monitoring.';
    if (String(waterData?.waterAnalysis.turbidityProxy ?? '').toLowerCase().includes('high') || riskScore > 50) {
      return 'Request water sample.';
    }
    if (String(waterData?.waterAnalysis.thermalAnomaly ?? '').toLowerCase().includes('elevated') || String(waterData?.waterAnalysis.thermalAnomaly ?? '').toLowerCase().includes('detected')) {
      return 'Compare date/layers and inspect area.';
    }
    if ((inspectQualityConfidence ?? 0) < 65) return 'Add evidence or change satellite date.';
    return 'Notify authority or launch field mission if indicators remain strong after validation.';
  }, [comparisonResult, drawingAoi, readySavedAoi, inspectQualityConfidence, riskScore, selectedFocusLocation, waterData?.waterAnalysis.thermalAnomaly, waterData?.waterAnalysis.turbidityProxy]);

  const displayAiSummary = useMemo(() => {
    if (!selectedFocusLocation) {
      return 'Select a focus location to begin water intelligence analysis.';
    }
    if (!waterData) {
      return 'Live satellite intelligence is unavailable for the selected location. Select a valid AOI/date range or retry live data before generating a conclusion.';
    }
    return buildAiSummary(selectedProject.concernType, selectedFocusLocation.displayName.split(',')[0]);
  }, [selectedFocusLocation, waterData, selectedProject.concernType]);
  const toolsRunning = searchBusy || entitiesLoading || waterApiLoading;
  const toolsStatusLabel = searchBusy
    ? 'Searching focus location...'
    : entitiesLoading && waterApiLoading
      ? 'Running nearby search and satellite analysis...'
      : entitiesLoading
        ? 'Searching nearby mapped entities...'
        : waterApiLoading
          ? 'Running satellite analysis...'
          : null;

  const focusAoiStatus = drawingAoi
    ? `Drawing (${aoiPoints.length} pts)`
    : hasSavedAoi
      ? 'Saved'
      : 'Required';

  type WorkflowStepStatus = 'complete' | 'needs_attention' | 'locked' | 'pending' | 'in_progress';
  const workflowSteps: Array<{
    id: string;
    label: string;
    status: WorkflowStepStatus;
    statusText: string;
    tabId?: 'intake' | 'layers' | 'mrv' | 'evidence' | 'actions';
  }> = [
    { id: 'location', label: 'Location', status: selectedFocusLocation ? 'complete' : 'needs_attention', statusText: selectedFocusLocation ? 'Done' : 'Required' },
    {
      id: 'boundary',
      label: 'Boundary',
      status: !selectedFocusLocation ? 'locked' : drawingAoi ? 'in_progress' : readySavedAoi ? 'complete' : 'needs_attention',
      statusText: !selectedFocusLocation ? 'Locked' : drawingAoi ? 'Drawing' : readySavedAoi ? 'Done' : 'Required',
      tabId: 'intake',
    },
    {
      id: 'layers',
      label: 'Layers',
      status: !selectedFocusLocation ? 'locked' : !readySavedAoi ? 'needs_attention' : selectedLayerIds.length > 0 ? 'complete' : 'pending',
      statusText: !selectedFocusLocation ? 'Locked' : !readySavedAoi ? 'Needs AOI' : selectedLayerIds.length > 0 ? 'Done' : 'Needed',
      tabId: 'layers',
    },
    {
      id: 'compare',
      label: 'Compare',
      status: !selectedFocusLocation || !readySavedAoi ? 'locked' : comparisonResult ? 'complete' : 'pending',
      statusText: !selectedFocusLocation || !readySavedAoi ? 'Locked' : comparisonResult ? 'Done' : 'Needed',
      tabId: 'mrv',
    },
    {
      id: 'evidence',
      label: 'Evidence',
      status: !selectedFocusLocation || !readySavedAoi ? 'locked' : showPacket ? 'complete' : 'pending',
      statusText: !selectedFocusLocation || !readySavedAoi ? 'Locked' : showPacket ? 'Done' : 'Needed',
      tabId: 'evidence',
    },
    {
      id: 'action',
      label: 'Action',
      status: !showPacket ? 'locked' : 'pending',
      statusText: !showPacket ? 'Locked' : 'Needed',
      tabId: 'actions',
    },
  ];

  const mrvBlockReason = !selectedFocusLocation
    ? 'Select a focus location first.'
    : !readySavedAoi
      ? 'Draw and save AOI first.'
      : !comparisonIndexType
        ? 'Select an index first.'
        : !beforeRange.from || !beforeRange.to || !afterRange.from || !afterRange.to
          ? 'Select before and after date ranges.'
          : beforeRange.from === afterRange.from && beforeRange.to === afterRange.to
            ? 'Before and after ranges must be different.'
            : !copernicusSetup.configured
              ? 'Backend unavailable.'
              : '';
  const canCalculateMrv = mrvBlockReason === '' && !comparisonLoading;
  const overlayDefinitions: Array<{
    overlayType: AquaScanOverlayType;
    label: string;
    sourceLabel: string;
    pathColor: string;
    fillOpacity: number;
    dashArray?: string;
  }> = [
    { overlayType: 'ndwi_water_presence', label: 'NDWI overlay', sourceLabel: 'Live-derived NDWI water presence from backend.', pathColor: '#38bdf8', fillOpacity: 0.26 },
    { overlayType: 'water_extent', label: 'Water extent', sourceLabel: 'Live-derived water classification.', pathColor: '#14b8a6', fillOpacity: 0.22 },
    { overlayType: 'flood_wet', label: 'Flood/wet', sourceLabel: 'Live-derived flood or wetness layer.', pathColor: '#6366f1', fillOpacity: 0.2 },
    { overlayType: 'risk_zones', label: 'Risk zones', sourceLabel: 'Backend-calculated risk geometry only.', pathColor: '#f59e0b', fillOpacity: 0.18, dashArray: '4 4' },
    { overlayType: 'flow_direction', label: 'Flow direction', sourceLabel: 'Backend hydrology or saved flow feature only.', pathColor: '#22c55e', fillOpacity: 0, dashArray: '6 6' },
  ];
  const liveOverlayList = overlayDefinitions.map((definition) => ({
    ...definition,
    overlay: overlayResults[definition.overlayType],
  }));
  const overlayIdleLabel = !selectedFocusLocation
    ? 'Needs focus location'
    : !readySavedAoi
      ? 'Needs AOI'
      : !comparisonResult
        ? 'Needs comparison'
      : !overlayDateRange.fromDate || !overlayDateRange.toDate
        ? 'Needs date range'
        : 'Ready to request';
  const measurementOverlay = useMemo(() => {
    const selected = overlayResults[selectedMeasurementOverlay];
    if (selected.status !== 'idle') return selected;
    return Object.values(overlayResults).find((overlay) => overlay.status === 'available')
      ?? Object.values(overlayResults).find((overlay) => overlay.status === 'unavailable' || overlay.status === 'loading')
      ?? null;
  }, [overlayResults, selectedMeasurementOverlay]);
  const overlayMeasurementRecords = useMemo(
    () =>
      liveOverlayList
        .filter(({ overlay }) => overlay.status === 'available' && overlay.statistics)
        .map(({ overlayType, label, overlay }) => ({
          overlayType,
          label,
          areaSqKm: Number(savedAoiAreaSqKm.toFixed(4)),
          areaHectares: Number(savedAoiAreaHectares.toFixed(2)),
          indexType: overlay.indexType ?? comparisonIndexType,
          collection: overlay.collection ?? comparisonCollection,
          dateRange: overlay.dateRange ?? overlayDateRange,
          threshold: overlay.threshold ?? overlayThreshold,
          mean: overlay.statistics?.mean ?? null,
          min: overlay.statistics?.min ?? null,
          max: overlay.statistics?.max ?? null,
          standardDeviation: overlay.statistics?.standardDeviation ?? null,
          sampleCount: overlay.statistics?.sampleCount ?? 0,
          noDataCount: overlay.statistics?.noDataCount ?? 0,
          cloudCover: overlay.statistics?.cloudCover ?? null,
          confidence: overlay.confidence ?? overlay.statistics?.confidence ?? null,
          source: overlay.sourceName,
          generatedAt: overlay.generatedAt ?? null,
          resolutionMeters: overlay.statistics?.resolutionMeters ?? null,
        })),
    [savedAoiAreaHectares, savedAoiAreaSqKm, comparisonCollection, comparisonIndexType, liveOverlayList, overlayDateRange, overlayThreshold],
  );
  const overlayPacketRecords = useMemo(
    () =>
      liveOverlayList
        .filter(({ overlay }) => overlay.status !== 'idle')
        .map(({ overlayType, overlay }) => (
          overlay.status === 'available'
            ? {
                overlayType,
                source: overlay.source,
                status: 'available',
                geometryIncluded: Boolean(overlay.geometry),
                rasterIncluded: Boolean(overlay.rasterTileUrl),
                generatedAt: overlay.generatedAt ?? '',
                disclaimer: 'Live-derived satellite overlays are screening indicators and require validation.',
              }
            : {
                overlayType,
                status: 'unavailable',
                reason: overlay.reason || 'No live-derived overlay returned.',
              }
        )),
    [liveOverlayList],
  );

  const packetPreview = useMemo(() => {
    return {
      packetId: `PKT-${selectedProject.id || 'DRAFT'}-${selectedDate.replace(/-/g, '')}`,
      auditId: `AUD-${new Date().toISOString().slice(0, 10)}-${selectedProject.id || 'draft'}`,
      ledgerHash: 'Pending ledger publication',
      validatorStatus,
      projectName: selectedProject.projectName || 'Unnamed project',
      location: selectedProject.locationName || 'No location selected',
      scanType: selectedProject.concernType,
      selectedLayers: mockSatelliteLayers.filter((layer) => selectedLayerIds.includes(layer.id)).map((layer) => layer.name),
      timestamp: new Date().toLocaleString(),
      riskScore,
      aiSummary,
      uploadedEvidence: selectedProject.evidenceCount,
      coordinates: selectedFocusLocation
        ? { lat: selectedFocusLocation.latitude, lng: selectedFocusLocation.longitude }
        : { lat: mapCenter[0], lng: mapCenter[1] },
      aoiBoundary: savedAoi ?? [],
      selectedDate,
      ndwi: inspectNdwiEstimate != null ? Number(inspectNdwiEstimate.toFixed(2)) : null,
      waterPresence: waterData?.waterAnalysis.waterPresence ?? 'Pending live data',
      turbidityProxy: waterData?.waterAnalysis.turbidityProxy ?? 'Pending live data',
      thermalAnomaly: waterData?.waterAnalysis.thermalAnomaly ?? 'Pending live data',
      confidenceScore: inspectQualityConfidence ?? null,
      nearbyEntitiesCount: overlayState.nearbyEntities ? nearbyEntities.length : 0,
      tileStatus: imageryError ? 'Failed' : partialFailure ? 'Partial' : imageryLoading ? 'Loading' : 'Active',
      legalSafeNote:
        'DPAL AquaScan identifies potential water-risk indicators using satellite, field, and community evidence. It does not claim confirmed contamination without laboratory testing, field validation, or official verification. Live-derived satellite measurements are screening indicators and require validator review, field evidence, or laboratory confirmation before official conclusions.',
      recommendedNextAction:
        riskBand(riskScore) === 'High Risk'
          ? 'Escalate with field sampling and notify relevant authority.'
          : 'Review the AOI comparison, then request sampling or validator review as needed.',
    };
  }, [selectedProject, selectedLayerIds, riskScore, aiSummary, validatorStatus, selectedFocusLocation, mapCenter, savedAoi, selectedDate, inspectNdwiEstimate, waterData?.waterAnalysis.waterPresence, waterData?.waterAnalysis.turbidityProxy, waterData?.waterAnalysis.thermalAnomaly, inspectQualityConfidence, overlayState.nearbyEntities, nearbyEntities.length, imageryError, partialFailure, imageryLoading]);
  const evidencePacket = useMemo<SatelliteEvidencePacket>(() => {
    const beforeValue = comparisonResult?.before.mean ?? null;
    const afterValue = comparisonResult?.after.mean ?? null;
    const deltaPercent = comparisonResult?.delta.percentChange ?? null;
    return {
      projectId: selectedProject.id,
      projectName: selectedProject.projectName || 'Unnamed project',
      aoiGeoJson: savedAoiGeoJson,
      centerLatLng: selectedFocusLocation
        ? { lat: selectedFocusLocation.latitude, lng: selectedFocusLocation.longitude }
        : { lat: mapCenter[0], lng: mapCenter[1] },
      satelliteCollection: comparisonResult?.collection ?? comparisonCollection,
      productId: waterData?.satellite.product ?? 'S2_L2A_PENDING_PRODUCT_ID',
      acquisitionDate: comparisonResult?.generatedAt ?? waterData?.satellite.acquisitionDate ?? selectedDate,
      cloudCover: waterData?.satellite.cloudCover ?? 'unavailable',
      indexType: comparisonResult?.indexType ?? comparisonIndexType,
      beforeValue,
      afterValue,
      deltaPercent,
      confidenceScore: comparisonResult?.confidenceScore ?? ((inspectQualityConfidence ?? 0) / 100),
      dataSourceCitation: comparisonResult?.sourceCitation ?? 'Copernicus Sentinel Hub + DPAL Water Analysis',
      assumptions: [
        'Satellite index values are indicative and depend on scene quality.',
        'Before/after values are generated from backend-controlled index formulas.',
        'Live-derived satellite overlays are screening indicators and require validation.',
      ],
      limitations: [
        'Not a certified carbon credit determination.',
        'Field validation and applicable methodology checks are required before certification claims.',
      ],
      generatedAt: new Date().toISOString(),
      validatorStatus: validatorGateStatus,
      photos: [],
      measurements: overlayMeasurementRecords,
      overlays: overlayPacketRecords,
      notes: `Indicative MRV estimate - not certified carbon credit. ${packetPreview.legalSafeNote}${comparisonResult ? '' : ' Measurement not yet completed.'}${!waterData ? ' NDWI and water index values are pending live satellite data (status: pending_live_data, source: unavailable_for_current_selection). Not confirmed satellite measurements.' : ''}${comparisonResult?.warnings.length ? ` Warnings: ${comparisonResult.warnings.join(' | ')}` : ''}`,
    };
  }, [comparisonCollection, comparisonIndexType, comparisonResult, inspectQualityConfidence, selectedFocusLocation, mapCenter, overlayMeasurementRecords, overlayPacketRecords, packetPreview.legalSafeNote, selectedDate, selectedProject.id, selectedProject.projectName, validatorGateStatus, waterData?.satellite.acquisitionDate, waterData?.satellite.cloudCover, waterData?.satellite.product, savedAoiGeoJson]);
  const canGenerateEvidencePacket = Boolean(selectedFocusLocation && readySavedAoi);
  const evidencePacketPayload = useMemo(() => ({
    ...evidencePacket,
    focusLocation: selectedFocusLocation
      ? {
          displayName: selectedFocusLocation.displayName,
          latitude: selectedFocusLocation.latitude,
          longitude: selectedFocusLocation.longitude,
        }
      : null,
    aoiArea: {
      hectares: Number(savedAoiAreaHectares.toFixed(2)),
      squareKilometers: Number(savedAoiAreaSqKm.toFixed(4)),
    },
    dateRanges: {
      before: { ...beforeRange },
      after: { ...afterRange },
    },
    measurementStatus: comparisonResult ? 'completed' : 'Measurement not yet completed.',
    measurementSource: comparisonResult ? 'Copernicus AOI statistics' : 'Measurement unavailable',
    measurements: comparisonResult
      ? [{
          beforeMean: comparisonResult.before.mean,
          afterMean: comparisonResult.after.mean,
          absoluteChange: comparisonResult.delta.absoluteChange,
          percentChange: comparisonResult.delta.percentChange,
          sampleCount: {
            before: comparisonResult.before.sampleCount,
            after: comparisonResult.after.sampleCount,
          },
          noDataCount: {
            before: comparisonResult.before.noDataCount,
            after: comparisonResult.after.noDataCount,
          },
          cloudCover: {
            before: comparisonResult.before.cloudCoverage,
            after: comparisonResult.after.cloudCoverage,
          },
          confidence: comparisonResult.confidenceScore,
          interpretation: comparisonResult.delta.interpretation,
          warnings: comparisonResult.warnings,
        }]
      : [],
    overlaysStatus: overlayPacketRecords,
    nearbyContext: {
      searchRadiusKm: 5,
      entities: nearbyEntities,
      disclaimer: 'Nearby mapped entities are contextual leads only and do not prove responsibility.',
    },
    warnings: comparisonResult?.warnings ?? [],
    limitations: evidencePacket.limitations,
    disclaimer: packetPreview.legalSafeNote,
  }), [beforeRange, afterRange, comparisonResult, evidencePacket, nearbyEntities, overlayPacketRecords, packetPreview.legalSafeNote, savedAoiAreaHectares, savedAoiAreaSqKm, selectedFocusLocation]);

  const latitudeDisplayValue = parseCoordinateInput(selectedProject.latitude);
  const longitudeDisplayValue = parseCoordinateInput(selectedProject.longitude);
  const latitudeDisplay = latitudeDisplayValue == null ? 'N/A' : latitudeDisplayValue.toFixed(4);
  const longitudeDisplay = longitudeDisplayValue == null ? 'N/A' : longitudeDisplayValue.toFixed(4);

  function toggleLayer(layerId: string): void {
    setSelectedLayerIds((prev) =>
      prev.includes(layerId) ? prev.filter((id) => id !== layerId) : [...prev, layerId],
    );
  }

  function updateSelectedProject(patch: Partial<AquaScanProject>): void {
    setProjects((prev) => prev.map((project) => (project.id === selectedProjectId ? { ...project, ...patch } : project)));
  }

  function addEvidenceItem(): void {
    if (selectedProjectId) {
      updateSelectedProject({ evidenceCount: selectedProject.evidenceCount + 1 });
    }
    setActionNotice('Evidence item added.');
  }

  function saveDraftProject(): void {
    if (!draftProject.projectName.trim() || !draftProject.locationName.trim()) {
      setActionNotice('Add project name and location before saving.');
      return;
    }
    const lat = Number.parseFloat(draftProject.latitude || '0');
    const lng = Number.parseFloat(draftProject.longitude || '0');
    void apiFetch<{ ok: boolean; project: WaterProjectApiRecord }>(apiUrl(API_ROUTES.WATER_PROJECTS), {
      method: 'POST',
      body: JSON.stringify({
        projectName: draftProject.projectName,
        projectType: draftProject.waterBodyType,
        description: `${draftProject.concernType} screening intake created from AquaScan MRV.`,
        country: selectedFocusLocation?.displayName.split(',').slice(-1)[0]?.trim() || '',
        region: '',
        city: draftProject.locationName,
        lat: Number.isFinite(lat) ? lat : 0,
        lng: Number.isFinite(lng) ? lng : 0,
        totalAcres: 0,
        baselineDate: selectedDate,
        improvementGoal: `Investigate ${draftProject.concernType.toLowerCase()} signals in selected AOI.`,
        ownerId: 'aquascan-user',
        ownerName: 'AquaScan User',
      }),
    })
      .then((payload) => {
        const next = mapLiveProjectToAquaScanProject(payload.project);
        setProjects((prev) => [next, ...prev.filter((item) => item.id !== next.id)]);
        setSelectedProjectId(next.id);
        setActionNotice('Project intake saved to live water projects.');
      })
      .catch((error) => {
        setActionNotice(error instanceof Error ? `Project save failed: ${error.message}` : 'Project save failed.');
      });
  }

  async function runMrvComparison(): Promise<void> {
    if (!selectedFocusLocation) {
      setComparisonError('Select a focus location first.');
      return;
    }
    const aoi = savedAoiGeoJson;
    if (!aoi) {
      setComparisonError('Draw and save AOI first.');
      return;
    }
    if (!beforeRange.from || !beforeRange.to || !afterRange.from || !afterRange.to) {
      setComparisonError('Select before and after date ranges.');
      return;
    }
    if (beforeRange.from === afterRange.from && beforeRange.to === afterRange.to) {
      setComparisonError('Before and after ranges must be different.');
      return;
    }
    if (!copernicusSetup.configured) {
      setComparisonError('Backend unavailable.');
      return;
    }
    setComparisonError(null);
    setComparisonLoading(true);
    setActionNotice('Calculating live AOI statistics...');
    try {
      const result = await fetchAoiStatisticsComparison({
        aoiGeoJson: aoi,
        indexType: comparisonIndexType,
        collection: comparisonCollection,
        before: beforeRange,
        after: afterRange,
      });
      setComparisonResult(result);
      setValidatorGateStatus('pending_review');
      const historyItem = {
        calculationId: `calc-${Date.now()}`,
        projectId: selectedProject.id,
        indexType: comparisonIndexType,
        before: { ...beforeRange },
        after: { ...afterRange },
        deltaPercent: result.delta.percentChange,
        confidenceScore: result.confidenceScore,
        validatorStatus: 'pending_review' as CopernicusValidatorStatus,
        generatedAt: result.generatedAt,
      };
      setCalculationHistory((prev) => [historyItem, ...prev].slice(0, 20));
      setActionNotice('MRV comparison completed. Pending Validator Review.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Comparison failed';
      if (/configured|unavailable|no comparison|no scene|not found|statistics api error/i.test(message)) {
        setComparisonError('Live AOI measurement unavailable for this AOI/date. Try a wider date range or different collection.');
      } else {
        setComparisonError(message);
      }
    } finally {
      setComparisonLoading(false);
    }
  }

  function runAction(actionLabel: string): void {
    if (actionLabel === 'Launch Field Mission') {
      setActionNotice('Field mission routing is not connected to a backend endpoint yet.');
      return;
    }
    if (actionLabel === 'Request Water Sample' && selectedProjectId) {
      updateSelectedProject({ evidenceCount: selectedProject.evidenceCount + 1 });
      setActionNotice('Sample request captured in project state. Backend sample-order routing is not connected yet.');
      return;
    }
    if (actionLabel === 'Upload Lab Result' && selectedProjectId) {
      updateSelectedProject({ hasLabResult: true });
      setActionNotice('Lab result flag updated. File upload storage is not connected yet.');
      return;
    }
    if (actionLabel === 'Notify Authority') {
      setActionNotice('Authority notification routing is not connected to a backend endpoint yet.');
      return;
    }
    if (actionLabel === 'Create Restoration Project') {
      setActionNotice('Restoration project creation is not connected to a backend endpoint yet.');
      return;
    }
    if (actionLabel === 'Add to Public Ledger') {
      setActionNotice('Requires validation before public ledger publishing.');
      return;
    }
    if (actionLabel === 'Export Evidence Packet') {
      if (!canGenerateEvidencePacket) {
        setActionNotice('Select a focus location and save an AOI before generating an evidence packet.');
        return;
      }
      setShowPacket(true);
      try {
        const payload = {
          exportedAt: new Date().toISOString(),
          projectId: selectedProject.id,
          projectName: selectedProject.projectName || 'Unnamed project',
          locationName: selectedProject.locationName || 'No location selected',
          focusLocation: evidencePacketPayload.focusLocation,
          coordinates: evidencePacketPayload.centerLatLng,
          aoiGeoJson: evidencePacketPayload.aoiGeoJson,
          aoiArea: evidencePacketPayload.aoiArea,
          selectedLayers: mockSatelliteLayers.filter((layer) => selectedLayerIds.includes(layer.id)).map((layer) => layer.name),
          selectedIndex: comparisonIndexType,
          dateRanges: evidencePacketPayload.dateRanges,
          measurements: evidencePacketPayload.measurements,
          measurementStatus: evidencePacketPayload.measurementStatus,
          overlaysStatus: evidencePacketPayload.overlaysStatus,
          nearbyContext: evidencePacketPayload.nearbyContext,
          validatorStatus: evidencePacketPayload.validatorStatus,
          warnings: evidencePacketPayload.warnings,
          limitations: evidencePacketPayload.limitations,
          disclaimer: evidencePacketPayload.disclaimer,
          recommendedNextAction: packetPreview.recommendedNextAction,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `aquascan-evidence-${selectedProject.id}.json`;
        link.click();
        URL.revokeObjectURL(url);
        setActionNotice('Evidence packet exported as JSON.');
      } catch {
        setActionNotice('Evidence packet export failed.');
      }
      return;
    }
  }

  async function exportEvidencePacketJson(): Promise<void> {
    if (!canGenerateEvidencePacket) {
      setActionNotice('Select a focus location and save an AOI before exporting an evidence packet.');
      return;
    }

    try {
      const response = await fetch(apiUrl(API_ROUTES.COPERNICUS_EVIDENCE_PACKET), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evidencePacketPayload),
      });
      const payload = (await response.json().catch(() => ({}))) as { packet?: SatelliteEvidencePacket; error?: string };
      if (!response.ok || !payload.packet) {
        // Fall back to local JSON export with nearby context included
        const localPayload = evidencePacketPayload;
        const blob = new Blob([JSON.stringify(localPayload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `satellite-evidence-packet-${selectedProject.id}.json`;
        link.click();
        URL.revokeObjectURL(url);
        setActionNotice('Evidence packet exported as JSON (local export - backend unavailable).');
        return;
      }
      const blob = new Blob([JSON.stringify({ ...payload.packet, ...evidencePacketPayload }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `satellite-evidence-packet-${selectedProject.id}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setActionNotice('Satellite Evidence Packet exported as JSON.');
    } catch {
      setActionNotice('Unable to export evidence packet JSON.');
    }
  }

  function exportEvidencePacketPdf(): void {
    setActionNotice('PDF export pending backend implementation.');
  }

  function toggleOverlay(key: keyof typeof overlayState): void {
    setOverlayState((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function requestLiveOverlay(overlayType: AquaScanOverlayType): Promise<void> {
    setSelectedMeasurementOverlay(overlayType);
    if (overlayBlockReason || !savedAoiGeoJson) {
      setActionNotice(overlayBlockReason || 'Overlay request requires a focus location, saved AOI, and date range.');
      return;
    }

    overlayAbortRefs.current[overlayType]?.abort();
    const controller = new AbortController();
    overlayAbortRefs.current[overlayType] = controller;
    const request: AquaScanOverlayRequest = {
      aoiGeoJson: savedAoiGeoJson,
      dateRange: overlayDateRange,
      indexType: overlayType === 'flow_direction' ? 'NDWI' : comparisonIndexType,
      collection: overlayType === 'flow_direction' ? 'copernicus-dem' : comparisonCollection,
      threshold: overlayThreshold,
    };

    setOverlayResults((prev) => ({
      ...prev,
      [overlayType]: {
        ...prev[overlayType],
        status: 'loading',
        reason: undefined,
        warnings: [],
      },
    }));

    const fetcher: Record<AquaScanOverlayType, (payload: AquaScanOverlayRequest, signal?: AbortSignal) => Promise<AquaScanOverlayResponse>> = {
      ndwi_water_presence: fetchNdwiOverlay,
      water_extent: fetchWaterExtentOverlay,
      flood_wet: fetchFloodWetOverlay,
      risk_zones: fetchRiskZones,
      flow_direction: fetchFlowDirection,
    };

    const response = await fetcher[overlayType](request, controller.signal);
    if (controller.signal.aborted) return;
    const nextState: AquaScanOverlayState = {
      ...response,
      status: response.status,
      reason:
        response.status === 'available'
          ? response.reason
          : overlayType === 'ndwi_water_presence'
            ? 'Live-derived NDWI overlay unavailable for this AOI/date.'
            : response.reason || 'Live-derived overlay unavailable.',
    };
    setOverlayResults((prev) => ({
      ...prev,
      [overlayType]: nextState,
    }));
    setActionNotice(nextState.status === 'available' ? `${overlayType.replace(/_/g, ' ')} loaded from live-derived backend output.` : nextState.reason || 'Live-derived overlay unavailable.');
  }

  function centerOnProject(): void {
    const next = focusPointFromProject(selectedProject);
    setMapCenter(next);
    if (next[0] === DEFAULT_WEST_US_CENTER[0] && next[1] === DEFAULT_WEST_US_CENTER[1]) {
      setActionNotice('Coordinates are invalid or incomplete. Use numeric latitude/longitude like 36.7783 and -119.4179.');
      return;
    }
    setActionNotice('Map centered on selected project.');
  }

  function centerOnGps(): void {
    if (!navigator.geolocation) {
      setActionNotice('Geolocation is not supported in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsMode('Active');
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const nextCenter: [number, number] = [lat, lng];
        if (entityLookupAbortRef.current) entityLookupAbortRef.current.abort();
        const entityController = new AbortController();
        entityLookupAbortRef.current = entityController;
        clearAoiState();
        setMapCenter(nextCenter);
        setInspectedPoint(nextCenter);
        setSelectedFocusLocation({
          source: 'gps',
          query: 'Current GPS location',
          displayName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          latitude: lat,
          longitude: lng,
          aoiGeoJson: null,
          resolvedAt: new Date().toISOString(),
        });
        setDraftProject((prev) => ({
          ...prev,
          projectName: prev.projectName || 'GPS Location Water Scan',
          locationName: prev.locationName || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          latitude: String(lat),
          longitude: String(lng),
        }));
        setSelectedProjectId('AQ-DRAFT');
        void runEntityLookup(lat, lng, entityController);
        setActionNotice('Draw an AOI to begin measurement.');
      },
      () => {
        setActionNotice('Could not access GPS location. Check browser permissions.');
      },
    );
  }

  async function runLocationSearch(): Promise<void> {
    const query = searchQuery.trim();
    if (!query) {
      setActionNotice('Enter a location to search.');
      return;
    }
    if (entityLookupAbortRef.current) {
      entityLookupAbortRef.current.abort();
    }
    const entityController = new AbortController();
    entityLookupAbortRef.current = entityController;
    setSearchBusy(true);
    clearAoiState();
    setWaterData(null);
    try {
      const gps = parseGpsCoords(query);

      if (gps) {
        // User typed raw GPS coordinates — preserve them exactly and reverse-geocode a name.
        const { lat, lng } = gps;
        let displayName = `GPS point (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
        try {
          const rev = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=0`,
          );
          if (rev.ok) {
            const revData = await rev.json() as { display_name?: string };
            if (revData.display_name) {
              displayName = `GPS point in ${revData.display_name.split(',').slice(0, 2).join(',')}`;
            }
          }
        } catch {
          // Reverse geocode failed — fall back to coordinate-based name.
        }
        const locationLabel = displayName.split(' in ')[1]?.split(',')[0] ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setMapCenter([lat, lng]);
        setInspectedPoint([lat, lng]);
        setSelectedFocusLocation({
          source: 'manual',
          query,
          displayName,
          latitude: lat,
          longitude: lng,
          aoiGeoJson: null,
          resolvedAt: new Date().toISOString(),
        });
        setDraftProject((prev) => ({
          ...prev,
          projectName: prev.projectName || `${locationLabel} Water Scan`,
          locationName: locationLabel,
          latitude: String(lat),
          longitude: String(lng),
        }));
        setSelectedProjectId('AQ-DRAFT');
        void runEntityLookup(lat, lng, entityController);
        setActionNotice('Draw an AOI to begin measurement.');
        return;
      }

      // Normal text/address search via Nominatim forward geocoding.
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Search provider unavailable');
      }
      const rows = await response.json() as Array<{ lat: string; lon: string; display_name: string }>;
      if (!rows.length) {
        setActionNotice('No matching location found.');
        return;
      }
      const lat = Number(rows[0].lat);
      const lng = Number(rows[0].lon);
      const displayName = rows[0].display_name;
      const shortName = displayName.split(',')[0];
      setMapCenter([lat, lng]);
      setInspectedPoint([lat, lng]);
      setSelectedFocusLocation({
        source: 'search',
        query,
        displayName,
        latitude: lat,
        longitude: lng,
        aoiGeoJson: null,
        resolvedAt: new Date().toISOString(),
      });
      setDraftProject((prev) => ({
        ...prev,
        projectName: prev.projectName || `${shortName} Water Scan`,
        locationName: shortName,
        latitude: String(lat.toFixed(6)),
        longitude: String(lng.toFixed(6)),
      }));
      setSelectedProjectId('AQ-DRAFT');
      void runEntityLookup(lat, lng, entityController);
      setActionNotice('Draw an AOI to begin measurement.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Location search failed.';
      setActionNotice(message);
    } finally {
      setSearchBusy(false);
    }
  }

  function runMapCommand(command: 'zoomIn' | 'zoomOut' | 'panNorth' | 'panSouth' | 'panEast' | 'panWest' | 'reset'): void {
    setMapCommand(command);
    setCommandTick((prev) => prev + 1);
  }

  function saveAoi(): void {
    if (aoiPoints.length < 3) {
      setActionNotice('Draw at least 3 points before saving AOI.');
      return;
    }
    const nextGeoJson = toAoiGeoJson(aoiPoints);
    if (!nextGeoJson) {
      setActionNotice('Unable to save AOI. Add at least 3 valid points.');
      return;
    }
    setSavedAoiPoints(aoiPoints);
    setAoiPoints([]);
    setDrawingAoi(false);
    setBoundaryDrawn(true);
    setBoundaryRevision((prev) => prev + 1);
    setSelectedFocusLocation((prev) => (prev ? { ...prev, aoiGeoJson: nextGeoJson } : prev));
    if (aoiStorageKey) {
      const raw = localStorage.getItem(AQUASCAN_AOI_STORAGE_KEY);
      let nextStore: Record<string, [number, number][]> = {};
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Record<string, [number, number][]>;
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            nextStore = parsed;
          }
        } catch {
          nextStore = {};
        }
      }
      nextStore[aoiStorageKey] = aoiPoints;
      localStorage.setItem(AQUASCAN_AOI_STORAGE_KEY, JSON.stringify(nextStore));
    }
    const areaSqKm = polygonAreaSqKm(aoiPoints);
    setActionNotice(`AOI saved. Area: ${(areaSqKm * 100).toFixed(2)} ha / ${areaSqKm.toFixed(4)} km2.`);
  }

  async function runEntityLookup(lat: number, lng: number, controller: AbortController): Promise<void> {
    setEntitiesLoading(true);
    setEntitiesError(null);
    setNearbyEntities([]);
    try {
      const entities = await lookupNearbyEntities(lat, lng, 5, controller.signal);
      if (!controller.signal.aborted) {
        setNearbyEntities(entities);
        if (entities.length === 0) {
          setEntitiesError('No nearby mapped entities available for this point.');
        }
      }
    } catch {
      if (!controller.signal.aborted) {
        setEntitiesError('No nearby mapped entities available for this point.');
      }
    } finally {
      if (!controller.signal.aborted) {
        setEntitiesLoading(false);
      }
    }
  }

  async function handleMapClick(point: [number, number]): Promise<void> {
    const [lat, lng] = point;
    setInspectedPoint(point);

    // Non-AOI click: become the new focus location
    // Cancel any running entity lookup
    if (entityLookupAbortRef.current) entityLookupAbortRef.current.abort();
    const entityController = new AbortController();
    entityLookupAbortRef.current = entityController;

    // Clear stale data from the previous location
    setWaterData(null);
    clearAoiState();
    setShowAoiReviewNotice(false);
    setMapCenter(point);

    // Immediately set focus with coordinates before reverse geocode completes
    const coordLabel = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    setSelectedFocusLocation({
      source: 'map_click',
      query: coordLabel,
      displayName: `Map point at ${coordLabel}`,
      latitude: lat,
      longitude: lng,
      aoiGeoJson: null,
      resolvedAt: new Date().toISOString(),
    });
    setDraftProject((prev) => ({
      ...prev,
      projectName: prev.projectName || `${coordLabel} Water Scan`,
      locationName: coordLabel,
      latitude: String(lat),
      longitude: String(lng),
    }));
    setSelectedProjectId('AQ-DRAFT');

    // Start entity lookup in parallel with reverse geocoding
    void runEntityLookup(lat, lng, entityController);

    // Reverse geocode to get a friendly name — update display once resolved
    try {
      const geo = await reverseGeocodeLatLng(lat, lng, entityController.signal);
      if (!entityController.signal.aborted) {
        setSelectedFocusLocation({
          source: 'map_click',
          query: coordLabel,
          displayName: `Map point near ${geo.shortName}`,
          latitude: lat,
          longitude: lng,
          aoiGeoJson: null,
          resolvedAt: new Date().toISOString(),
        });
        setDraftProject((prev) => ({
          ...prev,
          projectName: prev.projectName || `${geo.shortName} Water Scan`,
          locationName: geo.shortName,
          latitude: String(lat),
          longitude: String(lng),
        }));
      }
    } catch {
      // Reverse geocode failed — keep coordinate-only display name already set
      setDraftProject((prev) => ({
        ...prev,
        projectName: prev.projectName || `${coordLabel} Water Scan`,
        locationName: coordLabel,
        latitude: String(lat),
        longitude: String(lng),
      }));
    }
    setActionNotice('Draw an AOI to begin measurement.');
  }

  function retryLiveData(): void {
    setLiveDataRequired(false);
    setWaterApiError(null);
    setWaterApiNotice('Retrying live water data...');
    setLiveRetryTick((prev) => prev + 1);
  }

  function retryImagery(): void {
    setImageryLoading(true);
    setImageryError(null);
    setBeforeImageryError(null);
    setPartialFailure(false);
    setFailingLayerName(null);
    setLastRefreshTime(new Date().toLocaleTimeString());
  }

  function useBaseMapOnly(): void {
    setLayerOpacity(0);
    setCompareEnabled(false);
    setImageryError(null);
    setBeforeImageryError(null);
    setPartialFailure(false);
    setActionNotice('Switched to base map only.');
  }

  function resetLayers(): void {
    setSelectedLayerIds(mockSatelliteLayers.slice(0, 3).map((l) => l.id));
    setLayerOpacity(72);
    setCompareEnabled(false);
    retryImagery();
  }

  async function toggleFullscreen(): Promise<void> {
    const target = mapViewportRef.current;
    if (!target) return;
    if (!document.fullscreenElement) {
      await target.requestFullscreen();
      return;
    }
    await document.exitFullscreen();
  }

  const actionButtons = [
    'Launch Field Mission',
    'Request Water Sample',
    'Upload Lab Result',
    'Notify Authority',
    'Create Restoration Project',
    'Add to Public Ledger',
    'Export Evidence Packet',
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* -- 1. Premium Header -- */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <button
            onClick={onReturn}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
            aria-label="Return to main menu"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Waves className="h-4 w-4 shrink-0 text-cyan-300" />
            <span className="text-sm font-bold">DPAL AquaScan MRV</span>
            <span className="hidden text-[10px] text-slate-500 lg:block">
              Environmental Intelligence / DPAL Water Command Center / AquaScan MRV
            </span>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-cyan-400/40 bg-cyan-900/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
              Live-only
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                copernicusSetup.configured
                  ? 'border-emerald-500/40 bg-emerald-900/20 text-emerald-200'
                  : 'border-slate-700 text-slate-500'
              }`}
            >
              Copernicus: {copernicusSetup.configured ? 'OK' : 'Not configured'}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                selectedProject.validatorStatus === 'Validated'
                  ? 'border-emerald-500/40 bg-emerald-900/20 text-emerald-200'
                  : 'border-amber-500/40 bg-amber-900/20 text-amber-200'
              }`}
            >
              Validator: {selectedProject.validatorStatus}
            </span>
            {onOpenWaterOperations ? (
              <button
                type="button"
                onClick={onOpenWaterOperations}
                className="rounded-lg border border-cyan-500/40 bg-cyan-900/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-100 hover:bg-cyan-900/45"
              >
                Open Water Operations Engine
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* -- 2. Focus Location Command Bar -- */}
      <div className="border-b border-slate-800 bg-slate-900/80 px-4 py-2.5 sm:px-6">
        <div className="mx-auto max-w-[1400px]">
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
            Focus Location
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void runLocationSearch();
                }
              }}
              placeholder="Enter address, city, water body, or GPS coordinates"
              className="h-8 min-w-[240px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500/60 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => { void runLocationSearch(); }}
              disabled={searchBusy}
              className="h-8 rounded-lg border border-cyan-500/50 bg-cyan-900/30 px-3 text-xs font-semibold text-cyan-100 hover:bg-cyan-900/50 disabled:opacity-60"
            >
              {searchBusy ? 'Searching...' : 'Locate on Map'}
            </button>
            <button
              type="button"
              onClick={centerOnGps}
              className="h-8 rounded-lg border border-slate-600 bg-slate-800/60 px-3 text-xs font-semibold text-slate-200 hover:border-cyan-500/40"
            >
              Use My GPS
            </button>
            <button
              type="button"
              onClick={() => {
                startAoiDrawing();
              }}
              title={selectedFocusLocation ? undefined : 'Select a focus location before drawing an AOI'}
              className={`h-8 rounded-lg border px-3 text-xs font-semibold transition ${
                drawingAoi
                  ? 'border-cyan-500/60 bg-cyan-900/30 text-cyan-100'
                  : selectedFocusLocation
                    ? 'border-slate-600 bg-slate-800/60 text-slate-200 hover:border-cyan-500/40'
                    : 'border-slate-700 bg-slate-900/40 text-slate-500 cursor-not-allowed'
              }`}
            >
              {drawingAoi ? 'Stop Draw' : 'Draw AOI'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (entityLookupAbortRef.current) entityLookupAbortRef.current.abort();
                setSelectedFocusLocation(null);
                setSearchQuery('');
                setMapCenter(DEFAULT_WEST_US_CENTER);
                setInspectedPoint(null);
                clearAoiState();
                setNearbyEntities([]);
                setEntitiesLoading(false);
                setEntitiesError(null);
                setShowAoiReviewNotice(false);
                setWaterData(null);
                setActionNotice('Focus location cleared.');
              }}
              className="h-8 rounded-lg border border-rose-500/40 bg-rose-900/20 px-3 text-xs font-semibold text-rose-200 hover:bg-rose-900/35"
            >
              Clear
            </button>
          </div>
          {selectedFocusLocation ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11px] text-slate-300">
              <span>
                <span className="text-slate-500">Focused on:</span>{' '}
                <span className="font-semibold text-cyan-200">
                  {selectedFocusLocation.displayName.split(',').slice(0, 2).join(',')}
                </span>
              </span>
              <span>
                <span className="text-slate-500">Lat/Lng:</span>{' '}
                {selectedFocusLocation.latitude.toFixed(5)}, {selectedFocusLocation.longitude.toFixed(5)}
              </span>
              <span>
                <span className="text-slate-500">AOI:</span>{' '}
                <span className={focusAoiStatus === 'Missing' ? 'text-amber-300' : 'text-emerald-300'}>
                  {focusAoiStatus}
                </span>
              </span>
            </div>
          ) : (
            <p className="mt-1 text-[11px] text-slate-500">No focus location selected.</p>
          )}
        </div>
      </div>

      {/* -- 3. Compact Status Chips -- */}
      <div className="border-b border-slate-800/60 bg-slate-950/40 px-4 sm:px-6">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 py-1.5">
          {toolsRunning && toolsStatusLabel ? (
            <span className="rounded-full border border-cyan-500/40 bg-cyan-900/20 px-2 py-0.5 text-[10px] text-cyan-200">
              {toolsStatusLabel}
            </span>
          ) : null}
          {!waterData && !waterApiLoading && !toolsRunning && selectedFocusLocation && (waterApiError || liveDataRequired) ? (
            <span className="rounded-full border border-rose-500/40 bg-rose-900/20 px-2 py-0.5 text-[10px] text-rose-200">
              Satellite data: Unavailable
            </span>
          ) : null}
          {waterApiLoading ? (
            <span className="rounded-full border border-cyan-500/40 bg-cyan-900/20 px-2 py-0.5 text-[10px] text-cyan-200">
              Fetching satellite data...
            </span>
          ) : null}
          {!hasSavedAoi && selectedFocusLocation ? (
            <span className="rounded-full border border-amber-500/40 bg-amber-900/20 px-2 py-0.5 text-[10px] text-amber-200">
              AOI: Required for polygon stats
            </span>
          ) : null}
          {waterApiError && /not found|no scene|unavailable/i.test(waterApiError) ? (
            <span className="rounded-full border border-amber-500/40 bg-amber-900/20 px-2 py-0.5 text-[10px] text-amber-200">
              Scene: None found for selected date - try a wider date range or different satellite layer
            </span>
          ) : null}
          {liveDataRequired ? (
            <span
              role="button"
              tabIndex={0}
              className="cursor-pointer rounded-full border border-rose-500/40 bg-rose-900/20 px-2 py-0.5 text-[10px] text-rose-200 hover:bg-rose-900/35"
              onClick={retryLiveData}
              onKeyDown={(e) => { if (e.key === 'Enter') retryLiveData(); }}
              title={liveDataReason}
            >
              Live data: Required - click to retry
            </span>
          ) : null}
          {imageryError ? (
            <span
              role="button"
              tabIndex={0}
              className="cursor-pointer rounded-full border border-amber-500/40 bg-amber-900/20 px-2 py-0.5 text-[10px] text-amber-200 hover:bg-amber-900/35"
              onClick={retryImagery}
              onKeyDown={(e) => { if (e.key === 'Enter') retryImagery(); }}
              title={imageryError}
            >
              Imagery: Tile error - click to retry
            </span>
          ) : null}
          {waterApiNotice && !waterApiLoading ? (
            <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] text-slate-400">
              {waterApiNotice.length > 70 ? `${waterApiNotice.slice(0, 70)}...` : waterApiNotice}
            </span>
          ) : null}
          {showAoiReviewNotice ? (
            <span
              role="button"
              tabIndex={0}
              className="cursor-pointer rounded-full border border-amber-500/40 bg-amber-900/20 px-2 py-0.5 text-[10px] text-amber-200 hover:bg-amber-900/35"
              onClick={() => setShowAoiReviewNotice(false)}
              onKeyDown={(e) => { if (e.key === 'Enter') setShowAoiReviewNotice(false); }}
              title="Location changed - AOI may no longer match. Redraw or keep it."
            >
              AOI may need review after location change - click to dismiss
            </span>
          ) : null}
          {actionNotice ? (
            <span className="rounded-full border border-cyan-500/40 bg-cyan-900/20 px-2 py-0.5 text-[10px] text-cyan-100">
              {actionNotice}
            </span>
          ) : null}
        </div>
      </div>

      {/* -- 4. Main Workspace (3-column) -- */}
      <div className="mx-auto flex w-full max-w-[1400px] flex-1">

        {/* Left: Workflow Rail */}
        <nav className="hidden w-[180px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-slate-800 p-3 lg:flex">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Workflow</p>
          {workflowSteps.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => { if (step.tabId) setActiveTab(step.tabId); }}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                step.status === 'complete'
                  ? 'text-emerald-300 hover:bg-emerald-900/20'
                  : step.status === 'in_progress'
                    ? 'text-cyan-200 hover:bg-cyan-900/20'
                  : step.status === 'needs_attention'
                    ? 'text-amber-200 hover:bg-amber-900/20'
                    : step.status === 'locked'
                      ? 'cursor-not-allowed text-slate-600'
                      : 'text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  step.status === 'complete'
                    ? 'bg-emerald-400'
                    : step.status === 'in_progress'
                      ? 'bg-cyan-400'
                    : step.status === 'needs_attention'
                      ? 'bg-amber-400'
                      : step.status === 'locked'
                        ? 'bg-slate-700'
                        : 'bg-slate-600'
                }`}
              />
              <span className="font-semibold">{step.label}</span>
              <span className="ml-auto text-[10px] opacity-60">
                {step.statusText}
              </span>
            </button>
          ))}
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">AquaScan Test Flow</p>
            {[
              ['Select map point', Boolean(selectedFocusLocation), false],
              ['Draw AOI', aoiPoints.length > 0 || drawingAoi, !selectedFocusLocation],
              ['Save AOI', readySavedAoi, !selectedFocusLocation],
              ['Select NDWI', comparisonIndexType === 'NDWI', !readySavedAoi],
              ['Apply recommended dates', RECOMMENDED_COMPARISON_PRESETS.some((preset) => preset.before.from === beforeRange.from && preset.before.to === beforeRange.to && preset.after.from === afterRange.from && preset.after.to === afterRange.to), !readySavedAoi],
              ['Calculate Comparison', Boolean(comparisonResult), !readySavedAoi],
              ['Generate Evidence Packet', showPacket, !canGenerateEvidencePacket],
              ['Choose Action', showPacket && activeTab === 'actions', !showPacket],
            ].map(([label, done, locked]) => (
              <div key={String(label)} className="flex items-center gap-2 py-1 text-[11px]">
                <span className={`h-2 w-2 rounded-full ${locked ? 'bg-slate-700' : done ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="flex-1 text-slate-300">{label}</span>
                <span className={`text-[10px] ${locked ? 'text-slate-600' : done ? 'text-emerald-300' : 'text-amber-200'}`}>
                  {locked ? 'Locked' : done ? 'Done' : 'Needed'}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-slate-800 pt-3">
            <p className="text-[10px] text-slate-500">Project</p>
            {selectedFocusLocation ? (
              <select
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-300"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                <option value="AQ-DRAFT">
                  {draftProject.projectName || 'New AquaScan Project'}
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectName || p.id}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1 text-[10px] text-slate-600">No active project</p>
            )}
          </div>
          <div className="mt-3 space-y-1 border-t border-slate-800 pt-3 text-[10px] text-slate-500">
            <p>Risk: <span className="font-bold text-white">{selectedFocusLocation ? `${riskScore}/100` : '-'}</span></p>
            <p>Concern: <span className="text-amber-200">{selectedFocusLocation ? selectedProject.concernType : '-'}</span></p>
            <p>Validator: <span className="text-slate-300">{selectedFocusLocation ? selectedProject.validatorStatus : 'Pending'}</span></p>
          </div>
        </nav>

        {/* Center: Map */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Map toolbar */}
          <div className="border-b border-slate-800 bg-slate-900/60 px-3 py-1.5">
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <button type="button" onClick={() => runMapCommand('zoomIn')} className="rounded border border-slate-700 px-2 py-0.5 text-slate-300 hover:border-slate-500">+</button>
              <button type="button" onClick={() => runMapCommand('zoomOut')} className="rounded border border-slate-700 px-2 py-0.5 text-slate-300 hover:border-slate-500">-</button>
              <button type="button" onClick={centerOnProject} className="rounded border border-slate-700 px-2 py-0.5 text-slate-300 hover:border-slate-500">Center</button>
              <button type="button" onClick={centerOnGps} className="rounded border border-slate-700 px-2 py-0.5 text-slate-300 hover:border-slate-500">GPS</button>
              <button type="button" onClick={() => setMapExpanded((prev) => !prev)} className="rounded border border-slate-700 px-2 py-0.5 text-slate-300 hover:border-slate-500">
                {mapExpanded ? 'Contract' : 'Expand'}
              </button>
              <select
                value={mapStyle}
                onChange={(e) => setMapStyle(e.target.value as BasemapStyle)}
                className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-slate-300"
              >
                <option value="satellite">Satellite</option>
                <option value="terrain">Terrain</option>
                <option value="dark">Dark</option>
              </select>
              <input
                type="date"
                value={selectedDate}
                max={gibsDefaultDate()}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setImageryLoading(true);
                  setImageryError(null);
                  setBeforeImageryError(null);
                  setPartialFailure(false);
                  setLastRefreshTime(new Date().toLocaleTimeString());
                }}
                className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-slate-300"
              />
              <label className="flex items-center gap-1 text-slate-400">
                <input
                  type="checkbox"
                  checked={compareEnabled}
                  onChange={(e) => { setCompareEnabled(e.target.checked); setBeforeImageryError(null); setPartialFailure(false); }}
                />
                Compare
              </label>
              {compareEnabled ? (
                <input
                  type="date"
                  value={compareDate}
                  max={gibsDefaultDate()}
                  onChange={(e) => setCompareDate(e.target.value)}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-slate-300"
                />
              ) : null}
              <div className="ml-auto flex items-center gap-1">
                {drawingAoi ? <span className="text-cyan-300">AOI drawing mode active</span> : null}
                {drawingAoi || aoiPoints.length > 0 || hasSavedAoi ? (
                  <>
                    <span className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300">
                      AOI points: {aoiPoints.length}
                    </span>
                    <button type="button" onClick={() => setAoiPoints((prev) => prev.slice(0, -1))} disabled={aoiPoints.length === 0} className="rounded border border-slate-700 px-2 py-0.5 text-slate-300 disabled:cursor-not-allowed disabled:opacity-50">Undo AOI point</button>
                    <button type="button" onClick={saveAoi} disabled={aoiPoints.length < 3} className="rounded border border-emerald-500/50 bg-emerald-900/20 px-2 py-0.5 text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50">Save AOI</button>
                    <button
                      type="button"
                      onClick={() => { clearAoiState({ removePersisted: true, notice: 'AOI cleared. Draw and save a new measurement area.' }); }}
                      className="rounded border border-slate-700 px-2 py-0.5 text-slate-300"
                    >
                      Clear AOI
                    </button>
                  </>
                ) : null}
                <label className="flex items-center gap-1 rounded border border-slate-700 px-2 py-0.5 text-slate-400">
                  Opacity
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={layerOpacity}
                    onChange={(e) => setLayerOpacity(Number(e.target.value))}
                    className="w-16"
                  />
                </label>
                <button type="button" onClick={retryImagery} className="rounded border border-slate-700 px-2 py-0.5 text-slate-400">Refresh</button>
              </div>
            </div>
            {/* Overlay toggles */}
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {(
                [
                  ['boundary', 'Boundary', 'Toggle AOI boundary polygon'],
                  ['nearbyEntities', 'Nearby entities', 'Toggle mapped nearby entities from live OpenStreetMap / Overpass results'],
                ] as [keyof typeof overlayState, string, string][]
              ).map(([key, label, tooltip]) => (
                <button
                  key={key}
                  type="button"
                  title={tooltip}
                  onClick={() => toggleOverlay(key)}
                  className={`rounded border px-1.5 py-0.5 text-[10px] ${overlayState[key] ? 'border-cyan-500/50 text-cyan-200' : 'border-slate-700 text-slate-500'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Map viewport */}
          <div
            ref={mapViewportRef}
            className="relative overflow-hidden"
            style={{ height: mapExpanded ? '65vh' : '55vh', minHeight: mapExpanded ? '520px' : '420px' }}
          >
            <div className="pointer-events-none absolute right-2 top-2 z-[510] rounded border border-slate-700/80 bg-slate-950/85 px-2 py-1 text-[10px] text-slate-200">
              {selectedFocusLocation
                ? selectedFocusLocation.displayName.split(',')[0]
                : 'No location selected - use Focus Location above'}
            </div>
            {/* Compact map legend */}
            <div className="absolute bottom-2 left-2 z-[520]">
              <button
                type="button"
                onClick={() => setLegendOpen((prev) => !prev)}
                className="rounded border border-slate-700/80 bg-slate-950/90 px-2 py-0.5 text-[10px] font-semibold text-slate-300 hover:bg-slate-900"
              >
                {legendOpen ? 'Hide legend' : 'Legend'}
              </button>
              {legendOpen ? (
                <div className="mt-1 w-72 rounded-lg border border-slate-700 bg-slate-950/95 p-2 text-[10px] text-slate-300">
                  <p className="mb-1.5 font-bold uppercase tracking-wider text-slate-400">Map Legend</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#fb7185]" />
                      <span>Red marker: Selected focus/project point - user selected.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border-2 border-[#22d3ee] bg-transparent" />
                      <span>AOI boundary: User-drawn measurement boundary.</span>
                    </div>
                    {liveOverlayList.map(({ overlayType, label, pathColor, overlay }) => (
                      <div key={overlayType} className="flex items-start gap-2">
                        <span className="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: pathColor }} />
                        <span>{label}: {overlayStatusLabel(overlay)}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#38bdf8]" />
                      <span>Nearby entities: OpenStreetMap/Overpass context only - not proof of responsibility.</span>
                    </div>
                  </div>
                  <p className="mt-1.5 text-[9px] text-slate-600">If a live-derived layer is unavailable, AquaScan leaves it hidden instead of drawing fallback geometry.</p>
                </div>
              ) : null}
            </div>
            {imageryLoading ? (
              <div className="absolute inset-x-0 top-0 z-[500] bg-cyan-950/80 px-3 py-1 text-[11px] text-cyan-100">
                Loading satellite imagery...
              </div>
            ) : null}
            {imageryError ? (
              <div className="absolute inset-x-0 top-0 z-[500] bg-rose-950/85 px-3 py-1.5 text-[11px] text-rose-100">
                <span>{imageryError.split('.')[0]}.</span>
                <button type="button" onClick={retryImagery} className="ml-2 underline">Retry</button>
                <button type="button" onClick={useBaseMapOnly} className="ml-2 underline">Base map only</button>
                <button type="button" onClick={() => { setSelectedDate(gibsDefaultDate()); retryImagery(); }} className="ml-2 underline">Change date</button>
              </div>
            ) : null}
            {partialFailure && !imageryError ? (
              <div className="absolute inset-x-0 top-7 z-[500] bg-amber-950/80 px-3 py-0.5 text-[10px] text-amber-100">
                Partial tile failure - base map active
              </div>
            ) : null}
            {liveOverlayList.some(({ overlay }) => overlay.status === 'loading') ? (
              <div className="absolute inset-x-0 top-12 z-[500] bg-cyan-950/80 px-3 py-1 text-[11px] text-cyan-100">
                Loading live-derived overlay...
              </div>
            ) : null}
            {/* Right overlay panel */}
            <div className="absolute right-3 top-10 z-[520]">
              <button
                type="button"
                onClick={() => setShowRightLayerPanel((prev) => !prev)}
                className="rounded border border-cyan-500/40 bg-slate-950/90 px-2 py-0.5 text-[10px] font-semibold text-cyan-100"
              >
                {showRightLayerPanel ? 'Hide' : 'Layers'}
              </button>
              {showRightLayerPanel ? (
                <div className="mt-1 w-52 rounded-lg border border-slate-700 bg-slate-950/95 p-2 text-[10px]">
                  <p className="font-semibold text-cyan-200">Layer controls</p>
                  <p className="mt-1 text-slate-400">
                    Active: {mockSatelliteLayers.filter((l) => selectedLayerIds.includes(l.id)).map((l) => l.name).join(', ') || 'None'}
                  </p>
                  <label className="mt-1.5 flex items-center justify-between gap-2 text-slate-300">
                    Opacity
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={layerOpacity}
                      onChange={(e) => setLayerOpacity(Number(e.target.value))}
                      className="w-24"
                    />
                  </label>
                  <label className="mt-1 flex items-center gap-2 text-slate-300">
                    <input type="checkbox" checked={compareEnabled} onChange={(e) => setCompareEnabled(e.target.checked)} />
                    Date compare
                  </label>
                  {compareEnabled ? (
                    <label className="mt-1 flex items-center justify-between gap-2 text-slate-300">
                      Before/after
                      <input type="range" min={0} max={100} value={compareOpacity} onChange={(e) => setCompareOpacity(Number(e.target.value))} className="w-24" />
                    </label>
                  ) : null}
                </div>
              ) : null}
            </div>
            <MapContainer center={mapCenter} zoom={7} style={{ height: '100%', width: '100%', cursor: drawingAoi ? 'crosshair' : 'grab' }}>
              <MapResizeSync trigger={mapExpanded ? 1 : 0} />
              <MapViewSync center={mapCenter} />
              <MapCommandBridge commandTick={commandTick} command={mapCommand} center={mapCenter} />
              <MapInteractionCapture
                drawingAoi={drawingAoi}
                onInspect={(point) => { void handleMapClick(point); }}
                onAoiPoint={(point) => {
                  setBoundaryDrawn(true);
                  setAoiPoints((prev) => [...prev, point]);
                }}
              />
              {mapStyle === 'dark' ? (
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap contributors &copy; CARTO' />
              ) : mapStyle === 'terrain' ? (
                <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" attribution='Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap' />
              ) : (
                <TileLayer url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution='Tiles &copy; Esri' />
              )}
              <TileLayer
                key={`${activeGibsLayer.id}-${selectedDate}`}
                url={tileUrl}
                opacity={layerOpacity / 100}
                attribution='Imagery: NASA GIBS / ESDIS'
                eventHandlers={{
                  loading: () => { setImageryLoading(true); setImageryError(null); },
                  load: () => { setImageryLoading(false); },
                  tileerror: () => {
                    setImageryLoading(false);
                    setFailingLayerName(activeGibsLayer.label);
                    setImageryError('Some satellite image tiles did not load for the selected date, zoom level, or layer. The base map remains active. Try changing the date, reducing zoom, refreshing imagery, or selecting another satellite layer.');
                    setPartialFailure(true);
                  },
                }}
              />
              {compareEnabled ? (
                <TileLayer
                  key={`${activeGibsLayer.id}-${compareDate}-before`}
                  url={compareTileUrl}
                  opacity={compareOpacity / 100}
                  attribution='Comparison imagery: NASA GIBS / ESDIS'
                  eventHandlers={{
                    tileerror: () => {
                      setFailingLayerName(`${activeGibsLayer.label} (comparison)`);
                      setBeforeImageryError('Compare layer unavailable for selected date.');
                      setPartialFailure(true);
                    },
                  }}
                />
              ) : null}
              {liveOverlayList.map(({ overlayType, pathColor, fillOpacity, dashArray, overlay }) => {
                if (!isOverlayLiveDerived(overlay)) return null;
                return (
                  <React.Fragment key={`${overlayType}-${overlay.generatedAt ?? 'live'}`}>
                    {overlay.rasterTileUrl ? (
                      <TileLayer
                        key={`${overlayType}-raster-${overlay.generatedAt ?? 'live'}`}
                        url={overlay.rasterTileUrl}
                        opacity={0.62}
                        attribution={`Overlay: ${overlay.sourceName}`}
                      />
                    ) : null}
                    {overlay.geometry ? (
                      <GeoJSON
                        data={overlay.geometry as never}
                        style={() => ({
                          color: pathColor,
                          weight: overlayType === 'flow_direction' ? 3 : 2,
                          fillColor: pathColor,
                          fillOpacity,
                          dashArray,
                        })}
                      />
                    ) : null}
                  </React.Fragment>
                );
              })}
              {/* AOI boundary */}
              {overlayState.boundary && aoiPoints.length > 0 ? (
                <>
                  {aoiPoints.map((point, index) => (
                    <Circle
                      key={`aoi-point-${index}-${point[0]}-${point[1]}`}
                      center={point}
                      radius={45}
                      pathOptions={{ color: '#22d3ee', fillColor: '#22d3ee', fillOpacity: 0.95 }}
                    >
                      <Popup>
                        <div className="text-xs">
                          <p className="font-semibold">AOI point {index + 1}</p>
                          <p>{point[0].toFixed(5)}, {point[1].toFixed(5)}</p>
                        </div>
                      </Popup>
                    </Circle>
                  ))}
                  {aoiPoints.length >= 2 ? (
                    <Polyline positions={aoiPoints} pathOptions={{ color: '#22d3ee', weight: 2.5, opacity: 0.95 }} />
                  ) : null}
                </>
              ) : null}
              {overlayState.boundary && draftAoiPreview ? (
                <Polygon positions={draftAoiPreview} pathOptions={{ color: '#22d3ee', weight: 2, fillOpacity: 0.08 }}>
                  <Popup><div className="text-xs"><p className="font-semibold">AOI Boundary</p><p>User-drawn area of interest.</p></div></Popup>
                </Polygon>
              ) : null}
              {overlayState.boundary && savedAoiPoints.length >= 3 ? (
                <Polygon positions={savedAoiPoints} pathOptions={{ color: '#eab308', weight: 1.5, dashArray: '5 5', fillOpacity: 0.05 }}>
                  <Popup><div className="text-xs"><p className="font-semibold">Saved AOI Boundary</p><p>Previously saved area of interest.</p></div></Popup>
                </Polygon>
              ) : null}
              {/* Nearby mapped entities */}
              {overlayState.nearbyEntities ? (
                <>
                  {nearbyEntities.map((entity) => (
                    <Circle
                      key={entity.id}
                      center={[entity.latitude, entity.longitude]}
                      radius={180}
                      pathOptions={{ color: nearbyEntityColor(entity.category), fillColor: nearbyEntityColor(entity.category), fillOpacity: 0.45 }}
                    >
                      <Popup>
                        <div className="space-y-1 text-xs">
                          <p className="font-semibold">{entity.name}</p>
                          <p>{entity.category}</p>
                          <p>{entity.distanceKm} km away</p>
                          <p className="text-[10px] text-gray-500">Context only. Proximity does not prove responsibility.</p>
                        </div>
                      </Popup>
                    </Circle>
                  ))}
                </>
              ) : null}
              {/* Selected focus / project point */}
              {selectedFocusLocation ? (
                <Circle center={[selectedFocusLocation.latitude, selectedFocusLocation.longitude]} radius={230} pathOptions={{ color: '#fb7185', fillColor: '#fb7185', fillOpacity: 0.75 }}>
                  <Popup>
                    <div className="text-xs space-y-1">
                      <p className="font-semibold">Selected focus / project point</p>
                      <p>Lat: {selectedFocusLocation.latitude.toFixed(5)}</p>
                      <p>Lng: {selectedFocusLocation.longitude.toFixed(5)}</p>
                      <p className="text-[10px] text-gray-500">This marker shows the current focus point. Draw AOI around it to measure.</p>
                    </div>
                  </Popup>
                </Circle>
              ) : null}
            </MapContainer>
          </div>

          {/* Map status strip */}
          <div className="border-t border-slate-800 bg-slate-900/60 px-3 py-1">
            <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 text-[10px] text-slate-400 md:grid-cols-6">
              <span>Project: <span className="text-slate-300">{selectedFocusLocation ? selectedProject.id : 'Not started'}</span></span>
              <span>Type: <span className="text-slate-300">{selectedFocusLocation ? selectedProject.waterBodyType : 'Select after focus location'}</span></span>
              <span>Updated: <span className="text-slate-300">{selectedFocusLocation ? lastRefreshTime : '-'}</span></span>
              <span>Boundary: <span className="text-slate-300">{drawingAoi ? `Drawing (${aoiPoints.length} pts)` : hasSavedAoi ? `Saved ${savedAoiAreaSqKm.toFixed(2)} km2` : 'Required'}</span></span>
              <span>Evidence: <span className="text-slate-300">{selectedFocusLocation ? selectedProject.evidenceCount : 0}</span></span>
              <span>Layers: <span className="text-slate-300">{selectedLayerIds.length}</span></span>
            </div>
          </div>
        </div>

        {/* Right: Intelligence Panel */}
        <aside className="hidden w-[240px] shrink-0 overflow-y-auto border-l border-slate-800 p-3 lg:block">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Intelligence</p>

          {/* Risk Score */}
          <div className="mb-2 rounded-lg border border-slate-700 bg-slate-900/80 p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Risk Score</p>
            <p className="mt-1 text-2xl font-black text-white">
              {selectedFocusLocation ? riskScore : '-'}
              <span className="text-sm font-normal text-slate-400">/100</span>
            </p>
            <p className="text-xs text-cyan-200">
              {selectedFocusLocation ? riskBand(riskScore) : 'No location'}
            </p>
          </div>

          {/* Compact info cards */}
          {(
            [
              ['AOI Status', focusAoiStatus, focusAoiStatus !== 'Missing' ? 'text-emerald-300' : 'text-amber-300'],
              [
                'Live Data',
                selectedFocusLocation
                  ? waterData ? 'Available' : waterApiLoading ? 'Fetching...' : 'Unavailable'
                  : 'No location',
                waterData ? 'text-emerald-300' : 'text-rose-300',
              ],
              ['Index', comparisonIndexType, 'text-cyan-200'],
              ['Confidence', selectedFocusLocation ? (inspectQualityConfidence != null ? `${inspectQualityConfidence}%` : 'Pending live data') : '-', 'text-slate-200'],
              [
                'Validator',
                selectedProject.validatorStatus,
                selectedProject.validatorStatus === 'Validated' ? 'text-emerald-300' : 'text-amber-200',
              ],
              ['Collection', comparisonCollection === 'sentinel-2-l2a' ? 'Sentinel-2' : 'Sentinel-1', 'text-slate-300'],
              ['Scene date', waterData?.satellite.acquisitionDate ?? (selectedFocusLocation ? 'Pending' : '-'), 'text-slate-300'],
              ['Cloud cover', waterData?.satellite.cloudCover ?? '-', 'text-slate-300'],
            ] as [string, string, string][]
          ).map(([label, value, valueClass]) => (
            <div key={label} className="mb-1.5 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-2.5 py-1.5 text-[10px]">
              <span className="text-slate-500">{label}</span>
              <span className={`font-semibold ${valueClass}`}>{value}</span>
            </div>
          ))}

          {/* Next step */}
          <div className="mt-2 rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-2.5 text-[10px]">
            <p className="mb-1 font-semibold uppercase tracking-wider text-cyan-300">Next step</p>
            <p className="text-slate-300">
              {selectedFocusLocation ? recommendedNextStep : 'Select a focus location.'}
            </p>
          </div>

          {/* MRV result */}
          {comparisonResult ? (
            <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-2.5 text-[10px]">
              <p className="mb-1 font-semibold uppercase tracking-wider text-emerald-300">MRV Result</p>
              <div className="space-y-0.5 text-slate-300">
                <p>Before: {String(comparisonResult.before.mean ?? 'N/A')}</p>
                <p>After: {String(comparisonResult.after.mean ?? 'N/A')}</p>
                <p>Delta: {comparisonResult.delta.percentChange ?? 'N/A'}%</p>
                <p>Conf: {Math.round(comparisonResult.confidenceScore * 100)}%</p>
              </div>
            </div>
          ) : null}

          <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900/60 p-2.5 text-[10px]">
            <p className="mb-1 font-semibold uppercase tracking-wider text-slate-300">Measurement Precision</p>
            {!selectedFocusLocation ? (
              <p className="text-slate-500">Select a focus location to review measurement precision.</p>
            ) : !readySavedAoi ? (
              <p className="text-slate-500">Draw and save an AOI to measure area-based overlays.</p>
            ) : !comparisonResult ? (
              <p className="text-slate-500">Run AOI comparison first, then request live-derived overlays if available.</p>
            ) : !overlayDateRange.fromDate || !overlayDateRange.toDate ? (
              <p className="text-slate-500">Select an overlay date range in Layers before requesting live-derived overlays.</p>
            ) : measurementOverlay ? (
              measurementOverlay.status === 'available' && measurementOverlay.statistics ? (
                <div className="space-y-0.5 text-slate-300">
                  <p>AOI area: {savedAoiAreaHectares.toFixed(2)} ha / {savedAoiAreaSqKm.toFixed(4)} km2</p>
                  <p>Index: {measurementOverlay.indexType ?? comparisonIndexType}</p>
                  <p>Collection: {measurementOverlay.collection ?? comparisonCollection}</p>
                  <p>Date range: {(measurementOverlay.dateRange?.fromDate ?? overlayDateRange.fromDate) || '-'} to {(measurementOverlay.dateRange?.toDate ?? overlayDateRange.toDate) || '-'}</p>
                  <p>Threshold: {measurementOverlay.threshold ?? overlayThreshold}</p>
                  <p>Mean: {String(measurementOverlay.statistics.mean ?? 'N/A')}</p>
                  <p>Min: {String(measurementOverlay.statistics.min ?? 'N/A')}</p>
                  <p>Max: {String(measurementOverlay.statistics.max ?? 'N/A')}</p>
                  <p>Std dev: {String(measurementOverlay.statistics.standardDeviation ?? 'N/A')}</p>
                  <p>Sample count: {measurementOverlay.statistics.sampleCount}</p>
                  <p>No-data count: {measurementOverlay.statistics.noDataCount}</p>
                  <p>Cloud cover: {measurementOverlay.statistics.cloudCover ?? 'N/A'}</p>
                  <p>Confidence: {measurementOverlay.confidence ?? measurementOverlay.statistics.confidence ?? 'N/A'}</p>
                  <p>Source: {measurementOverlay.sourceName}</p>
                  <p>Generated: {measurementOverlay.generatedAt ?? 'Pending'}</p>
                  <p>{measurementOverlay.statistics.resolutionMeters != null ? `Resolution: ${measurementOverlay.statistics.resolutionMeters} m` : 'Resolution unavailable.'}</p>
                </div>
              ) : (
                <p className="text-amber-200">Measurement details unavailable until a live AOI comparison succeeds.</p>
              )
            ) : (
              <p className="text-slate-500">Measurement details unavailable until a live AOI comparison succeeds.</p>
            )}
          </div>

          {/* Nearby Mapped Entities */}
          <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900/60 p-2.5">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Nearby Mapped Entities
            </p>
            {!selectedFocusLocation ? (
              <p className="text-[10px] text-slate-600">
                Select or click a map location to search nearby mapped entities.
              </p>
            ) : entitiesLoading ? (
              <p className="text-[10px] text-slate-400">Searching nearby mapped entities...</p>
            ) : nearbyEntities.length === 0 ? (
              <p className="text-[10px] text-slate-500">
                {entitiesError ?? 'No nearby mapped entities available.'}
              </p>
            ) : (
              <div className="space-y-1.5">
                {nearbyEntities.slice(0, 6).map((e) => (
                  <div key={e.id} className="rounded border border-slate-800 bg-slate-950/60 p-1.5 text-[10px]">
                    <p className="font-semibold text-slate-200 truncate" title={e.name}>{e.name}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-slate-500">
                      <span>{e.category}</span>
                      <span>{e.distanceKm} km</span>
                      <span className="ml-auto">{e.source}</span>
                    </div>
                  </div>
                ))}
                {nearbyEntities.length > 6 ? (
                  <p className="text-[10px] text-slate-600">+{nearbyEntities.length - 6} more in Nearby Context tab</p>
                ) : null}
              </div>
            )}
            <p className="mt-1.5 text-[9px] leading-relaxed text-slate-600">
              Context only - proximity does not prove responsibility.
            </p>
          </div>

          <p className="mt-3 text-[9px] leading-relaxed text-slate-600">
            Indicative MRV estimate - not certified carbon credit. Satellite indicators must be verified with field evidence, lab results, or validator review before official conclusions.
          </p>
        </aside>
      </div>

      {/* -- 5. Bottom Workspace Tabs -- */}
      <div className="border-t border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-[1400px]">
          {/* Tab nav */}
          <div className="flex overflow-x-auto border-b border-slate-800">
            {(
              [
                ['intake', 'Intake'],
                ['layers', 'Layers'],
                ['mrv', 'MRV Compare'],
                ['evidence', 'Evidence Packet'],
                ['actions', 'Actions'],
              ] as [typeof activeTab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`shrink-0 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                  activeTab === id
                    ? 'border-cyan-400 text-cyan-200'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-4 sm:p-5">

            {/* -- Intake Tab -- */}
            {activeTab === 'intake' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <input
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
                    placeholder="Project name"
                    value={draftProject.projectName}
                    onChange={(e) => setDraftProject((prev) => ({ ...prev, projectName: e.target.value }))}
                  />
                  <select
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    value={draftProject.waterBodyType}
                    onChange={(e) => setDraftProject((prev) => ({ ...prev, waterBodyType: e.target.value as AquaScanProject['waterBodyType'] }))}
                  >
                    {waterBodyTypes.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <input
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
                    placeholder="Location name"
                    value={draftProject.locationName}
                    onChange={(e) => setDraftProject((prev) => ({ ...prev, locationName: e.target.value }))}
                  />
                  <select
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    value={draftProject.concernType}
                    onChange={(e) => setDraftProject((prev) => ({ ...prev, concernType: e.target.value as ConcernType }))}
                  >
                    {concernTypes.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <input
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
                    placeholder="GPS latitude"
                    value={draftProject.latitude}
                    onChange={(e) => setDraftProject((prev) => ({ ...prev, latitude: e.target.value }))}
                  />
                  <input
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
                    placeholder="GPS longitude"
                    value={draftProject.longitude}
                    onChange={(e) => setDraftProject((prev) => ({ ...prev, longitude: e.target.value }))}
                  />
                  <input
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 md:col-span-2"
                    placeholder="Optional AOI reference notes"
                    value={draftProject.polygonPlaceholder}
                    onChange={(e) => setDraftProject((prev) => ({ ...prev, polygonPlaceholder: e.target.value }))}
                  />
                  <select
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    value={draftProject.suspectedSource}
                    onChange={(e) => setDraftProject((prev) => ({ ...prev, suspectedSource: e.target.value as AquaScanProject['suspectedSource'] }))}
                  >
                    {suspectedSources.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs">
                    <button type="button" className="rounded-md border border-cyan-500/50 bg-cyan-900/25 px-2 py-1 text-cyan-100" onClick={addEvidenceItem}>
                      Upload evidence
                    </button>
                    <span className="text-slate-400">{selectedProject.evidenceCount} item(s)</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs">
                    <input id="boundary-flag" type="checkbox" checked={hasSavedAoi} readOnly />
                    <label htmlFor="boundary-flag" className="text-slate-300">Boundary saved</label>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
                  <p className="mb-2 text-xs font-semibold text-slate-300">Community impact</p>
                  <div className="flex flex-wrap gap-2">
                    {communityImpactOptions.map((impact) => {
                      const active = draftProject.communityImpact.includes(impact);
                      return (
                        <button
                          key={impact}
                          type="button"
                          onClick={() =>
                            setDraftProject((prev) => ({
                              ...prev,
                              communityImpact: active
                                ? prev.communityImpact.filter((i) => i !== impact)
                                : [...prev.communityImpact, impact],
                            }))
                          }
                          className={`rounded-full border px-2.5 py-1 text-[11px] ${active ? 'border-cyan-500/60 bg-cyan-900/30 text-cyan-100' : 'border-slate-600 bg-slate-800/60 text-slate-300'}`}
                        >
                          {impact}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={saveDraftProject}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/60 bg-emerald-900/25 px-3 py-2 text-xs font-semibold text-emerald-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Save Project Intake
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <select
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                      value={selectedProject.concernType}
                      onChange={(e) => selectedProjectId && updateSelectedProject({ concernType: e.target.value as ConcernType })}
                    >
                      {concernTypes.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <select
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                      value={selectedProject.validatorStatus}
                      onChange={(e) => selectedProjectId && updateSelectedProject({ validatorStatus: e.target.value as AquaScanProject['validatorStatus'] })}
                    >
                      <option value="Pending">Validator: Pending</option>
                      <option value="Reviewed">Validator: Reviewed</option>
                      <option value="Validated">Validator: Validated</option>
                    </select>
                    <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={selectedProject.hasLabResult}
                        onChange={(e) => selectedProjectId && updateSelectedProject({ hasLabResult: e.target.checked })}
                      />
                      Lab result uploaded
                    </label>
                  </div>
                </div>
              </div>
            ) : null}

            {/* -- Layers Tab -- */}
            {activeTab === 'layers' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-300">Select satellite layers for analysis</p>
                  <span className="rounded-full border border-amber-400/40 bg-amber-900/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-100">
                    Live satellite layers
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {mockSatelliteLayers.map((layer: SatelliteLayer) => {
                    const active = selectedLayerIds.includes(layer.id);
                    return (
                      <button
                        key={layer.id}
                        type="button"
                        onClick={() => toggleLayer(layer.id)}
                        className={`rounded-xl border p-3 text-left transition ${active ? 'border-cyan-500/60 bg-cyan-900/20' : 'border-slate-700 bg-slate-950/70 hover:border-slate-500'}`}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-slate-100">{layer.name}</h3>
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-400">
                            {active ? <CheckCircle className="h-3.5 w-3.5 text-cyan-300" /> : null}
                            {layer.category}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-300">{layer.purpose}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{layer.capability}</p>
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-2 text-[11px] text-slate-400">
                  NDVI = vegetation health . NDWI = water presence . NDMI = moisture stress . NBR = fire/burn disturbance
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">Live-Derived Overlays</p>
                    <span className="rounded-full border border-cyan-500/40 bg-cyan-900/20 px-2 py-0.5 text-[10px] text-cyan-100">
                      Backend only - no local fallback geometry
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <label className="flex flex-col gap-1 text-xs text-slate-300">
                      <span className="text-[10px] text-slate-400">Overlay from</span>
                      <input
                        type="date"
                        value={overlayDateRange.fromDate}
                        onChange={(e) => setOverlayDateRange((prev) => ({ ...prev, fromDate: e.target.value }))}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-slate-300">
                      <span className="text-[10px] text-slate-400">Overlay to</span>
                      <input
                        type="date"
                        value={overlayDateRange.toDate}
                        onChange={(e) => setOverlayDateRange((prev) => ({ ...prev, toDate: e.target.value }))}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-slate-300">
                      <span className="text-[10px] text-slate-400">Threshold</span>
                      <input
                        type="number"
                        step="0.01"
                        value={overlayThreshold}
                        onChange={(e) => setOverlayThreshold(Number(e.target.value))}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                      />
                    </label>
                    <div className="flex flex-col justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setOverlayDateRange({ fromDate: selectedDate, toDate: selectedDate })}
                        className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200"
                      >
                        Use map date
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    {!selectedFocusLocation
                      ? 'Select a focus location first.'
                      : !readySavedAoi
                        ? 'Focus location set. Draw and save an AOI before requesting overlays.'
                      : overlayBlockReason || 'Overlay requests will render only backend-returned GeoJSON or raster.'}
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {liveOverlayList.map(({ overlayType, label, sourceLabel, overlay }) => (
                      <div key={overlayType} className="rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-slate-100">{label}</p>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${
                            overlay.status === 'available'
                              ? 'border-emerald-500/40 bg-emerald-900/20 text-emerald-200'
                              : overlay.status === 'loading'
                                ? 'border-cyan-500/40 bg-cyan-900/20 text-cyan-100'
                                : overlay.status === 'unavailable' || overlay.status === 'error'
                                  ? 'border-amber-500/40 bg-amber-900/20 text-amber-200'
                                  : 'border-slate-700 bg-slate-900/50 text-slate-500'
                          }`}>
                            {overlay.status === 'idle' ? overlayIdleLabel : overlay.status}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">{sourceLabel}</p>
                        <p className="mt-1 text-[11px] text-slate-300">
                          {overlay.status === 'loading'
                            ? 'Loading live-derived overlay...'
                            : overlay.status === 'available'
                              ? 'Source: Copernicus-derived'
                              : overlayType === 'ndwi_water_presence' && (overlay.status === 'unavailable' || overlay.status === 'error')
                                ? 'Live-derived NDWI overlay unavailable for this AOI/date.'
                                : overlay.status === 'unavailable' || overlay.status === 'error'
                                  ? 'Live-derived overlay unavailable for this AOI/date.'
                                  : overlayIdleLabel}
                        </p>
                        {overlay.reason && overlay.status !== 'available' ? (
                          <p className="mt-1 text-[11px] text-amber-200">{overlay.reason}</p>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => { void requestLiveOverlay(overlayType); }}
                          disabled={overlayBlockReason !== '' || overlay.status === 'loading'}
                          className="mt-2 rounded-lg border border-cyan-500/60 bg-cyan-900/30 px-3 py-1.5 text-xs font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {overlay.status === 'loading' ? 'Loading live-derived overlay...' : `Load ${label}`}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Risk score breakdown */}
                <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">Risk Score Logic</p>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between"><span>Concern type baseline</span><span>+{concernWeights[selectedProject.concernType]}</span></div>
                    <div className="flex justify-between"><span>Evidence items ({selectedProject.evidenceCount})</span><span>+{Math.min(18, selectedProject.evidenceCount * 4)}</span></div>
                    <div className="flex justify-between"><span>Satellite anomaly status</span><span>+{anomalyLayerCount >= 5 ? 14 : anomalyLayerCount >= 3 ? 8 : 4}</span></div>
                    <div className="flex justify-between"><span>Lab result uploaded</span><span>{selectedProject.hasLabResult ? '-10' : '0'}</span></div>
                    <div className="flex justify-between"><span>Validator status</span><span>{validatorStatus === 'Validated' ? '+8' : validatorStatus === 'Reviewed' ? '+4' : '0'}</span></div>
                    <div className="mt-2 flex justify-between border-t border-slate-700 pt-2 font-semibold">
                      <span>Total</span>
                      <span className="text-xl font-black text-white">{selectedFocusLocation ? `${riskScore}/100` : '-'}</span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-cyan-200">
                    {selectedFocusLocation ? riskBand(riskScore) : 'Select a location to compute risk.'}
                  </p>
                </div>
              </div>
            ) : null}

            {/* -- MRV Compare Tab -- */}
            {activeTab === 'mrv' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-300">Before/after index comparison using Copernicus Statistical API</p>
                  <span className="rounded-full border border-amber-500/40 bg-amber-900/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
                    Indicative MRV estimate - not certified carbon credit
                  </span>
                </div>
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/15 p-3 text-xs text-slate-200">
                  <p className="font-semibold text-cyan-200">Use NDWI first for water presence and wetness. NDWI is the standard starting point for water-focused satellite screening.</p>
                  <p className="mt-1 text-slate-400">NDWI = water presence / wetness. NDVI = vegetation health. NDMI = moisture stress. NBR = burn/fire disturbance.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400">Index</span>
                    <select value={comparisonIndexType} onChange={(e) => setComparisonIndexType(e.target.value as CopernicusIndexType)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100">
                      <option value="NDWI">NDWI</option>
                      <option value="NDVI">NDVI</option>
                      <option value="NDMI">NDMI</option>
                      <option value="NBR">NBR</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400">Collection</span>
                    <select value={comparisonCollection} onChange={(e) => setComparisonCollection(e.target.value as 'sentinel-2-l2a' | 'sentinel-1-grd')} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100">
                      <option value="sentinel-2-l2a">Sentinel-2 L2A</option>
                      <option value="sentinel-1-grd">Sentinel-1 GRD</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400">Before from</span>
                    <input type="date" value={beforeRange.from} onChange={(e) => setBeforeRange((p) => ({ ...p, from: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400">Before to</span>
                    <input type="date" value={beforeRange.to} onChange={(e) => setBeforeRange((p) => ({ ...p, to: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400">After from</span>
                    <input type="date" value={afterRange.from} onChange={(e) => setAfterRange((p) => ({ ...p, from: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400">After to</span>
                    <input type="date" value={afterRange.to} onChange={(e) => setAfterRange((p) => ({ ...p, to: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100" />
                  </div>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-xs">
                  <p className="font-semibold text-slate-200">Recommended test dates</p>
                  <p className="mt-1 text-slate-400">If no scene is found, use a wider date range or try a historical month. Optical satellites may be blocked by clouds or unavailable for a narrow window.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {RECOMMENDED_COMPARISON_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyComparisonPreset(preset)}
                        className="rounded-lg border border-slate-600 bg-slate-900/60 px-3 py-1.5 text-left text-[11px] text-slate-200 hover:border-cyan-500/40"
                      >
                        {preset.label}: {preset.description}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  AOI: {savedAoi ? `${savedAoi.length} points, ${savedAoiAreaSqKm.toFixed(2)} km2` : drawingAoi ? `Drawing in progress (${aoiPoints.length} points)` : 'No saved AOI - draw one on the map then save it'}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { void runMrvComparison(); }}
                    disabled={!canCalculateMrv}
                    title={mrvBlockReason || undefined}
                    className="rounded-lg border border-cyan-500/60 bg-cyan-900/30 px-3 py-1.5 text-xs font-semibold text-cyan-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {comparisonLoading ? 'Calculating live AOI statistics...' : 'Calculate Comparison'}
                  </button>
                  {mrvBlockReason ? (
                    <span className="rounded-full border border-amber-500/40 bg-amber-900/20 px-2 py-0.5 text-[10px] text-amber-200">
                      {mrvBlockReason}
                    </span>
                  ) : null}
                  <span className="text-[11px] text-slate-400">Gate: {validatorGateStatus.replace(/_/g, ' ')}</span>
                  {(['pending_review', 'needs_more_evidence', 'approved', 'rejected'] as CopernicusValidatorStatus[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setValidatorGateStatus(s)}
                      className={`rounded border px-2 py-0.5 text-[10px] ${validatorGateStatus === s ? 'border-cyan-500/50 text-cyan-200' : 'border-slate-600 text-slate-400'}`}
                    >
                      {s.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
                {comparisonError ? <p className="text-xs text-rose-300">{comparisonError}</p> : null}
                <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                  {(
                    [
                      ['Before mean', String(comparisonResult?.before.mean ?? 'N/A')],
                      ['After mean', String(comparisonResult?.after.mean ?? 'N/A')],
                      ['Absolute change', String(comparisonResult?.delta.absoluteChange ?? 'N/A')],
                      ['Percent change', comparisonResult?.delta.percentChange != null ? `${comparisonResult.delta.percentChange}%` : 'N/A'],
                      ['Confidence', comparisonResult ? `${Math.round(comparisonResult.confidenceScore * 100)}%` : 'N/A'],
                      ['Sample count', comparisonResult ? `${comparisonResult.before.sampleCount} / ${comparisonResult.after.sampleCount}` : 'N/A'],
                      ['No-data count', comparisonResult ? `${comparisonResult.before.noDataCount} / ${comparisonResult.after.noDataCount}` : 'N/A'],
                      ['Cloud cover', comparisonResult ? `${comparisonResult.before.cloudCoverage ?? 'N/A'} / ${comparisonResult.after.cloudCoverage ?? 'N/A'}` : 'N/A'],
                      ['Source', comparisonResult ? 'Copernicus AOI statistics' : 'N/A'],
                    ] as [string, string][]
                  ).map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-slate-700 bg-slate-950/80 p-2 text-xs">
                      <p className="text-slate-400">{label}</p>
                      <p className="font-bold text-slate-100">{value}</p>
                    </div>
                  ))}
                </div>
                {comparisonResult?.warnings?.length ? (
                  <p className="text-[11px] text-amber-200">Warnings: {comparisonResult.warnings.join(' | ')}</p>
                ) : null}
                {comparisonResult ? (
                  <div className="space-y-1 text-xs text-slate-300">
                    <p>{comparisonResult.delta.interpretation}</p>
                    <p>Measurement source: Copernicus AOI statistics</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Run comparison to see interpretation.</p>
                )}
                <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-xs text-slate-300">
                  <p className="mb-1 font-semibold text-slate-200">Calculation history (local per project)</p>
                  {calculationHistory.length === 0 ? (
                    <p className="text-slate-500">No saved calculations yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {calculationHistory.slice(0, 5).map((item) => (
                        <p key={item.calculationId} className="text-[11px]">
                          {item.generatedAt.slice(0, 10)} . {item.indexType} . {item.deltaPercent ?? 'N/A'}% . {Math.round(item.confidenceScore * 100)}% conf . {item.validatorStatus.replace(/_/g, ' ')}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* -- Evidence Packet Tab -- */}
            {activeTab === 'evidence' ? (
              <div className="space-y-4">
                {!canGenerateEvidencePacket ? (
                  <p className="rounded-lg border border-amber-500/40 bg-amber-900/20 px-3 py-2 text-xs text-amber-200">
                    Select a focus location and save an AOI before generating an evidence packet.
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPacket((prev) => !prev)}
                    disabled={!canGenerateEvidencePacket}
                    className="rounded-lg border border-emerald-500/50 bg-emerald-900/25 px-3 py-1.5 text-xs font-semibold text-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {showPacket ? 'Hide Packet Preview' : 'Generate Evidence Packet'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { void exportEvidencePacketJson(); }}
                    disabled={!canGenerateEvidencePacket}
                    className="rounded-lg border border-cyan-500/50 bg-cyan-900/25 px-3 py-1.5 text-xs font-semibold text-cyan-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Export JSON
                  </button>
                  <button
                    type="button"
                    onClick={exportEvidencePacketPdf}
                    disabled={!canGenerateEvidencePacket}
                    className="rounded-lg border border-slate-600 bg-slate-900/30 px-3 py-1.5 text-xs font-semibold text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Export PDF (pending)
                  </button>
                  <span className="text-[11px] text-amber-200">
                    Indicative MRV estimate - not certified carbon credit.
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Live-derived satellite measurements are screening indicators and require validator review, field evidence, or laboratory confirmation before official conclusions.
                  </span>
                </div>

                {/* Satellite indicators */}
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
                  {indicators.map((item) => (
                    <article key={item.id} className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-200" title={item.explanation}>
                          {item.label}
                        </p>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${selectedFocusLocation ? statusTone(item.status) : 'border-slate-700 bg-slate-900/50 text-slate-500'}`}>
                          {selectedFocusLocation ? statusLabel(item.status) : 'Pending location'}
                        </span>
                      </div>
                      <p className="mt-1.5 text-lg font-black text-white">
                        {selectedFocusLocation ? item.value : '-'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {selectedFocusLocation ? item.trend : 'Select a focus location to evaluate this indicator.'}
                      </p>
                    </article>
                  ))}
                </div>

                {/* AI summary */}
                <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-purple-300">
                    AI Water Intelligence Summary
                  </p>
                  <p className="text-sm leading-relaxed text-slate-200">{displayAiSummary}</p>
                  {waterData && selectedFocusLocation ? (
                    <>
                      <p className="mt-2 text-xs text-cyan-200">Recommended next step: {recommendedNextStep}</p>
                      <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-900/20 p-2 text-[11px] text-amber-100">
                        Satellite indicators are screening tools. Confirmed contamination requires field sampling, laboratory testing, or official verification.
                      </p>
                    </>
                  ) : null}
                </div>

                {/* Evidence packet */}
                {showPacket ? (
                  <div className="space-y-1.5 rounded-xl border border-slate-700 bg-slate-950 p-4 text-xs text-slate-200">
                    <p className="text-sm font-bold text-white">DPAL AquaScan Evidence Packet</p>
                    <p className="text-[10px] text-slate-500">Current export payload from the active live workspace state.</p>
                    <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
                      <p><span className="text-slate-400">Generated:</span> {packetPreview.timestamp}</p>
                      <p><span className="text-slate-400">Project ID:</span> {selectedProject.id}</p>
                      <p>
                        <span className="text-slate-400">Location:</span>{' '}
                        {selectedFocusLocation
                          ? selectedFocusLocation.displayName.split(',').slice(0, 2).join(',')
                          : 'No focus location selected'}
                      </p>
                      <p>
                        <span className="text-slate-400">Coordinates:</span>{' '}
                        {selectedFocusLocation
                          ? `${selectedFocusLocation.latitude.toFixed(5)}, ${selectedFocusLocation.longitude.toFixed(5)}`
                          : 'N/A'}
                      </p>
                      <p><span className="text-slate-400">AOI boundary points:</span> {packetPreview.aoiBoundary.length}</p>
                      <p><span className="text-slate-400">AOI area:</span> {evidencePacketPayload.aoiArea.hectares} ha / {evidencePacketPayload.aoiArea.squareKilometers} km2</p>
                      <p><span className="text-slate-400">Concern type:</span> {packetPreview.scanType}</p>
                      <p><span className="text-slate-400">Layers:</span> {packetPreview.selectedLayers.join(', ') || 'None'}</p>
                      <p><span className="text-slate-400">Selected date:</span> {packetPreview.selectedDate}</p>
                      <p><span className="text-slate-400">Date ranges:</span> {beforeRange.from || '-'} to {beforeRange.to || '-'} / {afterRange.from || '-'} to {afterRange.to || '-'}</p>
                      <p><span className="text-slate-400">NDWI / water index:</span> {selectedFocusLocation ? (packetPreview.ndwi != null ? `${packetPreview.ndwi} (measured)` : 'Pending live data') : 'No location'}</p>
                      <p><span className="text-slate-400">Water presence:</span> {selectedFocusLocation ? packetPreview.waterPresence : 'No location'}</p>
                      <p><span className="text-slate-400">Confidence:</span> {selectedFocusLocation ? (packetPreview.confidenceScore != null ? `${packetPreview.confidenceScore}%` : 'Pending live data') : '-'}</p>
                      <p><span className="text-slate-400">Risk band:</span> {selectedFocusLocation ? `${packetPreview.riskScore} (${riskBand(packetPreview.riskScore)})` : '-'}</p>
                      <p><span className="text-slate-400">Lab status:</span> {selectedProject.hasLabResult ? 'Uploaded' : 'Pending'}</p>
                      <p><span className="text-slate-400">Validator:</span> {evidencePacket.validatorStatus}</p>
                      <p><span className="text-slate-400">Index type:</span> {evidencePacket.indexType}</p>
                      <p><span className="text-slate-400">Before value:</span> {evidencePacket.beforeValue ?? 'N/A'}</p>
                      <p><span className="text-slate-400">After value:</span> {evidencePacket.afterValue ?? 'N/A'}</p>
                      <p><span className="text-slate-400">Delta %:</span> {evidencePacket.deltaPercent ?? 'N/A'}</p>
                      <p><span className="text-slate-400">Data source:</span> {evidencePacket.dataSourceCitation}</p>
                      <p><span className="text-slate-400">Measurement status:</span> {String(evidencePacketPayload.measurementStatus)}</p>
                    </div>
                    <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                      <p className="font-semibold text-slate-100">Recorded overlays</p>
                      {overlayPacketRecords.length === 0 ? (
                        <p className="mt-1 text-[11px] text-slate-500">No live-derived overlays requested yet.</p>
                      ) : (
                        <div className="mt-1 space-y-1 text-[11px] text-slate-300">
                          {overlayPacketRecords.map((overlay) => (
                            <p key={String(overlay.overlayType)}>
                              {String(overlay.overlayType)} . {String(overlay.status)}
                              {'source' in overlay ? ` . ${String(overlay.source)}` : ''}
                              {'geometryIncluded' in overlay ? ` . geometryIncluded=${String(overlay.geometryIncluded)}` : ''}
                              {'rasterIncluded' in overlay ? ` . rasterIncluded=${String(overlay.rasterIncluded)}` : ''}
                              {'reason' in overlay ? ` . ${String(overlay.reason)}` : ''}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                      <p className="font-semibold text-slate-100">Measurement records</p>
                      {evidencePacketPayload.measurements.length === 0 ? (
                        <p className="mt-1 text-[11px] text-slate-500">Measurement not yet completed.</p>
                      ) : (
                        <div className="mt-1 space-y-1 text-[11px] text-slate-300">
                          {evidencePacketPayload.measurements.map((measurement, index) => (
                            <p key={`${index}-${String(measurement.beforeMean ?? 'na')}`}>
                              before={String(measurement.beforeMean ?? 'N/A')} . after={String(measurement.afterMean ?? 'N/A')} . delta={String(measurement.percentChange ?? 'N/A')} . confidence={String(measurement.confidence ?? 'N/A')}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-900/20 px-2 py-1 text-amber-100">
                      {packetPreview.legalSafeNote}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    Generate a packet from the current map state, selected layers, coordinates, indicators, and evidence.
                  </p>
                )}

                {/* Validator gate */}
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="text-slate-400">Validator gate:</span>
                  {(['pending_review', 'needs_more_evidence', 'approved', 'rejected'] as CopernicusValidatorStatus[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setValidatorGateStatus(s)}
                      className={`rounded border px-2 py-1 ${validatorGateStatus === s ? 'border-cyan-500/50 text-cyan-200' : 'border-slate-600 text-slate-400'}`}
                    >
                      {s.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* -- Actions Tab -- */}
            {activeTab === 'actions' ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  Route screening results into accountable operational steps. These actions create draft records. Confirm contamination before escalating to authorities.
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {actionButtons.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => runAction(label)}
                      disabled={!showPacket && label !== 'Export Evidence Packet'}
                      className="rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2.5 text-left text-xs font-semibold text-slate-100 transition hover:border-cyan-500/50 hover:bg-cyan-900/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <button type="button" onClick={() => selectedProjectId && updateSelectedProject({ validatorStatus: 'Pending' })} className="rounded border border-slate-600 px-2 py-1 text-slate-300">Set Pending</button>
                  <button type="button" onClick={() => selectedProjectId && updateSelectedProject({ validatorStatus: 'Reviewed' })} className="rounded border border-slate-600 px-2 py-1 text-slate-300">Set Reviewed</button>
                  <button type="button" onClick={() => selectedProjectId && updateSelectedProject({ validatorStatus: 'Validated' })} className="rounded border border-slate-600 px-2 py-1 text-slate-300">Set Validated</button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Unsupported action routes now report backend availability instead of creating local draft actions.
                </p>
                <p className="rounded-lg border border-amber-500/30 bg-amber-900/15 p-3 text-[11px] text-amber-100">
                  DPAL AquaScan identifies potential water-risk indicators using satellite, field, and community evidence. It does not claim confirmed contamination without laboratory testing, field validation, or official verification. Satellite indicators must be verified with field evidence, lab results, or validator review before official conclusions.
                </p>

                {/* Nearby Context */}
                <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">
                    Nearby Context
                  </p>
                  <p className="mb-2 text-[11px] text-amber-200">
                    Nearby mapped entities are contextual leads only. They are not evidence of contamination, liability, or wrongdoing.
                  </p>
                  {!selectedFocusLocation ? (
                    <p className="text-xs text-slate-500">Select or click a map location to search nearby mapped entities.</p>
                  ) : entitiesLoading ? (
                    <p className="text-xs text-slate-400">Searching nearby mapped entities...</p>
                  ) : nearbyEntities.length === 0 ? (
                    <p className="text-xs text-slate-500">{entitiesError ?? 'No nearby mapped entities available.'}</p>
                  ) : (
                    <div className="space-y-2">
                      {nearbyEntities.map((e) => (
                        <div key={e.id} className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 text-xs">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-200 truncate" title={e.name}>{e.name}</p>
                            <p className="mt-0.5 text-slate-500">{e.category}</p>
                          </div>
                          <div className="shrink-0 text-right text-[10px] text-slate-500">
                            <p>{e.distanceKm} km</p>
                            <p>{e.source}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-[10px] text-slate-600">
                    Search radius: 5 km. Source: OpenStreetMap via Overpass API. Nearby mapped entities are for investigation context only. Field evidence, lab results, official records, or validator review are required before making conclusions.
                  </p>
                </div>
              </div>
            ) : null}

          </div>
        </div>
      </div>
    </div>
  );
}
