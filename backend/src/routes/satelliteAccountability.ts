import { Router } from 'express';
import {
  runAnalyze,
  runEvidencePacketShell,
  getProviderStatusResponse,
  runModuleStatus,
  runNormalizeSignals,
} from '../services/satelliteAccountabilityService';

const router = Router();

router.get('/provider-status', (_req, res) => {
  return res.json(getProviderStatusResponse());
});

router.get('/module-status', (_req, res) => {
  return res.json(runModuleStatus());
});

router.post('/normalize-signals', (req, res) => {
  try {
    const payload = runNormalizeSignals(req.body ?? {});
    return res.json(payload);
  } catch (e) {
    console.error('satellite-accountability normalize-signals', e);
    return res.status(500).json({ ok: false, error: 'normalize_failed' });
  }
});

router.post('/analyze', (req, res) => {
  try {
    const payload = runAnalyze(req.body ?? {});
    return res.json(payload);
  } catch (e) {
    console.error('satellite-accountability analyze', e);
    return res.status(500).json({ ok: false, error: 'analyze_failed' });
  }
});

router.post('/evidence-packet', (req, res) => {
  try {
    const payload = runEvidencePacketShell(req.body ?? {});
    if (!payload.ok) return res.status(400).json(payload);
    return res.json(payload);
  } catch (e) {
    console.error('satellite-accountability evidence-packet', e);
    return res.status(500).json({ ok: false, error: 'evidence_packet_failed' });
  }
});

export default router;
