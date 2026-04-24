import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getAccessToken } from '../../../auth/authStorage';
import { MapContainer, Marker, Polygon, Polyline, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Database,
  Eye,
  FileText,
  Globe,
  Info,
  MapPin,
  Plus,
  Printer,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  Target,
} from '../../../components/icons';
import {
  BASELINE_PERIOD_PRESETS,
  CURRENT_PERIOD_PRESETS,
  defaultBaselinePeriod,
  defaultConfidenceInputs,
  defaultCurrentPeriod,
  defaultFacilityInfo,
  defaultProductionData,
  defaultReportedData,
  defaultSatelliteData,
  demoFacilityResults,
  INDUSTRY_OPTIONS,
  JURISDICTION_OPTIONS,
  LEGAL_FRAMEWORK_OPTIONS,
  LOCATION_METHOD_OPTIONS,
  SATELLITE_LAYER_OPTIONS,
  createDefaultMetadata,
} from './utils/mockEmissionsData';
import { calculateAdi, calculateAuditResults, hasMinimumAuditData } from './utils/emissionsCalculations';
import { JURISDICTION_CONTEXT, LEGAL_DISCLAIMER } from './utils/jurisdictionRules';
import type {
  AuditPeriod,
  CoordinatePoint,
  DataSourceMetadata,
  EmissionsAudit,
  EvidencePacket,
  Jurisdiction,
  LocationSelectionMethod,
  SourceStatus,
} from './types/emissionsIntegrity.types';
import {
  createEmissionsAudit,
  deleteEmissionsAudit,
  exportEmissionsAudit,
  getEmissionsAudit,
  linkEmissionsAudit,
  listEmissionsAudits,
  recalculateEmissionsAudit,
  updateEmissionsAudit,
  type EmissionsAuditDraftPayload,
  type EmissionsAuditSummary,
} from '../../../services/emissionsAuditService';
import { API_ROUTES, apiUrl } from '../../../constants';
import {
  clearEiasWorkspaceLocal,
  getEiasWorkspaceInitialState,
  saveEiasWorkspaceSnapshot,
} from './utils/eiasWorkspacePersistence';

/** Same host as `VITE_API_BASE` must expose `/api/emissions-audit/*` (Prisma `backend/` today; not on default Railway `dpal-ai-server`). */
const EIAS_API_DISCLAIMER =
  'Saved audits require an API that implements /api/emissions-audit/* and a compatible sign-in (local backend/Prisma JWT). Production Railway often returns 401/404 here; workspace + carbon adapter pulls still work.';
const LOCAL_DRAFT_HINT = 'This browser keeps an auto-saved local draft of the workspace (facility, periods, inputs, links).';

interface EmissionsIntegrityAuditPageProps {
  onReturn: () => void;
}

