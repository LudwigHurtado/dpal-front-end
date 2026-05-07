/**
 * DPAL FloodGuard HTTP API — `/api/floodguard/*`
 *
 * Stages 12A–12E — routes await `store.primeEnvironmentalSignals` (rainfall,
 * AquaScan satellite, water-level gauge) before recomputing risk scores where
 * freshness matters.
 */

import { Router, type Request, type Response } from 'express';
import { getCities, getZoneById } from '../services/floodGuard/floodCityZoneService';
import {
  buildCameraDetection,
  resolveZoneForCamera,
  type CameraAlertBody,
} from '../services/floodGuard/floodCameraAlertService';
import {
  buildCitizenReport,
  resolveZoneForCitizen,
  type CitizenReportBody,
} from '../services/floodGuard/floodCitizenReportService';
import { getFloodGuardStore } from '../services/floodGuard/floodGuardStore';
import { runFloodAgentMonitor } from '../services/floodGuard/agents/floodAgentOrchestrator';
import { rainfallAdapterHealth } from '../services/floodGuard/floodRainfallAdapter';
import { satelliteAdapterHealth } from '../services/floodGuard/floodSatelliteAdapter';
import { waterLevelAdapterHealth } from '../services/floodGuard/floodWaterLevelAdapter';
import type {
  FloodAlert,
  FloodIntegrationStatus,
} from '../services/floodGuard/floodGuardTypes';

const router = Router();

type FloodGuardStoreInstance = ReturnType<typeof getFloodGuardStore>;

