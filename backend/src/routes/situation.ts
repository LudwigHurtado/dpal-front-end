import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import crypto from 'crypto';
import {
  appendMessage as persistMessage,
  buildCanonicalRoomUrl,
  getMessages as persistGetMessages,
  getRoomById,
  upsertRoom,
} from '../services/situationRoomPersistence';
import { SituationMessageType } from '@prisma/client';

type SituationSourceType =
  | 'public_report'
  | 'aqua_scan'
  | 'carb_audit'
  | 'water_scan'
  | 'afolu_project'
  | 'carbon_viu_project'
  | 'mission'
  | 'manual';

type SituationStatus = 'draft' | 'active' | 'under_review' | 'verified' | 'closed';
type MessageType = 'user' | 'system' | 'validator' | 'ai';

type SituationRoomRecord = {
  id: string;
  roomId: string;
  reportId?: string;
  projectId?: string;
  sourceType: SituationSourceType;
  title: string;
  category?: string;
  status: SituationStatus;
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
    evidenceHash?: string;
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
  sourceSnapshot?: unknown;
  media?: SituationRoomMedia[];
  messages?: SituationRoomMessage[];
};

type SituationRoomMessage = {
  id: string;
  roomId: string;
  text: string;
  senderName?: string;
  senderRole?: string;
  type: MessageType;
  metadata?: unknown;
  createdAt: string;
};

type SituationRoomMedia = {
  id: string;
  roomId: string;
  reportId?: string;
  projectId?: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  caption?: string;
  isMain?: boolean;
  createdAt: string;
};

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

const DATA_DIR = path.resolve(process.cwd(), 'data', 'situation');
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'situation');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const MEDIA_FILE = path.join(DATA_DIR, 'media.json');

let writeQueue: Promise<void> = Promise.resolve();

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function hashEvidence(input: unknown): string {
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
      return Object.fromEntries(entries.map(([k, v]) => [k, normalize(v)]));
    }
    return value;
  };
  const stable = JSON.stringify(normalize(input ?? {}));
  return `0x${crypto.createHash('sha256').update(stable).digest('hex')}`;
}

async function ensureStorage(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await Promise.all([
    ensureJsonFile(ROOMS_FILE, []),
    ensureJsonFile(MESSAGES_FILE, []),
    ensureJsonFile(MEDIA_FILE, []),
  ]);
}

async function ensureJsonFile(filePath: string, fallback: unknown): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), 'utf8');
  }
}

async function readJsonArray<T>(filePath: string): Promise<T[]> {
  await ensureStorage();
  const raw = await fs.readFile(filePath, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

async function writeJsonArray<T>(filePath: string, rows: T[]): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    await fs.writeFile(filePath, JSON.stringify(rows, null, 2), 'utf8');
  });
  await writeQueue;
}

function toMessageCompat(message: SituationRoomMessage): Record<string, unknown> {
  return {
    ...message,
    sender: message.senderName || 'OPERATIVE',
    timestamp: new Date(message.createdAt).getTime(),
    isSystem: message.type === 'system',
  };
}

function baseUrlFromReq(req: Request): string {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = req.get('host') || 'localhost:3001';
  return `${proto}://${host}`;
}

function mapSourceType(value: unknown, fallback: SituationSourceType): SituationSourceType {
  const raw = String(value || '').trim() as SituationSourceType;
  const allowed: SituationSourceType[] = [
    'public_report',
    'aqua_scan',
    'carb_audit',
    'water_scan',
    'afolu_project',
    'carbon_viu_project',
    'mission',
    'manual',
  ];
  return allowed.includes(raw) ? raw : fallback;
}

function applyLedgerAndHash(room: SituationRoomRecord, evidencePacket: unknown): { room: SituationRoomRecord; hashAdded: boolean } {
  if (!evidencePacket) return { room, hashAdded: false };
  const evidenceHash = hashEvidence(evidencePacket);
  const ledger = room.ledger ?? { verificationStatus: 'unverified' as const };
  const hasChain = Boolean(ledger.transactionId || ledger.hash || ledger.chain || ledger.blockNumber);
  const nextLedger: SituationRoomRecord['ledger'] = {
    ...ledger,
    evidenceHash,
    verificationStatus:
      ledger.verificationStatus === 'failed'
        ? 'failed'
        : hasChain
          ? (ledger.verificationStatus === 'verified' ? 'verified' : 'pending')
          : 'pending',
  };
  return {
    room: { ...room, ledger: nextLedger },
    hashAdded: ledger.evidenceHash !== evidenceHash,
  };
}

