import type {
  AuditConfidenceInputs,
  AuditPeriod,
  CoordinatePoint,
  DataSourceMetadata,
  EmissionsAudit,
  FacilityInfo,
  LocationSelectionMethod,
  ProductionData,
  ReportedEmissionsData,
  SatelliteObservationData,
} from '../types/emissionsIntegrity.types';
import {
  createDefaultMetadata,
  defaultBaselinePeriod,
  defaultConfidenceInputs,
  defaultCurrentPeriod,
  defaultFacilityInfo,
  defaultProductionData,
  defaultReportedData,
  defaultSatelliteData,
} from './mockEmissionsData';

export const EIAS_WORKSPACE_STORAGE_KEY = 'dpal_eias_workspace_v1';
const SNAPSHOT_VERSION = 1 as const;

export type EiasLinkFields = {
  linkedReportId: string;
  linkedMissionId: string;
  linkedProjectId: string;
  linkedMRVProjectId: string;
  linkedEvidenceVaultId: string;
};

/** Serializable workspace slice for offline / API-miss recovery. */
export type EiasWorkspaceSnapshot = {
  v: typeof SNAPSHOT_VERSION;
  savedAt: string;
  facilityInfo: FacilityInfo;
  locationMethod: LocationSelectionMethod;
  gpsLat: string;
  gpsLng: string;
  mapPoint: CoordinatePoint | null;
  polygon: CoordinatePoint[];
  drawingPolygon: boolean;
  baselinePreset: AuditPeriod['preset'];
  currentPreset: AuditPeriod['preset'];
  baselineCustomStart: string;
  baselineCustomEnd: string;
  currentCustomStart: string;
  currentCustomEnd: string;
  reportedData: ReportedEmissionsData;
  satelliteData: SatelliteObservationData;
  productionData: ProductionData;
  confidenceInputs: AuditConfidenceInputs;
  regulatoryMetadata: DataSourceMetadata;
  fieldReportMetadata: DataSourceMetadata;
  facilitySearch: string;
  linkFields: EiasLinkFields;
  savedAuditId: string | null;
  auditVersion: number;
  audit: EmissionsAudit | null;
};

export type EiasWorkspaceInitial = {
  restoredFromLocal: boolean;
  restoredSavedAt: string | null;
} & Omit<EiasWorkspaceSnapshot, 'v' | 'savedAt'>;

const defaultLinkFields: EiasLinkFields = {
  linkedReportId: '',
  linkedMissionId: '',
  linkedProjectId: '',
  linkedMRVProjectId: '',
  linkedEvidenceVaultId: '',
};

function normalizeProductionData(raw: unknown): ProductionData {
  const base = defaultProductionData;
  if (!raw || typeof raw !== 'object') return base;
  const p = raw as Record<string, unknown>;
  const meta =
    p.metadata && typeof p.metadata === 'object'
      ? ({ ...base.metadata, ...p.metadata } as ProductionData['metadata'])
      : base.metadata;
  return {
    baselineProductionOutput: typeof p.baselineProductionOutput === 'number' ? p.baselineProductionOutput : base.baselineProductionOutput,
    currentProductionOutput: typeof p.currentProductionOutput === 'number' ? p.currentProductionOutput : base.currentProductionOutput,
    outputUnit: typeof p.outputUnit === 'string' && p.outputUnit.trim() ? p.outputUnit : base.outputUnit,
    metadata: meta,
  };
}

function parseSnapshot(raw: unknown): EiasWorkspaceSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== SNAPSHOT_VERSION) return null;
  if (typeof o.facilityInfo !== 'object' || !o.facilityInfo) return null;

  return {
    v: SNAPSHOT_VERSION,
    savedAt: typeof o.savedAt === 'string' ? o.savedAt : new Date().toISOString(),
    facilityInfo: { ...defaultFacilityInfo, ...(o.facilityInfo as FacilityInfo) },
    locationMethod: (o.locationMethod as LocationSelectionMethod) || 'GPS coordinate input',
    gpsLat: typeof o.gpsLat === 'string' ? o.gpsLat : '32.312',
    gpsLng: typeof o.gpsLng === 'string' ? o.gpsLng : '-104.234',
    mapPoint: o.mapPoint && typeof o.mapPoint === 'object' ? (o.mapPoint as CoordinatePoint) : { lat: 32.312, lng: -104.234 },
    polygon: Array.isArray(o.polygon) ? (o.polygon as CoordinatePoint[]) : [],
    drawingPolygon: Boolean(o.drawingPolygon),
    baselinePreset: (o.baselinePreset as AuditPeriod['preset']) || defaultBaselinePeriod.preset,
    currentPreset: (o.currentPreset as AuditPeriod['preset']) || defaultCurrentPeriod.preset,
    baselineCustomStart: typeof o.baselineCustomStart === 'string' ? o.baselineCustomStart : defaultBaselinePeriod.startDate,
    baselineCustomEnd: typeof o.baselineCustomEnd === 'string' ? o.baselineCustomEnd : defaultBaselinePeriod.endDate,
    currentCustomStart: typeof o.currentCustomStart === 'string' ? o.currentCustomStart : defaultCurrentPeriod.startDate,
    currentCustomEnd: typeof o.currentCustomEnd === 'string' ? o.currentCustomEnd : defaultCurrentPeriod.endDate,
    reportedData: o.reportedData && typeof o.reportedData === 'object' ? { ...defaultReportedData, ...o.reportedData } : defaultReportedData,
    satelliteData: o.satelliteData && typeof o.satelliteData === 'object' ? { ...defaultSatelliteData, ...o.satelliteData } as SatelliteObservationData : defaultSatelliteData,
    productionData: normalizeProductionData(o.productionData),
    confidenceInputs: o.confidenceInputs && typeof o.confidenceInputs === 'object' ? { ...defaultConfidenceInputs, ...o.confidenceInputs } : defaultConfidenceInputs,
    regulatoryMetadata:
      o.regulatoryMetadata && typeof o.regulatoryMetadata === 'object'
        ? { ...createDefaultMetadata('CARB MRR / EPA GHGRP placeholder'), ...(o.regulatoryMetadata as object) } as DataSourceMetadata
        : createDefaultMetadata('CARB MRR / EPA GHGRP placeholder'),
    fieldReportMetadata:
      o.fieldReportMetadata && typeof o.fieldReportMetadata === 'object'
        ? { ...createDefaultMetadata('DPAL field reports placeholder'), ...(o.fieldReportMetadata as object) } as DataSourceMetadata
        : createDefaultMetadata('DPAL field reports placeholder'),
    facilitySearch: typeof o.facilitySearch === 'string' ? o.facilitySearch : '',
    linkFields: o.linkFields && typeof o.linkFields === 'object' ? { ...defaultLinkFields, ...o.linkFields } : { ...defaultLinkFields },
    savedAuditId: typeof o.savedAuditId === 'string' ? o.savedAuditId : null,
    auditVersion: typeof o.auditVersion === 'number' && Number.isFinite(o.auditVersion) ? o.auditVersion : 1,
    audit: o.audit && typeof o.audit === 'object' ? (o.audit as EmissionsAudit) : null,
  };
}