function buildIntegrationMeta(
  alerts: FloodAlert[] = [],
  opts?: { includeSatelliteForZoneId?: string; includeWaterLevelForZoneId?: string; store?: FloodGuardStoreInstance },
): FloodIntegrationStatus {
  const health = rainfallAdapterHealth();
  const satHealth = satelliteAdapterHealth();
  const wlHealth = waterLevelAdapterHealth();
  // Aggregate the per-zone rainfall samples carried by current alerts so the
  // dashboard can show provenance per zone without an extra round-trip.
  const samples = alerts
    .map((a) => {
      const w = a.signalSnapshot.weather;
      const meta = w?.rainfallMeta;
      if (!w || !meta) return null;
      return {
        zoneId: a.zoneId,
        rainfall30mMm: w.rainfall30mMm,
        rainfall24hMm: w.rainfall24hMm,
        intensityMmPerHr: meta.intensityMmPerHr ?? w.rainfall30mMm * 2,
        status: meta.status,
        provider: meta.provider,
        fetchedAt: meta.fetchedAt,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const satSamples = alerts
    .map((a) => {
      const sm = a.signalSnapshot.weather?.satelliteMeta;
      if (!sm) return null;
      return {
        zoneId: a.zoneId,
        ndwiMean: sm.ndwiMean,
        waterExtentSqKm: sm.waterExtentSqKm,
        previousWaterExtentSqKm: sm.previousWaterExtentSqKm,
        waterExpansionPercent: sm.waterExpansionPercent,
        floodWetConfidence: sm.floodWetConfidence,
        isLive: sm.isLive,
        status: sm.status,
        provider: sm.provider,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  if (opts?.includeSatelliteForZoneId && opts.store) {
    const w = opts.store.getWeatherSnapshot(opts.includeSatelliteForZoneId);
    const sm = w?.satelliteMeta;
    if (sm && !satSamples.some((s) => s.zoneId === sm.zoneId)) {
      satSamples.push({
        zoneId: sm.zoneId,
        ndwiMean: sm.ndwiMean,
        waterExtentSqKm: sm.waterExtentSqKm,
        previousWaterExtentSqKm: sm.previousWaterExtentSqKm,
        waterExpansionPercent: sm.waterExpansionPercent,
        floodWetConfidence: sm.floodWetConfidence,
        isLive: sm.isLive,
        status: sm.status,
        provider: sm.provider,
      });
    }
  }

  const wlSamples = alerts
    .map((a) => {
      const wl = a.signalSnapshot.weather?.waterLevelMeta;
      if (!wl) return null;
      return {
        zoneId: a.zoneId,
        gaugeId: wl.gaugeId,
        gaugeName: wl.gaugeName,
        gaugeType: wl.gaugeType,
        waterLevelMeters: wl.waterLevelMeters,
        criticalLevelMeters: wl.criticalLevelMeters,
        levelPercentOfCritical: wl.levelPercentOfCritical,
        trend: wl.trend,
        status: wl.status,
        provider: wl.provider,
        isLive: wl.isLive,
        fetchedAt: wl.fetchedAt,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  if (opts?.includeWaterLevelForZoneId && opts.store) {
    const w = opts.store.getWeatherSnapshot(opts.includeWaterLevelForZoneId);
    const wl = w?.waterLevelMeta;
    if (wl && !wlSamples.some((s) => s.zoneId === wl.zoneId)) {
      wlSamples.push({
        zoneId: wl.zoneId,
        gaugeId: wl.gaugeId,
        gaugeName: wl.gaugeName,
        gaugeType: wl.gaugeType,
        waterLevelMeters: wl.waterLevelMeters,
        criticalLevelMeters: wl.criticalLevelMeters,
        levelPercentOfCritical: wl.levelPercentOfCritical,
        trend: wl.trend,
        status: wl.status,
        provider: wl.provider,
        isLive: wl.isLive,
        fetchedAt: wl.fetchedAt,
      });
    }
  }

  return {
    rainfall: {
      available: true, // adapter always returns a sample (live OR fallback)
      status: health.enabled ? 'live' : 'fallback',
      provider: health.provider,
      providerLabel: health.providerLabel,
      message: health.message,
      attribution: health.enabled ? 'Open-Meteo (https://open-meteo.com)' : undefined,
      upstreamUrl: health.enabled ? 'https://api.open-meteo.com/v1/forecast' : undefined,
      samples: samples.length ? samples : undefined,
    },
    satellite: {
      available: true,
      status: satHealth.status,
      provider: satHealth.provider,
      providerLabel: satHealth.providerLabel,
      message: satHealth.message,
      attribution: satHealth.enabled
        ? 'Copernicus Sentinel data processed via DPAL AquaScan overlay routes.'
        : undefined,
      upstreamUrl: satHealth.upstreamUrl,
      samples: satSamples.length ? satSamples : undefined,
    },
    waterLevel: {
      available: true,
      status: wlHealth.status,
      provider: wlHealth.provider,
      providerLabel: wlHealth.providerLabel,
      message: wlHealth.message,
      attribution: wlHealth.liveEnabled ? undefined : 'Deterministic DPAL gauge continuity layer.',
      samples: wlSamples.length ? wlSamples : undefined,
    },
    ledger: {
      available: true,
      message: 'SHA-256 placeholder anchor; swap for on-chain DPAL ledger when ready.',
    },
    routing: {
      available: false,
      message: 'Outbound SMS/email/push/webhooks not implemented on this deployment.',
    },
  };
}

/** GET /api/floodguard/agents/monitor — Stage 12C agentic evaluation for all Geo-IDs. */
router.get('/agents/monitor', async (_req: Request, res: Response) => {
  const store = getFloodGuardStore();
  await store.primeEnvironmentalForAllRegisteredZones();
  res.json(runFloodAgentMonitor(store));
});

/** POST /api/floodguard/agents/dispatch-mission — safe mission catalog + live safety gate. */
router.post('/agents/dispatch-mission', async (req: Request, res: Response) => {
  const body = req.body as {
    zoneId?: string;
    missionType?: string;
    requestedBy?: string;
    safetyClassification?: string;
  };
  const zoneId = String(body.zoneId ?? '');
  if (!zoneId) {
    res.status(400).json({ error: 'zoneId required', code: 'validation_error' });
    return;
  }
  const store = getFloodGuardStore();
  await store.primeEnvironmentalSignals(zoneId);
  const result = store.dispatchMission({
    zoneId,
    missionType: String(body.missionType ?? ''),
    requestedBy: String(body.requestedBy ?? ''),
    safetyClassification: String(body.safetyClassification ?? ''),
  });
  if (!result.ok) {
    res.status(400).json({ error: result.reason, code: result.code });
    return;
  }
  res.json({ mission: result.record });
});

/** GET /api/floodguard/cities */
router.get('/cities', (_req: Request, res: Response) => {
  res.json({ cities: getCities() });
});

/** GET /api/floodguard/cities/:cityId/zones */
router.get('/cities/:cityId/zones', (req: Request, res: Response) => {
  const store = getFloodGuardStore();
  const zones = store.listZonesForCity(String(req.params.cityId));
  if (!zones.length) {
    res.status(404).json({ error: 'City not found', code: 'not_found' });
    return;
  }
  res.json({ zones });
});

/** GET /api/floodguard/zones/:zoneId/status */
router.get('/zones/:zoneId/status', async (req: Request, res: Response) => {
  const zoneId = String(req.params.zoneId);
  const zone = getZoneById(zoneId);
  if (!zone) {
    res.status(404).json({ error: 'Zone not found', code: 'not_found' });
    return;
  }
  const store = getFloodGuardStore();
  await store.getZoneStatusLive(zoneId);
  const status = store.getActiveAlertForZone(zoneId);
  res.json({
    status,
    integrations: buildIntegrationMeta(status ? [status] : [], {
      includeSatelliteForZoneId: zoneId,
      includeWaterLevelForZoneId: zoneId,
      store,
    }),
  });
});

/** POST /api/floodguard/camera-alert */
router.post('/camera-alert', async (req: Request, res: Response) => {
  const body = req.body as CameraAlertBody;
  if (!body?.cameraId || typeof body.confidence !== 'number' || !body.label) {
    res.status(400).json({
      error: 'Invalid body',
      code: 'validation_error',
      message: 'cameraId, label, and confidence are required.',
    });
    return;
  }

  const zoneRes = resolveZoneForCamera(body);
  if (!zoneRes.ok) {
    res.status(400).json({ error: zoneRes.error, code: 'zone_resolution_failed' });
    return;
  }

  const detection = buildCameraDetection(body, zoneRes.zone);
  const store = getFloodGuardStore();
  await store.primeEnvironmentalSignals(zoneRes.zone.zoneId);
  const alert = store.addDetection(detection);
  res.json({ accepted: true as const, alert: alert ?? undefined, detection });
});

/** POST /api/floodguard/citizen-report */
router.post('/citizen-report', async (req: Request, res: Response) => {
  const body = req.body as CitizenReportBody;
  if (!body?.description || typeof body.description !== 'string') {
    res.status(400).json({
      error: 'Invalid body',
      code: 'validation_error',
      message: 'description is required.',
    });
    return;
  }

  const zoneRes = resolveZoneForCitizen(body);
  if (!zoneRes.ok) {
    res.status(400).json({ error: zoneRes.error, code: 'zone_resolution_failed' });
    return;
  }

  const report = buildCitizenReport(body, zoneRes.zone);
  const store = getFloodGuardStore();
  await store.primeEnvironmentalSignals(zoneRes.zone.zoneId);
  const alert = store.addReport(report);
  res.json({ accepted: true as const, alert: alert ?? undefined, report });
});

/** POST /api/floodguard/generate-evidence-packet */
router.post('/generate-evidence-packet', async (req: Request, res: Response) => {
  const alertId = String((req.body as { alertId?: string })?.alertId ?? '');
  if (!alertId) {
    res.status(400).json({ error: 'alertId required', code: 'validation_error' });
    return;
  }
  const store = getFloodGuardStore();
  const generatedBy = String((req.body as { generatedBy?: string })?.generatedBy ?? 'DPAL API');
  // Make sure the freshest rainfall sample is on the alert's zone before we
  // hash. The packet body therefore embeds rainfall provenance in the SHA-256.
  const existing = store.getAlert(alertId);
  if (existing) await store.primeEnvironmentalSignals(existing.zoneId);
  const packet = store.generateEvidencePacket(alertId, generatedBy);
  if (!packet) {
    res.status(404).json({ error: 'Alert not found', code: 'not_found' });
    return;
  }
  res.json({ packet });
});

/** POST /api/floodguard/anchor-alert */
router.post('/anchor-alert', (req: Request, res: Response) => {
  const alertId = String((req.body as { alertId?: string })?.alertId ?? '');
  if (!alertId) {
    res.status(400).json({ error: 'alertId required', code: 'validation_error' });
    return;
  }
  const store = getFloodGuardStore();
  const anchor = store.anchorAlert(alertId);
  if (!anchor) {
    res.status(400).json({
      error: 'Evidence packet must be generated before anchoring.',
      code: 'missing_evidence_packet',
    });
    return;
  }
  res.json({ alertId, ledgerRecordId: anchor.ledgerRecordId, contentHash: anchor.contentHash });
});

/** GET /api/floodguard/alerts/live */
router.get('/alerts/live', async (_req: Request, res: Response) => {
  const store = getFloodGuardStore();
  const alerts = await store.listLiveAlertsLive();
  res.json({ alerts, integrations: buildIntegrationMeta(alerts) });
});

/** GET /api/floodguard/alerts/:alertId */
router.get('/alerts/:alertId', async (req: Request, res: Response) => {
  const store = getFloodGuardStore();
  const alertId = String(req.params.alertId);
  const existing = store.getAlert(alertId);
  if (existing) await store.primeEnvironmentalSignals(existing.zoneId);
  const alert = store.getAlert(alertId);
  if (!alert) {
    res.status(404).json({ error: 'Alert not found', code: 'not_found' });
    return;
  }
  res.json({ alert, integrations: buildIntegrationMeta([alert]) });
});

/** GET /api/floodguard/situation/:alertId */
router.get('/situation/:alertId', (req: Request, res: Response) => {
  const store = getFloodGuardStore();
  const room = store.getSituation(String(req.params.alertId));
  if (!room) {
    res.status(404).json({ error: 'Situation room not found', code: 'not_found' });
    return;
  }
  res.json({ room });
});

export default router;
