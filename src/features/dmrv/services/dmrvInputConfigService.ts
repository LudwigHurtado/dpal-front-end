import { apiUrl, API_ROUTES } from '../../../../constants';
import { createEnvironmentalEvidencePacket } from '../../../services/environmentalEvidencePacketsApi';
import type { DmrvInputConfigType } from '../dmrvInputRegistry';
import { getDmrvInputByKey, resolveDmrvInputDef } from '../dmrvInputRegistry';
import { formatReportingPeriod, getDmrvProjectContext } from './dmrvProjectContextService';
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
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
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
  const locationLabel =
    stored.location.aoiId.trim() ||
    (stored.location.latitude && stored.location.longitude
      ? `${stored.location.latitude}, ${stored.location.longitude}`
      : '');
  return {
    projectName: stored.projectName,
    projectId: stored.projectId,
    locationAoiId: locationLabel,
    methodology: stored.methodology.name,
    reportingPeriod: formatReportingPeriod(stored),
    responsibleOrganization: stored.organization,
    validatorReviewer: stored.reviewer.name,
  };
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
        speciesLandCover: '',
        sampleDate: '',
        surveyor: '',
        photosRequired: true,
        minimumPlotCount: '3',
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

export function saveDmrvInputConfig(config: DmrvInputConfig): DmrvInputConfig {
  const map = readAll();
  const saved: DmrvInputConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
    status: deriveStatus(config),
  };
  map[storageKey(saved.projectId, saved.categorySlug, saved.inputKey)] = saved;
  writeAll(map);
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

  if (config.evidencePacket.title.trim()) points += 6;
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
    config.evidencePacket.title.trim() ||
    `${config.inputLabel} — ${config.categorySlug} DMRV`;

  const res = await createEnvironmentalEvidencePacket({
    title,
    projectId: config.projectContext.projectId || config.projectId,
    locationLabel: config.projectContext.locationAoiId || undefined,
    evidenceRefs: [
      {
        source: 'dmrv_input_config',
        categorySlug: config.categorySlug,
        typeId: config.typeId,
        inputKey: config.inputKey,
        configType: config.configType,
        validationRules: config.validationRules,
        dataSourceSettings: config.dataSourceSettings,
      },
    ],
    qrPayload: config.evidencePacket.generateQrCode
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
  const localHash = `sha256-local-${btoa(JSON.stringify(config)).slice(0, 32)}`;
  return {
    ok: true,
    packetId: localId,
    integrityHash: localHash,
    message:
      'Environmental Intelligence evidence-packet API unavailable — saved a local draft packet reference. Deploy /api/environmental-intelligence/evidence-packets on the API host for server-backed packets.',
  };
}
