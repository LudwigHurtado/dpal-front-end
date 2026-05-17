import { Router, type Request, type Response } from 'express';
import path from 'path';
import { promises as fs } from 'fs';
import crypto from 'crypto';

const router = Router();
const DATA_DIR = path.resolve(process.cwd(), 'data', 'dmrv-reports');

type StoredAnchor = {
  anchorId: string;
  reportId: string;
  versionId: string;
  reportJsonHash: string;
  evidencePacketId?: string;
  evidenceBundleHash?: string;
  timestamp: string;
  actor: string;
  transactionRef?: string;
  status: 'anchored' | 'pending' | 'failed';
};

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function reportPath(reportId: string): string {
  const safe = reportId.replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(DATA_DIR, `${safe}.json`);
}

function anchorsPath(reportId: string): string {
  const safe = reportId.replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(DATA_DIR, `${safe}.anchors.json`);
}

function hashJson(value: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

/** GET /api/dmrv/reports/:reportId */
router.get('/:reportId', async (req: Request, res: Response) => {
  try {
    await ensureDir();
    const raw = await fs.readFile(reportPath(req.params.reportId), 'utf8');
    res.json(JSON.parse(raw));
  } catch {
    res.status(404).json({ ok: false, error: 'report_not_found' });
  }
});

/** PUT /api/dmrv/reports/:reportId — full structured report JSON */
router.put('/:reportId', async (req: Request, res: Response) => {
  try {
    await ensureDir();
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ ok: false, error: 'invalid_body' });
    }
    const reportId = String(req.params.reportId);
    const payload = { ...body, reportId, updatedAt: new Date().toISOString() };
    await fs.writeFile(reportPath(reportId), JSON.stringify(payload, null, 2), 'utf8');
    res.json({ ok: true, reportId, reportJsonHash: hashJson(payload) });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

/** POST /api/dmrv/reports/:reportId/anchor — hash + references only */
router.post('/:reportId/anchor', async (req: Request, res: Response) => {
  try {
    await ensureDir();
    const reportId = String(req.params.reportId);
    const { versionId, reportJsonHash, evidencePacketId, evidenceBundleHash } = req.body ?? {};
    if (!versionId || !reportJsonHash) {
      return res.status(400).json({ ok: false, error: 'versionId_and_reportJsonHash_required' });
    }
    const anchor: StoredAnchor = {
      anchorId: `anchor-${Date.now().toString(36)}`,
      reportId,
      versionId: String(versionId),
      reportJsonHash: String(reportJsonHash),
      evidencePacketId: evidencePacketId ? String(evidencePacketId) : undefined,
      evidenceBundleHash: evidenceBundleHash ? String(evidenceBundleHash) : undefined,
      timestamp: new Date().toISOString(),
      actor: 'api',
      transactionRef: `mock-chain-${crypto.randomBytes(6).toString('hex')}`,
      status: 'anchored',
    };
    let anchors: StoredAnchor[] = [];
    try {
      const raw = await fs.readFile(anchorsPath(reportId), 'utf8');
      anchors = JSON.parse(raw) as StoredAnchor[];
    } catch {
      anchors = [];
    }
    anchors.push(anchor);
    await fs.writeFile(anchorsPath(reportId), JSON.stringify(anchors, null, 2), 'utf8');
    res.json({ ok: true, anchor });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
