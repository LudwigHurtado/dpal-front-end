/**
 * Situation Room persistence — Prisma (primary) with file JSON fallback for local/dev.
 * Soft-deletes messages only; append-only hash chain for transcript integrity.
 */
import crypto from 'crypto';
import path from 'path';
import { promises as fs } from 'fs';
import {
  Prisma,
  SituationMessageType,
  SituationRoomStatus,
  SituationValidatorReviewStatus,
} from '@prisma/client';
import { prisma } from '../lib/prisma';

export type SituationSourceType =
  | 'public_report'
  | 'aqua_scan'
  | 'carb_audit'
  | 'water_scan'
  | 'afolu_project'
  | 'carbon_viu_project'
  | 'mission'
  | 'manual';

export type SituationRoomDto = {
  id: string;
  roomId: string;
  reportId?: string;
  projectId?: string;
  sourceType: SituationSourceType;
  title: string;
  category?: string;
  status: SituationRoomStatus;
  canonicalUrl?: string;
  qrUrl?: string;
  createdByUserId?: string;
  methodologyId?: string;
  reportingPeriodStart?: string;
  reportingPeriodEnd?: string;
  aoiId?: string;
  evidencePacketId?: string;
  publicVisibility: string;
  integrityHash?: string;
  blockchainAnchorId?: string;
  location?: unknown;
  ledger?: unknown;
  evidencePacket?: unknown;
  aiSummary?: unknown;
  sourceSnapshot?: unknown;
  cadTrustMetadata?: unknown;
  cmiAlignment?: unknown;
  sealedAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  qr?: {
    reportUrl?: string;
    situationRoomUrl?: string;
    transparencyUrl?: string;
  };
};

export type SituationMessageDto = {
  id: string;
  roomId: string;
  authorUserId?: string;
  authorName?: string;
  authorRole?: string;
  authorOrganization?: string;
  body: string;
  messageType: SituationMessageType;
  aiGenerated: boolean;
  linkedEvidenceIds?: string[];
  linkedMethodologyStepId?: string;
  attachmentIds?: string[];
  contentHash?: string;
  previousMessageHash?: string;
  metadata?: unknown;
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
};

export type ValidatorReviewDto = {
  id: string;
  roomId: string;
  validatorIdentity?: string;
  organization?: string;
  accreditation?: string;
  conflictOfInterestDisclosure?: string;
  filesReviewed?: unknown[];
  questions?: unknown[];
  findings?: unknown[];
  deficiencies?: unknown[];
  reviewStatus: SituationValidatorReviewStatus;
  finalNote?: string;
  attestationSignature?: string;
  createdAt: string;
  updatedAt: string;
};

const DATA_DIR = path.resolve(process.cwd(), 'data', 'situation');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

let prismaAvailable: boolean | null = null;

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

export function resolveFrontendBase(): string {
  const fromOrigin = (process.env.FRONTEND_ORIGIN || '').split(',')[0]?.trim();
  const fromCors = (process.env.CORS_ORIGINS || '').split(',')[0]?.trim();
  const raw = fromOrigin || fromCors || 'https://dpal.info';
  return raw.replace(/\/+$/, '');
}

export function buildCanonicalRoomPath(roomId: string): string {
  return `/situation-room/${encodeURIComponent(roomId)}`;
}

export function buildCanonicalRoomUrl(roomId: string, mode?: 'public' | 'validator' | 'sealed'): string {
  const base = resolveFrontendBase();
  const u = new URL(buildCanonicalRoomPath(roomId), base);
  if (mode) u.searchParams.set('mode', mode);
  return u.toString();
}

function mapLegacyStatus(value: unknown): SituationRoomStatus {
  const raw = String(value || '').toUpperCase();
  if (raw === 'DRAFT') return SituationRoomStatus.DRAFT;
  if (raw === 'UNDER_REVIEW' || raw === 'under_review') return SituationRoomStatus.UNDER_REVIEW;
  if (raw === 'SEALED' || raw === 'verified') return SituationRoomStatus.SEALED;
  if (raw === 'ARCHIVED' || raw === 'closed') return SituationRoomStatus.ARCHIVED;
  if (raw === 'ACTIVE' || raw === 'active') return SituationRoomStatus.ACTIVE;
  return SituationRoomStatus.ACTIVE;
}

