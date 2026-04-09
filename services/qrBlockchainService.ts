import { addBlockToChain, type DpalBlock } from './dpalChainService';

export interface QrAnchorResult {
  ok: boolean;
  key: string;
  reportId: string;
  block?: DpalBlock;
  error?: string;
}

const QR_ANCHOR_STORAGE_KEY = 'dpal_qr_block_anchors_v1';

type QrAnchorMap = Record<string, DpalBlock>;

const readAnchors = (): QrAnchorMap => {
  try {
    const raw = localStorage.getItem(QR_ANCHOR_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as QrAnchorMap) : {};
  } catch {
    return {};
  }
};

const writeAnchors = (next: QrAnchorMap): void => {
  try {
    localStorage.setItem(QR_ANCHOR_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage issues in degraded mode
  }
};

const makeReportId = (scope: string, id: string): string =>
  `QR-${scope}-${id}`.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 90);

export async function anchorQrPayloadOnChain(params: {
  scope: string;
  id: string;
  title: string;
  description: string;
  location?: string;
  trustScore?: number;
}): Promise<QrAnchorResult> {
  const key = `${params.scope}:${params.id}`;
  const anchors = readAnchors();
  if (anchors[key]) {
    return { ok: true, key, reportId: anchors[key].reportId, block: anchors[key] };
  }

  const reportId = makeReportId(params.scope, params.id);
  try {
    const result = await addBlockToChain({
      id: reportId,
      category: `QR:${params.scope}`,
      title: params.title,
      description: params.description,
      location: params.location ?? 'Digital',
      trustScore: params.trustScore ?? 90,
      evidenceCount: 1,
    });

    const next = { ...anchors, [key]: result.block };
    writeAnchors(next);
    return { ok: true, key, reportId, block: result.block };
  } catch (error: any) {
    return {
      ok: false,
      key,
      reportId,
      error: error?.message ?? 'Failed to anchor QR payload on DPAL chain',
    };
  }
}

