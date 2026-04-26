import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, MapContainer, Polygon, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
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

interface AquaScanViewProps {
  onReturn: () => void;
  hero?: Hero;
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

function focusPointFromProject(project: AquaScanProject): [number, number] {
  const lat = Number(project.latitude);
  const lng = Number(project.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return [20, 0];
  }
  return [lat, lng];
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

export default function AquaScanView({ onReturn }: AquaScanViewProps) {
  const [projects, setProjects] = useState<AquaScanProject[]>(mockWaterProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(mockWaterProjects[0]?.id ?? '');
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>(mockSatelliteLayers.slice(0, 3).map((l) => l.id));
  const [boundaryDrawn, setBoundaryDrawn] = useState(false);
  const [showPacket, setShowPacket] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [actionNotice, setActionNotice] = useState<string>('');
  const [commandTick, setCommandTick] = useState(0);
  const [mapCommand, setMapCommand] = useState<'none' | 'zoomIn' | 'zoomOut' | 'panNorth' | 'panSouth' | 'panEast' | 'panWest' | 'reset'>('none');
  const [mapExpanded, setMapExpanded] = useState(false);
  const [mapStyle, setMapStyle] = useState<BasemapStyle>('satellite');
  const [gpsMode, setGpsMode] = useState<'Demo' | 'Active'>('Demo');
  const [boundaryRevision, setBoundaryRevision] = useState(0);
  const [selectedDate, setSelectedDate] = useState(gibsDefaultDate());
  const [compareDate, setCompareDate] = useState(gibsDefaultDate());
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareOpacity, setCompareOpacity] = useState(35);
  const [mapCenter, setMapCenter] = useState<[number, number]>(focusPointFromProject(mockWaterProjects[0]));
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
  const [lastRefreshTime, setLastRefreshTime] = useState<string>(new Date().toLocaleTimeString());
  const [waterApiLoading, setWaterApiLoading] = useState(false);
  const [waterApiError, setWaterApiError] = useState<string | null>(null);
  const [waterApiNotice, setWaterApiNotice] = useState<string | null>(null);
  const [waterApiMode, setWaterApiMode] = useState<'point' | 'aoi'>('point');
  const [waterData, setWaterData] = useState<WaterAnalysisResponse | null>(null);
  const [waterHistoryDelta, setWaterHistoryDelta] = useState<string>('Pending history');
  const [layerOpacity, setLayerOpacity] = useState(72);
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
    setMapCenter(focusPointFromProject(selectedProject));
  }, [selectedProject]);

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
        setWaterApiError(error instanceof Error ? error.message : 'Backend unavailable — showing map imagery only.');
        setWaterApiNotice('Backend unavailable — showing map imagery only.');
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
  }, [activeAoi, compareDate, compareEnabled, inspectedPoint, mapCenter, selectedAnalysisLayer, selectedDate]);

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
      { id: 'turbidity', label: 'Turbidity Proxy', value: api?.turbidityProxy ?? `${Math.max(18, Math.round(riskScore * 0.9))}/100`, trend: waterHistoryDelta, status, explanation: 'Satellite-derived turbidity proxy, not a lab turbidity measurement.' },
      { id: 'algae', label: 'Water Presence', value: api?.waterPresence ?? `${Math.round(riskScore * 0.76)}/100`, trend: 'Derived from selected product', status, explanation: 'Derived water detection status from selected point/AOI.' },
      { id: 'extent', label: 'Surface Water Estimate', value: api?.surfaceWaterEstimate ?? `${Math.round(riskScore * 0.42)}%`, trend: waterHistoryDelta, status, explanation: 'Surface-water estimate from satellite/model layers.' },
      { id: 'flood', label: 'Risk Level', value: quality?.riskLevel ?? `${Math.round(riskScore * 0.81)}/100`, trend: quality?.qualityFlag ? `Quality: ${quality.qualityFlag}` : '+9% from baseline', status, explanation: 'Risk combines water and quality interpretation from latest snapshot.' },
      { id: 'drought', label: 'Drought Stress', value: `${Math.round(riskScore * 0.62)}/100`, trend: 'Stable over 30 days', status, explanation: 'Storage and stress patterns from basin-scale indicators.' },
      { id: 'thermal', label: 'Thermal Anomaly', value: api?.thermalAnomaly ?? `${Math.round(riskScore * 0.73)}/100`, trend: '+3% this week', status, explanation: 'Thermal anomaly interpreted from selected satellite product.' },
      { id: 'confidence', label: 'Snapshot Confidence', value: `${Math.round((api?.confidence ?? Math.min(0.95, (45 + selectedProject.evidenceCount * 4 + anomalyLayerCount * 4) / 100)) * 100)}%`, trend: `${selectedProject.evidenceCount} evidence item(s) logged`, status, explanation: 'Confidence is satellite-derived and affected by cloud/coverage quality.' },
      { id: 'validator', label: 'Verification Status', value: validatorStatus, trend: validatorStatus === 'Validated' ? 'Validator-approved packet' : 'Awaiting final validation', status, explanation: 'Current verification state of the evidence package.' },
    ];
  }, [anomalyLayerCount, riskScore, selectedProject.evidenceCount, validatorStatus, waterData, waterHistoryDelta]);

  const aiSummary = useMemo(
    () => buildAiSummary(selectedProject.concernType, selectedProject.locationName || 'the selected area'),
    [selectedProject.concernType, selectedProject.locationName],
  );
  const inspectPoint = inspectedPoint ?? mapCenter;
  const inspectNdwiEstimate = waterData?.waterAnalysis.ndwi ?? Math.max(-0.2, Math.min(0.9, ((inspectPoint[0] + 90) / 180) * 0.8 - ((Math.abs(inspectPoint[1]) / 180) * 0.2)));
  const inspectWaterExtentEstimate = waterData?.waterAnalysis.surfaceWaterEstimate ?? 'Medium';
  const inspectFloodWetnessEstimate = waterData?.status.riskLevel ?? 'Moderate';
  const inspectQualityConfidence = Math.round((waterData?.waterAnalysis.confidence ?? Math.max(0.45, Math.min(0.98, (62 + anomalyLayerCount * 4 + (imageryError ? -20 : 0)) / 100))) * 100);

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
      recommendedNextAction:
        riskBand(riskScore) === 'High Risk'
          ? 'Escalate with field sampling and notify relevant authority.'
          : template.recommendedNextAction,
    };
  }, [selectedProject, selectedLayerIds, riskScore, aiSummary, validatorStatus]);

  const latitudeDisplay = Number(selectedProject.latitude || 0).toFixed(4);
  const longitudeDisplay = Number(selectedProject.longitude || 0).toFixed(4);

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
    setActionNotice('Evidence item added in demo mode.');
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
    setActionNotice('Project intake saved in demo mode.');
  }

  function runAction(actionLabel: string): void {
    if (actionLabel === 'Upload Lab Result' && selectedProjectId) {
      updateSelectedProject({ hasLabResult: true });
    }
    if (actionLabel === 'Request Water Sample' && selectedProjectId) {
      updateSelectedProject({ evidenceCount: selectedProject.evidenceCount + 1 });
    }
    if (actionLabel === 'Export Evidence Packet') {
      setShowPacket(true);
    }
    setActionNotice(`${actionLabel} queued in demo mode.`);
  }

  function runDemoScenario(): void {
    const preferredProject =
      projects.find((project) => project.waterBodyType === 'River')
      ?? projects.find((project) => project.waterBodyType === 'Wetland')
      ?? projects[0];

    if (!preferredProject) {
      setActionNotice('Create a project first, then run demo scenario.');
      return;
    }

    setSelectedProjectId(preferredProject.id);
    setProjects((prev) =>
      prev.map((project) =>
        project.id === preferredProject.id
          ? {
              ...project,
              concernType: project.waterBodyType === 'Wetland' ? 'Turbidity' : 'Suspected Contamination',
              evidenceCount: Math.max(project.evidenceCount, 6),
              hasLabResult: false,
              validatorStatus: 'Reviewed',
            }
          : project,
      ),
    );
    setSelectedLayerIds(['sentinel2', 'sentinel1', 'landsat89', 'sentinel3', 'swot']);
    setBoundaryDrawn(true);
    setShowPacket(true);
    setActionNotice('Demo scenario loaded.');
  }

  function toggleOverlay(key: keyof typeof overlayState): void {
    setOverlayState((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function centerOnProject(): void {
    setMapCenter(focusPointFromProject(selectedProject));
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
        const nextCenter: [number, number] = [position.coords.latitude, position.coords.longitude];
        setMapCenter(nextCenter);
        setInspectedPoint(nextCenter);
        setActionNotice('Centered on current GPS location.');
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
      setMapCenter([lat, lng]);
      setInspectedPoint([lat, lng]);
      setActionNotice(`Centered map on ${rows[0].display_name}.`);
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
    setActionNotice('AOI saved for this browser.');
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <button onClick={onReturn} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200" aria-label="Return to main menu">
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
          <div className="flex items-center gap-2">
            <Waves className="h-5 w-5 text-cyan-300" />
            <span className="text-sm font-semibold">DPAL AquaScan</span>
            <span className="rounded-full border border-cyan-400/40 bg-cyan-900/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">Demo layers</span>
          </div>
          <div className="ml-auto hidden text-[11px] text-slate-400 md:block">Evidence-based water screening workspace</div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6">
        {actionNotice ? (
          <div className="rounded-xl border border-cyan-500/40 bg-cyan-900/20 px-4 py-2 text-sm text-cyan-100">{actionNotice}</div>
        ) : null}
        {waterApiLoading ? (
          <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/25 px-4 py-2 text-sm text-cyan-100">
            Fetching water intelligence for selected area...
          </div>
        ) : null}
        {waterApiError ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/25 px-4 py-2 text-sm text-rose-100">
            {waterApiError.includes('unavailable') ? 'Satellite product unavailable for this date/location.' : waterApiError}
          </div>
        ) : null}
        {waterApiNotice ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-900/20 px-4 py-2 text-sm text-amber-100">{waterApiNotice}</div>
        ) : null}

        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">How to Use DPAL AquaScan</p>
              <p className="mt-1 text-sm text-slate-300">Simple workflow for evidence-based water monitoring in demo mode.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={runDemoScenario}
                className="rounded-lg border border-emerald-500/50 bg-emerald-900/25 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-900/35"
              >
                Run Demo Scenario
              </button>
              <button
                type="button"
                onClick={() => setShowGuide((prev) => !prev)}
                className="rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:border-cyan-500/50"
              >
                {showGuide ? 'Hide Guide' : 'Show Guide'}
              </button>
            </div>
          </div>
          <p className="mt-3 rounded-lg border border-cyan-500/40 bg-cyan-900/20 px-3 py-2 text-xs text-cyan-100">
            Demo Mode: satellite layers, AI summary, evidence packet, and actions use mock data.
          </p>

          {showGuide ? (
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <article className="rounded-xl border border-slate-700 bg-slate-950 p-4 lg:col-span-2">
                <h3 className="text-sm font-semibold text-slate-100">Workflow Steps</h3>
                <ol className="mt-3 space-y-2 text-sm text-slate-300">
                  <li>Step 1: Select a water project.</li>
                  <li>Step 2: Choose the concern type.</li>
                  <li>Step 3: Review satellite-style indicators.</li>
                  <li>Step 4: Inspect the scan area/map.</li>
                  <li>Step 5: Read the AI Water Intelligence Summary.</li>
                  <li>Step 6: Upload field evidence or lab results.</li>
                  <li>Step 7: Generate an evidence packet.</li>
                  <li>Step 8: Route the issue to field mission, sample request, authority notice, restoration project, public ledger, or export.</li>
                </ol>
              </article>
              <article className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <h3 className="text-sm font-semibold text-slate-100">What AquaScan Can and Cannot Do</h3>
                <div className="mt-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Can do</p>
                  <ul className="mt-1 space-y-1 text-xs text-slate-300">
                    <li>- Identify potential water-risk indicators.</li>
                    <li>- Compare conditions against a mock baseline.</li>
                    <li>- Organize satellite, field, and community evidence.</li>
                    <li>- Recommend next steps.</li>
                    <li>- Generate a demo evidence packet.</li>
                  </ul>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Cannot do</p>
                  <ul className="mt-1 space-y-1 text-xs text-slate-300">
                    <li>- Confirm contamination without field sampling, lab testing, or official verification.</li>
                    <li>- Replace certified laboratory results.</li>
                    <li>- Guarantee carbon credits, legal findings, or official enforcement action from satellite indicators alone.</li>
                  </ul>
                </div>
              </article>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 md:p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">Water Project Intake Panel</p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Project name" value={draftProject.projectName} onChange={(event) => setDraftProject((prev) => ({ ...prev, projectName: event.target.value }))} />
            <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={draftProject.waterBodyType} onChange={(event) => setDraftProject((prev) => ({ ...prev, waterBodyType: event.target.value as AquaScanProject['waterBodyType'] }))}>
              {waterBodyTypes.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Location name" value={draftProject.locationName} onChange={(event) => setDraftProject((prev) => ({ ...prev, locationName: event.target.value }))} />
            <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={draftProject.concernType} onChange={(event) => setDraftProject((prev) => ({ ...prev, concernType: event.target.value as ConcernType }))}>
              {concernTypes.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="GPS latitude" value={draftProject.latitude} onChange={(event) => setDraftProject((prev) => ({ ...prev, latitude: event.target.value }))} />
            <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="GPS longitude" value={draftProject.longitude} onChange={(event) => setDraftProject((prev) => ({ ...prev, longitude: event.target.value }))} />
            <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm md:col-span-2" placeholder="Optional polygon / boundary placeholder" value={draftProject.polygonPlaceholder} onChange={(event) => setDraftProject((prev) => ({ ...prev, polygonPlaceholder: event.target.value }))} />
            <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={draftProject.suspectedSource} onChange={(event) => setDraftProject((prev) => ({ ...prev, suspectedSource: event.target.value as AquaScanProject['suspectedSource'] }))}>
              {suspectedSources.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs">
              <button type="button" className="rounded-md border border-cyan-500/50 bg-cyan-900/25 px-2 py-1 text-cyan-100" onClick={addEvidenceItem}>Upload evidence (mock)</button>
              <span className="text-slate-400">{selectedProject.evidenceCount} total evidence item(s)</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs">
              <input id="boundary-flag" type="checkbox" checked={boundaryDrawn} onChange={(event) => setBoundaryDrawn(event.target.checked)} />
              <label htmlFor="boundary-flag" className="text-slate-300">Boundary placeholder captured</label>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950 p-3">
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
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={saveDraftProject} className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/60 bg-emerald-900/25 px-3 py-2 text-xs font-semibold text-emerald-100">
              <Plus className="h-3.5 w-3.5" />
              Save Project Intake
            </button>
            <select
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectName}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <select
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
              value={selectedProject.concernType}
              onChange={(event) => selectedProjectId && updateSelectedProject({ concernType: event.target.value as ConcernType })}
            >
              {concernTypes.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <select
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
              value={selectedProject.validatorStatus}
              onChange={(event) => selectedProjectId && updateSelectedProject({ validatorStatus: event.target.value as AquaScanProject['validatorStatus'] })}
            >
              <option value="Pending">Validator: Pending</option>
              <option value="Reviewed">Validator: Reviewed</option>
              <option value="Validated">Validator: Validated</option>
            </select>
            <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={selectedProject.hasLabResult}
                onChange={(event) => selectedProjectId && updateSelectedProject({ hasLabResult: event.target.checked })}
              />
              Lab result uploaded
            </label>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">Satellite Layer Selector</p>
              <span className="rounded-full border border-amber-400/40 bg-amber-900/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-100">Mock / demo layers</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
          </article>

          <article className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">Risk Score Logic</p>
            <div className="mt-3 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between"><span>Concern type baseline</span><span>+{concernWeights[selectedProject.concernType]}</span></div>
              <div className="flex justify-between"><span>Evidence items</span><span>+{Math.min(18, selectedProject.evidenceCount * 4)} ({selectedProject.evidenceCount})</span></div>
              <div className="flex justify-between"><span>Satellite anomaly status</span><span>+{anomalyLayerCount >= 5 ? 14 : anomalyLayerCount >= 3 ? 8 : 4}</span></div>
              <div className="flex justify-between"><span>Lab result uploaded</span><span>{selectedProject.hasLabResult ? '-10' : '0'}</span></div>
              <div className="flex justify-between"><span>Validator status</span><span>{validatorStatus === 'Validated' ? '+8' : validatorStatus === 'Reviewed' ? '+4' : '0'}</span></div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-600 bg-slate-950 p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Current risk score</p>
              <p className="mt-1 text-2xl font-black text-white">{riskScore} / 100</p>
              <p className="text-xs text-cyan-200">{riskBand(riskScore)}</p>
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 md:p-5">
          <div className="mb-3">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-300">AquaScan Map &amp; GPS</p>
            <p className="mt-1 text-xs text-slate-300">
              Visual monitoring area for the selected water project, including project location, scan boundary, risk zones, evidence points, and GPS context. The map can be adjusted by the user to inspect, refine, and manage the monitoring area.
            </p>
          </div>

          <div className="mb-3 rounded-xl border border-slate-700 bg-slate-950/80 p-3">
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 md:grid-cols-6">
              <span>Location: <span className="font-semibold text-white">{selectedProject.locationName || 'Unspecified'}</span></span>
              <span>Lat: <span className="font-semibold text-white">{latitudeDisplay}</span></span>
              <span>Lng: <span className="font-semibold text-white">{longitudeDisplay}</span></span>
              <span>GPS: <span className="font-semibold text-cyan-200">{gpsMode}</span></span>
              <span>Concern: <span className="font-semibold text-amber-200">{selectedProject.concernType}</span></span>
              <span>Layers: <span className="font-semibold text-emerald-200">{selectedLayerIds.length} selected</span></span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => runMapCommand('zoomIn')} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">Zoom +</button>
              <button type="button" onClick={() => runMapCommand('zoomOut')} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">Zoom -</button>
              <button type="button" onClick={() => runMapCommand('panNorth')} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">Pan N</button>
              <button type="button" onClick={() => runMapCommand('panSouth')} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">Pan S</button>
              <button type="button" onClick={() => runMapCommand('panEast')} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">Pan E</button>
              <button type="button" onClick={() => runMapCommand('panWest')} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">Pan W</button>
              <button type="button" onClick={centerOnProject} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">Center on project</button>
              <button type="button" onClick={centerOnGps} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">Use current GPS</button>
              <button type="button" onClick={() => setMapExpanded((prev) => !prev)} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">{mapExpanded ? 'Collapse map' : 'Expand map'}</button>
              <button type="button" onClick={toggleFullscreen} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">Fullscreen</button>
              <button type="button" onClick={() => setBoundaryDrawn((prev) => !prev)} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">{boundaryDrawn ? 'Hide boundary' : 'Show boundary'}</button>
              <button type="button" onClick={() => { setDrawingAoi((prev) => !prev); setBoundaryDrawn(true); }} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">{drawingAoi ? 'Stop AOI draw' : 'Draw AOI points'}</button>
              <button type="button" onClick={() => setAoiPoints((prev) => prev.slice(0, -1))} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">Undo AOI point</button>
              <button
                type="button"
                onClick={() => {
                  setAoiPoints([]);
                  setSavedAoiPoints([]);
                  localStorage.removeItem('dpal_aquascan_saved_aoi_v1');
                  setBoundaryRevision((prev) => prev + 1);
                }}
                className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200"
              >
                Clear AOI
              </button>
              <button type="button" onClick={saveAoi} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">Save AOI</button>
              <button type="button" onClick={() => { setImageryLoading(true); setImageryError(null); setBeforeImageryError(null); setPartialFailure(false); setLastRefreshTime(new Date().toLocaleTimeString()); }} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">Refresh imagery</button>
              <button type="button" onClick={() => runMapCommand('reset')} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">Reset view</button>
              <select
                value={mapStyle}
                onChange={(event) => setMapStyle(event.target.value as 'satellite' | 'terrain' | 'dark')}
                className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
              >
                <option value="satellite">Satellite + labels</option>
                <option value="terrain">Terrain base + satellite overlay</option>
                <option value="dark">Dark monitoring base</option>
              </select>
              <input
                type="date"
                value={selectedDate}
                max={gibsDefaultDate()}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setImageryLoading(true);
                  setImageryError(null);
                  setBeforeImageryError(null);
                  setPartialFailure(false);
                  setLastRefreshTime(new Date().toLocaleTimeString());
                }}
                className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
              />
              <label className="flex items-center gap-1 rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">
                Layer opacity
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={layerOpacity}
                  onChange={(event) => setLayerOpacity(Number(event.target.value))}
                />
              </label>
              <label className="flex items-center gap-2 rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">
                <input type="checkbox" checked={compareEnabled} onChange={(event) => { setCompareEnabled(event.target.checked); setBeforeImageryError(null); setPartialFailure(false); }} />
                Compare dates
              </label>
              {compareEnabled ? (
                <>
                  <input
                    type="date"
                    value={compareDate}
                    max={gibsDefaultDate()}
                    onChange={(event) => setCompareDate(event.target.value)}
                    className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                  />
                  <label className="flex items-center gap-1 rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200">
                    Before/after
                    <input type="range" min={0} max={100} value={compareOpacity} onChange={(event) => setCompareOpacity(Number(event.target.value))} />
                  </label>
                </>
              ) : null}
              <div className="flex items-center gap-2">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search location"
                  className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                />
                <button type="button" onClick={runLocationSearch} disabled={searchBusy} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200 disabled:opacity-60">
                  {searchBusy ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              <button type="button" onClick={() => toggleOverlay('boundary')} className={`rounded border px-2 py-1 ${overlayState.boundary ? 'border-cyan-500/60 text-cyan-200' : 'border-slate-600 text-slate-300'}`}>Boundary</button>
              <button type="button" onClick={() => toggleOverlay('waterExtent')} className={`rounded border px-2 py-1 ${overlayState.waterExtent ? 'border-cyan-500/60 text-cyan-200' : 'border-slate-600 text-slate-300'}`}>Water extent</button>
              <button type="button" onClick={() => toggleOverlay('ndwiProxy')} className={`rounded border px-2 py-1 ${overlayState.ndwiProxy ? 'border-cyan-500/60 text-cyan-200' : 'border-slate-600 text-slate-300'}`}>NDWI proxy</button>
              <button type="button" onClick={() => toggleOverlay('floodWetness')} className={`rounded border px-2 py-1 ${overlayState.floodWetness ? 'border-cyan-500/60 text-cyan-200' : 'border-slate-600 text-slate-300'}`}>Flood/wetness</button>
              <button type="button" onClick={() => toggleOverlay('riskZone')} className={`rounded border px-2 py-1 ${overlayState.riskZone ? 'border-cyan-500/60 text-cyan-200' : 'border-slate-600 text-slate-300'}`}>Risk zone</button>
              <button type="button" onClick={() => toggleOverlay('reportPins')} className={`rounded border px-2 py-1 ${overlayState.reportPins ? 'border-cyan-500/60 text-cyan-200' : 'border-slate-600 text-slate-300'}`}>Report pins</button>
              <button type="button" onClick={() => toggleOverlay('samplePoints')} className={`rounded border px-2 py-1 ${overlayState.samplePoints ? 'border-cyan-500/60 text-cyan-200' : 'border-slate-600 text-slate-300'}`}>Sample points</button>
              <button type="button" onClick={() => toggleOverlay('anomalyHotspots')} className={`rounded border px-2 py-1 ${overlayState.anomalyHotspots ? 'border-cyan-500/60 text-cyan-200' : 'border-slate-600 text-slate-300'}`}>Anomaly hotspots</button>
              <button type="button" onClick={() => toggleOverlay('flowDirection')} className={`rounded border px-2 py-1 ${overlayState.flowDirection ? 'border-cyan-500/60 text-cyan-200' : 'border-slate-600 text-slate-300'}`}>Flow direction</button>
            </div>
          </div>
          <div ref={mapViewportRef} className={`relative overflow-hidden rounded-xl border border-slate-700 ${mapExpanded ? 'h-[42rem]' : 'h-[32rem]'}`}>
            {imageryLoading ? (
              <div className="absolute inset-x-0 top-0 z-[500] bg-cyan-950/80 px-3 py-1 text-[11px] text-cyan-100">
                Loading latest available satellite-connected imagery...
              </div>
            ) : null}
            {imageryError ? (
              <div className="absolute inset-x-0 top-0 z-[500] bg-rose-950/85 px-3 py-1 text-[11px] text-rose-100">
                {imageryError}
              </div>
            ) : null}
            {partialFailure ? (
              <div className="absolute inset-x-0 top-8 z-[500] bg-amber-950/85 px-3 py-1 text-[11px] text-amber-100">
                Partial failure: one or more layers unavailable. Base map remains active.
              </div>
            ) : null}
            <MapContainer
              center={mapCenter}
              zoom={7}
              style={{ height: '100%', width: '100%' }}
            >
              <MapResizeSync trigger={mapExpanded ? 1 : 0} />
              <MapViewSync center={mapCenter} />
              <MapCommandBridge commandTick={commandTick} command={mapCommand} center={mapCenter} />
              <MapInteractionCapture
                drawingAoi={drawingAoi}
                onInspect={(point) => setInspectedPoint(point)}
                onAoiPoint={(point) => setAoiPoints((prev) => [...prev, point])}
              />
              {mapStyle === 'dark' ? (
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                />
              ) : mapStyle === 'terrain' ? (
                <TileLayer
                  url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                  attribution='Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap'
                />
              ) : (
                <TileLayer
                  url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution='Tiles &copy; Esri'
                />
              )}
              <TileLayer
                key={`${activeGibsLayer.id}-${selectedDate}`}
                url={tileUrl}
                opacity={layerOpacity / 100}
                attribution='Imagery: NASA GIBS / ESDIS'
                eventHandlers={{
                  loading: () => {
                    setImageryLoading(true);
                    setImageryError(null);
                  },
                  load: () => {
                    setImageryLoading(false);
                  },
                  tileerror: () => {
                    setImageryLoading(false);
                    setImageryError('Satellite tile fetch issue detected. Try another date or layer.');
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
                      setBeforeImageryError('Compare layer unavailable for selected date.');
                      setPartialFailure(true);
                    },
                  }}
                />
              ) : null}
              {overlayState.waterExtent ? (
                <Circle center={[mapCenter[0] + 0.01, mapCenter[1]]} radius={5400} pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.07 }} />
              ) : null}
              {overlayState.ndwiProxy ? (
                <Circle center={[mapCenter[0] - 0.02, mapCenter[1] + 0.03]} radius={3900} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.08 }} />
              ) : null}
              {overlayState.floodWetness ? (
                <Circle center={[mapCenter[0] + 0.05, mapCenter[1] - 0.04]} radius={3100} pathOptions={{ color: '#a855f7', fillColor: '#a855f7', fillOpacity: 0.08 }} />
              ) : null}
              {overlayState.riskZone ? (
                <Circle center={[mapCenter[0] + 0.01, mapCenter[1] + 0.05]} radius={2200} pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.13 }} />
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
                <Polyline positions={[[mapCenter[0] + 0.05, mapCenter[1] - 0.07], [mapCenter[0] - 0.07, mapCenter[1] + 0.09]]} pathOptions={{ color: '#38bdf8', dashArray: '6 6' }} />
              ) : null}
              {overlayState.reportPins ? (
                <>
                  <Circle center={[mapCenter[0] + 0.08, mapCenter[1] - 0.03]} radius={500} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.45 }} />
                  <Circle center={[mapCenter[0] - 0.03, mapCenter[1] + 0.06]} radius={500} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.45 }} />
                </>
              ) : null}
              {overlayState.samplePoints ? (
                <>
                  <Circle center={[mapCenter[0] + 0.03, mapCenter[1] + 0.02]} radius={350} pathOptions={{ color: '#34d399', fillColor: '#34d399', fillOpacity: 0.5 }} />
                  <Circle center={[mapCenter[0] - 0.04, mapCenter[1] - 0.01]} radius={350} pathOptions={{ color: '#34d399', fillColor: '#34d399', fillOpacity: 0.5 }} />
                </>
              ) : null}
              {overlayState.anomalyHotspots ? (
                <>
                  <Circle center={[mapCenter[0] + 0.07, mapCenter[1] + 0.03]} radius={680} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.45 }} />
                  <Circle center={[mapCenter[0] - 0.06, mapCenter[1] + 0.08]} radius={760} pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.45 }} />
                </>
              ) : null}
              <Circle center={inspectedPoint ?? mapCenter} radius={230} pathOptions={{ color: '#fb7185', fillColor: '#fb7185', fillOpacity: 0.7 }} />
            </MapContainer>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-[11px] text-slate-200 md:grid-cols-6">
            <div><span className="text-slate-400">Project ID:</span> {selectedProject.id}</div>
            <div><span className="text-slate-400">Water body type:</span> {selectedProject.waterBodyType}</div>
            <div><span className="text-slate-400">Last refresh:</span> {lastRefreshTime}</div>
            <div><span className="text-slate-400">Boundary status:</span> {boundaryDrawn ? `Adjusted v${boundaryRevision + 1}` : 'Not defined'}</div>
            <div><span className="text-slate-400">Evidence points:</span> {selectedProject.evidenceCount}</div>
            <div><span className="text-slate-400">Selected layers:</span> {mockSatelliteLayers.filter((layer) => selectedLayerIds.includes(layer.id)).map((layer) => layer.name).join(', ') || 'None'}</div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 text-[11px] text-cyan-100 md:grid-cols-2 lg:grid-cols-4">
            <div><span className="text-cyan-300/80">Selection mode:</span> {waterApiMode === 'aoi' ? 'AOI Mode Active' : 'Point Mode Active'}</div>
            <div><span className="text-cyan-300/80">Selected coordinates:</span> {(waterData?.location.lat ?? inspectPoint[0]).toFixed(5)}, {(waterData?.location.lng ?? inspectPoint[1]).toFixed(5)}</div>
            <div><span className="text-cyan-300/80">Area name:</span> {waterData?.location.name ?? 'Selected area'}</div>
            <div><span className="text-cyan-300/80">AOI area:</span> {activeAoi ? `${aoiAreaSqKm.toFixed(2)} km²` : 'Point inspection'}</div>
            <div><span className="text-cyan-300/80">Satellite provider:</span> {waterData?.satellite.provider ?? 'NASA GIBS / Sentinel / Landsat'}</div>
            <div><span className="text-cyan-300/80">Product / layer:</span> {waterData?.satellite.product ?? activeGibsLayer.label}</div>
            <div><span className="text-cyan-300/80">Acquisition date:</span> {waterData?.satellite.acquisitionDate ?? selectedDate}</div>
            <div><span className="text-cyan-300/80">Resolution:</span> {waterData?.satellite.resolution ?? activeGibsLayer.description}</div>
            <div><span className="text-cyan-300/80">Cloud cover:</span> {waterData?.satellite.cloudCover ?? 'estimated or unavailable'}</div>
            <div><span className="text-cyan-300/80">NDWI / water index:</span> {inspectNdwiEstimate.toFixed(2)} (satellite-derived)</div>
            <div><span className="text-cyan-300/80">Water presence:</span> {waterData?.waterAnalysis.waterPresence ?? 'Review'}</div>
            <div><span className="text-cyan-300/80">Surface water estimate:</span> {inspectWaterExtentEstimate} (satellite/model-estimated)</div>
            <div><span className="text-cyan-300/80">Turbidity proxy:</span> {waterData?.waterAnalysis.turbidityProxy ?? 'unavailable'} (proxy estimate)</div>
            <div><span className="text-cyan-300/80">Thermal anomaly:</span> {waterData?.waterAnalysis.thermalAnomaly ?? 'Review'}</div>
            <div><span className="text-cyan-300/80">Shoreline change:</span> {waterData?.waterAnalysis.shorelineChange ?? 'Stable'}</div>
            <div><span className="text-cyan-300/80">Confidence score:</span> {inspectQualityConfidence}%</div>
            <div><span className="text-cyan-300/80">Quality flag:</span> {waterData?.status.qualityFlag ?? (partialFailure ? 'Partial' : imageryError ? 'Estimated' : 'Clear')}</div>
            <div><span className="text-cyan-300/80">Risk level:</span> {inspectFloodWetnessEstimate}</div>
            <div><span className="text-cyan-300/80">Last updated:</span> {waterData?.status.lastUpdated ?? lastRefreshTime}</div>
            <div><span className="text-cyan-300/80">History delta:</span> {waterHistoryDelta}</div>
            <div><span className="text-cyan-300/80">Layer pixel context:</span> Derived from selected tile response at clicked point/AOI.</div>
            <div><span className="text-cyan-300/80">Compare window:</span> {compareEnabled ? `${compareDate} vs ${selectedDate}` : 'Off'}</div>
            <div><span className="text-cyan-300/80">Credibility:</span> Satellite-derived/model-estimated. Field validation required for pH, dissolved oxygen, conductivity, and lab-grade contamination claims.</div>
          </div>
          {beforeImageryError ? (
            <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-900/20 px-3 py-2 text-[11px] text-amber-100">{beforeImageryError}</p>
          ) : null}
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {indicators.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-200">{item.label}</p>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusTone(item.status)}`}>{item.status}</span>
              </div>
              <p className="mt-2 text-xl font-black text-white">{item.value}</p>
              <p className="text-[11px] text-cyan-200">{item.trend}</p>
              <p className="mt-1 text-[11px] text-slate-400">{item.explanation}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-purple-300">AI Water Intelligence Summary</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-200">{aiSummary}</p>
          <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-900/20 p-2 text-[11px] text-amber-100">
            Satellite indicators are screening tools. Confirmed contamination requires field sampling, laboratory testing, or official verification.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">Evidence Packet Generator</p>
              <button type="button" onClick={() => setShowPacket((prev) => !prev)} className="rounded-lg border border-emerald-500/50 bg-emerald-900/25 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                Generate Evidence Packet
              </button>
            </div>
            {showPacket ? (
              <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-200">
                <p className="text-sm font-bold text-white">DPAL AquaScan Evidence Packet (Demo Preview)</p>
                <p><span className="text-slate-400">Generated date/time:</span> {packetPreview.timestamp}</p>
                <p><span className="text-slate-400">Project ID:</span> {selectedProject.id}</p>
                <p><span className="text-slate-400">Packet title:</span> {packetPreview.projectName}</p>
                <p><span className="text-slate-400">Location:</span> {packetPreview.location}</p>
                <p><span className="text-slate-400">Concern type:</span> {packetPreview.scanType}</p>
                <p><span className="text-slate-400">Selected satellite layers:</span> {packetPreview.selectedLayers.join(', ') || 'None'}</p>
                <p><span className="text-slate-400">Risk score band:</span> {packetPreview.riskScore} ({riskBand(packetPreview.riskScore)})</p>
                <p><span className="text-slate-400">Evidence count:</span> {packetPreview.uploadedEvidence} item(s)</p>
                <p><span className="text-slate-400">Lab status:</span> {selectedProject.hasLabResult ? 'Uploaded' : 'Pending'}</p>
                <p><span className="text-slate-400">Validator status:</span> {packetPreview.validatorStatus}</p>
                <p><span className="text-slate-400">AI summary:</span> {packetPreview.aiSummary}</p>
                <p><span className="text-slate-400">Recommended action:</span> {packetPreview.recommendedNextAction}</p>
                <p><span className="text-slate-400">Audit ID placeholder:</span> {packetPreview.auditId}</p>
                <p><span className="text-slate-400">Ledger hash placeholder:</span> {packetPreview.ledgerHash}</p>
                <p className="rounded-md border border-amber-500/40 bg-amber-900/20 px-2 py-1 text-amber-100">
                  Export not connected — demo preview only.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Generate a demo packet preview from current project state and selected layers.</p>
            )}
          </article>

          <article className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">Action Center</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {actionButtons.map((label) => (
                <button key={label} type="button" onClick={() => runAction(label)} className="rounded-lg border border-slate-600 bg-slate-950/80 px-3 py-2 text-left text-xs font-semibold text-slate-100 hover:border-cyan-500/50 hover:bg-cyan-900/20">
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              <button type="button" onClick={() => selectedProjectId && updateSelectedProject({ validatorStatus: 'Pending' })} className="rounded border border-slate-600 px-2 py-1">Set Pending</button>
              <button type="button" onClick={() => selectedProjectId && updateSelectedProject({ validatorStatus: 'Reviewed' })} className="rounded border border-slate-600 px-2 py-1">Set Reviewed</button>
              <button type="button" onClick={() => selectedProjectId && updateSelectedProject({ validatorStatus: 'Validated' })} className="rounded border border-slate-600 px-2 py-1">Set Validated</button>
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-amber-500/40 bg-amber-900/20 p-4">
          <p className="text-sm font-semibold text-amber-100">
            DPAL AquaScan identifies potential water-risk indicators using satellite, field, and community evidence. It does not claim confirmed contamination without laboratory or official verification.
          </p>
        </section>
      </div>
    </div>
  );
}
