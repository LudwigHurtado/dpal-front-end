/**
 * In-memory FloodGuard state with optional JSON persistence.
 * Path: `data/floodguard/store.json` relative to `process.cwd()` (backend root).
 */

import fs from 'fs';
import path from 'path';
import type {
  FloodAlert,
  FloodCameraDetection,
  FloodCitizenReport,
  FloodDispatchedMissionRecord,
  FloodEvidencePacket,
  FloodLedgerRecord,
  FloodPublicLedgerRecord,
  FloodMissionBridgeRecord,
  FloodMissionSafetyClassification,
  FloodRoutingMode,
  FloodRoutingPreviewSummary,
  FloodSafeMissionType,
  FloodSituationMessage,
  FloodSituationRoom,
  FloodWeatherSignal,
  FloodZone,
} from './floodGuardTypes';
import { computeFloodRiskScore } from './floodRiskEngine';
import { draftFloodAlert, settingsForCity } from './floodAlertRouter';
import { buildSyntheticRainfallSignal, getRainfallSample } from './floodRainfallAdapter';
import { getSatelliteSample } from './floodSatelliteAdapter';
import { getWaterLevelSample } from './floodWaterLevelAdapter';
import {
  cloneZone,
  getCities,
  getZoneById,
  getZonesForCity,
  listAllRegisteredZones,
} from './floodCityZoneService';
import { evaluateZoneForAgents } from './agents/floodAgentOrchestrator';
import {
  isKnownSafeMissionType,
  isMissionAllowedForClassification,
  safetyClassificationAtLeastAsStrict,
} from './agents/floodMissionDispatchAgent';
import { buildFloodEvidencePacket } from './floodEvidencePacketService';
import {
  anchorEvidenceFull,
  buildAgentFindingsDigest,
  buildRainfallDigest,
  buildRoutingDigest,
  buildSatelliteDigest,
  buildWaterLevelDigest,
} from './floodLedgerService';
import { buildMissionBridgeRecord } from './floodMissionBridgeService';
import { buildFloodRoutingPreview, isValidRoutingMode } from './floodAlertRoutingService';
import { randomUUID } from 'crypto';

const STORE_DIR = path.join(process.cwd(), 'data', 'floodguard');
const STORE_FILE = path.join(STORE_DIR, 'store.json');

const INITIAL_WEATHER: Record<string, FloodWeatherSignal> = {
  'DPAL-FLOOD-SCZ-ZONE-A-0001': {
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-A-0001',
    rainfall30mMm: 22,
    rainfall24hMm: 78,
    riverGaugeMeters: 2.4,
    riverDeltaMeters: 0.6,
    satelliteWaterExpansionPct: 14,
    source: 'weather_feed',
    capturedAt: new Date().toISOString(),
  },
  'DPAL-FLOOD-SCZ-ZONE-B-0001': {
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-B-0001',
    rainfall30mMm: 9,
    rainfall24hMm: 41,
    riverGaugeMeters: 3.8,
    riverDeltaMeters: 0.9,
    satelliteWaterExpansionPct: 22,
    source: 'satellite',
    capturedAt: new Date().toISOString(),
  },
  'DPAL-FLOOD-SCZ-ZONE-C-0001': {
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-C-0001',
    rainfall30mMm: 5,
    rainfall24hMm: 24,
    satelliteWaterExpansionPct: 4,
    source: 'weather_feed',
    capturedAt: new Date().toISOString(),
  },
  'DPAL-FLOOD-SCZ-ZONE-D-0001': {
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-D-0001',
    rainfall30mMm: 1,
    rainfall24hMm: 6,
    source: 'weather_feed',
    capturedAt: new Date().toISOString(),
  },
};

const SEED_DETECTIONS: FloodCameraDetection[] = [
  {
    detectionId: 'CAM-DET-SCZ-A-0001-1',
    cameraId: 'CAM-SCZ-001',
    cameraLabel: 'Plan 3000 — Av. Virgen de Cotoca cam 1',
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-A-0001',
    label: 'flash_flood',
    confidence: 0.92,
    timestamp: '2026-05-07T14:30:00Z',
    streamUrl: 'https://cams.example.org/streams/CAM-SCZ-001',
    notes: 'Camera detected moving water across full road width.',
  },
  {
    detectionId: 'CAM-DET-SCZ-A-0001-2',
    cameraId: 'CAM-SCZ-014',
    cameraLabel: 'Plan 3000 — Mercado intersection',
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-A-0001',
    label: 'standing_water',
    confidence: 0.74,
    timestamp: '2026-05-07T14:38:00Z',
    notes: 'Standing water reaching curb height.',
  },
  {
    detectionId: 'CAM-DET-SCZ-B-0001-1',
    cameraId: 'CAM-SCZ-203',
    cameraLabel: 'Puente Mario Foianini — riverbank',
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-B-0001',
    label: 'river_level_rise',
    confidence: 0.81,
    timestamp: '2026-05-07T14:42:00Z',
    notes: 'River line moved up the embankment by ~30 cm in 20 minutes.',
  },
];

