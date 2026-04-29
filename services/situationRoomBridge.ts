import { sendSituationMessage } from './situationService';
import type { ChatMessage } from '../types';

export type SituationSourceType =
  | 'blockchain_report'
  | 'earth_observation_scan'
  | 'aquascan_scan'
  | 'carb_air_audit'
  | 'carbon_viu_review'
  | 'hazardous_waste_audit'
  | 'mission';

export type EarthObservationModuleType = 'earth_observation';

export type EarthObservationGuideSnapshot = {
  guideCurrentStep?: string;
  guideNextStep?: string;
  plainEnglishExplanation?: string;
  missingItems?: string[];
  warnings?: string[];
  recommendedActions?: string[];
  claimSafety?: {
    canMakeClaim?: boolean;
    safeClaimLanguage?: string;
    unsafeClaimLanguage?: string[];
  };
  lastUserQuestion?: string;
  lastGuideResponse?: string;
};

export type EarthObservationSavedAoi = {
  exists: boolean;
  isSaved: boolean;
  center: { lat: number; lng: number } | null;
  radiusKm: number | null;
  boundaryGeoJson?: Record<string, unknown> | null;
  areaKm2?: number | null;
  savedAt?: string | null;
  source: 'radius' | 'drawn_polygon' | 'imported_geojson' | null;
};

export type EarthObservationMissionSuggestion = {
  missionType: 'field_verification';
  sourceModule: 'earth_observation';
  sourceScanId: string;
  title: string;
  tasks: string[];
  safetyNotes: string[];
};

export type EarthObservationAssistantInterpretation = {
  summary: string;
  whatDpalFound: string[];
  whatDpalDidNotProve: string[];
  missingEvidence: string[];
  recommendedQuestions: string[];
  recommendedActions: string[];
  safeClaimLanguage: string;
  missionSuggestion: EarthObservationMissionSuggestion;
  generatedAt: string;
};

export type EarthObservationScanRecord = {
  id: string;
  moduleType: EarthObservationModuleType;
  analysisType: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  aoi?: EarthObservationSavedAoi | null;
  sourceMode?: string | null;
  signalStatus?: string | null;
  processingStage?: string | null;
  primarySignal?: string | null;
  riskLevel?: string | null;
  confidence?: number | null;
  beforeScene?: Record<string, unknown> | null;
  afterScene?: Record<string, unknown> | null;
  metricMethod?: string | null;
  metrics: Record<string, number | string | null>;
  sources: Array<Record<string, unknown>>;
  limitations: string[];
  legalDisclaimer?: string;
  recommendedActions: string[];
  createdAt: string;
  createdBy?: string | null;
  guide: EarthObservationGuideSnapshot;
  evidencePacketReady?: boolean;
  routedToSituationRoom?: boolean;
};

export type EvidencePacketDraft = {
  id: string;
  moduleType: EarthObservationModuleType;
  sourceType: 'earth_observation_scan';
  sourceId: string;
  projectName: string;
  scanSummary: string;
  location: { latitude: number; longitude: number; radiusKm: number };
  aoi?: EarthObservationSavedAoi | null;
  analysisType?: string;
  dateRange?: { startDate: string; endDate: string };
  providerMetadata?: Array<Record<string, unknown>>;
  sceneSearchResult?: {
    lifecycleStatus?: string;
    scenesFound?: number;
    usableScenesFound?: number;
    reasonCode?: string | null;
    reasonText?: string | null;
  };
  beforeSceneDate?: string | null;
  afterSceneDate?: string | null;
  metricValues: Record<string, number | string | null>;
  sourceList: Array<Record<string, unknown>>;
  confidence?: number | null;
  limitations: string[];
  claimSafetyStatement: string;
  recommendedDpalAction: string;
  verificationNeeds: string[];
  assistantInterpretation?: EarthObservationAssistantInterpretation;
  situationRoomId?: string;
  scanResultId: string;
  createdAt: string;
};

export type SituationRoomBinding = {
  id: string;
  sourceType: SituationSourceType;
  sourceId: string;
  roomId: string;
  reportId: string;
  evidencePacketId?: string;
  createdAt: string;
};

export type ScanToSituationPackage = {
  scan: EarthObservationScanRecord;
  evidencePacket: EvidencePacketDraft;
  situationRoom: SituationRoomBinding;
  initialMessages: Array<{ sender: string; text: string; isSystem?: boolean }>;
};

const SCAN_STORAGE_KEY = 'dpal_scan_results_v1';
const EVIDENCE_STORAGE_KEY = 'dpal_scan_evidence_packets_v1';
const ROOM_BINDINGS_KEY = 'dpal_situation_room_bindings_v1';

function readArray<T>(key: string): T[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, rows: T[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(rows));
}

function upsertById<T extends { id: string }>(key: string, row: T): T {
  const rows = readArray<T>(key);
  const next = [row, ...rows.filter((entry) => entry.id !== row.id)];
  writeArray(key, next);
  return row;
}

function createStableId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

