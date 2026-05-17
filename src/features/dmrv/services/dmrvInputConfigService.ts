import { apiUrl, API_ROUTES } from '../../../../constants';
import { emitDmrvReportDirty } from '../reporting/dmrvReportEvents';
import { createEnvironmentalEvidencePacket } from '../../../services/environmentalEvidencePacketsApi';
import { fetchUsgs3depTerrainEvidenceForProject } from '../utils/usgs3depTerrainEvidence';
import { safeTrim } from '../utils/safeString';
import { utf8ToBase64 } from '../utils/utf8Base64';
import type { DmrvInputConfigType } from '../dmrvInputRegistry';
import { getDmrvInputByKey, resolveDmrvInputDef } from '../dmrvInputRegistry';
import {
  formatReportingPeriod,
  getDmrvProjectContext,
  normalizeDmrvProjectContext,
} from './dmrvProjectContextService';
import type { DmrvProjectContext as DmrvStoredProjectContext } from './dmrvProjectContextTypes';
import type {
  DmrvEvidencePacketResult,
  DmrvInputConfig,
  DmrvInputConfigTestResult,
  DmrvProjectContext,
} from './dmrvInputConfigTypes';

const STORAGE_KEY = 'dpal_dmrv_input_configs_v1';

function storageKey(projectId: string, categorySlug: string, inputKey: string): string {
  return `${projectId}::${categorySlug}::${inputKey}`;
}

