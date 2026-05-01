import { Router } from 'express';

/**
 * Global Signals API — lightweight in-memory implementation so the SPA stays connected.
 * Replace with persisted feeds (USGS/EONET/OpenAQ) when ready; contract matches `GlobalSignalsView`.
 */

type SignalCategory =
  | 'environmental_hazard'
  | 'fire_smoke'
  | 'climate_risk'
  | 'public_safety'
  | 'infrastructure_failure'
  | 'pollution'
  | 'carbon_project'
  | 'community_verification';

type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

type SignalStatus =
  | 'new'
  | 'reviewed'
  | 'mission_created'
  | 'sent_to_verification'
  | 'verified'
  | 'closed'
  | 'logged';

type StoredSignal = {
  signalId: string;
  title: string;
  description: string;
  category: SignalCategory;
  sourceName: string;
  sourceUrl?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
  riskLevel: RiskLevel;
  confidenceScore: number;
  status: SignalStatus;
  aiSummary?: string;
  suggestedMissionTitle?: string;
  suggestedMissionDescription?: string;
  missionId?: string;
  createdAt: string;
};

const router = Router();
const signals = new Map<string, StoredSignal>();

const ALLOWED_STATUS: SignalStatus[] = [
  'new',
  'reviewed',
  'mission_created',
  'sent_to_verification',
  'verified',
  'closed',
  'logged',
];

function seedDemoSignals(): number {
  const now = new Date().toISOString();
  const demos: StoredSignal[] = [
    {
      signalId: 'sig-seed-eonet-1',
      title: 'Demo thermal anomaly (seed)',
      description:
        'Placeholder signal so the Global Signals UI loads with sample data. Replace with live EONET/USGS/OpenAQ import when wired.',
      category: 'fire_smoke',
      sourceName: 'DPAL seed',
      sourceUrl: 'https://eonet.gsfc.nasa.gov/',
      latitude: 34.05,
      longitude: -118.25,
      city: 'Los Angeles',
      country: 'USA',
      riskLevel: 'moderate',
      confidenceScore: 0.42,
      status: 'new',
      createdAt: now,
    },
    {
      signalId: 'sig-seed-openaq-1',
      title: 'Demo air-quality watchpoint (seed)',
      description:
        'Illustrative pollution-category signal for filters and map pins. Connect OpenAQ ingestion to replace.',
      category: 'pollution',
      sourceName: 'DPAL seed',
      sourceUrl: 'https://openaq.org/',
      latitude: 40.7128,
      longitude: -74.006,
      city: 'New York',
      country: 'USA',
      riskLevel: 'low',
      confidenceScore: 0.55,
      status: 'new',
      createdAt: now,
    },
    {
      signalId: 'sig-seed-usgs-1',
      title: 'Demo environmental hazard (seed)',
      description:
        'Illustrative environmental_hazard row for workflow buttons. Persist to DB before production.',
      category: 'environmental_hazard',
      sourceName: 'DPAL seed',
      latitude: 47.6062,
      longitude: -122.3321,
      city: 'Seattle',
      country: 'USA',
      riskLevel: 'high',
      confidenceScore: 0.61,
      status: 'reviewed',
      createdAt: now,
    },
  ];
  let added = 0;
  for (const s of demos) {
    if (!signals.has(s.signalId)) {
      signals.set(s.signalId, s);
      added++;
    }
  }
  return added;
}

function computeStats(): {
  total: number;
  critical: number;
  high: number;
  missionsCreated: number;
  categories: Record<string, number>;
} {
  const all = [...signals.values()];
  const categories: Record<string, number> = {};
  let critical = 0;
  let high = 0;
  let missionsCreated = 0;
  for (const s of all) {
    categories[s.category] = (categories[s.category] ?? 0) + 1;
    if (s.riskLevel === 'critical') critical++;
    if (s.riskLevel === 'high') high++;
    if (s.status === 'mission_created') missionsCreated++;
  }
  return {
    total: all.length,
    critical,
    high,
    missionsCreated,
    categories,
  };
}

router.get('/stats', (_req, res) => {
  res.json({ ok: true, stats: computeStats(), mode: 'in_memory_stub' as const });
});

router.post('/import', (_req, res) => {
  const before = signals.size;
  seedDemoSignals();
  const added = signals.size - before;
  res.json({
    ok: true,
    imported: { usgs: added, eonet: 0, aq: 0, total: added },
    notice:
      added > 0
        ? 'Seeded demo signals (development). Wire live feeds for production.'
        : 'No new signals — demo data already present on this server.',
    mode: 'in_memory_stub' as const,
  });
});

router.get('/', (req, res) => {
  const limit = Math.min(500, Math.max(1, Number.parseInt(String(req.query.limit ?? '100'), 10) || 100));
  const category = req.query.category ? String(req.query.category) : '';
  const riskLevel = req.query.riskLevel ? String(req.query.riskLevel) : '';
  const status = req.query.status ? String(req.query.status) : '';

  let rows = [...signals.values()];
  if (category) rows = rows.filter((s) => s.category === category);
  if (riskLevel) rows = rows.filter((s) => s.riskLevel === riskLevel);
  if (status) rows = rows.filter((s) => s.status === status);
  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  rows = rows.slice(0, limit);

  res.json({ ok: true, signals: rows, mode: 'in_memory_stub' as const });
});

router.get('/:id', (req, res) => {
  const row = signals.get(req.params.id);
  if (!row) return res.status(404).json({ ok: false, error: 'Signal not found' });
  res.json({ ok: true, signal: row });
});

router.patch('/:id/status', (req, res) => {
  const row = signals.get(req.params.id);
  if (!row) return res.status(404).json({ ok: false, error: 'Signal not found' });
  const next = req.body?.status as SignalStatus | undefined;
  if (!next || !ALLOWED_STATUS.includes(next)) {
    return res.status(400).json({ ok: false, error: 'Invalid status' });
  }
  row.status = next;
  signals.set(row.signalId, row);
  res.json({ ok: true, signal: row });
});

router.post('/:id/enrich', (req, res) => {
  const row = signals.get(req.params.id);
  if (!row) return res.status(404).json({ ok: false, error: 'Signal not found' });
  row.aiSummary =
    row.aiSummary ??
    `Stub enrichment for ${row.title}. Configure GEMINI_API_KEY on the API server for real summaries.`;
  row.suggestedMissionTitle = row.suggestedMissionTitle ?? `Verify: ${row.title}`;
  row.suggestedMissionDescription =
    row.suggestedMissionDescription ??
    'Suggested mission text — replace with model output when AI proxy is enabled.';
  signals.set(row.signalId, row);
  res.json({ ok: true, signal: row });
});

router.post('/:id/create-mission', (req, res) => {
  const row = signals.get(req.params.id);
  if (!row) return res.status(404).json({ ok: false, error: 'Signal not found' });
  const missionId = `mis-${row.signalId}-${Date.now()}`;
  row.missionId = missionId;
  row.status = 'mission_created';
  signals.set(row.signalId, row);
  res.json({ ok: true, missionId });
});

export default router;
