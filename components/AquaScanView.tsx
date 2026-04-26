import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, MapContainer, Polygon, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
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
  mockEvidencePackets,
  mockSatelliteLayers,
  mockWaterProjects,
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

interface AquaScanViewProps {
  onReturn: () => void;
  hero?: Hero;
  onOpenWaterOperations?: () => void;
}

interface FocusLocation {
  source: 'search' | 'gps' | 'manual';
  query: string;
  displayName: string;
  latitude: number;
  longitude: number;
  aoiGeoJson: CopernicusAoiGeoJson | null;
  resolvedAt: string;
}

const DEFAULT_WEST_US_CENTER: [number, number] = [37.25, -119.8];

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
      onInspect(point);
      if (drawingAoi) {
        onAoiPoint(point);
      }
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
  const [projects, setProjects] = useState<AquaScanProject[]>(mockWaterProjects);
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
  const [actionDraftCounts, setActionDraftCounts] = useState({
    fieldMission: 0,
    sampleRequest: 0,
    labUploads: 0,
    authorityNotifications: 0,
    restorationDrafts: 0,
  });
  const [overlayState, setOverlayState] = useState({
    boundary: true,
    waterExtent: true,
    ndwiProxy: true,
    floodWetness: true,
    riskZone: true,
    reportPins: true,
    samplePoints: true,
    anomalyHotspots: true,
    flowDirection: true,
  });
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const waterRequestAbortRef = useRef<AbortController | null>(null);
  const waterDebounceRef = useRef<number | null>(null);

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
  const activeAoi = aoiPoints.length >= 3 ? aoiPoints : savedAoiPoints.length >= 3 ? savedAoiPoints : null;
  const aoiAreaSqKm = polygonAreaSqKm(activeAoi ?? []);

  useEffect(() => {
    if (selectedFocusLocation) {
      setMapCenter([selectedFocusLocation.latitude, selectedFocusLocation.longitude]);
    }
  }, [selectedFocusLocation]);

  useEffect(() => {
    const stored = localStorage.getItem('dpal_aquascan_saved_aoi_v1');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as Array<[number, number]>;
      if (Array.isArray(parsed)) {
        setSavedAoiPoints(parsed);
      }
    } catch {
      // Ignore invalid localStorage payload.
    }
  }, []);

  useEffect(() => () => {
    if (waterRequestAbortRef.current) {
      waterRequestAbortRef.current.abort();
    }
    if (waterDebounceRef.current) {
      window.clearTimeout(waterDebounceRef.current);
    }
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
    const point: [number, number] = inspectedPoint ?? mapCenter;
    const shouldUseAoi = Boolean(activeAoi && activeAoi.length >= 3);
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
              polygonCoordinates: activeAoi as [number, number][],
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
          polygonCoordinates: shouldUseAoi ? (activeAoi as [number, number][]) : undefined,
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
  }, [activeAoi, compareDate, compareEnabled, inspectedPoint, liveRetryTick, mapCenter, selectedAnalysisLayer, selectedDate]);

  const validatorStatus = selectedProject.validatorStatus;

  const anomalyLayerCount = selectedLayerIds.length;

  const riskScore = useMemo(() => {
    const base = concernWeights[selectedProject.concernType] ?? 40;
    const evidenceBoost = Math.min(18, selectedProject.evidenceCount * 4);
    const anomalyBoost = anomalyLayerCount >= 5 ? 14 : anomalyLayerCount >= 3 ? 8 : 4;
    const boundaryBoost = boundaryDrawn ? 6 : 0;
    const validatorBoost = selectedProject.validatorStatus === 'Validated' ? 8 : selectedProject.validatorStatus === 'Reviewed' ? 4 : 0;
    const labReduction = selectedProject.hasLabResult ? -10 : 0;
    return clampRisk(base + evidenceBoost + anomalyBoost + boundaryBoost + validatorBoost + labReduction);
  }, [selectedProject, anomalyLayerCount, boundaryDrawn]);

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
    if (riskScore <= 25) return 'Continue monitoring.';
    if (String(waterData?.waterAnalysis.turbidityProxy ?? '').toLowerCase().includes('high') || riskScore > 50) {
      return 'Request water sample.';
    }
    if (String(waterData?.waterAnalysis.thermalAnomaly ?? '').toLowerCase().includes('elevated') || String(waterData?.waterAnalysis.thermalAnomaly ?? '').toLowerCase().includes('detected')) {
      return 'Compare date/layers and inspect area.';
    }
    if ((inspectQualityConfidence ?? 0) < 65) return 'Add evidence or change satellite date.';
    return 'Notify authority or launch field mission if indicators remain strong after validation.';
  }, [inspectQualityConfidence, riskScore, waterData?.waterAnalysis.thermalAnomaly, waterData?.waterAnalysis.turbidityProxy]);

  const displayAiSummary = useMemo(() => {
    if (!selectedFocusLocation) {
      return 'Select a focus location to begin water intelligence analysis.';
    }
    if (!waterData) {
      return 'Live satellite intelligence is unavailable for the selected location. Select a valid AOI/date range or retry live data before generating a conclusion.';
    }
    return buildAiSummary(selectedProject.concernType, selectedFocusLocation.displayName.split(',')[0]);
  }, [selectedFocusLocation, waterData, selectedProject.concernType]);

  const focusAoiStatus = activeAoi && activeAoi.length >= 3
    ? `Drawn (${activeAoi.length} pts)`
    : savedAoiPoints.length >= 3
      ? 'Saved'
      : 'Missing';

  type WorkflowStepStatus = 'complete' | 'needs_attention' | 'locked' | 'pending';
  const workflowSteps: Array<{
    id: string;
    label: string;
    status: WorkflowStepStatus;
    tabId?: 'intake' | 'layers' | 'mrv' | 'evidence' | 'actions';
  }> = [
    { id: 'location', label: 'Location', status: selectedFocusLocation ? 'complete' : 'needs_attention' },
    { id: 'boundary', label: 'Boundary', status: !selectedFocusLocation ? 'locked' : activeAoi && activeAoi.length >= 3 ? 'complete' : 'pending', tabId: 'intake' },
    { id: 'layers', label: 'Layers', status: selectedLayerIds.length > 0 ? 'complete' : 'pending', tabId: 'layers' },
    { id: 'compare', label: 'Compare', status: !activeAoi ? 'locked' : comparisonResult ? 'complete' : 'pending', tabId: 'mrv' },
    { id: 'evidence', label: 'Evidence', status: selectedProject.evidenceCount > 0 ? 'complete' : 'pending', tabId: 'evidence' },
    { id: 'action', label: 'Action', status: 'pending', tabId: 'actions' },
  ];

  const mrvBlockReason = !selectedFocusLocation
    ? 'Select a focus location first'
    : !activeAoi
      ? 'Draw and save an AOI on the map first'
      : !beforeRange.from || !beforeRange.to
        ? 'Enter a complete before date range'
        : !afterRange.from || !afterRange.to
          ? 'Enter a complete after date range'
          : beforeRange.from === afterRange.from && beforeRange.to === afterRange.to
            ? 'Before and after date ranges cannot be identical'
            : '';
  const canCalculateMrv = mrvBlockReason === '' && !comparisonLoading;

  const packetPreview = useMemo(() => {
    const template = mockEvidencePackets[0];
    return {
      ...template,
      projectName: selectedProject.projectName || 'Unnamed project',
      location: selectedProject.locationName || 'No location selected',
      scanType: selectedProject.concernType,
      selectedLayers: mockSatelliteLayers.filter((layer) => selectedLayerIds.includes(layer.id)).map((layer) => layer.name),
      timestamp: new Date().toLocaleString(),
      riskScore,
      aiSummary,
      uploadedEvidence: selectedProject.evidenceCount,
      validatorStatus,
      coordinates: { lat: mapCenter[0], lng: mapCenter[1] },
      aoiBoundary: activeAoi ?? [],
      selectedDate,
      ndwi: inspectNdwiEstimate != null ? Number(inspectNdwiEstimate.toFixed(2)) : null,
      waterPresence: waterData?.waterAnalysis.waterPresence ?? 'Pending live data',
      turbidityProxy: waterData?.waterAnalysis.turbidityProxy ?? 'Pending live data',
      thermalAnomaly: waterData?.waterAnalysis.thermalAnomaly ?? 'Pending live data',
      confidenceScore: inspectQualityConfidence ?? null,
      reportPinsCount: overlayState.reportPins ? 2 : 0,
      samplePointsCount: overlayState.samplePoints ? 2 : 0,
      tileStatus: imageryError ? 'Failed' : partialFailure ? 'Partial' : imageryLoading ? 'Loading' : 'Active',
      legalSafeNote:
        'DPAL AquaScan identifies potential water-risk indicators using satellite, field, and community evidence. It does not claim confirmed contamination without laboratory testing, field validation, or official verification.',
      recommendedNextAction:
        riskBand(riskScore) === 'High Risk'
          ? 'Escalate with field sampling and notify relevant authority.'
          : template.recommendedNextAction,
    };
  }, [selectedProject, selectedLayerIds, riskScore, aiSummary, validatorStatus, mapCenter, activeAoi, selectedDate, inspectNdwiEstimate, waterData?.waterAnalysis.waterPresence, waterData?.waterAnalysis.turbidityProxy, waterData?.waterAnalysis.thermalAnomaly, inspectQualityConfidence, overlayState.reportPins, overlayState.samplePoints, imageryError, partialFailure, imageryLoading]);
  const evidencePacket = useMemo<SatelliteEvidencePacket>(() => {
    const beforeValue = comparisonResult?.before.mean ?? null;
    const afterValue = comparisonResult?.after.mean ?? null;
    const deltaPercent = comparisonResult?.delta.percentChange ?? null;
    return {
      projectId: selectedProject.id,
      projectName: selectedProject.projectName || 'Unnamed project',
      aoiGeoJson: toAoiGeoJson(activeAoi),
      centerLatLng: { lat: mapCenter[0], lng: mapCenter[1] },
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
      ],
      limitations: [
        'Not a certified carbon credit determination.',
        'Field validation and applicable methodology checks are required before certification claims.',
      ],
      generatedAt: new Date().toISOString(),
      validatorStatus: validatorGateStatus,
      photos: [],
      notes: `Indicative MRV estimate. ${packetPreview.legalSafeNote}${comparisonResult?.warnings.length ? ` Warnings: ${comparisonResult.warnings.join(' | ')}` : ''}`,
    };
  }, [activeAoi, comparisonCollection, comparisonIndexType, comparisonResult, inspectQualityConfidence, mapCenter, packetPreview.legalSafeNote, selectedDate, selectedProject.id, validatorGateStatus, waterData?.satellite.acquisitionDate, waterData?.satellite.cloudCover, waterData?.satellite.product]);

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
    const next: AquaScanProject = {
      ...draftProject,
      id: `AQ-${Date.now().toString().slice(-6)}`,
      evidenceCount: draftProject.evidenceCount,
      validatorStatus: draftProject.validatorStatus,
    };
    setProjects((prev) => [next, ...prev]);
    setSelectedProjectId(next.id);
    setActionNotice('Project intake saved.');
  }

  async function runMrvComparison(): Promise<void> {
    const aoi = toAoiGeoJson(activeAoi);
    if (!aoi) {
      setComparisonError('AOI required before calculation');
      return;
    }
    if (!beforeRange.from || !beforeRange.to || !afterRange.from || !afterRange.to) {
      setComparisonError('Before and after date ranges are required.');
      return;
    }
    if (beforeRange.from === afterRange.from && beforeRange.to === afterRange.to) {
      setComparisonError('Before and after date ranges cannot be identical.');
      return;
    }
    setComparisonError(null);
    setComparisonLoading(true);
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
      setComparisonError(error instanceof Error ? error.message : 'Comparison failed');
    } finally {
      setComparisonLoading(false);
    }
  }

  function runAction(actionLabel: string): void {
    if (actionLabel === 'Launch Field Mission') {
      setActionDraftCounts((prev) => ({ ...prev, fieldMission: prev.fieldMission + 1 }));
      setActionNotice('Field mission draft created.');
      return;
    }
    if (actionLabel === 'Request Water Sample' && selectedProjectId) {
      updateSelectedProject({ evidenceCount: selectedProject.evidenceCount + 1 });
      setActionDraftCounts((prev) => ({ ...prev, sampleRequest: prev.sampleRequest + 1 }));
      setActionNotice('Sample request draft created.');
      return;
    }
    if (actionLabel === 'Upload Lab Result' && selectedProjectId) {
      updateSelectedProject({ hasLabResult: true });
      setActionDraftCounts((prev) => ({ ...prev, labUploads: prev.labUploads + 1 }));
      setActionNotice('Lab upload placeholder opened. Attach validated results when available.');
      return;
    }
    if (actionLabel === 'Notify Authority') {
      setActionDraftCounts((prev) => ({ ...prev, authorityNotifications: prev.authorityNotifications + 1 }));
      setActionNotice('Authority notification draft created.');
      return;
    }
    if (actionLabel === 'Create Restoration Project') {
      setActionDraftCounts((prev) => ({ ...prev, restorationDrafts: prev.restorationDrafts + 1 }));
      setActionNotice('Restoration project draft created.');
      return;
    }
    if (actionLabel === 'Add to Public Ledger') {
      setActionNotice('Requires validation before public ledger publishing.');
      return;
    }
    if (actionLabel === 'Export Evidence Packet') {
      setShowPacket(true);
      try {
        const payload = {
          exportedAt: new Date().toISOString(),
          projectId: selectedProject.id,
          projectName: selectedProject.projectName || 'Unnamed project',
          locationName: selectedProject.locationName || 'No location selected',
          coordinates: { lat: mapCenter[0], lng: mapCenter[1] },
          aoiBoundary: activeAoi ?? [],
          selectedLayers: mockSatelliteLayers.filter((layer) => selectedLayerIds.includes(layer.id)).map((layer) => layer.name),
          selectedDate,
          turbidityProxy: waterData?.waterAnalysis.turbidityProxy ?? 'Pending live data',
          ndwi: inspectNdwiEstimate != null ? Number(inspectNdwiEstimate.toFixed(2)) : null,
          waterPresence: waterData?.waterAnalysis.waterPresence ?? 'Pending live data',
          thermalAnomaly: waterData?.waterAnalysis.thermalAnomaly ?? 'Pending live data',
          confidenceScore: inspectQualityConfidence ?? null,
          evidencePointsCount: selectedProject.evidenceCount,
          reportPinsCount: overlayState.reportPins ? 2 : 0,
          samplePointsCount: overlayState.samplePoints ? 2 : 0,
          tileStatus: imageryError ? 'Failed' : partialFailure ? 'Partial' : imageryLoading ? 'Loading' : 'Active',
          legalSafeNote:
            'DPAL AquaScan identifies potential water-risk indicators using satellite, field, and community evidence. It does not claim confirmed contamination without laboratory testing, field validation, or official verification.',
          recommendedNextAction: packetPreview.recommendedNextAction,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `aquascan-evidence-${selectedProject.id}.json`;
        link.click();
        URL.revokeObjectURL(url);
        setActionNotice('Evidence packet exported as JSON preview.');
      } catch {
        setActionNotice('Evidence packet preview generated. Download is ready for wiring.');
      }
      return;
    }
  }

  async function exportEvidencePacketJson(): Promise<void> {
    try {
      const response = await fetch(apiUrl(API_ROUTES.COPERNICUS_EVIDENCE_PACKET), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evidencePacket),
      });
      const payload = (await response.json().catch(() => ({}))) as { packet?: SatelliteEvidencePacket; error?: string };
      if (!response.ok || !payload.packet) {
        setActionNotice(payload.error ?? 'Unable to export evidence packet JSON.');
        return;
      }
      const blob = new Blob([JSON.stringify(payload.packet, null, 2)], { type: 'application/json' });
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
        setActionNotice('Focused on current GPS location.');
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
    setSearchBusy(true);
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
        setActionNotice(`Focused on ${displayName}.`);
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
      setActionNotice(`Focused on ${shortName}.`);
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
    setSavedAoiPoints(aoiPoints);
    localStorage.setItem('dpal_aquascan_saved_aoi_v1', JSON.stringify(aoiPoints));
    setSelectedFocusLocation((prev) =>
      prev ? { ...prev, aoiGeoJson: toAoiGeoJson(aoiPoints) } : prev,
    );
    setActionNotice('AOI saved for this browser.');
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
      {/* â”€â”€ 1. Premium Header â”€â”€ */}
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

      {/* â”€â”€ 2. Focus Location Command Bar â”€â”€ */}
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
                setDrawingAoi((prev) => !prev);
                setBoundaryDrawn(true);
              }}
              className={`h-8 rounded-lg border px-3 text-xs font-semibold transition ${
                drawingAoi
                  ? 'border-cyan-500/60 bg-cyan-900/30 text-cyan-100'
                  : 'border-slate-600 bg-slate-800/60 text-slate-200 hover:border-cyan-500/40'
              }`}
            >
              {drawingAoi ? 'Stop Draw' : 'Draw AOI'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedFocusLocation(null);
                setSearchQuery('');
                setMapCenter(DEFAULT_WEST_US_CENTER);
                setInspectedPoint(null);
                setAoiPoints([]);
                setSavedAoiPoints([]);
                setBoundaryDrawn(false);
                localStorage.removeItem('dpal_aquascan_saved_aoi_v1');
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

      {/* â”€â”€ 3. Compact Status Chips â”€â”€ */}
      <div className="border-b border-slate-800/60 bg-slate-950/40 px-4 sm:px-6">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 py-1.5">
          {!waterData && !waterApiLoading && selectedFocusLocation ? (
            <span className="rounded-full border border-rose-500/40 bg-rose-900/20 px-2 py-0.5 text-[10px] text-rose-200">
              Satellite data: Unavailable
            </span>
          ) : null}
          {waterApiLoading ? (
            <span className="rounded-full border border-cyan-500/40 bg-cyan-900/20 px-2 py-0.5 text-[10px] text-cyan-200">
              Fetching satellite data...
            </span>
          ) : null}
          {activeAoi == null && selectedFocusLocation ? (
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
          {actionNotice ? (
            <span className="rounded-full border border-cyan-500/40 bg-cyan-900/20 px-2 py-0.5 text-[10px] text-cyan-100">
              {actionNotice}
            </span>
          ) : null}
        </div>
      </div>

      {/* â”€â”€ 4. Main Workspace (3-column) â”€â”€ */}
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
                    : step.status === 'needs_attention'
                      ? 'bg-amber-400'
                      : step.status === 'locked'
                        ? 'bg-slate-700'
                        : 'bg-slate-600'
                }`}
              />
              <span className="font-semibold">{step.label}</span>
              <span className="ml-auto text-[10px] opacity-60">
                {step.status === 'complete' ? 'v' : step.status === 'needs_attention' ? '!' : step.status === 'locked' ? '-' : 'o'}
              </span>
            </button>
          ))}
          <div className="mt-3 border-t border-slate-800 pt-3">
            <p className="text-[10px] text-slate-500">Project</p>
            <select
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-300"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.projectName || p.id}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 space-y-1 border-t border-slate-800 pt-3 text-[10px] text-slate-500">
            <p>Risk: <span className="font-bold text-white">{selectedFocusLocation ? `${riskScore}/100` : '-'}</span></p>
            <p>Concern: <span className="text-amber-200">{selectedProject.concernType}</span></p>
            <p>Validator: <span className="text-slate-300">{selectedProject.validatorStatus}</span></p>
          </div>
        </nav>

        {/* Center: Map */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Map toolbar */}
          <div className="border-b border-slate-800 bg-slate-900/60 px-3 py-1.5">
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <button type="button" onClick={() => runMapCommand('zoomIn')} className="rounded border border-slate-700 px-2 py-0.5 text-slate-300 hover:border-slate-500">+</button>
              <button type="button" onClick={() => runMapCommand('zoomOut')} className="rounded border border-slate-700 px-2 py-0.5 text-slate-300 hover:border-slate-500">âˆ’</button>
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
                {drawingAoi ? <span className="text-cyan-300">Drawing AOI...</span> : null}
                {aoiPoints.length > 0 ? (
                  <>
                    <button type="button" onClick={() => setAoiPoints((prev) => prev.slice(0, -1))} className="rounded border border-slate-700 px-2 py-0.5 text-slate-300">Undo</button>
                    <button type="button" onClick={saveAoi} className="rounded border border-emerald-500/50 bg-emerald-900/20 px-2 py-0.5 text-emerald-200">Save AOI</button>
                    <button
                      type="button"
                      onClick={() => { setAoiPoints([]); setSavedAoiPoints([]); localStorage.removeItem('dpal_aquascan_saved_aoi_v1'); setBoundaryRevision((prev) => prev + 1); }}
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
                <button type="button" onClick={retryImagery} className="rounded border border-slate-700 px-2 py-0.5 text-slate-400">â†»</button>
              </div>
            </div>
            {/* Overlay toggles */}
            <div className="mt-1 flex flex-wrap gap-1">
              {(
                [
                  ['boundary', 'Boundary'],
                  ['riskZone', 'Risk zone'],
                  ['reportPins', 'Reports'],
                  ['samplePoints', 'Samples'],
                  ['flowDirection', 'Flow'],
                  ['waterExtent', 'Water extent'],
                  ['ndwiProxy', 'NDWI proxy'],
                  ['floodWetness', 'Flood/wet'],
                  ['anomalyHotspots', 'Anomalies'],
                ] as [keyof typeof overlayState, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
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
            <MapContainer center={mapCenter} zoom={7} style={{ height: '100%', width: '100%' }}>
              <MapResizeSync trigger={mapExpanded ? 1 : 0} />
              <MapViewSync center={mapCenter} />
              <MapCommandBridge commandTick={commandTick} command={mapCommand} center={mapCenter} />
              <MapInteractionCapture
                drawingAoi={drawingAoi}
                onInspect={(point) => setInspectedPoint(point)}
                onAoiPoint={(point) => setAoiPoints((prev) => [...prev, point])}
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
              {overlayState.waterExtent ? (
                <Circle center={[mapCenter[0] + 0.01, mapCenter[1]]} radius={5400} pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.07 }}>
                  <Popup>
                    <div className="space-y-1 text-xs">
                      <p className="font-semibold">Water Presence Zone</p>
                      <p>Source: {activeGibsLayer.label}</p>
                      <p>Confidence: {inspectQualityConfidence != null ? `${inspectQualityConfidence}%` : 'Pending live data'}</p>
                      <p className="text-[10px]">Screening indicator only.</p>
                    </div>
                  </Popup>
                </Circle>
              ) : null}
              {overlayState.ndwiProxy ? (
                <Circle center={[mapCenter[0] - 0.02, mapCenter[1] + 0.03]} radius={3900} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.08 }}>
                  <Popup>
                    <div className="space-y-1 text-xs">
                      <p className="font-semibold">NDWI Proxy Zone</p>
                      <p>Source: {activeGibsLayer.label}</p>
                      <p className="text-[10px]">Screening indicator only.</p>
                    </div>
                  </Popup>
                </Circle>
              ) : null}
              {overlayState.floodWetness ? (
                <Circle center={[mapCenter[0] + 0.05, mapCenter[1] - 0.04]} radius={3100} pathOptions={{ color: '#a855f7', fillColor: '#a855f7', fillOpacity: 0.08 }} />
              ) : null}
              {overlayState.riskZone ? (
                <Circle center={[mapCenter[0] + 0.01, mapCenter[1] + 0.05]} radius={2200} pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.13 }}>
                  <Popup>
                    <div className="space-y-1 text-xs">
                      <p className="font-semibold">Orange Review Zone</p>
                      <p>Source: {activeGibsLayer.label}</p>
                      <p className="text-[10px]">Request sample or compare with lab data.</p>
                    </div>
                  </Popup>
                </Circle>
              ) : null}
              {overlayState.boundary && boundaryDrawn && aoiPoints.length >= 3 ? (
                <Polygon positions={aoiPoints} pathOptions={{ color: '#22d3ee', weight: 2, fillOpacity: 0.1 }} />
              ) : null}
              {overlayState.boundary && savedAoiPoints.length >= 3 ? (
                <Polygon positions={savedAoiPoints} pathOptions={{ color: '#eab308', weight: 1.5, dashArray: '5 5', fillOpacity: 0.05 }} />
              ) : null}
              {overlayState.boundary && boundaryDrawn && aoiPoints.length < 3 ? (
                <Circle center={mapCenter} radius={4200} pathOptions={{ color: '#22d3ee', weight: 2, fillOpacity: 0.08 }} />
              ) : null}
              {overlayState.flowDirection ? (
                <Polyline
                  positions={[[mapCenter[0] + 0.05, mapCenter[1] - 0.07], [mapCenter[0] - 0.07, mapCenter[1] + 0.09]]}
                  pathOptions={{ color: '#38bdf8', dashArray: '6 6' }}
                />
              ) : null}
              {overlayState.reportPins ? (
                <>
                  <Circle center={[mapCenter[0] + 0.08, mapCenter[1] - 0.03]} radius={500} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.45 }}>
                    <Popup><div className="text-xs"><p className="font-semibold">Report Pin</p><p>Open evidence record and verify in field.</p></div></Popup>
                  </Circle>
                  <Circle center={[mapCenter[0] - 0.03, mapCenter[1] + 0.06]} radius={500} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.45 }}>
                    <Popup><div className="text-xs"><p className="font-semibold">Report Pin</p><p>Open evidence record and verify in field.</p></div></Popup>
                  </Circle>
                </>
              ) : null}
              {overlayState.samplePoints ? (
                <>
                  <Circle center={[mapCenter[0] + 0.03, mapCenter[1] + 0.02]} radius={350} pathOptions={{ color: '#34d399', fillColor: '#34d399', fillOpacity: 0.5 }}>
                    <Popup><div className="text-xs"><p className="font-semibold">Sample Point</p><p>Requires lab testing for confirmation.</p></div></Popup>
                  </Circle>
                  <Circle center={[mapCenter[0] - 0.04, mapCenter[1] - 0.01]} radius={350} pathOptions={{ color: '#34d399', fillColor: '#34d399', fillOpacity: 0.5 }}>
                    <Popup><div className="text-xs"><p className="font-semibold">Sample Point</p><p>Requires lab testing for confirmation.</p></div></Popup>
                  </Circle>
                </>
              ) : null}
              {overlayState.anomalyHotspots ? (
                <>
                  <Circle center={[mapCenter[0] + 0.07, mapCenter[1] + 0.03]} radius={680} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.45 }}>
                    <Popup><div className="text-xs"><p className="font-semibold">High-priority anomaly</p><p>Compare dates/layers and inspect area.</p></div></Popup>
                  </Circle>
                  <Circle center={[mapCenter[0] - 0.06, mapCenter[1] + 0.08]} radius={760} pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.45 }}>
                    <Popup><div className="text-xs"><p className="font-semibold">Secondary anomaly</p><p>Add evidence or request sample.</p></div></Popup>
                  </Circle>
                </>
              ) : null}
              <Circle center={inspectedPoint ?? mapCenter} radius={230} pathOptions={{ color: '#fb7185', fillColor: '#fb7185', fillOpacity: 0.7 }} />
            </MapContainer>
          </div>

          {/* Map status strip */}
          <div className="border-t border-slate-800 bg-slate-900/60 px-3 py-1">
            <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 text-[10px] text-slate-400 md:grid-cols-6">
              <span>Project: <span className="text-slate-300">{selectedProject.id}</span></span>
              <span>Type: <span className="text-slate-300">{selectedProject.waterBodyType}</span></span>
              <span>Updated: <span className="text-slate-300">{lastRefreshTime}</span></span>
              <span>Boundary: <span className="text-slate-300">{boundaryDrawn ? `v${boundaryRevision + 1}` : 'Not set'}</span></span>
              <span>Evidence: <span className="text-slate-300">{selectedProject.evidenceCount}</span></span>
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
              ['Confidence', selectedFocusLocation ? (inspectQualityConfidence != null ? `${inspectQualityConfidence}% (live)` : 'Pending live data') : '-', 'text-slate-200'],
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
                <p>Î”: {comparisonResult.delta.percentChange ?? 'N/A'}%</p>
                <p>Conf: {Math.round(comparisonResult.confidenceScore * 100)}%</p>
              </div>
            </div>
          ) : null}

          <p className="mt-3 text-[9px] leading-relaxed text-slate-600">
            Indicative MRV estimate - not certified carbon credit. Satellite indicators must be verified with field evidence, lab results, or validator review before official conclusions.
          </p>
        </aside>
      </div>

      {/* â”€â”€ 5. Bottom Workspace Tabs â”€â”€ */}
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

            {/* â”€â”€ Intake Tab â”€â”€ */}
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
                    placeholder="Optional polygon / boundary placeholder"
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
                    <input id="boundary-flag" type="checkbox" checked={boundaryDrawn} onChange={(e) => setBoundaryDrawn(e.target.checked)} />
                    <label htmlFor="boundary-flag" className="text-slate-300">Boundary captured</label>
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

            {/* â”€â”€ Layers Tab â”€â”€ */}
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

            {/* â”€â”€ MRV Compare Tab â”€â”€ */}
            {activeTab === 'mrv' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-300">Before/after index comparison using Copernicus Statistical API</p>
                  <span className="rounded-full border border-amber-500/40 bg-amber-900/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
                    Indicative MRV estimate - not certified carbon credit
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400">Index</span>
                    <select value={comparisonIndexType} onChange={(e) => setComparisonIndexType(e.target.value as CopernicusIndexType)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100">
                      <option value="NDVI">NDVI</option>
                      <option value="NDWI">NDWI</option>
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
                <p className="text-[11px] text-slate-400">
                  AOI: {activeAoi ? `${activeAoi.length} points, ${aoiAreaSqKm.toFixed(2)} km2` : 'No AOI - draw one on the map then save it'}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { void runMrvComparison(); }}
                    disabled={!canCalculateMrv}
                    title={mrvBlockReason || undefined}
                    className="rounded-lg border border-cyan-500/60 bg-cyan-900/30 px-3 py-1.5 text-xs font-semibold text-cyan-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {comparisonLoading ? 'Calculating...' : 'Calculate Comparison'}
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
                  <p className="text-xs text-slate-300">{comparisonResult.delta.interpretation}</p>
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

            {/* â”€â”€ Evidence Packet Tab â”€â”€ */}
            {activeTab === 'evidence' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPacket((prev) => !prev)}
                    className="rounded-lg border border-emerald-500/50 bg-emerald-900/25 px-3 py-1.5 text-xs font-semibold text-emerald-100"
                  >
                    {showPacket ? 'Hide Packet Preview' : 'Generate Evidence Packet'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { void exportEvidencePacketJson(); }}
                    className="rounded-lg border border-cyan-500/50 bg-cyan-900/25 px-3 py-1.5 text-xs font-semibold text-cyan-100"
                  >
                    Export JSON
                  </button>
                  <button
                    type="button"
                    onClick={exportEvidencePacketPdf}
                    className="rounded-lg border border-slate-600 bg-slate-900/30 px-3 py-1.5 text-xs font-semibold text-slate-300"
                  >
                    Export PDF (pending)
                  </button>
                  <span className="text-[11px] text-amber-200">
                    Indicative MRV estimate - not certified carbon credit.
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
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusTone(item.status)}`}>
                          {statusLabel(item.status)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-lg font-black text-white">
                        {selectedFocusLocation ? item.value : '-'}
                      </p>
                      <p className="text-[11px] text-cyan-200">
                        {selectedFocusLocation ? item.trend : 'No location selected'}
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

                {/* Packet preview */}
                {showPacket ? (
                  <div className="space-y-1.5 rounded-xl border border-slate-700 bg-slate-950 p-4 text-xs text-slate-200">
                    <p className="text-sm font-bold text-white">DPAL AquaScan Evidence Packet Preview</p>
                    <p className="text-[10px] text-slate-500">Export not connected - demo preview only.</p>
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
                      <p><span className="text-slate-400">Concern type:</span> {packetPreview.scanType}</p>
                      <p><span className="text-slate-400">Layers:</span> {packetPreview.selectedLayers.join(', ') || 'None'}</p>
                      <p><span className="text-slate-400">Selected date:</span> {packetPreview.selectedDate}</p>
                      <p><span className="text-slate-400">NDWI / water index:</span> {selectedFocusLocation ? (packetPreview.ndwi != null ? `${packetPreview.ndwi} (live)` : 'Pending live data') : 'No location'}</p>
                      <p><span className="text-slate-400">Water presence:</span> {selectedFocusLocation ? packetPreview.waterPresence : 'No location'}</p>
                      <p><span className="text-slate-400">Confidence:</span> {selectedFocusLocation ? (packetPreview.confidenceScore != null ? `${packetPreview.confidenceScore}% (live)` : 'Pending live data') : '-'}</p>
                      <p><span className="text-slate-400">Risk band:</span> {selectedFocusLocation ? `${packetPreview.riskScore} (${riskBand(packetPreview.riskScore)})` : '-'}</p>
                      <p><span className="text-slate-400">Lab status:</span> {selectedProject.hasLabResult ? 'Uploaded' : 'Pending'}</p>
                      <p><span className="text-slate-400">Validator:</span> {evidencePacket.validatorStatus}</p>
                      <p><span className="text-slate-400">Index type:</span> {evidencePacket.indexType}</p>
                      <p><span className="text-slate-400">Before value:</span> {evidencePacket.beforeValue ?? 'N/A'}</p>
                      <p><span className="text-slate-400">After value:</span> {evidencePacket.afterValue ?? 'N/A'}</p>
                      <p><span className="text-slate-400">Delta %:</span> {evidencePacket.deltaPercent ?? 'N/A'}</p>
                      <p><span className="text-slate-400">Data source:</span> {evidencePacket.dataSourceCitation}</p>
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

            {/* â”€â”€ Actions Tab â”€â”€ */}
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
                      className="rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2.5 text-left text-xs font-semibold text-slate-100 transition hover:border-cyan-500/50 hover:bg-cyan-900/20"
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
                  Drafts: Field missions {actionDraftCounts.fieldMission} . Samples {actionDraftCounts.sampleRequest} . Lab {actionDraftCounts.labUploads} . Notices {actionDraftCounts.authorityNotifications} . Restoration {actionDraftCounts.restorationDrafts}
                </p>
                <p className="rounded-lg border border-amber-500/30 bg-amber-900/15 p-3 text-[11px] text-amber-100">
                  DPAL AquaScan identifies potential water-risk indicators using satellite, field, and community evidence. It does not claim confirmed contamination without laboratory testing, field validation, or official verification. Satellite indicators must be verified with field evidence, lab results, or validator review before official conclusions.
                </p>
              </div>
            ) : null}

          </div>
        </div>
      </div>
    </div>
  );
}
