import { Router, type Request, type Response } from 'express';
import {
  getDroneValidationStatusPayload,
  getHyperspectralPlasticProviderStatus,
  hashPlasticEvidencePayload,
  postDroneValidationRequestParsed,
  runHyperspectralPlasticScan,
} from '../services/hyperspectralPlasticService';
import { buildScanRawFromRequest, parsePlasticWatchScanRaw } from '../services/hyperspectral/scanRequestNormalize';

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

router.get('/drone/status', (_req, res) => {
  try {
    return res.json(getDroneValidationStatusPayload());
  } catch (error) {
    console.error('Hyperspectral plastic drone status error:', error);
    return res.status(500).json({ ok: false, error: 'drone_status_failed' });
  }
});

router.post('/drone/validation-request', (req, res) => {
  try {
    const parsed = postDroneValidationRequestParsed(req.body);
    if (!parsed.ok) {
      return res.status(400).json({ ok: false, error: parsed.error });
    }
    return res.json({ ok: true, ...parsed.body });
  } catch (error) {
    console.error('Hyperspectral plastic drone validation-request error:', error);
    return res.status(500).json({ ok: false, error: 'drone_validation_request_failed' });
  }
});

async function executePlasticScan(req: Request, res: Response): Promise<void> {
  const raw = buildScanRawFromRequest(req);
  const parsed = parsePlasticWatchScanRaw(raw);
  if (!parsed.ok) {
    res.status(400).json({ ok: false, error: parsed.error });
    return;
  }
  const { compactScenes, includeFullSceneLinks, ...scanFields } = parsed.value;
  try {
    const payload = await runHyperspectralPlasticScan({
      ...scanFields,
      compactScenes,
      includeFullSceneLinks,
    });
    res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'scan_failed';
    if (message.includes('Invalid baseline')) {
      res.status(400).json({ ok: false, error: message });
      return;
    }
    console.error('Hyperspectral plastic scan error:', error);
    res.status(500).json({ ok: false, error: 'scan_failed' });
  }
}

router.get('/scan', (req, res) => {
  void executePlasticScan(req, res);
});

router.post('/scan', (req, res) => {
  void executePlasticScan(req, res);
});

router.post('/evidence-packet', (req, res) => {
  try {
    const body = req.body ?? {};
    const scan = body.scan as Record<string, unknown> | undefined;
    if (!scan || scan.ok !== true) {
      return res.status(400).json({
        ok: false,
        error:
          'Body must include { scan } where scan is the JSON from GET or POST /api/hyperspectral-plastic-watch/scan.',
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
        plasticRisk: scan.plasticRisk,
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
