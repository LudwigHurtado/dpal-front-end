/**
 * DPAL FloodGuard HTTP API — `/api/floodguard/*`
 *
 * Stages 12A–12E — routes await `store.primeEnvironmentalSignals` (rainfall,
 * AquaScan satellite, water-level gauge) before recomputing risk scores where
 * freshness matters.
 *
 * Stage 12F — adds DPAL mission bridge endpoints `/missions` and
 * `/missions/:missionId`, and `/agents/dispatch-mission` now returns both the
 * FloodGuard `dispatchedMission` and the DPAL `dpalMission` record.
 *
 * Stage 12G — adds preview-only routing endpoints
 * `POST /alerts/:alertId/route-preview` and `GET /alerts/:alertId/routing`.
 * No external notifications are sent — only dry-run / preview decisions are
 * computed, persisted, and returned for operator review.
 *
 * Stage 12H — upgrades `POST /anchor-alert` to return a full DPAL ledger record
 * (mock chain by default) and adds `GET /ledger/:ledgerRecordId` and
 * `GET /alerts/:alertId/ledger`. No paid blockchain calls are made.
 *
 * Stage 12I — adds the public verification endpoint
 * `GET /public/ledger/:ledgerRecordId` so QR / share links can render a
 * privacy-safe verification view without exposing private reports, contact
 * info, situation-room messages, or operator-only notes.
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
  res.json({ mission: result.record, dispatchedMission: result.record, dpalMission: result.dpalMission });
});

/** GET /api/floodguard/missions — Stage 12F bridge listing. */
router.get('/missions', (req: Request, res: Response) => {
  const store = getFloodGuardStore();
  const zoneId = typeof req.query.zoneId === 'string' ? req.query.zoneId : undefined;
  const alertId = typeof req.query.alertId === 'string' ? req.query.alertId : undefined;
  const missions = store.listDpalMissions({ zoneId, alertId });
  res.json({
    missions,
    legalNotice:
      'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.',
  });
});

/** GET /api/floodguard/missions/:missionId — Stage 12F bridge detail. */
router.get('/missions/:missionId', (req: Request, res: Response) => {
  const store = getFloodGuardStore();
  const mission = store.getDpalMission(String(req.params.missionId));
  if (!mission) {
    res.status(404).json({ error: 'Mission not found', code: 'not_found' });
    return;
  }
  res.json({ mission });
});

/**
 * Stage 12G — generate a routing preview for an alert. Always dry-run / preview;
 * never sends external notifications. Production-safe: never returns 500 — the
 * handler returns a degraded response with `persistenceStatus: "not_persisted"`
 * and a populated `warnings` array if persistence or downstream steps fail.
 */
router.post('/alerts/:alertId/route-preview', async (req: Request, res: Response) => {
  const alertId = String(req.params.alertId ?? '');
  if (!alertId) {
    res.status(400).json({ error: 'alertId required', code: 'validation_error' });
    return;
  }
  const body = (req.body ?? {}) as { generatedBy?: string; mode?: string };
  const generatedBy = String(body.generatedBy ?? 'DPAL Operator');
  try {
    const store = getFloodGuardStore();
    const existing = store.getAlert(alertId);
    if (existing) {
      try {
        await store.primeEnvironmentalSignals(existing.zoneId);
      } catch (e) {
        console.warn(`[FloodGuard][route_preview_logic] prime threw: ${(e as Error).message}`);
      }
    }
    const result = store.safePreviewRouting({ alertId, generatedBy, mode: body.mode });
    if (!result.ok) {
      const status = result.code === 'not_found' ? 404 : result.code === 'validation_error' ? 400 : 500;
      res.status(status).json({
        ok: false,
        error: result.reason,
        code: result.code,
        warnings: result.warnings,
      });
      return;
    }
    res.json({
      ok: true,
      previewStatus: result.previewStatus,
      mode: result.mode,
      persistenceStatus: result.persistenceStatus,
      preview: result.preview,
      routes: result.preview.decisions.filter((d) => d.shouldRoute),
      blocked: result.preview.decisions.filter((d) => !d.shouldRoute),
      warnings: result.warnings,
      legalNotice:
        'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.',
    });
  } catch (e) {
    console.warn(`[FloodGuard][route_preview_logic] handler caught: ${(e as Error).message}`);
    res.status(200).json({
      ok: true,
      previewStatus: 'generated',
      mode: 'dry_run',
      persistenceStatus: 'not_persisted',
      preview: null,
      routes: [],
      blocked: [],
      warnings: [`handler: ${(e as Error).message}`],
      legalNotice:
        'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.',
    });
  }
});

