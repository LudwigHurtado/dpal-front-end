import { loadLocalSituationMessages, mergeSituationMessages, saveLocalSituationMessages } from './situationLocalStore';
import type { ChatMessage, Report } from '../types';
import { buildApiUrl, getDpalApiConfig, logSituationRoomDiagnostics } from '../src/config/api';

export type SituationRoomSourceType =
  | 'public_report'
  | 'aqua_scan'
  | 'carb_audit'
  | 'water_scan'
  | 'afolu_project'
  | 'carbon_viu_project'
  | 'mission'
  | 'manual';

export type SituationRoomRecord = {
  id: string;
  roomId: string;
  reportId?: string;
  projectId?: string;
  sourceType: SituationRoomSourceType;
  title: string;
  category: string;
  status: 'draft' | 'active' | 'under_review' | 'verified' | 'closed';
  createdAt: string;
  updatedAt: string;
  location?: {
    label?: string;
    lat?: number;
    lng?: number;
    address?: string;
    boundaryGeoJson?: unknown;
  };
  ledger?: {
    verificationStatus: 'unverified' | 'pending' | 'verified' | 'failed';
    hash?: string;
    chain?: string;
    blockNumber?: string;
    transactionId?: string;
    timestamp?: string;
  };
  qr?: {
    reportUrl?: string;
    situationRoomUrl?: string;
    transparencyUrl?: string;
  };
  evidencePacket?: unknown;
  aiSummary?: unknown;
  media?: Array<Record<string, unknown>>;
  messages?: ChatMessage[];
};

function mapSourceType(input?: string | null): SituationRoomSourceType {
  switch ((input || '').toLowerCase()) {
    case 'aqua_scan': return 'aqua_scan';
    case 'carb_audit': return 'carb_audit';
    case 'water_scan': return 'water_scan';
    case 'afolu_project': return 'afolu_project';
    case 'carbon_viu_project': return 'carbon_viu_project';
    case 'mission': return 'mission';
    case 'manual': return 'manual';
    default: return 'public_report';
  }
}

function normalizeRoomRecord(raw: any): SituationRoomRecord {
  return {
    id: String(raw?.id || raw?._id || raw?.roomId || `room-${Date.now()}`),
    roomId: String(raw?.roomId || raw?.id || ''),
    reportId: raw?.reportId ? String(raw.reportId) : undefined,
    projectId: raw?.projectId ? String(raw.projectId) : undefined,
    sourceType: mapSourceType(raw?.sourceType),
    title: String(raw?.title || 'Situation Room'),
    category: String(raw?.category || 'General'),
    status: ['draft', 'active', 'under_review', 'verified', 'closed'].includes(raw?.status)
      ? raw.status
      : 'active',
    createdAt: String(raw?.createdAt || new Date().toISOString()),
    updatedAt: String(raw?.updatedAt || raw?.createdAt || new Date().toISOString()),
    location: raw?.location || undefined,
    ledger: raw?.ledger || undefined,
    qr: raw?.qr || undefined,
    evidencePacket: raw?.evidencePacket,
    aiSummary: raw?.aiSummary,
    media: Array.isArray(raw?.media) ? raw.media : [],
    messages: Array.isArray(raw?.messages) ? raw.messages : [],
  };
}