function safeClaimStatement(guide?: EarthObservationGuideSnapshot): string {
  const safe = guide?.claimSafety?.safeClaimLanguage?.trim();
  if (safe) return safe;
  return 'This is a remote-sensing screening signal and requires field verification before legal, regulatory, insurance, scientific, enforcement, or carbon-credit conclusions.';
}

export function saveScanResult(scan: EarthObservationScanRecord): EarthObservationScanRecord {
  return upsertById<EarthObservationScanRecord>(SCAN_STORAGE_KEY, scan);
}

export function getScanResult(scanId: string): EarthObservationScanRecord | null {
  return readArray<EarthObservationScanRecord>(SCAN_STORAGE_KEY).find((row) => row.id === scanId) ?? null;
}

export function saveEvidencePacketDraft(packet: EvidencePacketDraft): EvidencePacketDraft {
  return upsertById<EvidencePacketDraft>(EVIDENCE_STORAGE_KEY, packet);
}

export function getOrCreateSituationRoomForSource(input: {
  sourceType: SituationSourceType;
  sourceId: string;
  evidencePacketId?: string;
}): SituationRoomBinding {
  const rows = readArray<SituationRoomBinding>(ROOM_BINDINGS_KEY);
  const existing = rows.find((row) => row.sourceType === input.sourceType && row.sourceId === input.sourceId);
  if (existing) {
    const updated = { ...existing, evidencePacketId: input.evidencePacketId ?? existing.evidencePacketId };
    return upsertById<SituationRoomBinding>(ROOM_BINDINGS_KEY, updated);
  }
  const reportId = createStableId('rep-eo');
  const roomId = reportId;
  return upsertById<SituationRoomBinding>(ROOM_BINDINGS_KEY, {
    id: createStableId('room-link'),
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    roomId,
    reportId,
    evidencePacketId: input.evidencePacketId,
    createdAt: new Date().toISOString(),
  });
}

export function attachEvidencePacketToRoom(
  packet: EvidencePacketDraft,
  room: SituationRoomBinding,
): EvidencePacketDraft {
  return saveEvidencePacketDraft({
    ...packet,
    situationRoomId: room.roomId,
  });
}

export function postInitialScanMessagesPayload(pkg: ScanToSituationPackage): Array<{ sender: string; text: string; isSystem?: boolean }> {
  const { scan, evidencePacket } = pkg;
  const confidenceText =
    typeof scan.confidence === 'number'
      ? `${Math.round(scan.confidence * 100)}%`
      : 'not available';
  const missingEvidence = [
    evidencePacket.verificationNeeds.length ? `Missing evidence: ${evidencePacket.verificationNeeds.join(', ')}.` : 'Missing evidence: validator review and field proof.',
  ].join(' ');
  return [
    {
      sender: 'DPAL System',
      isSystem: true,
      text: 'Earth Observation scan saved. DPAL created a review room for this remote-sensing signal.',
    },
    {
      sender: 'DPAL Guide',
      isSystem: true,
      text:
        `Scan summary: ${evidencePacket.scanSummary}\n` +
        `Routing status: needs_review.\n` +
        `What was scanned: ${scan.analysisType} at ${scan.latitude.toFixed(5)}, ${scan.longitude.toFixed(5)} (radius ${scan.radiusKm} km).\n` +
        `What changed: ${scan.primarySignal || 'screening signal not yet clear'}.\n` +
        `Processing stage: ${scan.processingStage || 'unknown'}.\n` +
        `Signal status: ${scan.signalStatus || 'not verified'}.\n` +
        `Confidence: ${confidenceText}.\n` +
        `Limitations: ${(scan.limitations && scan.limitations.length > 0) ? scan.limitations.join(' | ') : 'No explicit limitations provided.'}\n` +
        `${missingEvidence}\n` +
        `Recommended next action: ${scan.recommendedActions?.[0] || 'Create evidence packet, assign validator, and request field verification proof.'}`,
    },
    ...(evidencePacket.assistantInterpretation
      ? [{
        sender: 'Earth Observation Assistant',
        isSystem: true,
        text:
          `Assistant summary: ${evidencePacket.assistantInterpretation.summary}\n` +
          `Missing evidence: ${evidencePacket.assistantInterpretation.missingEvidence.join(', ') || 'None listed'}\n` +
          `Validator focus questions: ${evidencePacket.assistantInterpretation.recommendedQuestions.join(' | ')}\n` +
          `Recommended mission tasks: ${evidencePacket.assistantInterpretation.missionSuggestion.tasks.join(' | ')}\n` +
          `Safe claim language: ${evidencePacket.assistantInterpretation.safeClaimLanguage}`,
      }]
      : []),
    {
      sender: 'DPAL Safety',
      isSystem: true,
      text: 'This is a remote-sensing screening signal. It should not be treated as final legal, regulatory, insurance, scientific, enforcement, or carbon-credit proof without field verification and record review.',
    },
    {
      sender: 'DPAL Checklist',
      isSystem: true,
      text:
        'Action checklist:\n' +
        '- Review source and date range\n' +
        '- Review AOI\n' +
        '- Review metrics\n' +
        '- Assign validator\n' +
        '- Request field photos/GPS proof\n' +
        '- Create verification mission\n' +
        '- Decide whether to route to agency/report/ledger',
    },
  ];
}