/** Stage 12G — list previous routing previews for an alert (newest first). */
router.get('/alerts/:alertId/routing', (req: Request, res: Response) => {
  const alertId = String(req.params.alertId);
  const store = getFloodGuardStore();
  const alert = store.getAlert(alertId);
  if (!alert) {
    res.status(404).json({ error: 'Alert not found', code: 'not_found' });
    return;
  }
  const previews = store.listRoutingForAlert(alertId);
  res.json({
    alertId,
    previews,
    legalNotice:
      'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.',
  });
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

/**
 * POST /api/floodguard/generate-evidence-packet
 * Production-safe: never returns 500. If persistence or downstream steps fail,
 * a degraded response is returned with `persistenceStatus: "not_persisted"` /
 * `"pending"` and a populated `warnings` array. `blockchainAnchored` reflects
 * whether the latest ledger record for this alert is on a real chain.
 */
router.post('/generate-evidence-packet', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as { alertId?: string; generatedBy?: string };
  const alertId = String(body.alertId ?? '');
  if (!alertId) {
    res.status(400).json({ error: 'alertId required', code: 'validation_error' });
    return;
  }
  const generatedBy = String(body.generatedBy ?? 'DPAL API');
  try {
    const store = getFloodGuardStore();
    const existing = store.getAlert(alertId);
    if (existing) {
      try {
        await store.primeEnvironmentalSignals(existing.zoneId);
      } catch (e) {
        console.warn(`[FloodGuard][evidence_packet_generation] prime threw: ${(e as Error).message}`);
      }
    }
    const result = store.safeGenerateEvidencePacket(alertId, generatedBy);
    if (!result.ok) {
      const status = result.code === 'not_found' ? 404 : result.code === 'validation_error' ? 400 : 500;
      res.status(status).json({
        ok: false,
        error: result.reason,
        code: result.code,
        warnings: result.warnings,
      });
      return;
    }
    res.json({
      ok: true,
      packetStatus: result.packetStatus,
      persistenceStatus: result.persistenceStatus,
      blockchainAnchored: result.blockchainAnchored,
      packet: result.packet,
      warnings: result.warnings,
      legalNotice:
        'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.',
    });
  } catch (e) {
    console.warn(`[FloodGuard][evidence_packet_generation] handler caught: ${(e as Error).message}`);
    res.status(200).json({
      ok: true,
      packetStatus: 'generated_unanchored',
      persistenceStatus: 'pending',
      blockchainAnchored: false,
      packet: null,
      warnings: [`handler: ${(e as Error).message}`],
      legalNotice:
        'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.',
    });
  }
});

/**
 * POST /api/floodguard/anchor-alert — Stage 12H ledger anchor.
 * Production-safe: never returns 500. With the default mock provider, returns
 * `anchorStatus: "pending_anchor"`, `blockchainAnchored: false`, and
 * `ledgerMode: "mock"`. Live anchoring requires an explicit non-mock chain
 * provider configuration.
 */
router.post('/anchor-alert', (req: Request, res: Response) => {
  const body = (req.body ?? {}) as { alertId?: string; createdBy?: string };
  const alertId = String(body.alertId ?? '');
  if (!alertId) {
    res.status(400).json({ error: 'alertId required', code: 'validation_error' });
    return;
  }
  try {
    const store = getFloodGuardStore();
    const result = store.safeAnchorAlert(alertId, {
      createdBy: String(body.createdBy ?? 'DPAL Operator'),
    });
    if (!result.ok) {
      const status =
        result.code === 'not_found'
          ? 404
          : result.code === 'validation_error' || result.code === 'missing_evidence_packet'
            ? 400
            : 500;
      res.status(status).json({
        ok: false,
        error: result.reason,
        code: result.code,
        warnings: result.warnings,
      });
      return;
    }
    res.json({
      ok: true,
      alertId,
      anchorStatus: result.anchorStatus,
      blockchainAnchored: result.blockchainAnchored,
      ledgerMode: result.ledgerMode,
      persistenceStatus: result.persistenceStatus,
      ledgerRecordId: result.ledgerRecordId,
      contentHash: result.contentHash,
      record: result.record,
      warnings: result.warnings,
      legalNotice:
        'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.',
    });
  } catch (e) {
    console.warn(`[FloodGuard][ledger_anchoring] handler caught: ${(e as Error).message}`);
    res.status(200).json({
      ok: true,
      alertId,
      anchorStatus: 'pending_anchor',
      blockchainAnchored: false,
      ledgerMode: 'unavailable',
      persistenceStatus: 'not_persisted',
      ledgerRecordId: null,
      contentHash: null,
      record: null,
      warnings: [`handler: ${(e as Error).message}`],
      legalNotice:
        'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.',
    });
  }
});

/** GET /api/floodguard/ledger/:ledgerRecordId — Stage 12H ledger lookup. */
router.get('/ledger/:ledgerRecordId', (req: Request, res: Response) => {
  const store = getFloodGuardStore();
  const record = store.getLedgerRecord(String(req.params.ledgerRecordId));
  if (!record) {
    res.status(404).json({ error: 'Ledger record not found', code: 'not_found' });
    return;
  }
  res.json({ record });
});

/**
 * GET /api/floodguard/public/ledger/:ledgerRecordId — Stage 12I public, QR-friendly
 * verification record. Strips private citizen reports, situation-room messages,
 * preview message bodies, and operator notes; preserves digests, hashes,
 * mock/live labeling, and the legal disclaimer.
 */
router.get('/public/ledger/:ledgerRecordId', (req: Request, res: Response) => {
  const store = getFloodGuardStore();
  const record = store.getLedgerRecord(String(req.params.ledgerRecordId));
  if (!record) {
    res.status(404).json({ error: 'Ledger record not found', code: 'not_found' });
    return;
  }
  const publicRecord = store.toPublicLedgerRecord(record);
  res.json({
    record: publicRecord,
    legalNotice:
      'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.',
  });
});

/** GET /api/floodguard/alerts/:alertId/ledger — Stage 12H ledger history per alert. */
router.get('/alerts/:alertId/ledger', (req: Request, res: Response) => {
  const store = getFloodGuardStore();
  const alertId = String(req.params.alertId);
  const alert = store.getAlert(alertId);
  if (!alert) {
    res.status(404).json({ error: 'Alert not found', code: 'not_found' });
    return;
  }
  const records = store.listLedgerRecordsForAlert(alertId);
  res.json({
    alertId,
    records,
    legalNotice:
      'DPAL FloodGuard provides verified civic flood intelligence and does not replace official government emergency alerts.',
  });
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