async function getJson(path: string): Promise<any> {
  const res = await fetch(buildApiUrl(path));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getSituationRoomByReportId(reportId: string): Promise<SituationRoomRecord | null> {
  const data = await getJson(`/api/situation/report/${encodeURIComponent(reportId)}`);
  return data?.room ? normalizeRoomRecord(data.room) : null;
}

export async function getSituationRoomByRoomId(roomId: string): Promise<SituationRoomRecord | null> {
  const data = await getJson(`/api/situation/rooms/${encodeURIComponent(roomId)}`);
  return data?.room ? normalizeRoomRecord(data.room) : null;
}

export async function createSituationRoomForReport(payload: Record<string, unknown>): Promise<SituationRoomRecord> {
  const res = await fetch(buildApiUrl('/api/situation/report'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return normalizeRoomRecord((await res.json())?.room ?? {});
}

export async function createSituationRoomForProject(payload: Record<string, unknown>): Promise<SituationRoomRecord> {
  const res = await fetch(buildApiUrl('/api/situation/project'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return normalizeRoomRecord((await res.json())?.room ?? {});
}

export async function getMessages(roomId: string): Promise<ChatMessage[]> {
  const remote = await getJson(`/api/situation/${encodeURIComponent(roomId)}/messages?limit=200`);
  const local = loadLocalSituationMessages(roomId);
  const remoteRows = Array.isArray(remote?.messages) ? remote.messages : [];
  const normalized = remoteRows.map((m: any) => ({
    id: String(m?.id || m?._id || `msg-${Date.now()}`),
    sender: String(m?.sender || 'OPERATIVE'),
    text: String(m?.text || ''),
    timestamp: Number(m?.timestamp || Date.now()),
    isSystem: Boolean(m?.isSystem),
    imageUrl: m?.imageUrl ? String(m.imageUrl) : undefined,
    audioUrl: m?.audioUrl ? String(m.audioUrl) : undefined,
    ledgerProof: String(m?.ledgerProof || ''),
  })) as ChatMessage[];
  const merged = mergeSituationMessages(normalized, local);
  saveLocalSituationMessages(roomId, merged);
  return merged;
}

export async function sendMessage(
  roomId: string,
  message: { sender: string; text?: string; imageUrl?: string; audioUrl?: string; isSystem?: boolean }
): Promise<ChatMessage> {
  const res = await fetch(buildApiUrl(`/api/situation/${encodeURIComponent(roomId)}/messages`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const row = (await res.json())?.message ?? {};
  return {
    id: String(row?.id || row?._id || `msg-${Date.now()}`),
    sender: String(row?.sender || message.sender),
    text: String(row?.text || message.text || ''),
    timestamp: Number(row?.timestamp || Date.now()),
    isSystem: Boolean(row?.isSystem),
    imageUrl: row?.imageUrl ? String(row.imageUrl) : message.imageUrl,
    audioUrl: row?.audioUrl ? String(row.audioUrl) : message.audioUrl,
    ledgerProof: String(row?.ledgerProof || ''),
  };
}

export async function uploadRoomMedia(roomId: string, fileOrDataUrl: File | string): Promise<any> {
  if (typeof fileOrDataUrl === 'string') {
    const type = fileOrDataUrl.startsWith('data:audio') ? 'audio' : 'image';
    const res = await fetch(buildApiUrl('/api/situation/media'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, type, dataUrl: fileOrDataUrl }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  const payload = new FormData();
  payload.append('roomId', roomId);
  payload.append('file', fileOrDataUrl);
  const res = await fetch(buildApiUrl('/api/situation/media/upload'), { method: 'POST', body: payload });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function setMainRoomImage(roomId: string, mediaId: string): Promise<void> {
  const res = await fetch(buildApiUrl(`/api/situation/${encodeURIComponent(roomId)}/media/${encodeURIComponent(mediaId)}/main`), { method: 'POST' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function getLedgerVerification(reportId: string): Promise<any> {
  return getJson(`/api/reports/${encodeURIComponent(reportId)}`);
}

export function buildTransparencyUrl(input: { reportId?: string; projectId?: string; type?: string }): string {
  const cfg = getDpalApiConfig();
  const u = new URL('/transparency-db', cfg.publicFrontendBaseUrl);
  if (input.reportId) u.searchParams.set('reportId', input.reportId);
  if (input.projectId) u.searchParams.set('projectId', input.projectId);
  if (input.type) u.searchParams.set('type', input.type);
  return u.toString();
}

export function buildSituationRoomUrl(input: { reportId?: string; roomId?: string; projectId?: string; type?: string }): string {
  const cfg = getDpalApiConfig();
  if (input.reportId) {
    const u = new URL('/incident', cfg.publicFrontendBaseUrl);
    u.searchParams.set('reportId', input.reportId);
    u.searchParams.set('situationRoom', '1');
    return u.toString();
  }
  const u = new URL('/situation-room', cfg.publicFrontendBaseUrl);
  if (input.roomId) u.searchParams.set('roomId', input.roomId);
  if (input.projectId) u.searchParams.set('projectId', input.projectId);
  if (input.type) u.searchParams.set('type', input.type);
  return u.toString();
}

export function generateRoomQrPayload(roomId: string): string {
  return buildSituationRoomUrl({ roomId });
}

export function generateReportQrPayload(reportId: string): string {
  return buildTransparencyUrl({ reportId });
}

export function createSituationRecordFromReport(report: Report): SituationRoomRecord {
  const reportId = report.id;
  return {
    id: reportId,
    roomId: reportId,
    reportId,
    sourceType: 'public_report',
    title: report.title || 'DPAL Situation Room',
    category: String(report.category || 'General'),
    status: 'active',
    createdAt: new Date(report.timestamp as any).toISOString(),
    updatedAt: new Date().toISOString(),
    location: { label: report.location },
    ledger: {
      verificationStatus: report.txHash || report.hash ? 'verified' : 'pending',
      hash: report.hash,
      transactionId: report.txHash,
      chain: report.chain,
      blockNumber: report.blockNumber != null ? String(report.blockNumber) : undefined,
      timestamp: report.anchoredAt ? new Date(report.anchoredAt as any).toISOString() : undefined,
    },
    qr: {
      reportUrl: buildTransparencyUrl({ reportId }),
      situationRoomUrl: buildSituationRoomUrl({ reportId }),
      transparencyUrl: buildTransparencyUrl({ reportId }),
    },
    evidencePacket: report.structuredData?.evidencePacket,
    media: (report.imageUrls ?? []).map((url) => ({ url })),
  };
}

export async function generateEvidenceHash(evidencePacket: unknown): Promise<string> {
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
      return Object.fromEntries(entries.map(([k, v]) => [k, normalize(v)]));
    }
    return value;
  };
  const stable = JSON.stringify(normalize(evidencePacket ?? {}));
  const enc = new TextEncoder().encode(stable);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `0x${hex}`;
}

export function emitSituationDiagnostics(input: { reportId?: string; roomId?: string }): void {
  const chatEndpoint = buildApiUrl(`/api/situation/${encodeURIComponent(input.roomId || ':roomId')}/messages`);
  const mediaEndpoint = buildApiUrl('/api/situation/media');
  logSituationRoomDiagnostics({
    reportId: input.reportId ?? null,
    roomId: input.roomId ?? null,
    chatEndpoint,
    mediaEndpoint,
  });
}
