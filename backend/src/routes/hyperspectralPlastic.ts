import { Router } from 'express';
import {
  getHyperspectralPlasticProviderStatus,
  hashPlasticEvidencePayload,
  normalizePlasticEnvironmentType,
  runHyperspectralPlasticScan,
} from '../services/hyperspectralPlasticService';

const router = Router();

router.get('/provider-status', async (_req, res) => {
  try {
    const payload = await getHyperspectralPlasticProviderStatus();
    return res.json(payload);
  } catch (error) {
    console.error('Hyperspectral plastic provider-status error:', error);
    return res.status(500).json({ ok: false, error: 'provider_status_failed' });
  }
});

router.get('/scan', async (req, res) => {
  const lat = Number.parseFloat(String(req.query.lat ?? ''));
  const lng = Number.parseFloat(String(req.query.lng ?? ''));
  const radiusKm = Number.parseFloat(String(req.query.radiusKm ?? '10'));
  const label = String(req.query.label ?? '').trim();
  const baselineDate = String(req.query.baselineDate ?? '').trim();
  const currentDate = String(req.query.currentDate ?? '').trim();
  const environmentType = normalizePlasticEnvironmentType(String(req.query.environmentType ?? 'river'));
  let polygon: unknown;
  if (typeof req.query.polygon === 'string' && req.query.polygon.length > 0) {
    try {
      polygon = JSON.parse(req.query.polygon) as unknown;
    } catch {
      return res.status(400).json({ ok: false, error: 'polygon must be valid JSON when provided' });
    }
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ ok: false, error: 'lat and lng are required' });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ ok: false, error: 'lat/lng out of range' });
  }
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 250) {
    return res.status(400).json({ ok: false, error: 'radiusKm must be between 0 and 250' });
  }
  if (!baselineDate || !currentDate) {
    return res.status(400).json({ ok: false, error: 'baselineDate and currentDate (ISO) are required' });
  }

  try {
    const payload = await runHyperspectralPlasticScan({
      lat,
      lng,
      label: label || undefined,
      radiusKm,
      baselineDate,
      currentDate,
      environmentType,
      polygon,
    });
    return res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'scan_failed';
    if (message.includes('Invalid baseline')) {
      return res.status(400).json({ ok: false, error: message });
    }
    console.error('Hyperspectral plastic scan error:', error);
    return res.status(500).json({ ok: false, error: 'scan_failed' });
  }
});

router.post('/evidence-packet', (req, res) => {
  try {
    const body = req.body ?? {};
    const scan = body.scan as Record<string, unknown> | undefined;
    if (!scan || scan.ok !== true) {
      return res.status(400).json({
        ok: false,
        error: 'Body must include { scan } where scan is the JSON from GET /api/hyperspectral-plastic/scan.',
      });
    }
    const packet = {
      kind: 'dpal_hyperspectral_plastic_watch_evidence_v1' as const,
      generatedAt: new Date().toISOString(),
      scan,
      disclaimer:
        'DPAL Hyperspectral Plastic Watch provides evidence-support signals only. Satellite spectral anomalies are not final proof of plastic pollution and must be reviewed with field sampling, drone imagery, water-quality context, and independent validation.',
    };
    const integrityHash = hashPlasticEvidencePayload(packet);
    return res.json({
      ok: true,
      integrityHash,
      qrPayloadPreview: {
        type: 'dpal_hyperspectral_plastic_watch',
        integrityHash,
        scanId: scan.scanId,
        label: scan.label,
        generatedAt: packet.generatedAt,
        plasticRiskScore: scan.plasticRiskScore,
        riskLevel: scan.riskLevel,
      },
      packet,
    });
  } catch (error) {
    console.error('Hyperspectral plastic evidence-packet error:', error);
    return res.status(500).json({ ok: false, error: 'evidence_packet_failed' });
  }
});

export default router;