function mapMessageType(value: unknown, isSystem?: boolean): SituationMessageType {
  const raw = String(value || '').toUpperCase();
  if (raw === 'SYSTEM' || isSystem) return SituationMessageType.SYSTEM;
  if (raw === 'AI' || raw === 'ai') return SituationMessageType.AI;
  if (raw === 'VALIDATOR' || raw === 'validator') return SituationMessageType.VALIDATOR;
  return SituationMessageType.USER;
}

function hashContent(input: string): string {
  return `0x${crypto.createHash('sha256').update(input).digest('hex')}`;
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
  return hashContent(JSON.stringify(normalize(input ?? {})));
}

async function canUsePrisma(): Promise<boolean> {
  if (prismaAvailable !== null) return prismaAvailable;
  try {
    await prisma.$queryRaw`SELECT 1`;
    prismaAvailable = true;
  } catch {
    prismaAvailable = false;
  }
  return prismaAvailable;
}

function prismaRoomToDto(row: {
  id: string;
  roomId: string;
  reportId: string | null;
  projectId: string | null;
  sourceType: string;
  title: string;
  category: string | null;
  status: SituationRoomStatus;
  canonicalUrl: string | null;
  qrUrl: string | null;
  createdByUserId: string | null;
  methodologyId: string | null;
  reportingPeriodStart: Date | null;
  reportingPeriodEnd: Date | null;
  aoiId: string | null;
  evidencePacketId: string | null;
  publicVisibility: string;
  integrityHash: string | null;
  blockchainAnchorId: string | null;
  location: unknown;
  ledger: unknown;
  evidencePacket: unknown;
  aiSummary: unknown;
  sourceSnapshot: unknown;
  cadTrustMetadata: unknown;
  cmiAlignment: unknown;
  sealedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): SituationRoomDto {
  const canonicalUrl = row.canonicalUrl ?? buildCanonicalRoomUrl(row.roomId);
  return {
    id: row.id,
    roomId: row.roomId,
    reportId: row.reportId ?? undefined,
    projectId: row.projectId ?? undefined,
    sourceType: row.sourceType as SituationSourceType,
    title: row.title,
    category: row.category ?? undefined,
    status: row.status,
    canonicalUrl,
    qrUrl: row.qrUrl ?? canonicalUrl,
    createdByUserId: row.createdByUserId ?? undefined,
    methodologyId: row.methodologyId ?? undefined,
    reportingPeriodStart: row.reportingPeriodStart?.toISOString(),
    reportingPeriodEnd: row.reportingPeriodEnd?.toISOString(),
    aoiId: row.aoiId ?? undefined,
    evidencePacketId: row.evidencePacketId ?? undefined,
    publicVisibility: row.publicVisibility,
    integrityHash: row.integrityHash ?? undefined,
    blockchainAnchorId: row.blockchainAnchorId ?? undefined,
    location: row.location ?? undefined,
    ledger: row.ledger ?? undefined,
    evidencePacket: row.evidencePacket ?? undefined,
    aiSummary: row.aiSummary ?? undefined,
    sourceSnapshot: row.sourceSnapshot ?? undefined,
    cadTrustMetadata: row.cadTrustMetadata ?? undefined,
    cmiAlignment: row.cmiAlignment ?? undefined,
    sealedAt: row.sealedAt?.toISOString(),
    archivedAt: row.archivedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    qr: {
      situationRoomUrl: canonicalUrl,
      transparencyUrl: row.reportId
        ? `${resolveFrontendBase()}/transparency-db?reportId=${encodeURIComponent(row.reportId)}`
        : undefined,
    },
  };
}

async function readFileRooms(): Promise<SituationRoomDto[]> {
  try {
    const raw = await fs.readFile(ROOMS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((r) => {
      const roomId = String(r.roomId || r.id || '');
      const canonicalUrl = buildCanonicalRoomUrl(roomId);
      return {
        id: String(r.id || roomId),
        roomId,
        reportId: r.reportId ? String(r.reportId) : undefined,
        projectId: r.projectId ? String(r.projectId) : undefined,
        sourceType: (r.sourceType as SituationSourceType) || 'manual',
        title: String(r.title || `Situation Room ${roomId}`),
        category: r.category ? String(r.category) : undefined,
        status: mapLegacyStatus(r.status),
        canonicalUrl,
        qrUrl: canonicalUrl,
        publicVisibility: 'private',
        location: r.location,
        ledger: r.ledger,
        evidencePacket: r.evidencePacket,
        aiSummary: r.aiSummary,
        sourceSnapshot: r.sourceSnapshot,
        createdAt: String(r.createdAt || new Date().toISOString()),
        updatedAt: String(r.updatedAt || r.createdAt || new Date().toISOString()),
        qr: (r.qr as SituationRoomDto['qr']) || { situationRoomUrl: canonicalUrl },
      };
    });
  } catch {
    return [];
  }
}

async function migrateFileRoomToPrisma(room: SituationRoomDto): Promise<void> {
  if (!(await canUsePrisma())) return;
  const existing = await prisma.situationRoom.findUnique({ where: { roomId: room.roomId } });
  if (existing) return;
  await prisma.situationRoom.create({
    data: {
      roomId: room.roomId,
      reportId: room.reportId,
      projectId: room.projectId,
      sourceType: room.sourceType,
      title: room.title,
      category: room.category,
      status: room.status,
      canonicalUrl: room.canonicalUrl ?? buildCanonicalRoomUrl(room.roomId),
      qrUrl: room.qrUrl ?? buildCanonicalRoomUrl(room.roomId),
      publicVisibility: room.publicVisibility || 'private',
      location: room.location as Prisma.InputJsonValue,
      ledger: room.ledger as Prisma.InputJsonValue,
      evidencePacket: room.evidencePacket as Prisma.InputJsonValue,
      aiSummary: room.aiSummary as Prisma.InputJsonValue,
      sourceSnapshot: room.sourceSnapshot as Prisma.InputJsonValue,
      integrityHash: room.integrityHash,
      createdAt: new Date(room.createdAt),
      updatedAt: new Date(room.updatedAt),
    },
  });
}

export async function getRoomById(roomId: string): Promise<SituationRoomDto | null> {
  if (await canUsePrisma()) {
    const row = await prisma.situationRoom.findUnique({ where: { roomId } });
    if (row) return prismaRoomToDto(row);
  }
  const fileRoom = (await readFileRooms()).find((r) => r.roomId === roomId);
  if (!fileRoom) return null;
  await migrateFileRoomToPrisma(fileRoom);
  if (await canUsePrisma()) {
    const row = await prisma.situationRoom.findUnique({ where: { roomId } });
    if (row) return prismaRoomToDto(row);
  }
  return fileRoom;
}

export async function listRooms(): Promise<SituationRoomDto[]> {
  if (await canUsePrisma()) {
    const rows = await prisma.situationRoom.findMany({ orderBy: { updatedAt: 'desc' }, take: 500 });
    return rows.map(prismaRoomToDto);
  }
  return readFileRooms();
}

export async function upsertRoom(input: Partial<SituationRoomDto> & { roomId: string }): Promise<SituationRoomDto> {
  const roomId = input.roomId.trim();
  const canonicalUrl = input.canonicalUrl ?? buildCanonicalRoomUrl(roomId);
  const qrUrl = input.qrUrl ?? canonicalUrl;
  const now = new Date();

  if (await canUsePrisma()) {
    const data = {
      reportId: input.reportId,
      projectId: input.projectId,
      sourceType: input.sourceType ?? 'manual',
      title: input.title ?? `Situation Room ${roomId}`,
      category: input.category,
      status: input.status ?? SituationRoomStatus.ACTIVE,
      canonicalUrl,
      qrUrl,
      createdByUserId: input.createdByUserId,
      methodologyId: input.methodologyId,
      reportingPeriodStart: input.reportingPeriodStart ? new Date(input.reportingPeriodStart) : undefined,
      reportingPeriodEnd: input.reportingPeriodEnd ? new Date(input.reportingPeriodEnd) : undefined,
      aoiId: input.aoiId,
      evidencePacketId: input.evidencePacketId,
      publicVisibility: input.publicVisibility ?? 'private',
      integrityHash: input.integrityHash,
      blockchainAnchorId: input.blockchainAnchorId,
      location: input.location as Prisma.InputJsonValue,
      ledger: input.ledger as Prisma.InputJsonValue,
      evidencePacket: input.evidencePacket as Prisma.InputJsonValue,
      aiSummary: input.aiSummary as Prisma.InputJsonValue,
      sourceSnapshot: input.sourceSnapshot as Prisma.InputJsonValue,
      cadTrustMetadata: input.cadTrustMetadata as Prisma.InputJsonValue,
      cmiAlignment: input.cmiAlignment as Prisma.InputJsonValue,
      updatedAt: now,
    };
    const row = await prisma.situationRoom.upsert({
      where: { roomId },
      create: { roomId, ...data, createdAt: now },
      update: data,
    });
    return prismaRoomToDto(row);
  }

  const rooms = await readFileRooms();
  const idx = rooms.findIndex((r) => r.roomId === roomId);
  const merged: SituationRoomDto = {
    ...(idx >= 0 ? rooms[idx] : {}),
    ...input,
    id: idx >= 0 ? rooms[idx].id : makeId('room'),
    roomId,
    canonicalUrl,
    qrUrl,
    publicVisibility: input.publicVisibility ?? 'private',
    status: input.status ?? SituationRoomStatus.ACTIVE,
    sourceType: input.sourceType ?? 'manual',
    title: input.title ?? `Situation Room ${roomId}`,
    createdAt: idx >= 0 ? rooms[idx].createdAt : now.toISOString(),
    updatedAt: now.toISOString(),
  } as SituationRoomDto;
  if (idx >= 0) rooms[idx] = merged;
  else rooms.unshift(merged);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(ROOMS_FILE, JSON.stringify(rooms, null, 2), 'utf8');
  return merged;
}

export async function appendAuditLog(
  roomId: string,
  action: string,
  payload?: unknown,
  actorUserId?: string,
): Promise<void> {
  if (!(await canUsePrisma())) return;
  await prisma.situationRoomAuditLog.create({
    data: { roomId, action, actorUserId, payload: payload as Prisma.InputJsonValue },
  });
}

export async function getMessages(
  roomId: string,
  opts?: { includeDeleted?: boolean; includeValidator?: boolean; limit?: number },
): Promise<SituationMessageDto[]> {
  const limit = Math.min(opts?.limit ?? 500, 2000);
  if (await canUsePrisma()) {
    const rows = await prisma.situationRoomMessage.findMany({
      where: {
        roomId,
        ...(opts?.includeDeleted ? {} : { deletedAt: null }),
        ...(opts?.includeValidator === false ? { messageType: { not: SituationMessageType.VALIDATOR } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return rows.map((m) => ({
      id: m.id,
      roomId: m.roomId,
      authorUserId: m.authorUserId ?? undefined,
      authorName: m.authorName ?? undefined,
      authorRole: m.authorRole ?? undefined,
      authorOrganization: m.authorOrganization ?? undefined,
      body: m.body,
      messageType: m.messageType,
      aiGenerated: m.aiGenerated,
      linkedEvidenceIds: (m.linkedEvidenceIds as string[]) ?? undefined,
      linkedMethodologyStepId: m.linkedMethodologyStepId ?? undefined,
      attachmentIds: (m.attachmentIds as string[]) ?? undefined,
      contentHash: m.contentHash ?? undefined,
      previousMessageHash: m.previousMessageHash ?? undefined,
      metadata: m.metadata ?? undefined,
      createdAt: m.createdAt.toISOString(),
      editedAt: m.editedAt?.toISOString(),
      deletedAt: m.deletedAt?.toISOString(),
    }));
  }
  try {
    const raw = await fs.readFile(MESSAGES_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    return (Array.isArray(parsed) ? parsed : [])
      .filter((m) => String(m.roomId) === roomId)
      .map((m) => ({
        id: String(m.id),
        roomId,
        authorName: m.senderName ? String(m.senderName) : String(m.sender || 'OPERATIVE'),
        authorRole: m.senderRole ? String(m.senderRole) : undefined,
        body: String(m.text || ''),
        messageType: mapMessageType(m.type, Boolean(m.isSystem)),
        aiGenerated: mapMessageType(m.type) === SituationMessageType.AI,
        createdAt: String(m.createdAt || new Date().toISOString()),
        metadata: m.metadata,
      }))
      .slice(-limit);
  } catch {
    return [];
  }
}

export async function appendMessage(input: {
  roomId: string;
  body: string;
  authorUserId?: string;
  authorName?: string;
  authorRole?: string;
  authorOrganization?: string;
  messageType?: SituationMessageType;
  aiGenerated?: boolean;
  linkedEvidenceIds?: string[];
  linkedMethodologyStepId?: string;
  attachmentIds?: string[];
  metadata?: unknown;
}): Promise<SituationMessageDto> {
  const room = await getRoomById(input.roomId);
  if (!room) throw new Error('Room not found');
  if (room.status === SituationRoomStatus.SEALED || room.status === SituationRoomStatus.ARCHIVED) {
    throw new Error('Room is sealed or archived and cannot accept new messages');
  }

  const prior = await getMessages(input.roomId, { limit: 1 });
  const previousMessageHash = prior.length ? prior[prior.length - 1].contentHash : undefined;
  const contentHash = hashContent(
    JSON.stringify({
      roomId: input.roomId,
      body: input.body,
      previousMessageHash,
      at: new Date().toISOString(),
    }),
  );

  if (await canUsePrisma()) {
    const row = await prisma.situationRoomMessage.create({
      data: {
        roomId: input.roomId,
        body: input.body,
        authorUserId: input.authorUserId,
        authorName: input.authorName ?? 'OPERATIVE',
        authorRole: input.authorRole,
        authorOrganization: input.authorOrganization,
        messageType: input.messageType ?? SituationMessageType.USER,
        aiGenerated: Boolean(input.aiGenerated),
        linkedEvidenceIds: input.linkedEvidenceIds as Prisma.InputJsonValue,
        linkedMethodologyStepId: input.linkedMethodologyStepId,
        attachmentIds: input.attachmentIds as Prisma.InputJsonValue,
        contentHash,
        previousMessageHash,
        metadata: input.metadata as Prisma.InputJsonValue,
      },
    });
    await prisma.situationRoom.update({ where: { roomId: input.roomId }, data: { updatedAt: new Date() } });
    await appendAuditLog(input.roomId, 'message_appended', { messageId: row.id });
    return {
      id: row.id,
      roomId: row.roomId,
      authorUserId: row.authorUserId ?? undefined,
      authorName: row.authorName ?? undefined,
      authorRole: row.authorRole ?? undefined,
      authorOrganization: row.authorOrganization ?? undefined,
      body: row.body,
      messageType: row.messageType,
      aiGenerated: row.aiGenerated,
      contentHash: row.contentHash ?? undefined,
      previousMessageHash: row.previousMessageHash ?? undefined,
      createdAt: row.createdAt.toISOString(),
    };
  }

  const messagesRaw = await fs.readFile(MESSAGES_FILE, 'utf8').catch(() => '[]');
  const messages = JSON.parse(messagesRaw) as Array<Record<string, unknown>>;
  const msg = {
    id: makeId('msg'),
    roomId: input.roomId,
    text: input.body,
    senderName: input.authorName ?? 'OPERATIVE',
    senderRole: input.authorRole,
    type: (input.messageType ?? SituationMessageType.USER).toLowerCase(),
    createdAt: new Date().toISOString(),
    contentHash,
    previousMessageHash,
  };
  messages.push(msg);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
  return {
    id: String(msg.id),
    roomId: input.roomId,
    authorName: input.authorName,
    body: input.body,
    messageType: input.messageType ?? SituationMessageType.USER,
    aiGenerated: Boolean(input.aiGenerated),
    contentHash,
    previousMessageHash,
    createdAt: String(msg.createdAt),
  };
}

export function computeCmiAlignment(room: SituationRoomDto, review: ValidatorReviewDto | null): Record<string, unknown> {
  return {
    governance: {
      rolesIdentified: Boolean(room.createdByUserId || review?.validatorIdentity),
      label: 'Governance: roles identified',
      ok: Boolean(room.createdByUserId || review?.validatorIdentity),
    },
    security: {
      accessControlsEnabled: room.publicVisibility !== 'public',
      label: 'Security: access controls enabled',
      ok: true,
    },
    interoperability: {
      structuredMetadata: Boolean(room.projectId || room.methodologyId || room.evidencePacketId),
      label: 'Interoperability: project metadata structured',
      ok: Boolean(room.projectId || room.methodologyId),
    },
    digitalMrv: {
      methodologyLinked: Boolean(room.methodologyId || room.evidencePacket),
      label: 'Digital MRV: evidence linked to methodology',
      ok: Boolean(room.methodologyId || room.evidencePacket),
    },
    transactionIntegrity: {
      hashRecorded: Boolean(room.integrityHash),
      anchorRecorded: Boolean(room.blockchainAnchorId),
      label: 'Transaction integrity: hash/anchor/anti-tamper record',
      ok: Boolean(room.integrityHash),
    },
    validatorIndependence: {
      coiCaptured: Boolean(review?.conflictOfInterestDisclosure),
      validatorRole: Boolean(review?.validatorIdentity),
      label: 'Validator independence: role and COI disclosure captured',
      ok: Boolean(review?.validatorIdentity && review?.conflictOfInterestDisclosure),
    },
    disclaimer:
      'DPAL stores supporting MRV/evidence documentation. Registry-level data may be mapped to CAD Trust-compatible metadata where applicable. The Situation Room is not itself a carbon registry.',
  };
}

export async function getValidatorReview(roomId: string): Promise<ValidatorReviewDto | null> {
  if (!(await canUsePrisma())) return null;
  const row = await prisma.situationValidatorReview.findUnique({ where: { roomId } });
  if (!row) return null;
  return {
    id: row.id,
    roomId: row.roomId,
    validatorIdentity: row.validatorIdentity ?? undefined,
    organization: row.organization ?? undefined,
    accreditation: row.accreditation ?? undefined,
    conflictOfInterestDisclosure: row.conflictOfInterestDisclosure ?? undefined,
    filesReviewed: (row.filesReviewed as unknown[]) ?? undefined,
    questions: (row.questions as unknown[]) ?? undefined,
    findings: (row.findings as unknown[]) ?? undefined,
    deficiencies: (row.deficiencies as unknown[]) ?? undefined,
    reviewStatus: row.reviewStatus,
    finalNote: row.finalNote ?? undefined,
    attestationSignature: row.attestationSignature ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function upsertValidatorReview(
  roomId: string,
  input: Partial<ValidatorReviewDto>,
): Promise<ValidatorReviewDto> {
  if (!(await canUsePrisma())) throw new Error('Validator review requires database persistence');
  const row = await prisma.situationValidatorReview.upsert({
    where: { roomId },
    create: {
      roomId,
      validatorIdentity: input.validatorIdentity,
      organization: input.organization,
      accreditation: input.accreditation,
      conflictOfInterestDisclosure: input.conflictOfInterestDisclosure,
      filesReviewed: input.filesReviewed as Prisma.InputJsonValue,
      questions: input.questions as Prisma.InputJsonValue,
      findings: input.findings as Prisma.InputJsonValue,
      deficiencies: input.deficiencies as Prisma.InputJsonValue,
      reviewStatus: input.reviewStatus ?? SituationValidatorReviewStatus.PENDING,
      finalNote: input.finalNote,
      attestationSignature: input.attestationSignature,
    },
    update: {
      validatorIdentity: input.validatorIdentity,
      organization: input.organization,
      accreditation: input.accreditation,
      conflictOfInterestDisclosure: input.conflictOfInterestDisclosure,
      filesReviewed: input.filesReviewed as Prisma.InputJsonValue,
      questions: input.questions as Prisma.InputJsonValue,
      findings: input.findings as Prisma.InputJsonValue,
      deficiencies: input.deficiencies as Prisma.InputJsonValue,
      reviewStatus: input.reviewStatus,
      finalNote: input.finalNote,
      attestationSignature: input.attestationSignature,
      updatedAt: new Date(),
    },
  });
  await appendAuditLog(roomId, 'validator_review_updated', { reviewStatus: row.reviewStatus });
  return (await getValidatorReview(roomId))!;
}

export async function sealRoom(roomId: string, actorUserId?: string): Promise<SituationRoomDto> {
  const room = await getRoomById(roomId);
  if (!room) throw new Error('Room not found');
  const messages = await getMessages(roomId);
  const manifestHash = hashEvidence({ room, messages });
  const sealedAt = new Date();
  return upsertRoom({
    ...room,
    status: SituationRoomStatus.SEALED,
    sealedAt: sealedAt.toISOString(),
    integrityHash: manifestHash,
    cmiAlignment: computeCmiAlignment(room, await getValidatorReview(roomId)),
  }).then(async (updated) => {
    await appendAuditLog(roomId, 'room_sealed', { integrityHash: manifestHash }, actorUserId);
    return updated;
  });
}

export { hashEvidence, SituationRoomStatus, SituationMessageType, SituationValidatorReviewStatus };
