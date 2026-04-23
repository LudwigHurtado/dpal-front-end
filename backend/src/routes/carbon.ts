import { Router } from 'express';
import { carbonGasAdapter } from '../services/adapters/carbonGas.adapter';
import { mineralAdapter } from '../services/adapters/mineral.adapter';

const router = Router();
type QrRegistryPayload = {
  projectCode: string;
  projectName: string;
  aoiId: string;
  siteName: string;
  coordinates: { latitude: number; longitude: number; formatted: string };
  region: string;
  country: string;
  boundary: {
    name: string;
    hectares: number;
    polygonEstimateHa: number;
    points: Array<{ lat: number; lng: number }>;
    gpsPolygon: Array<{ lat: number; lng: number }>;
    color: string;
  };
  monitoringPeriod: { start: string; end: string; months: number };
  aiReading: {
    modelVersion: string;
    sourceStack: string;
    activeLayer: string;
    scanReadiness: string;
    confidence: number;
    lastScanAt: string;
  };
  result: {
    grossProjectCo2e: number;
    grossBaselineCo2e: number;
    netCreditableCo2e: number;
    viuEligible: number;
    readiness: string;
  };
};

type QrRegistryEntry = {
  id: string;
  registryUrl: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  payload: QrRegistryPayload;
};

const qrRegistryStore = new Map<string, QrRegistryEntry>();

const buildRegistryEntry = (
  payload: QrRegistryPayload,
  favorite = false,
  existingId?: string,
  baseHost?: string,
): QrRegistryEntry => {
  const now = new Date().toISOString();
  const id = existingId ?? `qr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const configuredBase = process.env.PUBLIC_API_BASE?.trim().replace(/\/+$/, '') || '';
  const registryUrl = `${baseHost || configuredBase}/api/carbon/projects/registry/${id}`;
  const existing = existingId ? qrRegistryStore.get(existingId) : null;

  return {
    id,
    registryUrl,
    favorite,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    payload,
  };
};

// Air quality monitoring endpoint
router.get('/air-quality', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng required' });
    }

    const data = await carbonGasAdapter.getAirQualityData(parseFloat(lat as string), parseFloat(lng as string));
    res.json(data);
  } catch (error) {
    console.error('Air quality error:', error);
    res.status(500).json({ error: 'Failed to fetch air quality data' });
  }
});

// Mineral mapping endpoint
router.get('/minerals', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng required' });
    }

    const data = await mineralAdapter.getMineralData(parseFloat(lat as string), parseFloat(lng as string));
    res.json(data);
  } catch (error) {
    console.error('Mineral mapping error:', error);
    res.status(500).json({ error: 'Failed to fetch mineral data' });
  }
});

router.get('/projects/registry', (_req, res) => {
  const entries = Array.from(qrRegistryStore.values())
    .sort((a: QrRegistryEntry, b: QrRegistryEntry) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  res.json({ ok: true, entries });
});

router.post('/projects/registry', (req, res) => {
  const payload = (req.body ?? {}) as Partial<QrRegistryPayload>;
  const required: Array<keyof QrRegistryPayload> = ['projectCode', 'projectName', 'aoiId', 'siteName', 'coordinates', 'boundary', 'monitoringPeriod', 'aiReading', 'result'];
  const missing = required.filter((key) => payload[key] == null);

  if (missing.length) {
    return res.status(400).json({ ok: false, error: `Missing required registry fields: ${missing.join(', ')}` });
  }

  const existing = Array.from(qrRegistryStore.values()).find((entry: QrRegistryEntry) => (
    entry.payload?.aoiId === payload.aoiId
    && entry.payload?.projectCode === payload.projectCode
  ));

  const requestBase = `${req.protocol}://${req.get('host')}`;
  const entry = buildRegistryEntry(payload as QrRegistryPayload, existing?.favorite ?? false, existing?.id, requestBase);
  qrRegistryStore.set(entry.id, entry);
  res.status(existing ? 200 : 201).json({ ok: true, entry });
});

router.get('/projects/registry/:id', (req, res) => {
  const entry = qrRegistryStore.get(req.params.id);
  if (!entry) {
    return res.status(404).json({ ok: false, error: 'Registry entry not found' });
  }
  res.json({ ok: true, entry });
});

router.patch('/projects/registry/:id/favorite', (req, res) => {
  const entry = qrRegistryStore.get(req.params.id);
  if (!entry) {
    return res.status(404).json({ ok: false, error: 'Registry entry not found' });
  }

  const favorite = Boolean(req.body?.favorite);
  const updated = {
    ...entry,
    favorite,
    updatedAt: new Date().toISOString(),
  };
  qrRegistryStore.set(updated.id, updated);
  res.json({ ok: true, entry: updated });
});

export default router;