async function appendSystemMessage(roomId: string, text: string, metadata?: unknown): Promise<void> {
  const messages = await readJsonArray<SituationRoomMessage>(MESSAGES_FILE);
  const exists = messages.some((m) => m.roomId === roomId && m.type === 'system' && m.text === text);
  if (exists) return;
  messages.push({
    id: makeId('sys'),
    roomId,
    text,
    senderName: 'DPAL System',
    senderRole: 'system',
    type: 'system',
    metadata,
    createdAt: new Date().toISOString(),
  });
  await writeJsonArray(MESSAGES_FILE, messages);
}

async function joinRoom(room: SituationRoomRecord): Promise<SituationRoomRecord> {
  const [messages, media] = await Promise.all([
    readJsonArray<SituationRoomMessage>(MESSAGES_FILE),
    readJsonArray<SituationRoomMedia>(MEDIA_FILE),
  ]);
  return {
    ...room,
    messages: messages.filter((m) => m.roomId === room.roomId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    media: media.filter((m) => m.roomId === room.roomId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  await ensureStorage();
  const probe = await getRoomById('__health_probe__').catch(() => null);
  res.json({
    ok: true,
    service: 'situation-room',
    persistence: probe !== undefined ? 'prisma+file-fallback' : 'file',
    canonicalPathPattern: '/situation-room/:roomId',
    timestamp: new Date().toISOString(),
  });
});

router.get('/rooms', async (_req: Request, res: Response): Promise<void> => {
  const rooms = await readJsonArray<SituationRoomRecord>(ROOMS_FILE);
  const sorted = [...rooms].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  res.json({
    ok: true,
    rooms: sorted.map((r) => ({
      ...r,
      activeUsers: undefined,
      participants: undefined,
      memberCount: undefined,
      lastActivityAt: Date.parse(r.updatedAt),
      mediaPersistence: true,
    })),
  });
});

router.get('/rooms/:roomId', async (req: Request, res: Response): Promise<void> => {
  const roomId = String(req.params.roomId || '').trim();
  const persisted = await getRoomById(roomId);
  if (persisted) {
    const messages = await persistGetMessages(roomId);
    res.json({
      ok: true,
      room: {
        ...persisted,
        messages: messages.map((m) => toMessageCompat({
          id: m.id,
          roomId: m.roomId,
          text: m.body,
          senderName: m.authorName,
          senderRole: m.authorRole,
          type: m.messageType.toLowerCase() as MessageType,
          metadata: m.metadata,
          createdAt: m.createdAt,
        })),
      },
    });
    return;
  }
  const rooms = await readJsonArray<SituationRoomRecord>(ROOMS_FILE);
  const room = rooms.find((r) => r.roomId === roomId);
  if (!room) {
    res.status(404).json({ ok: false, error: 'Room not found' });
    return;
  }
  res.json({ ok: true, room: await joinRoom(room) });
});

router.get('/report/:reportId', async (req: Request, res: Response): Promise<void> => {
  const reportId = String(req.params.reportId || '').trim();
  if (!reportId) {
    res.status(400).json({ ok: false, error: 'reportId is required' });
    return;
  }
  const rooms = await readJsonArray<SituationRoomRecord>(ROOMS_FILE);
  let room = rooms.find((r) => r.reportId === reportId);
  if (!room) {
    const now = new Date().toISOString();
    room = {
      id: makeId('room'),
      roomId: reportId,
      reportId,
      sourceType: 'public_report',
      title: `Report ${reportId}`,
      category: 'General',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      qr: { situationRoomUrl: buildCanonicalRoomUrl(reportId) },
    };
    rooms.unshift(room);
    await writeJsonArray(ROOMS_FILE, rooms);
    await upsertRoom({
      roomId: reportId,
      reportId,
      sourceType: 'public_report',
      title: room.title,
      category: room.category,
      status: 'ACTIVE' as never,
      canonicalUrl: buildCanonicalRoomUrl(reportId),
      qrUrl: buildCanonicalRoomUrl(reportId),
    }).catch(() => undefined);
    await appendSystemMessage(room.roomId, 'Situation Room created.');
    await appendSystemMessage(room.roomId, `Report attached: ${reportId}.`);
  }
  res.json({ ok: true, room: await joinRoom(room) });
});

router.post('/report', async (req: Request, res: Response): Promise<void> => {
  const body = req.body ?? {};
  const reportId = String(body.reportId || '').trim();
  if (!reportId) {
    res.status(400).json({ ok: false, error: 'reportId is required' });
    return;
  }
  const now = new Date().toISOString();
  const rooms = await readJsonArray<SituationRoomRecord>(ROOMS_FILE);
  const idx = rooms.findIndex((r) => r.reportId === reportId || r.roomId === reportId);
  let room: SituationRoomRecord;
  if (idx >= 0) {
    room = {
      ...rooms[idx],
      sourceType: mapSourceType(body.sourceType, 'public_report'),
      title: String(body.title || rooms[idx].title || `Report ${reportId}`),
      category: String(body.category || rooms[idx].category || 'General'),
      evidencePacket: body.evidencePacket ?? rooms[idx].evidencePacket,
      aiSummary: body.aiSummary ?? rooms[idx].aiSummary,
      location: body.location ?? rooms[idx].location,
      ledger: body.ledger ?? rooms[idx].ledger,
      updatedAt: now,
    };
    const hashApplied = applyLedgerAndHash(room, room.evidencePacket);
    room = hashApplied.room;
    rooms[idx] = room;
    await writeJsonArray(ROOMS_FILE, rooms);
    if (body.evidencePacket != null) await appendSystemMessage(room.roomId, 'Report evidence packet attached.');
    if (body.aiSummary != null) await appendSystemMessage(room.roomId, 'AI summary attached to this Situation Room.');
    if (body.ledger != null) await appendSystemMessage(room.roomId, 'Ledger data attached to this Situation Room.');
    if (hashApplied.hashAdded) {
      await appendSystemMessage(room.roomId, 'Evidence packet hash generated and attached to this Situation Room.');
    }
  } else {
    room = {
      id: makeId('room'),
      roomId: reportId,
      reportId,
      sourceType: mapSourceType(body.sourceType, 'public_report'),
      title: String(body.title || `Report ${reportId}`),
      category: String(body.category || 'General'),
      status: 'active',
      createdAt: now,
      updatedAt: now,
      evidencePacket: body.evidencePacket,
      aiSummary: body.aiSummary,
      location: body.location,
      ledger: body.ledger,
    };
    const hashApplied = applyLedgerAndHash(room, room.evidencePacket);
    room = hashApplied.room;
    rooms.unshift(room);
    await writeJsonArray(ROOMS_FILE, rooms);
    await appendSystemMessage(room.roomId, 'Situation Room created.');
    await appendSystemMessage(room.roomId, `Report attached: ${reportId}.`);
    if (room.aiSummary != null) await appendSystemMessage(room.roomId, 'AI summary attached to this Situation Room.');
    if (hashApplied.hashAdded) await appendSystemMessage(room.roomId, 'Evidence packet hash generated and attached to this Situation Room.');
  }
  res.status(201).json({ ok: true, room: await joinRoom(room) });
});

router.post('/project', async (req: Request, res: Response): Promise<void> => {
  const body = req.body ?? {};
  const projectId = String(body.projectId || '').trim();
  if (!projectId) {
    res.status(400).json({ ok: false, error: 'projectId is required' });
    return;
  }
  const sourceType = mapSourceType(body.sourceType, 'manual');
  if (sourceType === 'public_report') {
    res.status(400).json({ ok: false, error: 'sourceType public_report is not valid for project endpoint' });
    return;
  }
  const now = new Date().toISOString();
  const rooms = await readJsonArray<SituationRoomRecord>(ROOMS_FILE);
  const idx = rooms.findIndex((r) => r.projectId === projectId && r.sourceType === sourceType);
  const roomId = idx >= 0 ? rooms[idx].roomId : makeId(`room-${sourceType}`);
  let room: SituationRoomRecord = idx >= 0
    ? {
        ...rooms[idx],
        title: String(body.title || rooms[idx].title || `Project ${projectId}`),
        category: String(body.category || rooms[idx].category || sourceType),
        evidencePacket: body.evidencePacket ?? rooms[idx].evidencePacket,
        aiSummary: body.aiSummary ?? rooms[idx].aiSummary,
        location: body.location ?? rooms[idx].location,
        ledger: body.ledger ?? rooms[idx].ledger,
        sourceSnapshot: body.sourceSnapshot ?? rooms[idx].sourceSnapshot,
        updatedAt: now,
      }
    : {
        id: makeId('room'),
        roomId,
        projectId,
        sourceType,
        title: String(body.title || `Project ${projectId}`),
        category: String(body.category || sourceType),
        status: 'active',
        createdAt: now,
        updatedAt: now,
        evidencePacket: body.evidencePacket,
        aiSummary: body.aiSummary,
        location: body.location,
        ledger: body.ledger,
        sourceSnapshot: body.sourceSnapshot,
      };
  const hashApplied = applyLedgerAndHash(room, room.evidencePacket);
  room = hashApplied.room;
  if (idx >= 0) rooms[idx] = room;
  else rooms.unshift(room);
  await writeJsonArray(ROOMS_FILE, rooms);
  if (idx < 0) await appendSystemMessage(room.roomId, 'Situation Room created.');
  await appendSystemMessage(room.roomId, `Project evidence attached (${sourceType}) for ${projectId}.`);
  if (room.aiSummary != null) await appendSystemMessage(room.roomId, 'AI summary attached to this Situation Room.');
  if (body.ledger != null) await appendSystemMessage(room.roomId, 'Ledger data attached to this Situation Room.');
  if (hashApplied.hashAdded) await appendSystemMessage(room.roomId, 'Evidence packet hash generated and attached to this Situation Room.');
  res.status(201).json({ ok: true, room: await joinRoom(room) });
});

router.get('/:roomId/messages', async (req: Request, res: Response): Promise<void> => {
  const roomId = String(req.params.roomId || '').trim();
  const limit = Math.max(1, Math.min(Number(req.query.limit || 200), 1000));
  const includeValidator = req.query.includeValidator !== 'false';
  const persisted = await persistGetMessages(roomId, { includeValidator, limit });
  if (persisted.length > 0) {
    res.json({
      ok: true,
      messages: persisted.map((m) =>
        toMessageCompat({
          id: m.id,
          roomId: m.roomId,
          text: m.body,
          senderName: m.authorName,
          senderRole: m.authorRole,
          type: m.messageType.toLowerCase() as MessageType,
          metadata: m.metadata,
          createdAt: m.createdAt,
        }),
      ),
    });
    return;
  }
  const messages = await readJsonArray<SituationRoomMessage>(MESSAGES_FILE);
  const roomMessages = messages
    .filter((m) => m.roomId === roomId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-limit);
  res.json({ ok: true, messages: roomMessages.map(toMessageCompat) });
});

router.post('/:roomId/messages', async (req: Request, res: Response): Promise<void> => {
  const roomId = String(req.params.roomId || '').trim();
  const body = req.body ?? {};
  const text = String(body.text || '').trim();
  if (!roomId || !text) {
    res.status(400).json({ ok: false, error: 'roomId and text are required' });
    return;
  }
  const rooms = await readJsonArray<SituationRoomRecord>(ROOMS_FILE);
  const idx = rooms.findIndex((r) => r.roomId === roomId);
  if (idx < 0) {
    const now = new Date().toISOString();
    rooms.unshift({
      id: makeId('room'),
      roomId,
      reportId: roomId.startsWith('rep-') ? roomId : undefined,
      sourceType: roomId.startsWith('rep-') ? 'public_report' : 'manual',
      title: `Situation Room ${roomId}`,
      category: 'General',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    await writeJsonArray(ROOMS_FILE, rooms);
    await appendSystemMessage(roomId, 'Situation Room created.');
  } else {
    rooms[idx].updatedAt = new Date().toISOString();
    await writeJsonArray(ROOMS_FILE, rooms);
  }
  const msgType = ['user', 'system', 'validator', 'ai'].includes(String(body.type || 'user'))
    ? (body.type as MessageType)
    : (body.isSystem ? 'system' : 'user');
  try {
    const saved = await persistMessage({
      roomId,
      body: text,
      authorName: String(body.senderName || body.sender || 'OPERATIVE'),
      authorRole: body.senderRole ? String(body.senderRole) : undefined,
      messageType:
        msgType === 'ai'
          ? SituationMessageType.AI
          : msgType === 'validator'
            ? SituationMessageType.VALIDATOR
            : msgType === 'system'
              ? SituationMessageType.SYSTEM
              : SituationMessageType.USER,
      aiGenerated: msgType === 'ai',
      metadata: body.metadata,
    });
    res.status(201).json({
      ok: true,
      message: toMessageCompat({
        id: saved.id,
        roomId,
        text: saved.body,
        senderName: saved.authorName,
        senderRole: saved.authorRole,
        type: msgType,
        metadata: saved.metadata,
        createdAt: saved.createdAt,
      }),
    });
    return;
  } catch {
    /* fall through to file persistence */
  }
  const message: SituationRoomMessage = {
    id: makeId('msg'),
    roomId,
    text,
    senderName: String(body.senderName || body.sender || 'OPERATIVE'),
    senderRole: body.senderRole ? String(body.senderRole) : undefined,
    type: msgType,
    metadata: body.metadata ?? undefined,
    createdAt: new Date().toISOString(),
  };
  const messages = await readJsonArray<SituationRoomMessage>(MESSAGES_FILE);
  messages.push(message);
  await writeJsonArray(MESSAGES_FILE, messages);
  res.status(201).json({ ok: true, message: toMessageCompat(message) });
});

router.post('/media', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body ?? {};
    const roomId = String(body.roomId || '').trim();
    if (!roomId) {
      res.status(400).json({ ok: false, error: 'roomId is required' });
      return;
    }
    let mimeType = '';
    let filename = '';
    let size = 0;
    let publicUrl = '';

    if (req.file) {
      mimeType = req.file.mimetype || 'application/octet-stream';
      if (!mimeType.startsWith('image/')) {
        res.status(400).json({ ok: false, error: 'Only image uploads are currently supported' });
        return;
      }
      filename = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = path.join(UPLOAD_DIR, filename);
      await fs.writeFile(filePath, req.file.buffer);
      size = req.file.size;
      publicUrl = `${baseUrlFromReq(req)}/uploads/situation/${filename}`;
    } else if (typeof body.dataUrl === 'string' && body.dataUrl.startsWith('data:image/')) {
      const m = body.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) {
        res.status(400).json({ ok: false, error: 'Invalid image dataUrl payload' });
        return;
      }
      mimeType = m[1];
      const ext = mimeType.split('/')[1] || 'png';
      filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext.replace(/[^a-zA-Z0-9]/g, '')}`;
      const filePath = path.join(UPLOAD_DIR, filename);
      const buffer = Buffer.from(m[2], 'base64');
      await fs.writeFile(filePath, buffer);
      size = buffer.length;
      publicUrl = `${baseUrlFromReq(req)}/uploads/situation/${filename}`;
    } else {
      res.status(400).json({ ok: false, error: 'Expected multipart file upload or image dataUrl payload' });
      return;
    }

    const reportId = body.reportId ? String(body.reportId) : undefined;
    const projectId = body.projectId ? String(body.projectId) : undefined;
    const setAsMain = String(body.setAsMain || '').toLowerCase() === 'true';
    const caption = body.caption ? String(body.caption) : undefined;

    const media = await readJsonArray<SituationRoomMedia>(MEDIA_FILE);
    if (setAsMain) {
      for (const item of media) {
        if (item.roomId === roomId) item.isMain = false;
      }
    }
    const mediaItem: SituationRoomMedia = {
      id: makeId('media'),
      roomId,
      reportId,
      projectId,
      url: publicUrl,
      filename,
      mimeType,
      size,
      caption,
      isMain: setAsMain || undefined,
      createdAt: new Date().toISOString(),
    };
    media.push(mediaItem);
    await writeJsonArray(MEDIA_FILE, media);

    await appendSystemMessage(roomId, 'Media uploaded to this Situation Room.');
    if (setAsMain) {
      await appendSystemMessage(roomId, 'Main image updated for this Situation Room.');
    }

    res.status(201).json({
      ok: true,
      media: mediaItem,
      // Legacy shape for existing frontend adapter compatibility
      url: mediaItem.url,
      path: `/uploads/situation/${filename}`,
      sizeBytes: mediaItem.size,
      mimeType: mediaItem.mimeType,
      persistent: true,
      storage: 'file',
    });
  } catch (error: any) {
    console.error('[POST /api/situation/media] failed', error);
    res.status(500).json({ ok: false, error: error?.message || 'Upload failed' });
  }
});

export default router;