export async function postInitialScanMessages(roomId: string, payloads: Array<{ sender: string; text: string; isSystem?: boolean }>): Promise<ChatMessage[]> {
  const saved: ChatMessage[] = [];
  for (const payload of payloads) {
    try {
      const message = await sendSituationMessage(roomId, payload);
      saved.push(message);
    } catch {
      saved.push({
        id: createStableId('local-room-msg'),
        sender: payload.sender,
        text: payload.text,
        timestamp: Date.now(),
        isSystem: Boolean(payload.isSystem),
        ledgerProof: 'local-bridge-fallback',
      });
    }
  }
  return saved;
}

export function createRoomFromScanResult(input: {
  analysisType: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  aoi?: EarthObservationSavedAoi | null;
  sourceMode?: string | null;
  signalStatus?: string | null;
  processingStage?: string | null;
  primarySignal?: string | null;
  riskLevel?: string | null;
  confidence?: number | null;
  beforeScene?: Record<string, unknown> | null;
  afterScene?: Record<string, unknown> | null;
  metricMethod?: string | null;
  metrics?: Record<string, number | string | null>;
  sources?: Array<Record<string, unknown>>;
  limitations?: string[];
  legalDisclaimer?: string;
  recommendedActions?: string[];
  summaryText?: string;
  createdBy?: string | null;
  guide?: EarthObservationGuideSnapshot;
  analysisTypeLabel?: string;
  lifecycleStatus?: string;
  sceneSearchResult?: EvidencePacketDraft['sceneSearchResult'];
  assistantInterpretation?: EarthObservationAssistantInterpretation;
  dateRange?: { startDate: string; endDate: string };
}): ScanToSituationPackage {
  const scan: EarthObservationScanRecord = saveScanResult({
    id: createStableId('scan-eo'),
    moduleType: 'earth_observation',
    analysisType: input.analysisType,
    latitude: input.latitude,
    longitude: input.longitude,
    radiusKm: input.radiusKm,
    aoi: input.aoi ?? null,
    sourceMode: input.sourceMode ?? null,
    signalStatus: input.signalStatus ?? null,
    processingStage: input.processingStage ?? null,
    primarySignal: input.primarySignal ?? null,
    riskLevel: input.riskLevel ?? null,
    confidence: toNumber(input.confidence),
    beforeScene: input.beforeScene ?? null,
    afterScene: input.afterScene ?? null,
    metricMethod: input.metricMethod ?? null,
    metrics: input.metrics ?? {},
    sources: input.sources ?? [],
    limitations: input.limitations ?? [],
    legalDisclaimer: input.legalDisclaimer,
    recommendedActions: input.recommendedActions ?? [],
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy ?? null,
    guide: input.guide ?? {},
    evidencePacketReady: Boolean(input.assistantInterpretation),
    routedToSituationRoom: false,
  });

  const evidenceDraft = saveEvidencePacketDraft({
    id: createStableId('evidence-eo'),
    moduleType: 'earth_observation',
    sourceType: 'earth_observation_scan',
    sourceId: scan.id,
    scanResultId: scan.id,
    projectName: 'Earth Observation',
    scanSummary: input.summaryText || 'Earth Observation scan screening package generated for team review.',
    location: { latitude: scan.latitude, longitude: scan.longitude, radiusKm: scan.radiusKm },
    aoi: scan.aoi ?? null,
    analysisType: input.analysisTypeLabel ?? scan.analysisType,
    dateRange: input.dateRange,
    providerMetadata: scan.sources,
    sceneSearchResult: input.sceneSearchResult ?? { lifecycleStatus: input.lifecycleStatus },
    beforeSceneDate: typeof scan.beforeScene?.acquisitionDate === 'string' ? scan.beforeScene.acquisitionDate : null,
    afterSceneDate: typeof scan.afterScene?.acquisitionDate === 'string' ? scan.afterScene.acquisitionDate : null,
    metricValues: scan.metrics,
    sourceList: scan.sources,
    confidence: scan.confidence,
    limitations: scan.limitations,
    claimSafetyStatement: safeClaimStatement(scan.guide),
    recommendedDpalAction: scan.recommendedActions?.[0] || 'Send to validator review and collect field verification evidence.',
    verificationNeeds: [
      'Validator assignment',
      'Field photos with geotags',
      'GPS verification proof',
      'Mission verification notes',
    ],
    assistantInterpretation: input.assistantInterpretation,
    createdAt: scan.createdAt,
  });

  const room = getOrCreateSituationRoomForSource({
    sourceType: 'earth_observation_scan',
    sourceId: scan.id,
    evidencePacketId: evidenceDraft.id,
  });
  const attachedEvidence = attachEvidencePacketToRoom(evidenceDraft, room);
  const pkg: ScanToSituationPackage = {
    scan,
    evidencePacket: attachedEvidence,
    situationRoom: room,
    initialMessages: [],
  };
  const initialMessages = postInitialScanMessagesPayload(pkg);
  return { ...pkg, initialMessages };
}

