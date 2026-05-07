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
  FloodEvidencePacket,
  FloodSituationMessage,
  FloodSituationRoom,
  FloodWeatherSignal,
  FloodZone,
} from './floodGuardTypes';
import { computeFloodRiskScore } from './floodRiskEngine';
import { draftFloodAlert, settingsForCity } from './floodAlertRouter';
import { buildSyntheticRainfallSignal, getRainfallSample } from './floodRainfallAdapter';
import { getSatelliteSample } from './floodSatelliteAdapter';
import { cloneZone, getZoneById, getZonesForCity } from './floodCityZoneService';
import { buildFloodEvidencePacket } from './floodEvidencePacketService';
import { anchorEvidenceOnLedger } from './floodLedgerService';

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
  version: 1;
  detections: Record<string, FloodCameraDetection[]>;
  reports: Record<string, FloodCitizenReport[]>;
  weather: Record<string, FloodWeatherSignal>;
  alerts: Record<string, FloodAlert>;
  activeByZone: Record<string, string>;
  situationRooms: Record<string, FloodSituationRoom>;
  evidenceByAlert: Record<string, FloodEvidencePacket>;
  anchors: Record<string, { contentHash: string; ledgerRecordId: string; anchoredAt: string }>;
}

function emptyPersisted(): PersistedShape {
  return {
    version: 1,
    detections: {},
    reports: {},
    weather: {},
    alerts: {},
    activeByZone: {},
    situationRooms: {},
    evidenceByAlert: {},
    anchors: {},
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

class FloodGuardStore {
  private data: PersistedShape = emptyPersisted();

  constructor() {
    this.loadOrSeed();
  }

  private loadOrSeed(): void {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf8');
        const parsed = JSON.parse(raw) as PersistedShape;
        if (parsed?.version === 1 && parsed.alerts && parsed.detections) {
          this.data = parsed;
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
        riverGaugeMeters: base?.riverGaugeMeters,
        riverDeltaMeters: base?.riverDeltaMeters,
        satelliteWaterExpansionPct: base?.satelliteWaterExpansionPct,
        satelliteMeta: base?.satelliteMeta,
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
      riverGaugeMeters: base?.riverGaugeMeters,
      riverDeltaMeters: base?.riverDeltaMeters,
      satelliteWaterExpansionPct: base?.satelliteWaterExpansionPct ?? sample.signal.satelliteWaterExpansionPct,
      satelliteMeta: base?.satelliteMeta ?? sample.signal.satelliteMeta,
    };
    this.data.weather[zoneId] = merged;
    return merged;
  }

  /** Prime rainfall + satellite (Stages 12A/12B) for every zone we track. */
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

  /** Rainfall (12A) then satellite water (12B) for one zone. */
  async primeEnvironmentalSignals(zoneId: string): Promise<void> {
    await this.primeRainfall(zoneId);
    await this.primeSatellite(zoneId);
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

    const packet = buildFloodEvidencePacket({ alert: fresh, riskScore, generatedBy });
    this.data.evidenceByAlert[alertId] = packet;
    fresh.evidencePacketId = packet.packetId;
    fresh.lifecycle = fresh.lifecycle === 'ai_detected' ? 'evidence_assembled' : fresh.lifecycle;
    fresh.updatedAt = new Date().toISOString();
    this.data.alerts[alertId] = fresh;
    this.persist();
    return packet;
  }

  anchorAlert(alertId: string): { contentHash: string; ledgerRecordId: string } | null {
    const packet = this.data.evidenceByAlert[alertId];
    if (!packet) return null;
    const anchor = anchorEvidenceOnLedger(packet.contentHash, alertId);
    this.data.anchors[alertId] = anchor;
    const alert = this.data.alerts[alertId];
    if (alert) {
      alert.ledgerAnchorHash = anchor.contentHash;
      alert.lifecycle = 'human_verified';
      alert.updatedAt = new Date().toISOString();
      this.data.alerts[alertId] = alert;
    }
    this.persist();
    return { contentHash: anchor.contentHash, ledgerRecordId: anchor.ledgerRecordId };
  }
}

let singleton: FloodGuardStore | null = null;

export function getFloodGuardStore(): FloodGuardStore {
  if (!singleton) singleton = new FloodGuardStore();
  return singleton;
}