const SEED_REPORTS: FloodCitizenReport[] = [
  {
    reportId: 'CIT-REP-SCZ-A-001',
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-A-0001',
    reporterHandle: 'vecino_anon_812',
    description: 'El agua ya entró a la tienda de Doña María, sube rápido.',
    observedDepthCm: 28,
    hasPhoto: true,
    timestamp: '2026-05-07T14:33:00Z',
    location: { lat: -17.7951, lng: -63.1304 },
  },
  {
    reportId: 'CIT-REP-SCZ-A-002',
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-A-0001',
    reporterHandle: 'comunidad_3000',
    description: 'Los buses no pueden cruzar la avenida.',
    observedDepthCm: 35,
    hasPhoto: false,
    timestamp: '2026-05-07T14:36:00Z',
    location: { lat: -17.7948, lng: -63.1289 },
  },
  {
    reportId: 'CIT-REP-SCZ-A-003',
    zoneId: 'DPAL-FLOOD-SCZ-ZONE-A-0001',
    reporterHandle: 'maestra_unidad',
    description: 'Cerramos la unidad educativa y mandamos a los niños a casa.',
    hasPhoto: true,
    timestamp: '2026-05-07T14:40:00Z',
    location: { lat: -17.7955, lng: -63.1318 },
  },
];

interface PersistedShape {
  version: 1 | 2 | 3 | 4 | 5;
  detections: Record<string, FloodCameraDetection[]>;
  reports: Record<string, FloodCitizenReport[]>;
  weather: Record<string, FloodWeatherSignal>;
  alerts: Record<string, FloodAlert>;
  activeByZone: Record<string, string>;
  situationRooms: Record<string, FloodSituationRoom>;
  evidenceByAlert: Record<string, FloodEvidencePacket>;
  anchors: Record<string, { contentHash: string; ledgerRecordId: string; anchoredAt: string }>;
  dispatchedMissions?: FloodDispatchedMissionRecord[];
  /** Stage 12F — DPAL mission bridge records persisted alongside FloodGuard state. */
  dpalMissions?: FloodMissionBridgeRecord[];
  /** Stage 12G — newest-first routing previews per alert id. */
  routingByAlert?: Record<string, FloodRoutingPreviewSummary[]>;
  /** Stage 12H — full ledger records, indexed by ledgerRecordId. */
  ledgerRecords?: Record<string, FloodLedgerRecord>;
  /** Stage 12H — newest-first ledger record ids per alert id. */
  ledgerByAlert?: Record<string, string[]>;
}

function emptyPersisted(): PersistedShape {
  return {
    version: 5,
    detections: {},
    reports: {},
    weather: {},
    alerts: {},
    activeByZone: {},
    situationRooms: {},
    evidenceByAlert: {},
    anchors: {},
    dispatchedMissions: [],
    dpalMissions: [],
    routingByAlert: {},
    ledgerRecords: {},
    ledgerByAlert: {},
  };
}

function seedPersisted(): PersistedShape {
  const p = emptyPersisted();
  p.weather = { ...INITIAL_WEATHER };
  for (const d of SEED_DETECTIONS) {
    p.detections[d.zoneId] = p.detections[d.zoneId] ?? [];
    p.detections[d.zoneId].push(d);
  }
  for (const r of SEED_REPORTS) {
    p.reports[r.zoneId] = p.reports[r.zoneId] ?? [];
    p.reports[r.zoneId].push(r);
  }
  return p;
}

function buildSituationRoom(alert: FloodAlert): FloodSituationRoom {
  const created = alert.createdAt;
  return {
    roomId: `ROOM-${alert.alertId}`,
    alertId: alert.alertId,
    zoneId: alert.zoneId,
    cityId: alert.cityId,
    status: 'open',
    participants: [
      { participantId: 'p-system', name: 'DPAL FloodGuard', role: 'observer', joinedAt: created },
      { participantId: 'p-validator', name: 'Validator on call', role: 'validator', joinedAt: created },
    ],
    messages: [
      {
        messageId: 'msg-system-1',
        authorName: 'DPAL FloodGuard',
        authorRole: 'system',
        body: `Alert opened. ${alert.label} (L${alert.level}) for ${alert.zoneId}. Reasons: ${alert.reasons.join(' · ')}.`,
        timestamp: created,
      },
      {
        messageId: 'msg-system-2',
        authorName: 'DPAL FloodGuard',
        authorRole: 'system',
        body:
          'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.',
        timestamp: created,
      },
    ],
    createdAt: created,
  };
}

const MISSION_SAFETY_CLASSIFICATIONS: FloodMissionSafetyClassification[] = [
  'no_mission_allowed',
  'remote_only',
  'safe_distance_only',
  'post_event_only',
  'validator_review_required',
  'mission_allowed',
];

function isMissionSafetyClassification(s: string): s is FloodMissionSafetyClassification {
  return MISSION_SAFETY_CLASSIFICATIONS.includes(s as FloodMissionSafetyClassification);
}

export class FloodGuardStore {
  private data: PersistedShape = emptyPersisted();

  constructor() {
    this.loadOrSeed();
  }