export function loadEiasWorkspaceSnapshot(): EiasWorkspaceSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(EIAS_WORKSPACE_STORAGE_KEY);
    if (!raw) return null;
    return parseSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function getEiasWorkspaceInitialState(): EiasWorkspaceInitial {
  const snap = loadEiasWorkspaceSnapshot();
  if (!snap) {
    return {
      restoredFromLocal: false,
      restoredSavedAt: null,
      facilityInfo: defaultFacilityInfo,
      locationMethod: 'GPS coordinate input',
      gpsLat: '32.312',
      gpsLng: '-104.234',
      mapPoint: { lat: 32.312, lng: -104.234 },
      polygon: [],
      drawingPolygon: false,
      baselinePreset: defaultBaselinePeriod.preset,
      currentPreset: defaultCurrentPeriod.preset,
      baselineCustomStart: defaultBaselinePeriod.startDate,
      baselineCustomEnd: defaultBaselinePeriod.endDate,
      currentCustomStart: defaultCurrentPeriod.startDate,
      currentCustomEnd: defaultCurrentPeriod.endDate,
      reportedData: defaultReportedData,
      satelliteData: defaultSatelliteData,
      productionData: defaultProductionData,
      confidenceInputs: defaultConfidenceInputs,
      regulatoryMetadata: createDefaultMetadata('CARB MRR / EPA GHGRP placeholder'),
      fieldReportMetadata: createDefaultMetadata('DPAL field reports placeholder'),
      facilitySearch: '',
      linkFields: { ...defaultLinkFields },
      savedAuditId: null,
      auditVersion: 1,
      audit: null,
    };
  }

  const { v: _v, savedAt, ...rest } = snap;
  return {
    restoredFromLocal: true,
    restoredSavedAt: savedAt,
    ...rest,
  };
}

export function saveEiasWorkspaceSnapshot(snapshot: Omit<EiasWorkspaceSnapshot, 'v'> & { v?: typeof SNAPSHOT_VERSION }): void {
  if (typeof window === 'undefined') return;
  try {
    const full: EiasWorkspaceSnapshot = {
      v: SNAPSHOT_VERSION,
      savedAt: snapshot.savedAt,
      facilityInfo: snapshot.facilityInfo,
      locationMethod: snapshot.locationMethod,
      gpsLat: snapshot.gpsLat,
      gpsLng: snapshot.gpsLng,
      mapPoint: snapshot.mapPoint,
      polygon: snapshot.polygon,
      drawingPolygon: snapshot.drawingPolygon,
      baselinePreset: snapshot.baselinePreset,
      currentPreset: snapshot.currentPreset,
      baselineCustomStart: snapshot.baselineCustomStart,
      baselineCustomEnd: snapshot.baselineCustomEnd,
      currentCustomStart: snapshot.currentCustomStart,
      currentCustomEnd: snapshot.currentCustomEnd,
      reportedData: snapshot.reportedData,
      satelliteData: snapshot.satelliteData,
      productionData: snapshot.productionData,
      confidenceInputs: snapshot.confidenceInputs,
      regulatoryMetadata: snapshot.regulatoryMetadata,
      fieldReportMetadata: snapshot.fieldReportMetadata,
      facilitySearch: snapshot.facilitySearch,
      linkFields: snapshot.linkFields,
      savedAuditId: snapshot.savedAuditId,
      auditVersion: snapshot.auditVersion,
      audit: snapshot.audit,
    };
    window.localStorage.setItem(EIAS_WORKSPACE_STORAGE_KEY, JSON.stringify(full));
  } catch {
    /* quota or private mode */
  }
}

export function clearEiasWorkspaceLocal(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(EIAS_WORKSPACE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