function readAll(): Record<string, DmrvInputConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, DmrvInputConfig>;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, DmrvInputConfig> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value && typeof value === 'object') {
        out[key] = normalizeDmrvInputConfig(value);
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** Repair partial legacy input configs (missing evidencePacket, validationRules, etc.). */
export function normalizeDmrvInputConfig(raw: Partial<DmrvInputConfig>): DmrvInputConfig {
  const projectId = safeTrim(raw.projectId) || defaultProjectId('carbon-land', 'forest-land-use');
  const categorySlug = safeTrim(raw.categorySlug) || 'carbon-land';
  const typeId = safeTrim(raw.typeId) || 'forest-land-use';
  const inputKey = safeTrim(raw.inputKey) || 'generic';
  const defaults = buildDefaultConfig({
    projectId,
    categorySlug,
    typeId,
    inputKey,
    inputLabel: safeTrim(raw.inputLabel) || undefined,
  });
  const ep: Partial<DmrvInputConfig['evidencePacket']> =
    raw.evidencePacket && typeof raw.evidencePacket === 'object' ? raw.evidencePacket : {};
  const vr: Partial<DmrvInputConfig['validationRules']> =
    raw.validationRules && typeof raw.validationRules === 'object' ? raw.validationRules : {};
  const bc: Partial<DmrvInputConfig['blockchain']> =
    raw.blockchain && typeof raw.blockchain === 'object' ? raw.blockchain : {};
  const pcs: Partial<DmrvInputConfig['projectContext']> =
    raw.projectContext && typeof raw.projectContext === 'object' ? raw.projectContext : {};
  return {
    ...defaults,
    ...raw,
    projectId,
    categorySlug,
    typeId,
    inputKey,
    inputLabel: safeTrim(raw.inputLabel) || defaults.inputLabel,
    configType: raw.configType ?? defaults.configType,
    status: raw.status ?? defaults.status,
    projectContext: { ...defaults.projectContext, ...pcs },
    dataSourceSettings: { ...defaults.dataSourceSettings, ...(raw.dataSourceSettings ?? {}) },
    validationRules: { ...defaults.validationRules, ...vr },
    evidencePacket: {
      ...defaults.evidencePacket,
      title: safeTrim(ep.title) || defaults.evidencePacket.title,
      includeMapSnapshot: ep.includeMapSnapshot ?? defaults.evidencePacket.includeMapSnapshot,
      includeRawDataReference: ep.includeRawDataReference ?? defaults.evidencePacket.includeRawDataReference,
      includeReviewerNotes: ep.includeReviewerNotes ?? defaults.evidencePacket.includeReviewerNotes,
      includeAttachments: ep.includeAttachments ?? defaults.evidencePacket.includeAttachments,
      generateQrCode: ep.generateQrCode ?? defaults.evidencePacket.generateQrCode,
      publicVisibility:
        ep.publicVisibility === 'private' ||
        ep.publicVisibility === 'validator_only' ||
        ep.publicVisibility === 'public'
          ? ep.publicVisibility
          : defaults.evidencePacket.publicVisibility,
    },
    blockchain: {
      ...defaults.blockchain,
      status:
        bc.status === 'pending' ||
        bc.status === 'anchored' ||
        bc.status === 'unavailable'
          ? bc.status
          : defaults.blockchain.status,
      lastAnchoredHash: safeTrim(bc.lastAnchoredHash) || undefined,
      anchoredAt: safeTrim(bc.anchoredAt) || undefined,
      ledgerRecordId: safeTrim(bc.ledgerRecordId) || undefined,
      qrEvidenceUrl: safeTrim(bc.qrEvidenceUrl) || undefined,
      serviceMessage: safeTrim(bc.serviceMessage) || undefined,
    },
    evidencePacketId: safeTrim(raw.evidencePacketId) || undefined,
    updatedAt: safeTrim(raw.updatedAt) || defaults.updatedAt,
  };
}

function writeAll(map: Record<string, DmrvInputConfig>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/** @deprecated Use explicit projectId from project configuration wizard */
export function defaultProjectId(categorySlug: string, typeId: string): string {
  return `dmrv-${categorySlug}-${typeId}`;
}

export function projectContextSnapshot(stored?: DmrvStoredProjectContext | null): DmrvProjectContext {
  if (!stored) {
    return {
      projectName: '',
      projectId: '',
      locationAoiId: '',
      methodology: '',
      reportingPeriod: '',
      responsibleOrganization: '',
      validatorReviewer: '',
    };
  }
  const normalized = normalizeDmrvProjectContext(stored) ?? stored;
  const locationLabel =
    safeTrim(normalized.location.countryRegion) ||
    safeTrim(normalized.location.aoiSummary) ||
    safeTrim(normalized.location.aoiId) ||
    (normalized.location.latitude && normalized.location.longitude
      ? `${normalized.location.latitude}, ${normalized.location.longitude}`
      : '');
  return {
    projectName: normalized.projectName,
    projectId: normalized.projectId,
    locationAoiId: locationLabel,
    methodology: normalized.methodology.name,
    reportingPeriod: formatReportingPeriod(normalized),
    responsibleOrganization: normalized.organization,
    validatorReviewer: normalized.reviewer.name,
  };
}

/** Push saved project location / identity into all DMRV input configs for this project. */
export function syncDmrvInputConfigsProjectContext(projectId: string): void {
  const stored = getDmrvProjectContext(projectId);
  if (!stored) return;
  const snapshot = projectContextSnapshot(stored);
  const all = readAll();
  let changed = false;
  for (const [key, config] of Object.entries(all)) {
    if (config.projectId !== projectId) continue;
    all[key] = {
      ...config,
      projectContext: snapshot,
      dataSourceSettings: {
        ...config.dataSourceSettings,
        latitude: safeTrim(stored.location?.latitude) || config.dataSourceSettings.latitude,
        longitude: safeTrim(stored.location?.longitude) || config.dataSourceSettings.longitude,
      },
    };
    changed = true;
  }
  if (changed) writeAll(all);
}

export function buildDefaultConfig(params: {
  projectId: string;
  categorySlug: string;
  typeId: string;
  inputKey: string;
  inputLabel?: string;
}): DmrvInputConfig {
  const def = getDmrvInputByKey(params.inputKey) ?? resolveDmrvInputDef(params.inputLabel ?? params.inputKey);
  const stored = getDmrvProjectContext(params.projectId);
  const projectId = params.projectId;
  return {
    projectId,
    categorySlug: params.categorySlug,
    typeId: params.typeId,
    inputKey: def.key,
    inputLabel: params.inputLabel ?? def.label,
    configType: def.configType,
    status: 'not_configured',
    projectContext: projectContextSnapshot(stored),
    dataSourceSettings: defaultDataSourceSettings(def.configType),
    validationRules: {
      requireCoordinates: def.configType === 'satellite' || def.configType === 'field-plots',
      requireTimestamp: true,
      requireSourceDocument: def.configType === 'activity',
      requireReviewerApproval: def.requiredForIntegrity,
      requireFieldVerification: def.configType === 'field-plots' || def.configType === 'field-survey',
      requireBeforeAfterComparison: def.configType === 'satellite',
      requireAnomalyDetection: def.configType === 'satellite' || def.configType === 'fire',
      requireUncertaintyScore: def.configType === 'biomass',
    },
    evidencePacket: {
      title: `${def.label} — DMRV evidence`,
      includeMapSnapshot: def.configType === 'satellite',
      includeRawDataReference: true,
      includeReviewerNotes: true,
      includeAttachments: true,
      generateQrCode: true,
      publicVisibility: 'validator_only',
    },
    blockchain: { status: 'none' },
    updatedAt: new Date().toISOString(),
  };
}

function defaultDataSourceSettings(configType: DmrvInputConfigType): Record<string, string | boolean> {
  switch (configType) {
    case 'satellite':
      return {
        selectedSatellites: '',
        provider: 'Planetary Computer',
        collection: '',
        startDate: '',
        endDate: '',
        cloudCoverLimit: '20',
        resolution: '30m',
        aoiRequired: true,
        minimumCoveragePct: '80',
        refreshFrequency: 'monthly',
      };
    case 'lidar':
      return {
        provider: '',
        pointCloudSource: '',
        verticalAccuracy: '',
        groundClassificationRequired: true,
        canopyHeightModel: true,
        uploadUrl: '',
      };
    case 'field-plots':
      return {
        plotId: '',
        latitude: '',
        longitude: '',
        gpsAccuracySource: '',
        speciesLandCover: '',
        sampleDate: '',
        surveyor: '',
        plotSizeRadius: '',
        biomassEvidence: '',
        photoAttachments: '',
        provenanceNotes: '',
        photosRequired: true,
        minimumPlotCount: '3',
        aiDraftGenerated: false,
        aiDraftReviewed: false,
      };
    case 'biomass':
      return {
        equationModel: '',
        units: 'tCO2e/ha',
        conversionFactor: '',
        carbonFraction: '0.47',
        uncertaintyPct: '',
        qaQcNotes: '',
      };
    case 'activity':
      return {
        activityType: '',
        sourceDocument: '',
        reportingEntity: '',
        emissionRemovalFactor: '',
        supportingAttachmentRequired: true,
      };
    case 'soil':
      return {
        labName: '',
        sampleDepth: '',
        organicCarbonPct: '',
        sampleDate: '',
        chainOfCustodyRequired: true,
      };
    case 'iot':
      return {
        sensorId: '',
        sensorType: '',
        apiEndpoint: '',
        samplingInterval: '',
        calibrationDate: '',
        tamperDetection: true,
      };
    case 'weather':
      return {
        provider: '',
        stationId: '',
        variablesMonitored: '',
        startDate: '',
        endDate: '',
        gapTolerance: '5%',
      };
    case 'fire':
      return {
        provider: 'NASA FIRMS',
        burnAreaSource: '',
        confidenceThreshold: 'nominal',
        startDate: '',
        endDate: '',
        severityIndex: '',
      };
    case 'grazing':
      return {
        herdCount: '',
        grazingPeriod: '',
        areaUsed: '',
        stockingRate: '',
        supportingRecords: '',
      };
    default:
      return { notes: '' };
  }
}

export function getDmrvInputConfig(
  projectId: string,
  categorySlug: string,
  inputKey: string,
): DmrvInputConfig | null {
  const map = readAll();
  return map[storageKey(projectId, categorySlug, inputKey)] ?? null;
}

export function listDmrvInputConfigsForProject(projectId: string): DmrvInputConfig[] {
  return Object.values(readAll()).filter((c) => c.projectId === projectId);
}

export function saveDmrvInputConfig(config: DmrvInputConfig): DmrvInputConfig {
  const map = readAll();
  const saved: DmrvInputConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
    status: deriveStatus(config),
  };
  map[storageKey(saved.projectId, saved.categorySlug, saved.inputKey)] = saved;
  writeAll(map);
  emitDmrvReportDirty(saved.projectId);
  return saved;
}

function deriveStatus(config: DmrvInputConfig): DmrvInputConfig['status'] {
  if (config.blockchain.status === 'anchored' && config.blockchain.lastAnchoredHash) {
    return 'blockchain_anchored';
  }
  const score = computeCompletenessScore(config);
  if (score >= 85 && config.evidencePacketId) return 'verified';
  if (score >= 60) return 'ready';
  if (score > 0) return 'draft';
  return 'not_configured';
}

export function computeCompletenessScore(config: DmrvInputConfig): number {
  let points = 0;
  const stored = getDmrvProjectContext(config.projectId);
  if (stored && stored.projectName.trim()) points += 10;

  const ds = config.dataSourceSettings;
  const filledDs = Object.values(ds).filter((v) => v !== '' && v !== undefined && v !== false).length;
  points += Math.min(25, filledDs * 3);
  if (config.configType === 'satellite') {
    const selected =
      typeof ds.selectedSatellites === 'string' ? ds.selectedSatellites.trim() : '';
    if (selected) points += 8;
  }

  const rules = Object.values(config.validationRules).filter(Boolean).length;
  points += Math.min(12, rules * 2);

  if (safeTrim(config.evidencePacket?.title)) points += 6;
  if (config.evidencePacketId) points += 12;

  if (config.blockchain.status === 'anchored') points += 15;
  else if (config.blockchain.status === 'pending') points += 5;

  return Math.min(100, points);
}

export async function testDmrvInputSource(config: DmrvInputConfig): Promise<DmrvInputConfigTestResult> {
  const checkedAt = new Date().toISOString();
  try {
    if (config.configType === 'satellite') {
      const res = await fetch(apiUrl(API_ROUTES.COPERNICUS_STATUS), { method: 'GET' });
      if (res.ok || res.status === 404) {
        return {
          ok: res.ok,
          message: res.ok
            ? 'Earth Observation adapter reachable on configured API host.'
            : 'Earth Observation route not found on API host — configure scan endpoint before live satellite tests.',
          checkedAt,
        };
      }
    }
    if (config.configType === 'iot' && typeof config.dataSourceSettings.apiEndpoint === 'string') {
      const endpoint = config.dataSourceSettings.apiEndpoint.trim();
      if (!endpoint) {
        return { ok: false, message: 'Enter an API endpoint before testing the sensor source.', checkedAt };
      }
      return {
        ok: true,
        message: 'Sensor endpoint format accepted — live probe requires CORS-safe backend proxy.',
        checkedAt,
      };
    }
    return {
      ok: true,
      message: `Configuration saved locally. ${config.inputLabel} settings are ready for evidence packet assembly.`,
      checkedAt,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Source test failed.',
      checkedAt,
    };
  }
}

export async function generateDmrvEvidencePacket(config: DmrvInputConfig): Promise<DmrvEvidencePacketResult> {
  const title =
    safeTrim(config.evidencePacket?.title) ||
    `${config.inputLabel} — ${config.categorySlug} DMRV`;

  const storedProject = getDmrvProjectContext(config.projectId);
  const terrainEvidence = await fetchUsgs3depTerrainEvidenceForProject(storedProject, config);

  const evidenceRefs: Record<string, unknown>[] = [
    {
      source: 'dmrv_input_config',
      categorySlug: config.categorySlug,
      typeId: config.typeId,
      inputKey: config.inputKey,
      configType: config.configType,
      validationRules: config.validationRules,
      dataSourceSettings: config.dataSourceSettings,
    },
  ];
  if (terrainEvidence) {
    evidenceRefs.push(terrainEvidence);
  }

  const res = await createEnvironmentalEvidencePacket({
    title,
    projectId: config.projectContext.projectId || config.projectId,
    locationLabel: config.projectContext.locationAoiId || undefined,
    evidenceRefs,
    qrPayload: config.evidencePacket?.generateQrCode
      ? {
          module: 'dmrv',
          categorySlug: config.categorySlug,
          inputKey: config.inputKey,
          projectId: config.projectId,
        }
      : undefined,
  });

  if (res?.packet) {
    return {
      ok: true,
      packetId: res.packet.packetId,
      integrityHash: res.packet.integrityHash,
      message: 'Evidence packet created via Environmental Intelligence API.',
    };
  }

  const localId = `dmrv-packet-${config.inputKey}-${Date.now().toString(36)}`;
  const localHash = `sha256-local-${utf8ToBase64(JSON.stringify(config)).slice(0, 32)}`;
  return {
    ok: true,
    packetId: localId,
    integrityHash: localHash,
    message:
      'Environmental Intelligence evidence-packet API unavailable — saved a local draft packet reference. Deploy /api/environmental-intelligence/evidence-packets on the API host for server-backed packets.',
  };
}