  private loadOrSeed(): void {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf8');
        const parsed = JSON.parse(raw) as PersistedShape;
        if (
          parsed &&
          parsed.alerts &&
          parsed.detections &&
          (parsed.version === 1 ||
            parsed.version === 2 ||
            parsed.version === 3 ||
            parsed.version === 4 ||
            parsed.version === 5)
        ) {
          this.data = {
            ...parsed,
            version: 5,
            dispatchedMissions: Array.isArray(parsed.dispatchedMissions) ? parsed.dispatchedMissions : [],
            dpalMissions: Array.isArray(parsed.dpalMissions) ? parsed.dpalMissions : [],
            routingByAlert:
              parsed.routingByAlert && typeof parsed.routingByAlert === 'object' ? parsed.routingByAlert : {},
            ledgerRecords:
              parsed.ledgerRecords && typeof parsed.ledgerRecords === 'object' ? parsed.ledgerRecords : {},
            ledgerByAlert:
              parsed.ledgerByAlert && typeof parsed.ledgerByAlert === 'object' ? parsed.ledgerByAlert : {},
          };
          return;
        }
      }
    } catch (e) {
      console.warn('[FloodGuard] Could not load store, re-seeding:', (e as Error).message);
    }
    this.data = seedPersisted();
    this.recomputeAllZones();
    this.persist();
  }

  persist(): void {
    try {
      if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
      fs.writeFileSync(STORE_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.warn('[FloodGuard] Persist failed:', (e as Error).message);
    }
  }

  listZonesForCity(cityId: string): FloodZone[] {
    return getZonesForCity(cityId).map((z) => cloneZone(z, this.data.activeByZone[z.zoneId] ?? null));
  }

  /** Latest merged weather row after `primeEnvironmentalSignals` / `refreshWeather`. */
  getWeatherSnapshot(zoneId: string): FloodWeatherSignal | null {
    return this.data.weather[zoneId] ?? INITIAL_WEATHER[zoneId] ?? null;
  }

  getZoneDetections(zoneId: string): FloodCameraDetection[] {
    return this.data.detections[zoneId] ?? [];
  }

  getZoneReports(zoneId: string): FloodCitizenReport[] {
    return this.data.reports[zoneId] ?? [];
  }

  /** Non-archived alerts for agent integration summaries. */
  listAlertsSnapshot(): FloodAlert[] {
    return Object.values(this.data.alerts).filter((a) => a.lifecycle !== 'archived');
  }

  /** Prime rainfall + satellite for every registered Geo-ID, then recompute risk. */
  async primeEnvironmentalForAllRegisteredZones(): Promise<void> {
    const ids = listAllRegisteredZones().map((z) => z.zoneId);
    await Promise.all(ids.map((zid) => this.primeEnvironmentalSignals(zid)));
    this.recomputeAllZones();
  }

  private refreshWeather(zoneId: string): FloodWeatherSignal | null {
    const zone = getZoneById(zoneId);
    if (!zone) return null;
    const base = this.data.weather[zoneId] ?? INITIAL_WEATHER[zoneId] ?? null;
    // Synchronous floor: keep river / satellite context, attach a synthetic
    // rainfall sample tagged with provenance. If `primeRainfall()` already ran
    // it will have written a live-tagged signal here that we keep below.
    const existingMeta = base?.rainfallMeta;
    if (existingMeta && (existingMeta.status === 'live' || existingMeta.isLive)) {
      // Already primed with a live sample — re-attach river/satellite passthrough.
      const merged: FloodWeatherSignal = {
        ...base!,
        zoneId,
        riverGaugeMeters: base?.waterLevelMeta?.waterLevelMeters ?? base?.riverGaugeMeters,
        riverDeltaMeters: base?.waterLevelMeta?.trendDeltaMeters ?? base?.riverDeltaMeters,
        satelliteWaterExpansionPct: base?.satelliteWaterExpansionPct,
        satelliteMeta: base?.satelliteMeta,
        waterLevelMeta: base?.waterLevelMeta,
      };
      this.data.weather[zoneId] = merged;
      return merged;
    }
    const { signal } = buildSyntheticRainfallSignal(zone, base, new Date());
    if (base?.satelliteMeta) {
      signal.satelliteWaterExpansionPct = base.satelliteWaterExpansionPct;
      signal.satelliteMeta = base.satelliteMeta;
    } else if (base?.satelliteWaterExpansionPct !== undefined) {
      signal.satelliteWaterExpansionPct = base.satelliteWaterExpansionPct;
    }
    if (base?.waterLevelMeta) {
      signal.waterLevelMeta = base.waterLevelMeta;
      signal.riverGaugeMeters = base.waterLevelMeta.waterLevelMeters;
      signal.riverDeltaMeters = base.waterLevelMeta.trendDeltaMeters;
    }
    this.data.weather[zoneId] = signal;
    return signal;
  }

  /**
   * Async upgrade path — fetches a live rainfall sample (or labelled
   * fallback) and stores it on `this.data.weather[zoneId]` so the next
   * synchronous `recomputeZone` picks it up. Safe to call repeatedly: the
   * adapter has its own per-zone TTL cache.
   */
  async primeRainfall(zoneId: string): Promise<FloodWeatherSignal | null> {
    const zone = getZoneById(zoneId);
    if (!zone) return null;
    const base = this.data.weather[zoneId] ?? INITIAL_WEATHER[zoneId] ?? null;
    const sample = await getRainfallSample(zone, base, new Date());
    const merged: FloodWeatherSignal = {
      ...sample.signal,
      riverGaugeMeters: base?.waterLevelMeta?.waterLevelMeters ?? base?.riverGaugeMeters,
      riverDeltaMeters: base?.waterLevelMeta?.trendDeltaMeters ?? base?.riverDeltaMeters,
      satelliteWaterExpansionPct: base?.satelliteWaterExpansionPct ?? sample.signal.satelliteWaterExpansionPct,
      satelliteMeta: base?.satelliteMeta ?? sample.signal.satelliteMeta,
      waterLevelMeta: base?.waterLevelMeta,
    };
    this.data.weather[zoneId] = merged;
    return merged;
  }

  /** Stages 12A/12B/12E — rainfall, satellite water, then water-level gauge. */
  async primeEnvironmentalSignals(zoneId: string): Promise<void> {
    await this.primeRainfall(zoneId);
    await this.primeSatellite(zoneId);
    await this.primeWaterLevel(zoneId);
  }

  /** Prime environmental stack for every zone we track. */
  async primeRainfallForActiveZones(): Promise<void> {
    const ids = new Set<string>([
      ...Object.keys(this.data.activeByZone),
      ...Object.keys(this.data.detections),
      ...Object.keys(this.data.reports),
      ...Object.keys(this.data.weather),
    ]);
    getZonesForCity('SCZ').forEach((z) => ids.add(z.zoneId));
    getZonesForCity('DEN').forEach((z) => ids.add(z.zoneId));
    await Promise.all(Array.from(ids).map((zid) => this.primeEnvironmentalSignals(zid)));
  }

  /**
   * AquaScan-style satellite sample merged onto the current weather row.
   */
  async primeSatellite(zoneId: string): Promise<void> {
    const zone = getZoneById(zoneId);
    if (!zone) return;
    const cur =
      this.data.weather[zoneId] ??
      INITIAL_WEATHER[zoneId] ?? {
        zoneId,
        rainfall30mMm: 0,
        rainfall24hMm: 0,
        source: 'weather_feed',
        capturedAt: new Date().toISOString(),
      };
    const sample = await getSatelliteSample(zone, cur, new Date());
    this.data.weather[zoneId] = {
      ...cur,
      zoneId,
      satelliteWaterExpansionPct: sample.expansionPercent,
      satelliteMeta: sample.meta,
      waterLevelMeta: cur.waterLevelMeta,
      riverGaugeMeters: cur.waterLevelMeta?.waterLevelMeters ?? cur.riverGaugeMeters,
      riverDeltaMeters: cur.waterLevelMeta?.trendDeltaMeters ?? cur.riverDeltaMeters,
    };
  }

  /** Stage 12E — water-level / gauge sample merged onto the weather row. */
  async primeWaterLevel(zoneId: string): Promise<void> {
    const zone = getZoneById(zoneId);
    if (!zone) return;
    const cur =
      this.data.weather[zoneId] ??
      INITIAL_WEATHER[zoneId] ?? {
        zoneId,
        rainfall30mMm: 0,
        rainfall24hMm: 0,
        source: 'weather_feed',
        capturedAt: new Date().toISOString(),
      };
    const { meta } = await getWaterLevelSample(zone, cur, new Date());
    this.data.weather[zoneId] = {
      ...cur,
      zoneId,
      waterLevelMeta: meta,
      riverGaugeMeters: meta.waterLevelMeters,
      riverDeltaMeters: meta.trendDeltaMeters,
    };
  }

  recomputeZone(zoneId: string): FloodAlert | null {
    const zone = getZoneById(zoneId);
    if (!zone) return null;

    const weather = this.refreshWeather(zoneId);
    const cameras = this.data.detections[zoneId] ?? [];
    const citizenReports = this.data.reports[zoneId] ?? [];

    const riskScore = computeFloodRiskScore({ zone, cameras, citizenReports, weather });

    const minSignal = cameras.length + citizenReports.length;
    if (riskScore.score < 12 && minSignal === 0) {
      const existingId = this.data.activeByZone[zoneId];
      if (existingId) {
        delete this.data.alerts[existingId];
        delete this.data.activeByZone[zoneId];
        delete this.data.situationRooms[existingId];
      }
      this.persist();
      return null;
    }

    const existingId = this.data.activeByZone[zoneId];
    const existing = existingId ? this.data.alerts[existingId] : undefined;
    const settings = settingsForCity(zone.cityId);

    const next = draftFloodAlert({
      zone,
      riskScore,
      cameras,
      citizenReports,
      weather,
      settings,
      existingAlertId: existing?.alertId,
      preserveCreatedAt: existing?.createdAt,
      preserveLifecycle: existing?.lifecycle,
      evidencePacketId: existing?.evidencePacketId,
      ledgerAnchorHash: existing?.ledgerAnchorHash,
      validatorReview: existing?.validatorReview,
    });

    if (existingId && existingId !== next.alertId) {
      delete this.data.alerts[existingId];
      delete this.data.situationRooms[existingId];
    }

    this.data.alerts[next.alertId] = next;
    this.data.activeByZone[zoneId] = next.alertId;

    if (!this.data.situationRooms[next.alertId]) {
      this.data.situationRooms[next.alertId] = buildSituationRoom(next);
    }

    this.persist();
    return next;
  }

  recomputeAllZones(): void {
    const ids = new Set<string>();
    Object.keys(this.data.detections).forEach((z) => ids.add(z));
    Object.keys(this.data.reports).forEach((z) => ids.add(z));
    Object.keys(this.data.weather).forEach((z) => ids.add(z));
    Object.keys(this.data.activeByZone).forEach((z) => ids.add(z));
    getZonesForCity('SCZ').forEach((z) => ids.add(z.zoneId));
    getZonesForCity('DEN').forEach((z) => ids.add(z.zoneId));
    ids.forEach((zid) => this.recomputeZone(zid));
  }

  addDetection(detection: FloodCameraDetection): FloodAlert | null {
    const list = this.data.detections[detection.zoneId] ?? [];
    this.data.detections[detection.zoneId] = [detection, ...list];
    return this.recomputeZone(detection.zoneId);
  }

  addReport(report: FloodCitizenReport): FloodAlert | null {
    const list = this.data.reports[report.zoneId] ?? [];
    this.data.reports[report.zoneId] = [report, ...list];
    return this.recomputeZone(report.zoneId);
  }

  getZoneStatus(zoneId: string): FloodAlert | null {
    this.refreshWeather(zoneId);
    return this.recomputeZone(zoneId);
  }

  /** Async variant that primes the live rainfall adapter before recompute. */
  async getZoneStatusLive(zoneId: string): Promise<FloodAlert | null> {
    await this.primeEnvironmentalSignals(zoneId);
    return this.recomputeZone(zoneId);
  }

  /** Returns current alert for zone without full recompute (used after recompute). */
  getActiveAlertForZone(zoneId: string): FloodAlert | null {
    const id = this.data.activeByZone[zoneId];
    return id ? this.data.alerts[id] ?? null : null;
  }

  listLiveAlerts(): FloodAlert[] {
    const touched = new Set<string>([
      ...Object.keys(this.data.activeByZone),
      ...Object.keys(this.data.detections),
      ...Object.keys(this.data.reports),
    ]);
    touched.forEach((zid) => {
      this.refreshWeather(zid);
      this.recomputeZone(zid);
    });

    return Object.values(this.data.alerts)
      .filter((a) => a.lifecycle !== 'resolved' && a.lifecycle !== 'archived')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /** Async variant — primes rainfall + AquaScan satellite for every active zone first. */
  async listLiveAlertsLive(): Promise<FloodAlert[]> {
    await this.primeRainfallForActiveZones();
    return this.listLiveAlerts();
  }

  getAlert(alertId: string): FloodAlert | undefined {
    const alert = this.data.alerts[alertId];
    if (alert) this.recomputeZone(alert.zoneId);
    return this.data.alerts[alertId];
  }

  getSituation(alertId: string): FloodSituationRoom | undefined {
    let room = this.data.situationRooms[alertId];
    const alert = this.data.alerts[alertId];
    if (alert && !room) {
      room = buildSituationRoom(alert);
      this.data.situationRooms[alertId] = room;
      this.persist();
    }
    return room;
  }

  appendSituationMessage(alertId: string, message: FloodSituationMessage): FloodSituationRoom | undefined {
    const room = this.getSituation(alertId);
    if (!room) return undefined;
    room.messages = [...room.messages, message];
    this.persist();
    return room;
  }

  /**
   * Stage 12C/12F — create a persisted FloodGuard mission record AND a DPAL
   * mission bridge record only when the catalog + live safety gate allow it.
   * Caller should `await primeEnvironmentalSignals(zoneId)` first for fresh rainfall/satellite/water-level.
   */
  dispatchMission(args: {
    zoneId: string;
    missionType: string;
    requestedBy: string;
    safetyClassification: string;
  }):
    | { ok: true; record: FloodDispatchedMissionRecord; dpalMission: FloodMissionBridgeRecord }
    | { ok: false; code: string; reason: string } {
    const zone = getZoneById(args.zoneId);
    if (!zone) return { ok: false, code: 'not_found', reason: 'Zone not found.' };
    if (!args.requestedBy || typeof args.requestedBy !== 'string' || !args.requestedBy.trim()) {
      return { ok: false, code: 'validation_error', reason: 'requestedBy is required.' };
    }
    if (!isMissionSafetyClassification(args.safetyClassification)) {
      return { ok: false, code: 'validation_error', reason: 'Invalid safetyClassification.' };
    }
    if (!isKnownSafeMissionType(args.missionType)) {
      return {
        ok: false,
        code: 'unsafe_mission_type',
        reason: 'Mission type is not in the DPAL safe catalog.',
      };
    }

    this.recomputeZone(args.zoneId);
    const serverEval = evaluateZoneForAgents(this, zone);

    if (
      !safetyClassificationAtLeastAsStrict(
        args.safetyClassification,
        serverEval.missionSafetyClassification,
      )
    ) {
      return {
        ok: false,
        code: 'safety_mismatch',
        reason: `Declared safety gate is looser than the server evaluation (${serverEval.missionSafetyClassification}). Refresh GET /api/floodguard/agents/monitor.`,
      };
    }

    if (!isMissionAllowedForClassification(serverEval.missionSafetyClassification, args.missionType)) {
      return {
        ok: false,
        code: 'mission_blocked',
        reason: `Mission "${args.missionType}" is not permitted under current gate "${serverEval.missionSafetyClassification}".`,
      };
    }

    const missionId = `FG-MIS-${randomUUID().slice(0, 8)}`;
    const missionType = args.missionType as FloodSafeMissionType;
    const recommended = serverEval.recommendedMissions.find((m) => m.missionType === missionType) ?? null;
    const activeAlert = this.getActiveAlertForZone(args.zoneId);
    const linkedSituationRoomId = activeAlert ? this.data.situationRooms[activeAlert.alertId]?.roomId ?? null : null;
    const linkedEvidencePacketId = activeAlert?.evidencePacketId ?? null;

    const weather = this.data.weather[args.zoneId];
    const dpalMission = buildMissionBridgeRecord({
      missionId,
      zoneId: args.zoneId,
      cityId: zone.cityId,
      missionType,
      recommended,
      safetyClassification: serverEval.missionSafetyClassification,
      safetyRationale: serverEval.safetyRationale,
      agentFindings: serverEval.agentFindings,
      createdBy: args.requestedBy.trim(),
      sourceAlertId: activeAlert?.alertId ?? null,
      linkedEvidencePacketId,
      linkedSituationRoomId,
      rainfallMeta: weather?.rainfallMeta,
      satelliteMeta: weather?.satelliteMeta,
      waterLevelMeta: weather?.waterLevelMeta,
    });

    if (!dpalMission) {
      return {
        ok: false,
        code: 'bridge_blocked',
        reason: 'DPAL mission bridge could not map this mission to a safe DPAL category.',
      };
    }

    const record: FloodDispatchedMissionRecord = {
      missionId,
      zoneId: args.zoneId,
      missionType,
      requestedBy: args.requestedBy.trim(),
      safetyClassification: args.safetyClassification,
      zoneSafetyAtDispatch: serverEval.missionSafetyClassification,
      createdAt: new Date().toISOString(),
      status: 'open',
      dpalMissionId: dpalMission.missionId,
    };
    this.data.dispatchedMissions = [...(this.data.dispatchedMissions ?? []), record];
    this.data.dpalMissions = [...(this.data.dpalMissions ?? []), dpalMission];
    this.persist();
    return { ok: true, record, dpalMission };
  }

  /** Stage 12F — list bridge records (newest first). */
  listDpalMissions(filters?: { zoneId?: string; alertId?: string }): FloodMissionBridgeRecord[] {
    const all = [...(this.data.dpalMissions ?? [])];
    const filtered = all.filter((m) => {
      if (filters?.zoneId && m.sourceZoneId !== filters.zoneId) return false;
      if (filters?.alertId && m.sourceAlertId !== filters.alertId) return false;
      return true;
    });
    return filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  /** Stage 12F — get a single bridge record. */
  getDpalMission(missionId: string): FloodMissionBridgeRecord | undefined {
    return (this.data.dpalMissions ?? []).find((m) => m.missionId === missionId);
  }

  /** Stage 12F — link an evidence packet onto bridge records for the same zone/alert. */
  linkEvidenceToMissions(packetId: string, alertId: string, zoneId: string): void {
    const next = (this.data.dpalMissions ?? []).map((m) => {
      if (m.linkedEvidencePacketId) return m;
      if (m.sourceAlertId === alertId || m.sourceZoneId === zoneId) {
        return { ...m, linkedEvidencePacketId: packetId, updatedAt: new Date().toISOString() };
      }
      return m;
    });
    this.data.dpalMissions = next;
  }

  /** Stage 12F — compact mission summary for evidence packet `linkedMissions`. */
  getLinkedMissionsSummary(zoneId: string, alertId: string): NonNullable<FloodEvidencePacket['linkedMissions']> {
    return (this.data.dpalMissions ?? [])
      .filter((m) => m.sourceZoneId === zoneId || m.sourceAlertId === alertId)
      .map((m) => ({
        missionId: m.missionId,
        missionType: m.missionType,
        dpalCategory: m.dpalCategory,
        safetyClassification: m.safetyClassification,
        status: m.status,
        createdAt: m.createdAt,
      }));
  }

  /**
   * Stage 12G — generate (and persist) a routing preview for an alert. Always
   * dry-run / preview; this never sends external notifications.
   */
  previewRouting(args: {
    alertId: string;
    generatedBy: string;
    mode?: string;
  }):
    | { ok: true; preview: FloodRoutingPreviewSummary }
    | { ok: false; code: 'not_found' | 'validation_error'; reason: string } {
    const alert = this.data.alerts[args.alertId];
    if (!alert) return { ok: false, code: 'not_found', reason: 'Alert not found.' };
    const zone = getZoneById(alert.zoneId);
    if (!zone) return { ok: false, code: 'not_found', reason: 'Zone for alert not found.' };
    if (!args.generatedBy || typeof args.generatedBy !== 'string' || !args.generatedBy.trim()) {
      return { ok: false, code: 'validation_error', reason: 'generatedBy is required.' };
    }
    const mode: FloodRoutingMode = isValidRoutingMode(args.mode ?? '') ? (args.mode as FloodRoutingMode) : 'dry_run';

    this.recomputeZone(alert.zoneId);
    const fresh = this.data.alerts[args.alertId] ?? alert;
    const agentEvaluation = evaluateZoneForAgents(this, zone);
    const linkedMissions = (this.data.dpalMissions ?? []).filter(
      (m) => m.sourceAlertId === args.alertId || m.sourceZoneId === alert.zoneId,
    );
    const hasSituationRoom = Boolean(this.data.situationRooms[args.alertId]);

    const preview = buildFloodRoutingPreview({
      alert: fresh,
      zone,
      agentEvaluation,
      linkedMissions,
      evidencePacketId: fresh.evidencePacketId ?? null,
      hasSituationRoom,
      generatedBy: args.generatedBy.trim(),
      mode,
    });

    const map = this.data.routingByAlert ?? {};
    const existing = Array.isArray(map[args.alertId]) ? map[args.alertId] : [];
    map[args.alertId] = [preview, ...existing].slice(0, 25);
    this.data.routingByAlert = map;
    this.persist();
    return { ok: true, preview };
  }

  /** Stage 12G — list previews for an alert (newest first). */
  listRoutingForAlert(alertId: string): FloodRoutingPreviewSummary[] {
    return [...(this.data.routingByAlert?.[alertId] ?? [])];
  }

  /** Stage 12G — return the most recent routing preview for evidence packet hashing. */
  getLatestRoutingPreview(alertId: string): FloodRoutingPreviewSummary | null {
    const list = this.data.routingByAlert?.[alertId] ?? [];
    return list.length ? list[0] : null;
  }

  generateEvidencePacket(alertId: string, generatedBy: string): FloodEvidencePacket | null {
    const alert = this.data.alerts[alertId];
    if (!alert) return null;
    this.recomputeZone(alert.zoneId);
    const fresh = this.data.alerts[alertId];
    if (!fresh) return null;

    const weather = this.data.weather[fresh.zoneId] ?? null;
    const cameras = this.data.detections[fresh.zoneId] ?? [];
    const citizenReports = this.data.reports[fresh.zoneId] ?? [];
    const zone = getZoneById(fresh.zoneId);
    if (!zone) return null;
    const riskScore = computeFloodRiskScore({ zone, cameras, citizenReports, weather });
    const agentEvaluation = evaluateZoneForAgents(this, zone);

    const linkedMissions = this.getLinkedMissionsSummary(fresh.zoneId, fresh.alertId);
    const routingPreview = this.getLatestRoutingPreview(alertId);
    const packet = buildFloodEvidencePacket({
      alert: fresh,
      riskScore,
      generatedBy,
      agentEvaluation,
      linkedMissions,
      routingPreview,
    });

    // Stage 12H — surface provenance digests on the packet so the UI can show
    // them without re-deriving. The same digests feed the ledger record.
    packet.rainfallDigest = buildRainfallDigest(weather);
    packet.satelliteDigest = buildSatelliteDigest(weather);
    packet.waterLevelDigest = buildWaterLevelDigest(weather);
    packet.agentFindingsDigest = buildAgentFindingsDigest(agentEvaluation);
    packet.routingPreviewDigest = buildRoutingDigest(routingPreview);
    const latestLedgerId = (this.data.ledgerByAlert ?? {})[alertId]?.[0];
    const latestLedger = latestLedgerId ? this.data.ledgerRecords?.[latestLedgerId] : undefined;
    if (latestLedger) {
      packet.anchoringHash = latestLedger.anchoringHash;
      packet.ledgerAnchor = latestLedger;
    }

    this.data.evidenceByAlert[alertId] = packet;
    fresh.evidencePacketId = packet.packetId;
    fresh.lifecycle = fresh.lifecycle === 'ai_detected' ? 'evidence_assembled' : fresh.lifecycle;
    fresh.updatedAt = new Date().toISOString();
    this.data.alerts[alertId] = fresh;
    this.linkEvidenceToMissions(packet.packetId, alertId, fresh.zoneId);
    this.persist();
    return packet;
  }

  /**
   * Stage 12H — upgraded ledger anchor. Builds a structured `FloodLedgerRecord`
   * including provenance/agent/routing/mission digests, persists it, supersedes
   * older records for the alert, and updates the cached evidence packet so the
   * UI can render the full record without an extra round-trip.
   *
   * Returns a back-compat shape `{ contentHash, ledgerRecordId }` for callers
   * that haven't migrated; full record is also returned via `record`.
   */
  anchorAlert(
    alertId: string,
    options: { createdBy?: string } = {},
  ): { contentHash: string; ledgerRecordId: string; record: FloodLedgerRecord } | null {
    const packet = this.data.evidenceByAlert[alertId];
    if (!packet) return null;
    const alert = this.data.alerts[alertId];
    if (!alert) return null;
    const zone = getZoneById(alert.zoneId);
    if (!zone) return null;

    const weather = this.data.weather[alert.zoneId] ?? null;
    const agentEvaluation = evaluateZoneForAgents(this, zone);
    const routingPreview = this.getLatestRoutingPreview(alertId);
    const linkedMissionIds = (this.data.dpalMissions ?? [])
      .filter((m) => m.sourceAlertId === alertId || m.sourceZoneId === alert.zoneId)
      .map((m) => m.missionId);

    const record = anchorEvidenceFull({
      alert,
      packet,
      weather,
      agentEvaluation,
      routingPreview,
      linkedMissionIds,
      createdBy: options.createdBy ?? 'DPAL Operator',
    });

    // Persist record + supersede older records for this alert.
    const records = { ...(this.data.ledgerRecords ?? {}) };
    const previousIds = [...((this.data.ledgerByAlert ?? {})[alertId] ?? [])];
    for (const oldId of previousIds) {
      const old = records[oldId];
      if (old && old.anchorStatus !== 'superseded' && old.anchorStatus !== 'failed') {
        records[oldId] = { ...old, anchorStatus: 'superseded' };
      }
    }
    records[record.ledgerRecordId] = record;
    this.data.ledgerRecords = records;
    this.data.ledgerByAlert = {
      ...(this.data.ledgerByAlert ?? {}),
      [alertId]: [record.ledgerRecordId, ...previousIds].slice(0, 25),
    };

    // Back-compat anchors map for older callers.
    this.data.anchors[alertId] = {
      contentHash: record.contentHash,
      ledgerRecordId: record.ledgerRecordId,
      anchoredAt: record.anchoredAt,
    };

    // Update alert lifecycle (`human_verified` per existing behavior).
    alert.ledgerAnchorHash = record.anchoringHash;
    alert.lifecycle = 'human_verified';
    alert.updatedAt = new Date().toISOString();
    this.data.alerts[alertId] = alert;

    // Refresh the cached evidence packet so the UI shows the new ledger info.
    const updatedPacket: FloodEvidencePacket = {
      ...packet,
      anchoringHash: record.anchoringHash,
      ledgerAnchor: record,
      ledgerRecordId: record.ledgerRecordId,
      rainfallDigest: record.rainfallDigest,
      satelliteDigest: record.satelliteDigest,
      waterLevelDigest: record.waterLevelDigest,
      agentFindingsDigest: record.agentFindingsDigest,
      routingPreviewDigest: record.routingPreviewDigest,
    };
    this.data.evidenceByAlert[alertId] = updatedPacket;

    this.persist();
    return { contentHash: record.contentHash, ledgerRecordId: record.ledgerRecordId, record };
  }

  /** Stage 12H — fetch a single ledger record by id. */
  getLedgerRecord(ledgerRecordId: string): FloodLedgerRecord | undefined {
    return (this.data.ledgerRecords ?? {})[ledgerRecordId];
  }

  /** Stage 12H — list ledger records for an alert (newest first). */
  listLedgerRecordsForAlert(alertId: string): FloodLedgerRecord[] {
    const ids = (this.data.ledgerByAlert ?? {})[alertId] ?? [];
    return ids
      .map((id) => (this.data.ledgerRecords ?? {})[id])
      .filter((rec): rec is FloodLedgerRecord => Boolean(rec));
  }

  /**
   * Stage 12I — build a public-safe verification view of a ledger record.
   *
   * Privacy contract:
   *   - never expose raw citizen reports, contact info, or operator notes;
   *   - never expose situation-room messages;
   *   - never expose preview message bodies for outbound channels;
   *   - mock/live labeling is preserved verbatim.
   */
  toPublicLedgerRecord(record: FloodLedgerRecord): FloodPublicLedgerRecord {
    const zone = getZoneById(record.zoneId);
    const city = getCities().find((c) => c.cityId === record.cityId);
    const alert = this.data.alerts[record.alertId];

    const verificationStatus: FloodPublicLedgerRecord['verificationStatus'] =
      record.anchorStatus === 'anchored_mock'
        ? 'verified_anchored_mock'
        : record.anchorStatus === 'anchored_live'
          ? 'verified_anchored_live'
          : record.anchorStatus === 'pending'
            ? 'pending_anchor'
            : record.anchorStatus === 'superseded'
              ? 'superseded'
              : record.anchorStatus === 'failed'
                ? 'failed'
                : 'unknown';

    const summaryParts: string[] = [];
    if (alert) {
      summaryParts.push(`Alert level: ${String(alert.level ?? 'unknown')}`);
      if (typeof alert.riskScore === 'number') {
        summaryParts.push(`risk score ${Math.round(alert.riskScore)}/100`);
      }
    }
    if (zone) summaryParts.push(`Zone: ${zone.name}`);
    if (city) summaryParts.push(`City: ${city.name}`);
    if (record.linkedMissionIds.length) {
      summaryParts.push(`${record.linkedMissionIds.length} linked DPAL mission(s)`);
    }
    summaryParts.push(record.isMock ? 'Mock anchor' : 'Live anchor');

    const publicSummary =
      summaryParts.join(' · ') ||
      'DPAL FloodGuard anchored evidence record. See digests for verification.';

    const privacyNotice =
      'Public verification view — private citizen reports, contact details, internal Situation Room messages, and operator notes are intentionally excluded.';

    return {
      ledgerRecordId: record.ledgerRecordId,
      alertId: record.alertId,
      zoneId: record.zoneId,
      zoneName: zone?.name,
      cityId: record.cityId,
      cityName: city?.name,
      evidencePacketId: record.evidencePacketId,
      contentHash: record.contentHash,
      anchoringHash: record.anchoringHash,
      rainfallDigest: record.rainfallDigest,
      satelliteDigest: record.satelliteDigest,
      waterLevelDigest: record.waterLevelDigest,
      agentFindingsDigest: record.agentFindingsDigest,
      routingPreviewDigest: record.routingPreviewDigest,
      linkedMissionIds: [...record.linkedMissionIds],
      qrPayload: record.qrPayload,
      legalDisclaimer: record.legalDisclaimer,
      publicSummary,
      verificationStatus,
      privacyNotice,
      anchorStatus: record.anchorStatus,
      chainProviderLabel: record.chainProviderLabel,
      isMock: record.isMock,
      createdAt: record.createdAt,
      anchoredAt: record.anchoredAt,
      verificationUrl: record.verificationUrl,
    };
  }
}

let singleton: FloodGuardStore | null = null;

export function getFloodGuardStore(): FloodGuardStore {
  if (!singleton) singleton = new FloodGuardStore();
  return singleton;
}