const mapPinIcon = L.divIcon({
  className: 'dpal-eias-marker',
  html: '<div style="width:16px;height:16px;border-radius:9999px;background:#f97316;border:2px solid white;box-shadow:0 0 0 4px rgba(249,115,22,0.18)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const inputCls =
  'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-emerald-500';
const labelCls = 'mb-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500';

const limitations = [
  'Satellite observations are evidence indicators, not always exact legal proof by themselves.',
  'Results should be validated with permits, production data, weather, QA flags, and regulatory filings.',
  'Methane plume detection is stronger for oil/gas than general CO2 point-source enforcement.',
  'OCO-type CO2 data is useful context but should not be treated as exact facility-level proof without supporting data.',
  'The system flags discrepancies for review.',
];

const integrationHooks = [
  'Link audit to DPAL Report',
  'Link audit to DPAL Mission',
  'Link audit to DPAL MRV Project',
  'Link audit to DPAL Evidence Vault',
  'Link audit to DPAL Public Ledger',
];

function toFixedNumber(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : '0.00';
}

function computePolygonAreaKm2(points: CoordinatePoint[]): number {
  if (points.length < 3) return 0;
  const avgLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
  const metersPerDegLat = 111_320;
  const metersPerDegLng = 111_320 * Math.cos((avgLat * Math.PI) / 180);
  const projected = points.map((point) => ({
    x: point.lng * metersPerDegLng,
    y: point.lat * metersPerDegLat,
  }));
  let area = 0;
  for (let index = 0; index < projected.length; index += 1) {
    const current = projected[index];
    const next = projected[(index + 1) % projected.length];
    area += current.x * next.y - next.x * current.y;
  }
  return Math.abs(area / 2) / 1_000_000;
}

function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toPolygonGeoJSON(points: CoordinatePoint[]) {
  if (points.length < 3) return undefined;
  const coordinates = points.map((point) => [point.lng, point.lat]);
  const [firstLng, firstLat] = coordinates[0];
  const [lastLng, lastLat] = coordinates[coordinates.length - 1];
  if (firstLng !== lastLng || firstLat !== lastLat) {
    coordinates.push([firstLng, firstLat]);
  }
  return {
    type: 'Polygon' as const,
    coordinates: [coordinates],
  };
}

function normalizeRiskLabel(value: string): EmissionsAudit['adi']['riskLevel'] {
  if (value === 'high' || value === 'High') return 'High / Material Discrepancy';
  if (value === 'medium' || value === 'Medium') return 'Medium / Needs Review';
  if (value === 'needs_more_data' || value === 'Needs More Data') return 'Needs More Data';
  return 'Low / Consistent';
}

function normalizeSummaryRisk(value: string): string {
  if (value === 'high') return 'High';
  if (value === 'medium') return 'Medium';
  if (value === 'needs_more_data') return 'Needs More Data';
  if (value === 'low') return 'Low';
  return value;
}

function createPeriod(
  preset: AuditPeriod['preset'],
  fallback: AuditPeriod,
  customStart: string,
  customEnd: string,
): AuditPeriod {
  if (preset === 'custom') {
    return {
      label: 'Custom date range',
      preset,
      startDate: customStart || fallback.startDate,
      endDate: customEnd || fallback.endDate,
    };
  }
  return {
    ...fallback,
    preset,
    label:
      preset === fallback.preset
        ? fallback.label
        : preset === 'trailing_12_months'
          ? 'Trailing 12 months'
          : preset === 'previous_calendar_year'
            ? 'Previous calendar year'
            : preset === 'current_calendar_year_to_date'
              ? 'Current calendar year to date'
              : 'Current trailing 12 months',
  };
}

function riskTone(risk: string): string {
  if (risk.startsWith('High')) return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
  if (risk.startsWith('Medium')) return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
  if (risk.startsWith('Needs More Data')) return 'border-slate-600 bg-slate-800/70 text-slate-200';
  return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
}

type MetadataBannerTone = 'emerald' | 'amber' | 'sky';

type CarbonAirQualityResponse = {
  co2ppm: number | null;
  ch4ppb: number | null;
  no2: number | null;
  captureDate: string;
  source: string;
  dataAvailable: boolean;
  measurementStatus: 'verified' | 'unavailable';
  message: string;
};

type CarbonMineralResponse = {
  minerals: string[];
  dustArea: number | null;
  composition: Record<string, number>;
  captureDate: string;
  source: string;
  dataAvailable: boolean;
  measurementStatus: 'verified' | 'unavailable';
  message: string;
};

function hasPlaceholderLanguage(value?: string | null): boolean {
  const normalized = value?.trim().toLowerCase() ?? '';
  if (!normalized) return false;
  return ['demo', 'placeholder', 'replace with verified', 'unavailable', 'not connected'].some((token) => normalized.includes(token));
}

function metadataUsesPlaceholderCopy(metadata: DataSourceMetadata): boolean {
  return [metadata.sourceName, metadata.sourceUrl, metadata.datasetVersion, metadata.notes].some((value) => hasPlaceholderLanguage(value));
}

function getMetadataBanner(metadata: DataSourceMetadata): { tone: MetadataBannerTone; text: string } {
  if (metadata.qaFlag === 'verified') {
    return { tone: 'emerald', text: 'Verified source attached from the existing DPAL satellite adapter.' };
  }
  if (metadata.qaFlag === 'review_needed') {
    return { tone: 'amber', text: 'Source metadata attached. Review measurement availability before relying on it as final proof.' };
  }
  if (metadata.qaFlag === 'estimated') {
    return { tone: 'sky', text: 'Estimated source context is attached. Replace it with a live adapter read when possible.' };
  }
  return { tone: 'amber', text: 'Demo data — replace with verified satellite source.' };
}

function getBannerClass(tone: MetadataBannerTone): string {
  if (tone === 'emerald') return 'text-emerald-300';
  if (tone === 'sky') return 'text-sky-300';
  return 'text-amber-300';
}

function normalizeSourceDate(value?: string): string {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
}

function clampScore(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function isFiniteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function estimateJurisdictionFromPoint(point: CoordinatePoint | null): Jurisdiction | null {
  if (!point) return null;
  const { lat, lng } = point;
  if (lat >= 32.0 && lat <= 42.1 && lng >= -124.6 && lng <= -114.0) return 'California';
  if (lat >= 31.2 && lat <= 37.1 && lng >= -114.9 && lng <= -109.0) return 'Arizona';
  if (lat >= 31.3 && lat <= 37.1 && lng >= -109.1 && lng <= -103.0) return 'New Mexico';
  return 'Federal';
}

function getLocationValidation(point: CoordinatePoint | null, polygon: CoordinatePoint[]) {
  const hasMarker = Boolean(point);
  const hasPolygon = polygon.length >= 3;
  return {
    hasMarker,
    hasPolygon,
    hasLocation: hasMarker || hasPolygon,
  };
}

function isValidDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start;
}

function getSourceStatus(metadata: DataSourceMetadata): SourceStatus {
  const hasCoreFields = Boolean(
    metadata.sourceName?.trim() ||
    metadata.sourceUrl?.trim() ||
    metadata.datasetVersion?.trim() ||
    metadata.notes?.trim(),
  );
  if (!hasCoreFields) return 'MISSING';
  if (metadataUsesPlaceholderCopy(metadata)) {
    return metadata.qaFlag === 'estimated' ? 'ESTIMATED' : 'DEMO';
  }
  if (metadata.qaFlag === 'verified') return 'LIVE VERIFIED';
  if (metadata.qaFlag === 'estimated') return 'ESTIMATED';
  if (metadata.qaFlag === 'review_needed') return 'NEEDS REVIEW';
  return 'DEMO';
}

function getMetadataBannerState(metadata: DataSourceMetadata): { tone: MetadataBannerTone; text: string } {
  const sourceStatus = getSourceStatus(metadata);
  if (sourceStatus === 'LIVE VERIFIED') {
    return { tone: 'emerald', text: 'Verified source attached from the existing DPAL satellite adapter.' };
  }
  if (sourceStatus === 'NEEDS REVIEW') {
    return { tone: 'amber', text: 'Source metadata attached. Review measurement availability before relying on it as final proof.' };
  }
  if (sourceStatus === 'ESTIMATED') {
    return { tone: 'sky', text: 'Estimated source context is attached. Replace it with a live adapter read when possible.' };
  }
  if (sourceStatus === 'MISSING') {
    return { tone: 'amber', text: 'No source metadata is attached yet. Add provenance before relying on this input.' };
  }
  return { tone: 'amber', text: 'Demo data - replace with verified satellite source.' };
}

function getSourceBadgeClass(status: SourceStatus): string {
  if (status === 'LIVE VERIFIED') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
  if (status === 'ESTIMATED') return 'border-sky-500/40 bg-sky-500/10 text-sky-200';
  if (status === 'NEEDS REVIEW') return 'border-amber-500/40 bg-amber-500/10 text-amber-100';
  if (status === 'MISSING') return 'border-slate-600 bg-slate-800/60 text-slate-300';
  return 'border-amber-500/40 bg-amber-500/10 text-amber-100';
}

function buildLiveSatelliteMetadata(
  airQuality: CarbonAirQualityResponse | null,
  mineralData: CarbonMineralResponse | null,
): DataSourceMetadata {
  const hasVerifiedAir = airQuality?.measurementStatus === 'verified' && airQuality?.dataAvailable === true;
  const hasVerifiedMineral = mineralData?.measurementStatus === 'verified' && mineralData?.dataAvailable === true;
  const hasAnyLiveSource = Boolean(airQuality?.source || mineralData?.source);
  const sourceNames = [airQuality?.source, mineralData?.source].filter(Boolean) as string[];
  const notes = [airQuality?.message, mineralData?.message].filter(Boolean).join(' | ');

  return {
    sourceName: sourceNames.length > 0 ? sourceNames.join(' + ') : 'DPAL carbon adapter source unavailable',
    sourceUrl: hasAnyLiveSource ? 'https://cmr.earthdata.nasa.gov/search' : '',
    retrievalDate: normalizeSourceDate(airQuality?.captureDate || mineralData?.captureDate),
    datasetVersion: hasVerifiedAir || hasVerifiedMineral
      ? 'Live adapter read'
      : hasAnyLiveSource
        ? 'Metadata-only adapter read'
        : 'Demo data — replace with verified source',
    qaFlag: hasVerifiedAir || hasVerifiedMineral
      ? 'verified'
      : hasAnyLiveSource
        ? 'review_needed'
        : 'demo',
    notes: notes || 'No live satellite adapter response is attached for the selected point yet.',
  };
}

function DatasetMetadataEditor({
  title,
  metadata,
  onChange,
}: {
  title: string;
  metadata: DataSourceMetadata;
  onChange: (next: DataSourceMetadata) => void;
}) {
  const update = <K extends keyof DataSourceMetadata>(key: K, value: DataSourceMetadata[K]) => {
    onChange({ ...metadata, [key]: value });
  };
  const banner = getMetadataBannerState(metadata);
  const sourceStatus = getSourceStatus(metadata);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{title}</p>
          <p className={`mt-1 text-xs ${getBannerClass(banner.tone)}`}>{banner.text}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${getSourceBadgeClass(sourceStatus)}`}>
            {sourceStatus}
          </span>
          <Database className="h-4 w-4 text-slate-500" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className={labelCls}>Source Name</label>
          <input className={inputCls} value={metadata.sourceName} onChange={(event) => update('sourceName', event.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Source Url</label>
          <input className={inputCls} value={metadata.sourceUrl ?? ''} onChange={(event) => update('sourceUrl', event.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Retrieval Date</label>
          <input className={inputCls} type="date" value={metadata.retrievalDate} onChange={(event) => update('retrievalDate', event.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Dataset Version</label>
          <input className={inputCls} value={metadata.datasetVersion} onChange={(event) => update('datasetVersion', event.target.value)} />
        </div>
        <div>
          <label className={labelCls}>QA Flag</label>
          <select className={inputCls} value={metadata.qaFlag} onChange={(event) => update('qaFlag', event.target.value as DataSourceMetadata['qaFlag'])}>
            <option value="demo">demo</option>
            <option value="estimated">estimated</option>
            <option value="review_needed">review_needed</option>
            <option value="verified">verified</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <input className={inputCls} value={metadata.notes} onChange={(event) => update('notes', event.target.value)} />
        </div>
      </div>
    </div>
  );
}

function BoundaryPicker({
  point,
  polygon,
  drawMode,
  onMapClick,
}: {
  point: CoordinatePoint | null;
  polygon: CoordinatePoint[];
  drawMode: boolean;
  onMapClick: (point: CoordinatePoint) => void;
}) {
  useMapEvents({
    click(event) {
      onMapClick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  return (
    <>
      {point ? <Marker position={[point.lat, point.lng]} icon={mapPinIcon} /> : null}
      {polygon.length > 0 ? (
        <>
          <Polygon positions={polygon.map((vertex) => [vertex.lat, vertex.lng] as [number, number])} pathOptions={{ color: '#10b981', fillOpacity: 0.12 }} />
          {drawMode && polygon.length < 3 ? (
            <Polyline positions={polygon.map((vertex) => [vertex.lat, vertex.lng] as [number, number])} pathOptions={{ color: '#34d399' }} />
          ) : null}
        </>
      ) : null}
    </>
  );
}

function buildEvidencePacketFromParts(
  audit: EmissionsAudit,
  regulatoryMeta: DataSourceMetadata,
  fieldReportMeta: DataSourceMetadata,
): EvidencePacket {
  return {
    title: 'DPAL Emissions Integrity Audit Evidence Packet',
    auditId: audit.auditId,
    companyName: audit.facilityInfo.companyName,
    facilityName: audit.facilityInfo.facilityName,
    jurisdiction: audit.facilityInfo.jurisdiction,
    industry: audit.facilityInfo.industry,
    legalFramework: audit.facilityInfo.legalFramework,
    location: audit.locationBoundary.point,
    polygon: audit.locationBoundary.polygon,
    mapBoundary: {
      location: audit.locationBoundary.point,
      polygon: audit.locationBoundary.polygon,
      areaEstimateKm2: audit.locationBoundary.areaEstimateKm2,
      stateLabel: audit.locationBoundary.stateLabel,
    },
    baselinePeriod: audit.baselinePeriod,
    currentPeriod: audit.currentPeriod,
    periodComparison: {
      baselinePeriod: audit.baselinePeriod,
      currentPeriod: audit.currentPeriod,
    },
    reportedData: audit.reportedData,
    satelliteObservations: audit.satelliteObservations,
    productionData: audit.productionData,
    dataSources: {
      reportedData: audit.reportedData.metadata,
      satelliteObservations: audit.satelliteObservations.metadata,
      productionData: audit.productionData.metadata,
      regulatorySource: regulatoryMeta,
      fieldReports: fieldReportMeta,
    },
    calculationResults: audit.calculationResults,
    adiScore: audit.adi.score,
    riskLevel: audit.adi.riskLevel,
    confidence: audit.confidenceInputs,
    legalContext: [...audit.legalContext, LEGAL_DISCLAIMER],
    confidenceScore: audit.adi.confidenceScore,
    limitations: audit.limitations,
    recommendedNextSteps: audit.recommendedNextSteps,
    generatedAt: new Date().toISOString(),
    checksumPlaceholder: 'pending-checksum',
    timestamps: {
      exportedAt: new Date().toISOString(),
      createdAt: audit.timestamps.createdAt,
      updatedAt: audit.timestamps.updatedAt,
    },
    dpalLedgerPlaceholder: {
      status: 'not_connected',
      note: 'Ledger write integration not connected yet. Save-to-ledger is a placeholder.',
    },
    integrationHooks,
  };
}

function buildAuditFromStored(source: any): EmissionsAudit {
  const calculations = source.calculations ?? {};
  const confidence = source.confidence ?? {};
  const riskLevel = normalizeRiskLabel(source.riskLevel ?? 'low');
  const reportedReduction = Number(calculations.reportedReductionPct ?? 0);
  const observedReduction = Number(calculations.observedReductionPct ?? 0);
  return {
    auditId: source.id ?? source.auditId ?? `EIAS-${Date.now()}`,
    facilityInfo: {
      companyName: source.companyName ?? '',
      facilityName: source.facilityName ?? '',
      industry: source.industry ?? defaultFacilityInfo.industry,
      jurisdiction: source.jurisdiction ?? defaultFacilityInfo.jurisdiction,
      legalFramework: source.legalFramework ?? defaultFacilityInfo.legalFramework,
    },
    locationBoundary: {
      selectionMethod: 'GPS coordinate input',
      point: typeof source.location?.lat === 'number' && typeof source.location?.lng === 'number'
        ? { lat: source.location.lat, lng: source.location.lng }
        : null,
      polygon: Array.isArray(source.location?.polygonGeoJSON?.coordinates?.[0])
        ? source.location.polygonGeoJSON.coordinates[0].slice(0, -1).map((pair: [number, number]) => ({ lat: pair[1], lng: pair[0] }))
        : [],
      areaEstimateKm2: source.location?.areaEstimate ?? 0,
      stateLabel: source.jurisdiction ?? '',
    },
    baselinePeriod: {
      label: source.baselinePeriod?.label ?? 'Baseline',
      startDate: source.baselinePeriod?.startDate ?? '',
      endDate: source.baselinePeriod?.endDate ?? '',
      preset: 'custom',
    },
    currentPeriod: {
      label: source.currentPeriod?.label ?? 'Current',
      startDate: source.currentPeriod?.startDate ?? '',
      endDate: source.currentPeriod?.endDate ?? '',
      preset: 'custom',
    },
    reportedData: {
      baselineReportedEmissions: source.reportedData?.baselineCO2e ?? 0,
      currentReportedEmissions: source.reportedData?.currentCO2e ?? 0,
      metadata: source.reportedData?.sourceMetadata ?? createDefaultMetadata('Reported data'),
    },
    satelliteObservations: {
      baselineMethaneScore: source.satelliteData?.baselineMethaneScore ?? 0,
      currentMethaneScore: source.satelliteData?.currentMethaneScore ?? 0,
      baselineNO2Score: source.satelliteData?.baselineNO2Score ?? 0,
      currentNO2Score: source.satelliteData?.currentNO2Score ?? 0,
      baselineActivityProxyScore: source.satelliteData?.baselineActivityProxyScore ?? 0,
      currentActivityProxyScore: source.satelliteData?.currentActivityProxyScore ?? 0,
      co2ContextScore: source.satelliteData?.co2ContextScore ?? 0,
      enabledLayers: [...SATELLITE_LAYER_OPTIONS],
      metadata: source.satelliteData?.sourceMetadata ?? createDefaultMetadata('Satellite data'),
    },
    productionData: {
      baselineProductionOutput: source.productionData?.baselineOutput ?? 0,
      currentProductionOutput: source.productionData?.currentOutput ?? 0,
      outputUnit:
        typeof source.productionData?.outputUnit === 'string' && source.productionData.outputUnit.trim()
          ? source.productionData.outputUnit
          : defaultProductionData.outputUnit,
      metadata: source.productionData?.sourceMetadata ?? createDefaultMetadata('Production data'),
    },
    confidenceInputs: {
      dataConfidence: confidence.overallConfidence ?? 0,
      satelliteDataConfidence: confidence.satelliteConfidence ?? 0,
      regulatoryDataConfidence: confidence.regulatoryConfidence ?? 0,
      weatherQaConfidence: confidence.weatherQAConfidence ?? 0,
    },
    calculationResults: {
      reportedReductionPct: calculations.reportedReductionPct ?? 0,
      methaneChangePct: calculations.methaneChangePct ?? 0,
      no2ChangePct: calculations.no2ChangePct ?? 0,
      activityProxyChangePct: calculations.activityProxyChangePct ?? 0,
      baselineIntensity: calculations.baselineIntensity ?? 0,
      currentIntensity: calculations.currentIntensity ?? 0,
      intensityReductionPct: calculations.intensityReductionPct ?? 0,
      observedReductionPct: calculations.observedReductionPct ?? 0,
      discrepancyGap: calculations.discrepancyGap ?? 0,
      auditDiscrepancyIndex: calculations.auditDiscrepancyIndex ?? calculations.ADI ?? 0,
      overallConfidence: confidence.overallConfidence ?? 0,
      riskLevel,
      interpretation:
        source.evidencePacket?.calculations?.interpretation ??
        `The company reported a ${reportedReduction.toFixed(1)}% reduction, while observed indicators suggest ${observedReduction.toFixed(1)}%.`,
    },
    adi: {
      score: calculations.auditDiscrepancyIndex ?? calculations.ADI ?? 0,
      riskLevel,
      weights: {},
      confidenceScore: confidence.overallConfidence ?? 0,
    },
    legalContext: source.legalContext ?? [],
    limitations: source.limitations ?? limitations,
    recommendedNextSteps: source.recommendedNextSteps ?? [],
    timestamps: {
      createdAt: source.createdAt ?? new Date().toISOString(),
      updatedAt: source.updatedAt ?? new Date().toISOString(),
    },
  };
}

const EmissionsIntegrityAuditPage: React.FC<EmissionsIntegrityAuditPageProps> = ({ onReturn }) => {
  const [initialWorkspace] = useState(() => getEiasWorkspaceInitialState());
  const isFirstPersistEffect = useRef(true);
  const skipNextWorkspacePersist = useRef(false);
  const resultsRef = useRef<HTMLElement | null>(null);
  const [lastLocalSaveAt, setLastLocalSaveAt] = useState<string | null>(null);

  const [facilityInfo, setFacilityInfo] = useState(initialWorkspace.facilityInfo);
  const [locationMethod, setLocationMethod] = useState<LocationSelectionMethod>(initialWorkspace.locationMethod);
  const [gpsLat, setGpsLat] = useState(initialWorkspace.gpsLat);
  const [gpsLng, setGpsLng] = useState(initialWorkspace.gpsLng);
  const [mapPoint, setMapPoint] = useState<CoordinatePoint | null>(initialWorkspace.mapPoint);
  const [polygon, setPolygon] = useState<CoordinatePoint[]>(initialWorkspace.polygon);
  const [drawingPolygon, setDrawingPolygon] = useState(initialWorkspace.drawingPolygon);
  const [baselinePreset, setBaselinePreset] = useState<AuditPeriod['preset']>(initialWorkspace.baselinePreset);
  const [currentPreset, setCurrentPreset] = useState<AuditPeriod['preset']>(initialWorkspace.currentPreset);
  const [baselineCustomStart, setBaselineCustomStart] = useState(initialWorkspace.baselineCustomStart);
  const [baselineCustomEnd, setBaselineCustomEnd] = useState(initialWorkspace.baselineCustomEnd);
  const [currentCustomStart, setCurrentCustomStart] = useState(initialWorkspace.currentCustomStart);
  const [currentCustomEnd, setCurrentCustomEnd] = useState(initialWorkspace.currentCustomEnd);
  const [reportedData, setReportedData] = useState(initialWorkspace.reportedData);
  const [satelliteData, setSatelliteData] = useState(initialWorkspace.satelliteData);
  const [productionData, setProductionData] = useState(initialWorkspace.productionData);
  const [confidenceInputs, setConfidenceInputs] = useState(initialWorkspace.confidenceInputs);
  const [regulatoryMetadata, setRegulatoryMetadata] = useState(initialWorkspace.regulatoryMetadata);
  const [fieldReportMetadata, setFieldReportMetadata] = useState(initialWorkspace.fieldReportMetadata);
  const [facilitySearch, setFacilitySearch] = useState(initialWorkspace.facilitySearch);
  const [warning, setWarning] = useState('');
  const [lastActionMessage, setLastActionMessage] = useState('No export or handoff action has been triggered yet.');
  const [audit, setAudit] = useState<EmissionsAudit | null>(initialWorkspace.audit);
  const [savedAuditId, setSavedAuditId] = useState<string | null>(initialWorkspace.savedAuditId);
  const [auditVersion, setAuditVersion] = useState(initialWorkspace.auditVersion);
  const [statusMessage, setStatusMessage] = useState('Audit workspace ready.');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingSatelliteSource, setIsLoadingSatelliteSource] = useState(false);
  const [savedAudits, setSavedAudits] = useState<EmissionsAuditSummary[]>([]);
  const [viewMode, setViewMode] = useState<'workspace' | 'myAudits'>('workspace');
  const [versionHistory, setVersionHistory] = useState<Array<{ version: number; modifiedBy: string; changeSummary?: string | null; createdAt: string }>>([]);
  const [linkFields, setLinkFields] = useState(initialWorkspace.linkFields);

  const baselinePeriod = useMemo(
    () => createPeriod(baselinePreset, defaultBaselinePeriod, baselineCustomStart, baselineCustomEnd),
    [baselineCustomEnd, baselineCustomStart, baselinePreset],
  );
  const currentPeriod = useMemo(
    () => createPeriod(currentPreset, defaultCurrentPeriod, currentCustomStart, currentCustomEnd),
    [currentCustomEnd, currentCustomStart, currentPreset],
  );

  const areaEstimateKm2 = useMemo(() => computePolygonAreaKm2(polygon), [polygon]);
  const centerPoint = mapPoint ?? (polygon[0] ?? null);
  const locationValidation = useMemo(() => getLocationValidation(centerPoint, polygon), [centerPoint, polygon]);
  const estimatedJurisdiction = useMemo(() => estimateJurisdictionFromPoint(centerPoint), [centerPoint]);
  const filteredFacilities = useMemo(
    () =>
      demoFacilityResults.filter((result) =>
        result.label.toLowerCase().includes(facilitySearch.toLowerCase()) ||
        result.jurisdiction.toLowerCase().includes(facilitySearch.toLowerCase()),
      ),
    [facilitySearch],
  );

  const legalContext = useMemo(() => JURISDICTION_CONTEXT[facilityInfo.jurisdiction as Jurisdiction], [facilityInfo.jurisdiction]);
  const satelliteMetadataBanner = useMemo(() => getMetadataBannerState(satelliteData.metadata), [satelliteData.metadata]);
  const jurisdictionMismatch = Boolean(estimatedJurisdiction && facilityInfo.jurisdiction !== estimatedJurisdiction);
  const overallSourceStatuses = useMemo(
    () => [
      getSourceStatus(reportedData.metadata),
      getSourceStatus(satelliteData.metadata),
      getSourceStatus(productionData.metadata),
      getSourceStatus(regulatoryMetadata),
      getSourceStatus(fieldReportMetadata),
    ],
    [fieldReportMetadata, productionData.metadata, regulatoryMetadata, reportedData.metadata, satelliteData.metadata],
  );
  const topDataQuality = useMemo(() => {
    const uniqueStatuses = Array.from(new Set(overallSourceStatuses));
    if (uniqueStatuses.length === 1) return uniqueStatuses[0];
    return 'Mixed';
  }, [overallSourceStatuses]);

  const workspaceSnapshot = useMemo(
    () => ({
      facilityInfo,
      locationMethod,
      gpsLat,
      gpsLng,
      mapPoint,
      polygon,
      drawingPolygon,
      baselinePreset,
      currentPreset,
      baselineCustomStart,
      baselineCustomEnd,
      currentCustomStart,
      currentCustomEnd,
      reportedData,
      satelliteData,
      productionData,
      confidenceInputs,
      regulatoryMetadata,
      fieldReportMetadata,
      facilitySearch,
      linkFields,
      savedAuditId,
      auditVersion,
      audit,
    }),
    [
      facilityInfo,
      locationMethod,
      gpsLat,
      gpsLng,
      mapPoint,
      polygon,
      drawingPolygon,
      baselinePreset,
      currentPreset,
      baselineCustomStart,
      baselineCustomEnd,
      currentCustomStart,
      currentCustomEnd,
      reportedData,
      satelliteData,
      productionData,
      confidenceInputs,
      regulatoryMetadata,
      fieldReportMetadata,
      facilitySearch,
      linkFields,
      savedAuditId,
      auditVersion,
      audit,
    ],
  );

  useEffect(() => {
    if (initialWorkspace.restoredFromLocal && initialWorkspace.restoredSavedAt) {
      setLastLocalSaveAt(initialWorkspace.restoredSavedAt);
      setStatusMessage(
        `Restored local workspace from ${new Date(initialWorkspace.restoredSavedAt).toLocaleString()}. ${LOCAL_DRAFT_HINT}`,
      );
    }
  }, [initialWorkspace.restoredFromLocal, initialWorkspace.restoredSavedAt]);

  useEffect(() => {
    if (isFirstPersistEffect.current) {
      isFirstPersistEffect.current = false;
      return;
    }
    if (skipNextWorkspacePersist.current) {
      skipNextWorkspacePersist.current = false;
      return;
    }
    const handle = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      saveEiasWorkspaceSnapshot({
        v: 1,
        savedAt,
        ...workspaceSnapshot,
      });
      setLastLocalSaveAt(savedAt);
    }, 700);
    return () => window.clearTimeout(handle);
  }, [workspaceSnapshot]);

  const buildPayload = (options?: {
    auditSnapshot?: EmissionsAudit | null;
    evidenceSnapshot?: EvidencePacket | null;
  }): EmissionsAuditDraftPayload => {
    const auditRef = options?.auditSnapshot ?? audit;
    const evidence =
      options?.evidenceSnapshot ??
      (auditRef ? buildEvidencePacketFromParts(auditRef, regulatoryMetadata, fieldReportMetadata) : undefined);
    return {
      companyName: facilityInfo.companyName,
      facilityName: facilityInfo.facilityName,
      industry: facilityInfo.industry,
      jurisdiction: facilityInfo.jurisdiction,
      legalFramework: facilityInfo.legalFramework,
      location: {
        lat: centerPoint?.lat ?? null,
        lng: centerPoint?.lng ?? null,
        polygonGeoJSON: toPolygonGeoJSON(polygon),
        areaEstimate: areaEstimateKm2,
      },
      baselinePeriod: {
        startDate: baselinePeriod.startDate,
        endDate: baselinePeriod.endDate,
        label: baselinePeriod.label,
      },
      currentPeriod: {
        startDate: currentPeriod.startDate,
        endDate: currentPeriod.endDate,
        label: currentPeriod.label,
      },
      reportedData: {
        baselineCO2e: reportedData.baselineReportedEmissions,
        currentCO2e: reportedData.currentReportedEmissions,
        sourceMetadata: reportedData.metadata,
      },
      satelliteData: {
        baselineMethaneScore: satelliteData.baselineMethaneScore,
        currentMethaneScore: satelliteData.currentMethaneScore,
        baselineNO2Score: satelliteData.baselineNO2Score,
        currentNO2Score: satelliteData.currentNO2Score,
        baselineActivityProxyScore: satelliteData.baselineActivityProxyScore,
        currentActivityProxyScore: satelliteData.currentActivityProxyScore,
        co2ContextScore: satelliteData.co2ContextScore,
        sourceMetadata: {
          ...satelliteData.metadata,
          notes: [
            satelliteData.metadata.notes,
            `Layer toggles: ${satelliteData.enabledLayers.join(', ')}`,
            `Activity proxy baseline/current: ${satelliteData.baselineActivityProxyScore}/${satelliteData.currentActivityProxyScore}`,
            `CO2 context score: ${satelliteData.co2ContextScore}`,
            `Regulatory metadata source: ${regulatoryMetadata.sourceName}`,
            `Field report source: ${fieldReportMetadata.sourceName}`,
          ].filter(Boolean).join(' | '),
        },
      },
      productionData: {
        baselineOutput: productionData.baselineProductionOutput,
        currentOutput: productionData.currentProductionOutput,
        outputUnit: productionData.outputUnit.trim() || defaultProductionData.outputUnit,
        sourceMetadata: productionData.metadata,
      },
      confidence: {
        satelliteConfidence: confidenceInputs.satelliteDataConfidence,
        regulatoryConfidence: confidenceInputs.regulatoryDataConfidence,
        weatherQAConfidence: confidenceInputs.weatherQaConfidence,
        overallConfidence: confidenceInputs.dataConfidence,
      },
      legalContext,
      limitations,
      recommendedNextSteps: auditRef?.recommendedNextSteps?.length
        ? auditRef.recommendedNextSteps
        : [
            'Compare the flagged discrepancy against permits, filings, and facility operating logs.',
            'Validate weather conditions and QA flags for the selected observation window.',
            'Escalate to a DPAL investigation case if discrepancy remains material after document review.',
          ],
      linkedReportId: linkFields.linkedReportId || null,
      linkedMissionId: linkFields.linkedMissionId || null,
      linkedProjectId: linkFields.linkedProjectId || null,
      linkedMRVProjectId: linkFields.linkedMRVProjectId || null,
      linkedEvidenceVaultId: linkFields.linkedEvidenceVaultId || null,
      ledgerStatus: 'not_connected',
      evidencePacket: evidence ?? undefined,
      version: auditVersion,
    };
  };

  const hydrateFromServer = (rawAudit: any) => {
    const source = rawAudit?.fullAudit ?? rawAudit;
    if (!source) return;

    const nextFacilityInfo = {
      companyName: source.companyName ?? defaultFacilityInfo.companyName,
      facilityName: source.facilityName ?? defaultFacilityInfo.facilityName,
      industry: source.industry ?? defaultFacilityInfo.industry,
      jurisdiction: source.jurisdiction ?? defaultFacilityInfo.jurisdiction,
      legalFramework: source.legalFramework ?? defaultFacilityInfo.legalFramework,
    };

    setFacilityInfo(nextFacilityInfo);
    const location = source.location ?? {};
    const point = typeof location.lat === 'number' && typeof location.lng === 'number'
      ? { lat: location.lat, lng: location.lng }
      : null;
    setMapPoint(point);
    setGpsLat(point ? String(point.lat) : '');
    setGpsLng(point ? String(point.lng) : '');
    const serverPolygon = Array.isArray(location.polygonGeoJSON?.coordinates?.[0])
      ? location.polygonGeoJSON.coordinates[0]
          .slice(0, -1)
          .map((pair: [number, number]) => ({ lat: pair[1], lng: pair[0] }))
      : [];
    setPolygon(serverPolygon);
    setBaselineCustomStart(source.baselinePeriod?.startDate ?? defaultBaselinePeriod.startDate);
    setBaselineCustomEnd(source.baselinePeriod?.endDate ?? defaultBaselinePeriod.endDate);
    setCurrentCustomStart(source.currentPeriod?.startDate ?? defaultCurrentPeriod.startDate);
    setCurrentCustomEnd(source.currentPeriod?.endDate ?? defaultCurrentPeriod.endDate);
    setBaselinePreset('custom');
    setCurrentPreset('custom');

    if (source.reportedData) {
      setReportedData((current) => ({
        ...current,
        baselineReportedEmissions: source.reportedData.baselineCO2e ?? current.baselineReportedEmissions,
        currentReportedEmissions: source.reportedData.currentCO2e ?? current.currentReportedEmissions,
        metadata: source.reportedData.sourceMetadata ?? current.metadata,
      }));
    }
    if (source.satelliteData) {
      setSatelliteData((current) => ({
        ...current,
        baselineMethaneScore: source.satelliteData.baselineMethaneScore ?? current.baselineMethaneScore,
        currentMethaneScore: source.satelliteData.currentMethaneScore ?? current.currentMethaneScore,
        baselineNO2Score: source.satelliteData.baselineNO2Score ?? current.baselineNO2Score,
        currentNO2Score: source.satelliteData.currentNO2Score ?? current.currentNO2Score,
        baselineActivityProxyScore: source.satelliteData.baselineActivityProxyScore ?? current.baselineActivityProxyScore,
        currentActivityProxyScore: source.satelliteData.currentActivityProxyScore ?? current.currentActivityProxyScore,
        co2ContextScore: source.satelliteData.co2ContextScore ?? current.co2ContextScore,
        metadata: source.satelliteData.sourceMetadata ?? current.metadata,
      }));
    }
    if (source.productionData) {
      setProductionData((current) => ({
        ...current,
        baselineProductionOutput: source.productionData.baselineOutput ?? current.baselineProductionOutput,
        currentProductionOutput: source.productionData.currentOutput ?? current.currentProductionOutput,
        outputUnit:
          typeof source.productionData.outputUnit === 'string' && source.productionData.outputUnit.trim()
            ? source.productionData.outputUnit
            : current.outputUnit,
        metadata: source.productionData.sourceMetadata ?? current.metadata,
      }));
    }
    if (source.confidence) {
      setConfidenceInputs((current) => ({
        ...current,
        satelliteDataConfidence: source.confidence.satelliteConfidence ?? current.satelliteDataConfidence,
        regulatoryDataConfidence: source.confidence.regulatoryConfidence ?? current.regulatoryDataConfidence,
        weatherQaConfidence: source.confidence.weatherQAConfidence ?? current.weatherQaConfidence,
        dataConfidence: source.confidence.overallConfidence ?? current.dataConfidence,
      }));
    }
    setLinkFields({
      linkedReportId: source.linkedReportId ?? '',
      linkedMissionId: source.linkedMissionId ?? '',
      linkedProjectId: source.linkedProjectId ?? '',
      linkedMRVProjectId: source.linkedMRVProjectId ?? '',
      linkedEvidenceVaultId: source.linkedEvidenceVaultId ?? '',
    });
    setSavedAuditId(source.id ?? rawAudit.id ?? null);
    setAuditVersion(source.version ?? rawAudit.version ?? 1);
    setAudit(buildAuditFromStored(source));
  };

  const buildAudit = (): EmissionsAudit => {
    const calculationResults = calculateAuditResults({
      industry: facilityInfo.industry,
      baselineReportedEmissions: reportedData.baselineReportedEmissions,
      currentReportedEmissions: reportedData.currentReportedEmissions,
      baselineMethaneScore: satelliteData.baselineMethaneScore,
      currentMethaneScore: satelliteData.currentMethaneScore,
      baselineNO2Score: satelliteData.baselineNO2Score,
      currentNO2Score: satelliteData.currentNO2Score,
      baselineActivityProxyScore: satelliteData.baselineActivityProxyScore,
      currentActivityProxyScore: satelliteData.currentActivityProxyScore,
      baselineProductionOutput: productionData.baselineProductionOutput,
      currentProductionOutput: productionData.currentProductionOutput,
      co2ContextScore: satelliteData.co2ContextScore,
    });
    const adi = calculateAdi(calculationResults, confidenceInputs, facilityInfo.industry, hasMinimumAuditData({
      industry: facilityInfo.industry,
      baselineReportedEmissions: reportedData.baselineReportedEmissions,
      currentReportedEmissions: reportedData.currentReportedEmissions,
      baselineMethaneScore: satelliteData.baselineMethaneScore,
      currentMethaneScore: satelliteData.currentMethaneScore,
      baselineNO2Score: satelliteData.baselineNO2Score,
      currentNO2Score: satelliteData.currentNO2Score,
      baselineActivityProxyScore: satelliteData.baselineActivityProxyScore,
      currentActivityProxyScore: satelliteData.currentActivityProxyScore,
      baselineProductionOutput: productionData.baselineProductionOutput,
      currentProductionOutput: productionData.currentProductionOutput,
      co2ContextScore: satelliteData.co2ContextScore,
    }));
    calculationResults.auditDiscrepancyIndex = adi.score;
    calculationResults.overallConfidence = adi.confidenceScore;
    calculationResults.riskLevel = adi.riskLevel;
    const now = new Date().toISOString();

    return {
      auditId: `EIAS-${Date.now()}`,
      facilityInfo,
      locationBoundary: {
        selectionMethod: locationMethod,
        point: centerPoint,
        polygon,
        areaEstimateKm2,
        stateLabel: facilityInfo.jurisdiction,
      },
      baselinePeriod,
      currentPeriod,
      reportedData,
      satelliteObservations: satelliteData,
      productionData,
      confidenceInputs,
      calculationResults,
      adi,
      legalContext,
      limitations,
      recommendedNextSteps: [
        'Compare the flagged discrepancy against permits, filings, and facility operating logs.',
        'Validate weather conditions and QA flags for the selected observation window.',
        'Escalate to a DPAL investigation case if discrepancy remains material after document review.',
      ],
      timestamps: {
        createdAt: now,
        updatedAt: now,
      },
    };
  };

  const evidencePacket = useMemo<EvidencePacket | null>(() => {
    if (!audit) return null;
    return buildEvidencePacketFromParts(audit, regulatoryMetadata, fieldReportMetadata);
  }, [audit, fieldReportMetadata, regulatoryMetadata]);

  const validateAuditWorkspace = () => {
    if (!locationValidation.hasLocation) {
      setWarning('Select a facility location or draw a boundary before running an audit.');
      return false;
    }
    if (!facilityInfo.companyName.trim() || !facilityInfo.facilityName.trim()) {
      setWarning('Enter a company name and facility name before running or saving an audit.');
      return false;
    }
    if (!isValidDateRange(baselinePeriod.startDate, baselinePeriod.endDate)) {
      setWarning('Review the baseline period dates before continuing.');
      return false;
    }
    if (!isValidDateRange(currentPeriod.startDate, currentPeriod.endDate)) {
      setWarning('Review the current period dates before continuing.');
      return false;
    }
    if (new Date(currentPeriod.endDate) < new Date(baselinePeriod.endDate)) {
      setWarning('Current period must not end before the baseline period.');
      return false;
    }
    const numericValues = [
      reportedData.baselineReportedEmissions,
      reportedData.currentReportedEmissions,
      satelliteData.baselineMethaneScore,
      satelliteData.currentMethaneScore,
      satelliteData.baselineNO2Score,
      satelliteData.currentNO2Score,
      satelliteData.baselineActivityProxyScore,
      satelliteData.currentActivityProxyScore,
      satelliteData.co2ContextScore,
      productionData.baselineProductionOutput,
      productionData.currentProductionOutput,
      confidenceInputs.dataConfidence,
      confidenceInputs.satelliteDataConfidence,
      confidenceInputs.regulatoryDataConfidence,
      confidenceInputs.weatherQaConfidence,
    ];
    if (!numericValues.every(isFiniteNonNegative)) {
      setWarning('Use non-negative numeric values for emissions, activity, production, and confidence inputs.');
      return false;
    }
    if (
      confidenceInputs.dataConfidence > 100 ||
      confidenceInputs.satelliteDataConfidence > 100 ||
      confidenceInputs.regulatoryDataConfidence > 100 ||
      confidenceInputs.weatherQaConfidence > 100
    ) {
      setWarning('Confidence inputs must stay between 0 and 100.');
      return false;
    }
    if (jurisdictionMismatch) {
      setWarning('Jurisdiction and selected location may not match. Review before saving.');
    } else {
      setWarning('');
    }
    return true;
  };

  const runAudit = () => {
    if (!validateAuditWorkspace()) {
      return;
    }
    setAudit(buildAudit());
    setStatusMessage('Audit calculated from the current workspace inputs.');
    scrollResultsIntoView();
  };

  const handleResetForm = () => {
    clearEiasWorkspaceLocal();
    skipNextWorkspacePersist.current = true;
    setLastLocalSaveAt(null);
    setFacilityInfo(defaultFacilityInfo);
    setLocationMethod('GPS coordinate input');
    setGpsLat('32.312');
    setGpsLng('-104.234');
    setMapPoint({ lat: 32.312, lng: -104.234 });
    setPolygon([]);
    setDrawingPolygon(false);
    setBaselinePreset(defaultBaselinePeriod.preset);
    setCurrentPreset(defaultCurrentPeriod.preset);
    setBaselineCustomStart(defaultBaselinePeriod.startDate);
    setBaselineCustomEnd(defaultBaselinePeriod.endDate);
    setCurrentCustomStart(defaultCurrentPeriod.startDate);
    setCurrentCustomEnd(defaultCurrentPeriod.endDate);
    setReportedData(defaultReportedData);
    setSatelliteData(defaultSatelliteData);
    setProductionData(defaultProductionData);
    setConfidenceInputs(defaultConfidenceInputs);
    setRegulatoryMetadata(createDefaultMetadata('CARB MRR / EPA GHGRP placeholder'));
    setFieldReportMetadata(createDefaultMetadata('DPAL field reports placeholder'));
    setFacilitySearch('');
    setWarning('');
    setAudit(null);
    setSavedAuditId(null);
    setAuditVersion(1);
    setVersionHistory([]);
    setLastActionMessage('No export or handoff action has been triggered yet.');
    setStatusMessage('Audit workspace reset to default values.');
    setLinkFields({
      linkedReportId: '',
      linkedMissionId: '',
      linkedProjectId: '',
      linkedMRVProjectId: '',
      linkedEvidenceVaultId: '',
    });
  };

  const updateFacility = <K extends keyof typeof defaultFacilityInfo>(key: K, value: (typeof defaultFacilityInfo)[K]) => {
    setFacilityInfo((current) => ({ ...current, [key]: value }));
  };

  const updateReported = <K extends keyof typeof defaultReportedData>(key: K, value: (typeof defaultReportedData)[K]) => {
    setReportedData((current) => ({ ...current, [key]: value }));
  };

  const updateSatellite = <K extends keyof typeof defaultSatelliteData>(key: K, value: (typeof defaultSatelliteData)[K]) => {
    setSatelliteData((current) => ({ ...current, [key]: value }));
  };

  const updateProduction = <K extends keyof typeof defaultProductionData>(key: K, value: (typeof defaultProductionData)[K]) => {
    setProductionData((current) => ({ ...current, [key]: value }));
  };

  const updateConfidence = <K extends keyof typeof defaultConfidenceInputs>(key: K, value: (typeof defaultConfidenceInputs)[K]) => {
    setConfidenceInputs((current) => ({ ...current, [key]: value }));
  };

  const applyGpsPoint = (lat: number, lng: number) => {
    setMapPoint({ lat, lng });
    setGpsLat(String(Number(lat.toFixed(6))));
    setGpsLng(String(Number(lng.toFixed(6))));
  };

  const handleMapClick = (point: CoordinatePoint) => {
    if (locationMethod === 'drawn polygon' || drawingPolygon) {
      setPolygon((current) => [...current, point]);
      if (!mapPoint) setMapPoint(point);
      return;
    }
    applyGpsPoint(point.lat, point.lng);
    setLocationMethod('map click');
  };

  const toggleLayer = (layer: string) => {
    setSatelliteData((current) => ({
      ...current,
      enabledLayers: current.enabledLayers.includes(layer)
        ? current.enabledLayers.filter((entry) => entry !== layer)
        : [...current.enabledLayers, layer],
    }));
  };

  const loadLiveSatelliteSource = async (point: CoordinatePoint) => {
    setIsLoadingSatelliteSource(true);
    try {
      const [airRes, mineralRes] = await Promise.all([
        fetch(apiUrl(API_ROUTES.CARBON_AIR_QUALITY) + `?lat=${point.lat}&lng=${point.lng}`),
        fetch(apiUrl(API_ROUTES.CARBON_MINERALS) + `?lat=${point.lat}&lng=${point.lng}`),
      ]);

      const [airBody, mineralBody] = await Promise.all([airRes.text(), mineralRes.text()]);

      const airQuality = airRes.ok && airBody ? JSON.parse(airBody) as CarbonAirQualityResponse : null;
      const mineralData = mineralRes.ok && mineralBody ? JSON.parse(mineralBody) as CarbonMineralResponse : null;
      const metadata = buildLiveSatelliteMetadata(airQuality, mineralData);

      setSatelliteData((current) => {
        const next = { ...current, metadata };
        if (typeof airQuality?.co2ppm === 'number' && Number.isFinite(airQuality.co2ppm)) {
          next.co2ContextScore = clampScore(100 - ((airQuality.co2ppm - 380) / 2));
        }
        return next;
      });
      setConfidenceInputs((current) => ({
        ...current,
        satelliteDataConfidence: metadata.qaFlag === 'verified'
          ? Math.max(current.satelliteDataConfidence, 82)
          : metadata.qaFlag === 'review_needed'
            ? Math.max(current.satelliteDataConfidence, 60)
            : current.satelliteDataConfidence,
      }));
      setStatusMessage(
        metadata.qaFlag === 'verified'
          ? 'Live satellite source attached from the existing DPAL carbon adapters.'
          : metadata.qaFlag === 'review_needed'
            ? 'Satellite adapter metadata was found, but the reading still needs review before it is treated as final proof.'
            : 'No live satellite adapter reading was available for the selected point.',
      );
    } catch (error) {
      console.error('Failed to load live satellite source:', error);
      setStatusMessage('Unable to load the existing DPAL satellite source for this point.');
    } finally {
      setIsLoadingSatelliteSource(false);
    }
  };

  const refreshSavedAudits = async () => {
    setIsLoadingList(true);
    try {
      const response = await listEmissionsAudits();
      setSavedAudits(response.audits.map((auditItem) => ({
        ...auditItem,
        riskLevel: normalizeSummaryRisk(auditItem.riskLevel),
      })));
    } catch (error) {
      const raw = error instanceof Error ? error.message : 'Unable to load saved audits.';
      const lower = raw.toLowerCase();
      if (lower.includes('sign in') || lower.includes('401')) {
        setStatusMessage(`${raw} ${EIAS_API_DISCLAIMER}`);
      } else if (lower.includes('404') || lower.includes('not found')) {
        setStatusMessage(`${raw} The API host may not implement emissions audit routes yet. ${EIAS_API_DISCLAIMER}`);
      } else {
        setStatusMessage(raw);
      }
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    void refreshSavedAudits();
  }, []);

  useEffect(() => {
    if (!centerPoint) return;
    const handle = window.setTimeout(() => {
      void loadLiveSatelliteSource(centerPoint);
    }, 650);
    return () => window.clearTimeout(handle);
  }, [centerPoint?.lat, centerPoint?.lng]);

  const handleSaveAudit = async () => {
    if (!validateAuditWorkspace()) {
      return;
    }
    if (!getAccessToken()) {
      setStatusMessage(`Sign in required to save audits to the API. ${EIAS_API_DISCLAIMER}`);
      return;
    }
    const snapshot = buildAudit();
    setAudit(snapshot);
    const packet = buildEvidencePacketFromParts(snapshot, regulatoryMetadata, fieldReportMetadata);
    setIsSaving(true);
    setStatusMessage(savedAuditId ? 'Updating audit...' : 'Saving audit...');
    try {
      const payload = buildPayload({ auditSnapshot: snapshot, evidenceSnapshot: packet });
      const response = savedAuditId
        ? await updateEmissionsAudit(savedAuditId, payload)
        : await createEmissionsAudit(payload);
      setSavedAuditId(response.auditId);
      hydrateFromServer(response.audit);
      const nextVersion = Number((response.audit as { version?: number })?.version);
      setVersionHistory((current) => [
        {
          version: Number.isFinite(nextVersion) ? nextVersion : savedAuditId ? auditVersion + 1 : 1,
          modifiedBy: 'current-user',
          changeSummary: savedAuditId ? 'Updated audit' : 'Created audit',
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
      setStatusMessage(`${savedAuditId ? 'Updated' : 'Saved'} audit successfully. Audit ID: ${response.auditId}`);
      await refreshSavedAudits();
    } catch (error) {
      const raw = error instanceof Error ? error.message : 'Failed to save audit.';
      const lower = raw.toLowerCase();
      if (lower.includes('sign in') || lower.includes('401')) {
        setStatusMessage(`${raw} ${EIAS_API_DISCLAIMER} ${LOCAL_DRAFT_HINT}`);
      } else if (lower.includes('404') || lower.includes('not found')) {
        setStatusMessage(`${raw} ${EIAS_API_DISCLAIMER} ${LOCAL_DRAFT_HINT}`);
      } else {
        setStatusMessage(raw);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadAudit = async (auditId: string) => {
    setStatusMessage('Loading audit...');
    try {
      const response = await getEmissionsAudit(auditId);
      hydrateFromServer(response.audit);
      setVersionHistory(response.versionHistory);
      setViewMode('workspace');
      setStatusMessage(`Loaded audit ${auditId}.`);
      scrollResultsIntoView();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to load audit.');
    }
  };

  const handleDeleteAudit = async () => {
    if (!savedAuditId) return;
    const confirmed = window.confirm('Delete this audit? This will remove it from your active audit list.');
    if (!confirmed) return;
    try {
      await deleteEmissionsAudit(savedAuditId);
      setSavedAuditId(null);
      setAuditVersion(1);
      setVersionHistory([]);
      setStatusMessage('Audit deleted successfully.');
      await refreshSavedAudits();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to delete audit.');
    }
  };

  const handleServerExport = async () => {
    if (!validateAuditWorkspace()) return;
    if (!savedAuditId) {
      const localAudit = audit ?? buildAudit();
      const localPacket = buildEvidencePacketFromParts(localAudit, regulatoryMetadata, fieldReportMetadata);
      setAudit(localAudit);
      downloadJson(`${localAudit.auditId}-evidence-packet.json`, localPacket);
      setLastActionMessage('Exported local evidence packet JSON. Save the audit to export the persisted backend copy.');
      setStatusMessage('Exported local evidence packet JSON.');
      return;
    }
    setIsExporting(true);
    try {
      const response = await exportEmissionsAudit(savedAuditId);
      downloadJson(`${savedAuditId}-evidence-packet.json`, response.export);
      setLastActionMessage('Exported persisted evidence packet JSON from the backend.');
      setStatusMessage(`Exported persisted evidence packet for audit ${savedAuditId}.`);
    } catch (error) {
      setLastActionMessage(error instanceof Error ? error.message : 'Failed to export audit.');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to export audit.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRecalculate = async () => {
    if (!savedAuditId) {
      runAudit();
      setStatusMessage('Audit recalculated locally. Save it to persist the new values.');
      return;
    }
    try {
      const response = await recalculateEmissionsAudit(savedAuditId);
      hydrateFromServer(response.audit);
      setStatusMessage(`Recalculated audit ${savedAuditId} from stored inputs.`);
      await refreshSavedAudits();
      scrollResultsIntoView();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to recalculate audit.');
    }
  };

  const handleSaveLinks = async () => {
    if (!savedAuditId) {
      setStatusMessage('Save the audit before linking it to DPAL modules.');
      return;
    }
    try {
      await linkEmissionsAudit(savedAuditId, {
        linkedReportId: linkFields.linkedReportId || null,
        linkedMissionId: linkFields.linkedMissionId || null,
        linkedProjectId: linkFields.linkedProjectId || null,
        linkedMRVProjectId: linkFields.linkedMRVProjectId || null,
        linkedEvidenceVaultId: linkFields.linkedEvidenceVaultId || null,
      });
      setStatusMessage(`Updated DPAL links for audit ${savedAuditId}.`);
      await refreshSavedAudits();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to save audit links.');
    }
  };

  const metricNeedsData = useMemo(
    () => !hasMinimumAuditData({
      industry: facilityInfo.industry,
      baselineReportedEmissions: reportedData.baselineReportedEmissions,
      currentReportedEmissions: reportedData.currentReportedEmissions,
      baselineMethaneScore: satelliteData.baselineMethaneScore,
      currentMethaneScore: satelliteData.currentMethaneScore,
      baselineNO2Score: satelliteData.baselineNO2Score,
      currentNO2Score: satelliteData.currentNO2Score,
      baselineActivityProxyScore: satelliteData.baselineActivityProxyScore,
      currentActivityProxyScore: satelliteData.currentActivityProxyScore,
      baselineProductionOutput: productionData.baselineProductionOutput,
      currentProductionOutput: productionData.currentProductionOutput,
      co2ContextScore: satelliteData.co2ContextScore,
    }),
    [
      facilityInfo.industry,
      productionData.baselineProductionOutput,
      productionData.currentProductionOutput,
      reportedData.baselineReportedEmissions,
      reportedData.currentReportedEmissions,
      satelliteData.baselineActivityProxyScore,
      satelliteData.baselineMethaneScore,
      satelliteData.baselineNO2Score,
      satelliteData.co2ContextScore,
      satelliteData.currentActivityProxyScore,
      satelliteData.currentMethaneScore,
      satelliteData.currentNO2Score,
    ],
  );

  const auditStatusLabel = audit
    ? audit.adi.riskLevel === 'Needs More Data'
      ? 'Needs More Data'
      : audit.adi.riskLevel.startsWith('High')
        ? 'High Risk'
        : savedAuditId
          ? 'Saved'
          : 'Draft'
    : savedAuditId
      ? 'Saved'
      : 'Draft';

  const formatAuditMetric = (value?: number | null, digits = 1, suffix = ''): string => {
    if (metricNeedsData || value == null || !Number.isFinite(value)) return 'Needs More Data';
    return `${value.toFixed(digits)}${suffix}`;
  };

  const canRunOrSave =
    locationValidation.hasLocation &&
    facilityInfo.companyName.trim().length > 0 &&
    facilityInfo.facilityName.trim().length > 0 &&
    isValidDateRange(baselinePeriod.startDate, baselinePeriod.endDate) &&
    isValidDateRange(currentPeriod.startDate, currentPeriod.endDate);

  const scrollResultsIntoView = () => {
    window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onReturn}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Return
            </button>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-emerald-400">DPAL Emissions Integrity Audit System</p>
              <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">EIAS</h1>
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Emissions-claim verification tied to location, boundary, source metadata, and audit export.
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <span className="font-bold text-amber-200">API note: </span>
          {EIAS_API_DISCLAIMER}{' '}
          <span className="text-amber-200/95">{LOCAL_DRAFT_HINT}</span>
          {lastLocalSaveAt ? (
            <span className="mt-2 block font-mono text-[11px] text-amber-50/90">
              Local draft last saved: {new Date(lastLocalSaveAt).toLocaleString()}
            </span>
          ) : null}
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setViewMode('workspace')}
              className={`rounded-xl px-4 py-3 text-sm font-bold transition ${viewMode === 'workspace' ? 'bg-emerald-600 text-white' : 'border border-slate-700 bg-slate-900 text-slate-300'}`}
            >
              Audit Workspace
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('myAudits');
                void refreshSavedAudits();
              }}
              className={`rounded-xl px-4 py-3 text-sm font-bold transition ${viewMode === 'myAudits' ? 'bg-emerald-600 text-white' : 'border border-slate-700 bg-slate-900 text-slate-300'}`}
            >
              My Emissions Audits
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('myAudits');
                void refreshSavedAudits();
              }}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Load Existing Audit
            </button>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{statusMessage}</span>
              <span className="font-mono text-xs text-slate-400">
                {savedAuditId ? `Audit ID: ${savedAuditId} - v${auditVersion}` : 'Unsaved draft'}
              </span>
            </div>
          </div>
        </div>

        <section className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Location Selected</p>
            <p className={`mt-2 text-lg font-black ${locationValidation.hasLocation ? 'text-emerald-300' : 'text-rose-300'}`}>
              {locationValidation.hasLocation ? 'Yes' : 'No'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Data Quality</p>
            <p className="mt-2 text-lg font-black text-white">{topDataQuality}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Audit Status</p>
            <p className="mt-2 text-lg font-black text-white">{auditStatusLabel}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">State Estimate</p>
            <p className="mt-2 text-lg font-black text-white">{estimatedJurisdiction ?? 'Unavailable'}</p>
          </div>
        </section>

        {viewMode === 'myAudits' ? (
          <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">My Audits</p>
                <h2 className="mt-1 text-xl font-black text-white">Saved emissions integrity audits</h2>
              </div>
              <button
                type="button"
                onClick={() => void refreshSavedAudits()}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-bold text-slate-200"
              >
                Refresh List
              </button>
            </div>

            {isLoadingList ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-6 py-10 text-center text-slate-400">
                Loading saved audits...
              </div>
            ) : savedAudits.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-6 py-10 text-center text-slate-400">
                No saved audits found for the current account.
              </div>
            ) : (
              <div className="grid gap-3">
                {savedAudits.map((item) => (
                  <div key={item.id} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 md:grid-cols-[1.2fr_0.8fr_0.6fr_0.8fr_auto] md:items-center">
                    <div>
                      <p className="text-sm font-black text-white">{item.companyName}</p>
                      <p className="mt-1 text-xs text-slate-400">{item.facilityName} · {item.jurisdiction}</p>
                    </div>
                    <div className="text-sm text-slate-300">
                      <span className="text-slate-500">ADI</span>
                      <p className="font-black text-white">{Math.round(item.adiScore)}</p>
                    </div>
                    <div className={`rounded-xl border px-3 py-2 text-center text-xs font-bold ${riskTone(item.riskLevel)}`}>
                      {item.riskLevel}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(item.updatedAt).toLocaleString()}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleLoadAudit(item.id)}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-500"
                    >
                      Load Audit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Project / Facility Intake</p>
                  <h2 className="mt-1 text-xl font-black text-white">Facility intake and audit scope</h2>
                  <p className="mt-2 text-sm text-slate-400">Define the company, facility, jurisdiction, and comparison periods before running the audit.</p>
                </div>
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelCls}>Company Name</label>
                  <input className={inputCls} value={facilityInfo.companyName} onChange={(event) => updateFacility('companyName', event.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Facility Name</label>
                  <input className={inputCls} value={facilityInfo.facilityName} onChange={(event) => updateFacility('facilityName', event.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Industry</label>
                  <select className={inputCls} value={facilityInfo.industry} onChange={(event) => updateFacility('industry', event.target.value as typeof facilityInfo.industry)}>
                    {INDUSTRY_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Jurisdiction</label>
                  <select className={inputCls} value={facilityInfo.jurisdiction} onChange={(event) => updateFacility('jurisdiction', event.target.value as typeof facilityInfo.jurisdiction)}>
                    {JURISDICTION_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Legal Framework</label>
                  <select className={inputCls} value={facilityInfo.legalFramework} onChange={(event) => updateFacility('legalFramework', event.target.value as typeof facilityInfo.legalFramework)}>
                    {LEGAL_FRAMEWORK_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Baseline Period</p>
                  <select className={`${inputCls} mt-3`} value={baselinePreset} onChange={(event) => setBaselinePreset(event.target.value as AuditPeriod['preset'])}>
                    {BASELINE_PERIOD_PRESETS.map((option) => (
                      <option key={option.preset} value={option.preset}>{option.label}</option>
                    ))}
                  </select>
                  {baselinePreset === 'custom' ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input className={inputCls} type="date" value={baselineCustomStart} onChange={(event) => setBaselineCustomStart(event.target.value)} />
                      <input className={inputCls} type="date" value={baselineCustomEnd} onChange={(event) => setBaselineCustomEnd(event.target.value)} />
                    </div>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Current Period</p>
                  <select className={`${inputCls} mt-3`} value={currentPreset} onChange={(event) => setCurrentPreset(event.target.value as AuditPeriod['preset'])}>
                    {CURRENT_PERIOD_PRESETS.map((option) => (
                      <option key={option.preset} value={option.preset}>{option.label}</option>
                    ))}
                  </select>
                  {currentPreset === 'custom' ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input className={inputCls} type="date" value={currentCustomStart} onChange={(event) => setCurrentCustomStart(event.target.value)} />
                      <input className={inputCls} type="date" value={currentCustomEnd} onChange={(event) => setCurrentCustomEnd(event.target.value)} />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Map Boundary / Satellite Layer Panel</p>
                  <h2 className="mt-1 text-xl font-black text-white">Facility location, boundary, and layer controls</h2>
                  <p className="mt-2 text-sm text-slate-400">Select a marker or draw a polygon boundary. Location is required before the audit can run or save.</p>
                </div>
                <MapPin className="h-5 w-5 text-orange-400" />
              </div>

              <div className="mb-4 grid gap-3 md:grid-cols-2">
                <div>
                  <label className={labelCls}>Select Location By</label>
                  <select className={inputCls} value={locationMethod} onChange={(event) => setLocationMethod(event.target.value as LocationSelectionMethod)}>
                    {LOCATION_METHOD_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className={`rounded-2xl border px-4 py-3 text-sm ${
                  satelliteMetadataBanner.tone === 'emerald'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                    : satelliteMetadataBanner.tone === 'sky'
                      ? 'border-sky-500/30 bg-sky-500/10 text-sky-100'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <span>{satelliteMetadataBanner.text}</span>
                    <button
                      type="button"
                      onClick={() => centerPoint && void loadLiveSatelliteSource(centerPoint)}
                      disabled={!centerPoint || isLoadingSatelliteSource}
                      className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-white/20"
                    >
                      {isLoadingSatelliteSource ? 'Refreshing...' : 'Refresh source'}
                    </button>
                  </div>
                </div>
              </div>

              {locationMethod === 'GPS coordinate input' ? (
                <div className="mb-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>Latitude</label>
                    <input
                      className={inputCls}
                      value={gpsLat}
                      onChange={(event) => setGpsLat(event.target.value)}
                      onBlur={() => {
                        const lat = Number.parseFloat(gpsLat);
                        const lng = Number.parseFloat(gpsLng);
                        if (Number.isFinite(lat) && Number.isFinite(lng)) applyGpsPoint(lat, lng);
                      }}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Longitude</label>
                    <input
                      className={inputCls}
                      value={gpsLng}
                      onChange={(event) => setGpsLng(event.target.value)}
                      onBlur={() => {
                        const lat = Number.parseFloat(gpsLat);
                        const lng = Number.parseFloat(gpsLng);
                        if (Number.isFinite(lat) && Number.isFinite(lng)) applyGpsPoint(lat, lng);
                      }}
                    />
                  </div>
                </div>
              ) : null}

              {locationMethod === 'facility search/manual entry' ? (
                <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <label className={labelCls}>Facility Search / Manual Entry</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                    <input className={`${inputCls} pl-10`} value={facilitySearch} onChange={(event) => setFacilitySearch(event.target.value)} placeholder="Search facility name or jurisdiction" />
                  </div>
                  <div className="mt-3 grid gap-2">
                    {filteredFacilities.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => {
                          updateFacility('facilityName', result.label);
                          updateFacility('industry', result.industry);
                          updateFacility('jurisdiction', result.jurisdiction as typeof facilityInfo.jurisdiction);
                          applyGpsPoint(result.point.lat, result.point.lng);
                        }}
                        className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-left transition hover:border-slate-600"
                      >
                        <div>
                          <p className="text-sm font-bold text-white">{result.label}</p>
                          <p className="mt-1 text-xs text-slate-400">{result.jurisdiction} · {result.industry}</p>
                        </div>
                        <Plus className="h-4 w-4 text-emerald-400" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="overflow-hidden rounded-2xl border border-slate-800">
                  <MapContainer center={centerPoint ? [centerPoint.lat, centerPoint.lng] : [34.25, -106.2]} zoom={6} style={{ height: '400px', width: '100%' }} scrollWheelZoom>
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      attribution="Esri"
                    />
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                      attribution="Esri"
                    />
                    <BoundaryPicker point={centerPoint} polygon={polygon} drawMode={drawingPolygon || locationMethod === 'drawn polygon'} onMapClick={handleMapClick} />
                  </MapContainer>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Boundary Controls</p>
                      <Target className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLocationMethod('drawn polygon');
                          setDrawingPolygon(true);
                        }}
                        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200"
                      >
                        Draw Polygon
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawingPolygon(false)}
                        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300"
                      >
                        Finish Polygon
                      </button>
                      <button
                        type="button"
                        onClick={() => setPolygon([])}
                        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300"
                      >
                        Reset Boundary
                      </button>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">Click the map to place a facility marker or add polygon vertices. No audit runs without a selected point or a boundary.</p>
                    {jurisdictionMismatch ? (
                      <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                        Jurisdiction and selected location may not match. Review before saving.
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Boundary Summary</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">Latitude</p>
                        <p className="mt-1 font-black text-white">{centerPoint ? toFixedNumber(centerPoint.lat, 4) : 'Not set'}</p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">Longitude</p>
                        <p className="mt-1 font-black text-white">{centerPoint ? toFixedNumber(centerPoint.lng, 4) : 'Not set'}</p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">Area Estimate</p>
                        <p className="mt-1 font-black text-white">{toFixedNumber(areaEstimateKm2)} km²</p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">State</p>
                        <p className="mt-1 font-black text-white">{estimatedJurisdiction ?? facilityInfo.jurisdiction}</p>
                      </div>
                      <div className="col-span-2 rounded-xl border border-slate-800 bg-slate-900 p-3">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">Selected Industry</p>
                        <p className="mt-1 font-black text-white">{facilityInfo.industry}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Satellite Layer Toggles</p>
                    <div className="mt-3 grid gap-2">
                      {SATELLITE_LAYER_OPTIONS.map((layer) => {
                        const active = satelliteData.enabledLayers.includes(layer);
                        return (
                          <button
                            key={layer}
                            type="button"
                            onClick={() => toggleLayer(layer)}
                            className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                              active
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                                : 'border-slate-800 bg-slate-900 text-slate-300'
                            }`}
                          >
                            <span>{layer}</span>
                            {active ? <CheckCircle className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Manual + Future API Inputs</p>
                  <h2 className="mt-1 text-xl font-black text-white">Audit inputs and confidence controls</h2>
                  <p className="mt-2 text-sm text-slate-400">Enter reported, observed, production, and confidence values. Live source cards below show what is verified and what still needs review.</p>
                </div>
                <Activity className="h-5 w-5 text-sky-400" />
              </div>

              <div className="grid gap-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Reported Emissions CO2e</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className={labelCls}>Baseline Reported Emissions CO2e</label>
                      <input className={inputCls} type="number" value={reportedData.baselineReportedEmissions} onChange={(event) => updateReported('baselineReportedEmissions', Number(event.target.value))} />
                    </div>
                    <div>
                      <label className={labelCls}>Current Reported Emissions CO2e</label>
                      <input className={inputCls} type="number" value={reportedData.currentReportedEmissions} onChange={(event) => updateReported('currentReportedEmissions', Number(event.target.value))} />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Observed Signal Scores</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className={labelCls}>Baseline methane / plume score</label>
                      <input className={inputCls} type="number" value={satelliteData.baselineMethaneScore} onChange={(event) => updateSatellite('baselineMethaneScore', Number(event.target.value))} />
                    </div>
                    <div>
                      <label className={labelCls}>Current methane / plume score</label>
                      <input className={inputCls} type="number" value={satelliteData.currentMethaneScore} onChange={(event) => updateSatellite('currentMethaneScore', Number(event.target.value))} />
                    </div>
                    <div>
                      <label className={labelCls}>Baseline NO2 / activity score</label>
                      <input className={inputCls} type="number" value={satelliteData.baselineNO2Score} onChange={(event) => updateSatellite('baselineNO2Score', Number(event.target.value))} />
                    </div>
                    <div>
                      <label className={labelCls}>Current NO2 / activity score</label>
                      <input className={inputCls} type="number" value={satelliteData.currentNO2Score} onChange={(event) => updateSatellite('currentNO2Score', Number(event.target.value))} />
                    </div>
                    <div>
                      <label className={labelCls}>Baseline production / activity proxy</label>
                      <input className={inputCls} type="number" value={satelliteData.baselineActivityProxyScore} onChange={(event) => updateSatellite('baselineActivityProxyScore', Number(event.target.value))} />
                    </div>
                    <div>
                      <label className={labelCls}>Current production / activity proxy</label>
                      <input className={inputCls} type="number" value={satelliteData.currentActivityProxyScore} onChange={(event) => updateSatellite('currentActivityProxyScore', Number(event.target.value))} />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Production Output + Confidence</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className={labelCls}>Baseline production output</label>
                      <input className={inputCls} type="number" value={productionData.baselineProductionOutput} onChange={(event) => updateProduction('baselineProductionOutput', Number(event.target.value))} />
                    </div>
                    <div>
                      <label className={labelCls}>Current production output</label>
                      <input className={inputCls} type="number" value={productionData.currentProductionOutput} onChange={(event) => updateProduction('currentProductionOutput', Number(event.target.value))} />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelCls}>Production output unit (drives intensity tCO2e / unit)</label>
                      <input
                        className={inputCls}
                        value={productionData.outputUnit}
                        onChange={(event) => updateProduction('outputUnit', event.target.value)}
                        placeholder="e.g. MMBtu/yr, tonnes clinker, bbl oil equivalent"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Data confidence</label>
                      <input className={inputCls} type="number" min="0" max="100" value={confidenceInputs.dataConfidence} onChange={(event) => updateConfidence('dataConfidence', Number(event.target.value))} />
                    </div>
                    <div>
                      <label className={labelCls}>Weather / QA confidence</label>
                      <input className={inputCls} type="number" min="0" max="100" value={confidenceInputs.weatherQaConfidence} onChange={(event) => updateConfidence('weatherQaConfidence', Number(event.target.value))} />
                    </div>
                    <div>
                      <label className={labelCls}>Satellite data confidence</label>
                      <input className={inputCls} type="number" min="0" max="100" value={confidenceInputs.satelliteDataConfidence} onChange={(event) => updateConfidence('satelliteDataConfidence', Number(event.target.value))} />
                    </div>
                    <div>
                      <label className={labelCls}>Regulatory data confidence</label>
                      <input className={inputCls} type="number" min="0" max="100" value={confidenceInputs.regulatoryDataConfidence} onChange={(event) => updateConfidence('regulatoryDataConfidence', Number(event.target.value))} />
                    </div>
                  </div>
                </div>

                <details className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4" open={false}>
                  <summary className="cursor-pointer text-sm font-black text-white">Source metadata and provenance</summary>
                  <div className="mt-4 grid gap-4">
                    <DatasetMetadataEditor title="Reported data source metadata" metadata={reportedData.metadata} onChange={(metadata) => updateReported('metadata', metadata)} />
                    <DatasetMetadataEditor title="Satellite observation metadata" metadata={satelliteData.metadata} onChange={(metadata) => updateSatellite('metadata', metadata)} />
                    <DatasetMetadataEditor title="Production data metadata" metadata={productionData.metadata} onChange={(metadata) => updateProduction('metadata', metadata)} />
                    <DatasetMetadataEditor title="Regulatory source metadata" metadata={regulatoryMetadata} onChange={setRegulatoryMetadata} />
                    <DatasetMetadataEditor title="DPAL field report metadata" metadata={fieldReportMetadata} onChange={setFieldReportMetadata} />
                  </div>
                </details>
              </div>

              {warning ? (
                <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {warning}
                </div>
              ) : null}

              <div className="sticky top-4 z-10 mt-5 rounded-2xl border border-slate-800 bg-slate-950/95 p-3 backdrop-blur">
                <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={runAudit}
                  disabled={!canRunOrSave}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-emerald-500"
                >
                  <RefreshCw className="h-4 w-4" />
                  Run Audit
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveAudit()}
                  disabled={isSaving || !canRunOrSave}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-bold text-slate-200 transition disabled:cursor-not-allowed disabled:opacity-60 hover:border-slate-500 hover:text-white"
                >
                  <Database className="h-4 w-4" />
                  {savedAuditId ? 'Update Audit' : 'Save Audit'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleRecalculate()}
                  disabled={!canRunOrSave && !savedAuditId}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-bold text-slate-200 transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-slate-500 hover:text-white"
                >
                  <RefreshCw className="h-4 w-4" />
                  Recalculate
                </button>
                <button
                  type="button"
                  disabled={isExporting || (!savedAuditId && !canRunOrSave && !audit)}
                  onClick={() => {
                    void handleServerExport();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-bold text-slate-200 transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-slate-500 hover:text-white"
                >
                  <FileText className="h-4 w-4" />
                  Export Evidence Packet
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteAudit()}
                  disabled={!savedAuditId}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-3 text-sm font-bold text-rose-200 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-rose-500/20"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Delete Audit
                </button>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-slate-500 hover:text-white"
                >
                  <Info className="h-4 w-4" />
                  Reset Form
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Backend persistence is enabled for create, update, delete, recalculate, and export when the API supports it. The workspace also auto-saves in this browser (see API note above). Reset Form clears the local draft and defaults the page.
              </p>
              {!canRunOrSave ? (
                <p className="mt-2 text-xs text-amber-300">
                  Run and save stay disabled until location, company/facility names, and valid audit periods are in place.
                </p>
              ) : null}
            </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Legal / Regulatory Context</p>
                  <h2 className="mt-1 text-xl font-black text-white">{facilityInfo.jurisdiction} review framing</h2>
                </div>
                <Scale className="h-5 w-5 text-amber-400" />
              </div>
              <div className="space-y-2 text-sm text-slate-300">
                {legalContext.map((line) => (
                  <div key={line} className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                    {line}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                {LEGAL_DISCLAIMER}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6">
          <section ref={resultsRef} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Results Dashboard</p>
                <h2 className="mt-1 text-xl font-black text-white">Discrepancy scoring and interpretation</h2>
              </div>
              <Eye className="h-5 w-5 text-sky-400" />
            </div>

            {audit ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Reported reduction %</p>
                    <p className="mt-2 text-3xl font-black text-white">{formatAuditMetric(audit.calculationResults.reportedReductionPct, 1, '%')}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Observed reduction %</p>
                    <p className="mt-2 text-3xl font-black text-white">{formatAuditMetric(audit.calculationResults.observedReductionPct, 1, '%')}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Discrepancy gap</p>
                    <p className="mt-2 text-3xl font-black text-white">{formatAuditMetric(audit.calculationResults.discrepancyGap, 1, ' pts')}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">ADI score</p>
                    <p className="mt-2 text-3xl font-black text-white">{metricNeedsData ? 'Needs More Data' : audit.adi.score}</p>
                  </div>
                  <div className={`rounded-2xl border p-4 ${riskTone(audit.adi.riskLevel)}`}>
                    <p className="text-[10px] uppercase tracking-wide">Risk level</p>
                    <p className="mt-2 text-lg font-black">{audit.adi.riskLevel}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Intensity Comparison</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">Baseline intensity</p>
                        <p className="mt-1 font-black text-white">{formatAuditMetric(audit.calculationResults.baselineIntensity, 4)}</p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">Current intensity</p>
                        <p className="mt-1 font-black text-white">{formatAuditMetric(audit.calculationResults.currentIntensity, 4)}</p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">Intensity reduction %</p>
                        <p className="mt-1 font-black text-white">{formatAuditMetric(audit.calculationResults.intensityReductionPct, 1, '%')}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-slate-300">
                      {[
                        ['Methane change', formatAuditMetric(audit.calculationResults.methaneChangePct, 1, '%')],
                        ['NO2 activity change', formatAuditMetric(audit.calculationResults.no2ChangePct, 1, '%')],
                        ['Activity proxy change', formatAuditMetric(audit.calculationResults.activityProxyChangePct, 1, '%')],
                        ['Confidence score', metricNeedsData ? 'Needs More Data' : `${audit.adi.confidenceScore}/100`],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                          <span>{label}</span>
                          <span className="font-black text-white">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Plain-English Interpretation</p>
                    <p className="mt-4 text-base leading-7 text-slate-200">
                      {metricNeedsData
                        ? 'Needs More Data. Add reported emissions, observed signal baselines, and production output before relying on the discrepancy interpretation.'
                        : audit.calculationResults.interpretation}
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {Object.entries(audit.adi.weights).map(([key, value]) => (
                        <div key={key} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                          <p className="text-[10px] uppercase tracking-wide text-slate-500">{key} weight</p>
                          <p className="mt-1 text-lg font-black text-white">{Math.round(value * 100)}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-6 py-10 text-center text-slate-400">
                Run the audit after selecting a facility location or polygon to generate EIAS results.
              </div>
            )}
          </section>

          {versionHistory.length > 0 ? (
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Audit Trail</p>
                  <h2 className="mt-1 text-xl font-black text-white">Version history</h2>
                </div>
                <Database className="h-5 w-5 text-cyan-400" />
              </div>
              <div className="space-y-2">
                {versionHistory.map((entry) => (
                  <div key={`${entry.version}-${entry.createdAt}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
                    <span className="font-black text-white">v{entry.version}</span>
                    <span>{entry.changeSummary ?? 'Audit update'}</span>
                    <span className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Evidence Packet Export</p>
                  <h2 className="mt-1 text-xl font-black text-white">Export-ready audit object</h2>
                </div>
                <FileText className="h-5 w-5 text-emerald-400" />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={isExporting || (!savedAuditId && !canRunOrSave && !audit)}
                  onClick={() => {
                    void handleServerExport();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-emerald-500"
                >
                  <Database className="h-4 w-4" />
                  Export Evidence Packet
                </button>
                <button
                  type="button"
                  onClick={() => setLastActionMessage('Export PDF placeholder clicked. PDF rendering is not connected yet.')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-slate-500 hover:text-white"
                >
                  <Printer className="h-4 w-4" />
                  Export PDF placeholder
                </button>
                <button
                  type="button"
                  onClick={() => setLastActionMessage('Save to DPAL Ledger placeholder clicked. Ledger integration is not connected yet.')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-slate-500 hover:text-white"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Save to DPAL Ledger placeholder
                </button>
                <button
                  type="button"
                  onClick={() => setLastActionMessage('Create Investigation Case placeholder clicked. Case creation hook is not connected yet.')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-slate-500 hover:text-white"
                >
                  <Search className="h-4 w-4" />
                  Create Investigation Case placeholder
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
                {lastActionMessage}
              </div>

              <pre className="mt-4 max-h-[520px] overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-300">
                {JSON.stringify(evidencePacket ?? { status: 'Run the audit to preview the evidence packet.' }, null, 2)}
              </pre>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Defensibility</p>
                    <h2 className="mt-1 text-xl font-black text-white">Limitations and evidentiary guardrails</h2>
                  </div>
                  <Info className="h-5 w-5 text-amber-400" />
                </div>
                <div className="space-y-2 text-sm text-slate-300">
                  {limitations.map((line) => (
                    <div key={line} className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Integration Hooks</p>
                    <h2 className="mt-1 text-xl font-black text-white">DPAL follow-on workflow placeholders</h2>
                  </div>
                  <Globe className="h-5 w-5 text-cyan-400" />
                </div>
                <div className="space-y-2 text-sm text-slate-300">
                  {integrationHooks.map((line) => (
                    <div key={line} className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                      {line}
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-3">
                  <input className={inputCls} placeholder="Linked Report ID" value={linkFields.linkedReportId} onChange={(event) => setLinkFields((current) => ({ ...current, linkedReportId: event.target.value }))} />
                  <input className={inputCls} placeholder="Linked Mission ID" value={linkFields.linkedMissionId} onChange={(event) => setLinkFields((current) => ({ ...current, linkedMissionId: event.target.value }))} />
                  <input className={inputCls} placeholder="Linked Project ID" value={linkFields.linkedProjectId} onChange={(event) => setLinkFields((current) => ({ ...current, linkedProjectId: event.target.value }))} />
                  <input className={inputCls} placeholder="Linked MRV Project ID" value={linkFields.linkedMRVProjectId} onChange={(event) => setLinkFields((current) => ({ ...current, linkedMRVProjectId: event.target.value }))} />
                  <input className={inputCls} placeholder="Linked Evidence Vault ID" value={linkFields.linkedEvidenceVaultId} onChange={(event) => setLinkFields((current) => ({ ...current, linkedEvidenceVaultId: event.target.value }))} />
                  <button
                    type="button"
                    onClick={() => void handleSaveLinks()}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-slate-500 hover:text-white"
                  >
                    Save DPAL Links
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>{LEGAL_DISCLAIMER}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default EmissionsIntegrityAuditPage;
