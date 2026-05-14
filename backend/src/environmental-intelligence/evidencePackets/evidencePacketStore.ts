import type { EnvironmentalEvidencePacket as EnvironmentalEvidencePacketRow, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { attachIntegrityHashToPacket } from './evidencePacketHash';
import type { DpalEvidencePacket, EvidencePacketSafetyLabels, EvidencePacketValidationStatus } from './evidencePacketTypes';
import type { EvidenceConfidenceSummary } from '../sources/confidenceEngine';
import type { EvidenceLane } from '../sources/evidenceNormalizer';
import type { ProviderRunResult } from '../sources/providerAdapters';
import type { SkippedSource } from '../sources/useCaseSourceRunner';

export interface EvidencePacketStore {
  readonly mode: 'prisma' | 'memory';
  save(packet: DpalEvidencePacket): Promise<DpalEvidencePacket>;
  get(packetId: string): Promise<DpalEvidencePacket | null>;
  list(limit: number): Promise<DpalEvidencePacket[]>;
  update(packetId: string, patch: Partial<DpalEvidencePacket>): Promise<DpalEvidencePacket | null>;
}

const FALLBACK_WARN =
  '[evidence-packets] EvidencePacketStore using in-memory fallback; packets are not persistent.';

let singleton: EvidencePacketStore | null = null;
let fallbackWarned = false;

export function isDatabaseUrlConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function rowToPacket(row: EnvironmentalEvidencePacketRow): DpalEvidencePacket {
  return {
    packetId: row.packetId,
    runId: row.runId,
    useCaseId: row.useCaseId ?? undefined,
    title: row.title,
    locationLabel: row.locationLabel ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    radiusKm: row.radiusKm ?? undefined,
    aoiGeoJson: row.aoiGeoJson ?? undefined,
    baselineDate: row.baselineDate ?? undefined,
    currentDate: row.currentDate ?? undefined,
    requestedSources: row.requestedSources as unknown as string[],
    providerResults: row.providerResults as unknown as ProviderRunResult[],
    evidenceLanes: row.evidenceLanes as unknown as EvidenceLane[],
    confidence: row.confidence as unknown as EvidenceConfidenceSummary,
    limitations: row.limitations as unknown as string[],
    skippedSources: (row.skippedSources as unknown as SkippedSource[] | null) ?? undefined,
    safetyLabels: row.safetyLabels as unknown as EvidencePacketSafetyLabels,
    validationStatus: row.validationStatus as EvidencePacketValidationStatus,
    situationRoomId: row.situationRoomId ?? undefined,
    projectId: row.projectId ?? undefined,
    qrPayload: row.qrPayload ?? undefined,
    integrityHash: row.integrityHash,
    integrityHashLimitation: row.integrityHashLimitation,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function packetToCreateInput(packet: DpalEvidencePacket): Prisma.EnvironmentalEvidencePacketCreateInput {
  return {
    packetId: packet.packetId,
    runId: packet.runId,
    useCaseId: packet.useCaseId ?? null,
    title: packet.title,
    locationLabel: packet.locationLabel ?? null,
    lat: packet.lat ?? null,
    lng: packet.lng ?? null,
    radiusKm: packet.radiusKm ?? null,
    aoiGeoJson: (packet.aoiGeoJson ?? null) as Prisma.InputJsonValue,
    baselineDate: packet.baselineDate ?? null,
    currentDate: packet.currentDate ?? null,
    requestedSources: packet.requestedSources as unknown as Prisma.InputJsonValue,
    providerResults: packet.providerResults as unknown as Prisma.InputJsonValue,
    evidenceLanes: packet.evidenceLanes as unknown as Prisma.InputJsonValue,
    confidence: packet.confidence as unknown as Prisma.InputJsonValue,
    limitations: packet.limitations as unknown as Prisma.InputJsonValue,
    skippedSources: (packet.skippedSources ?? null) as unknown as Prisma.InputJsonValue,
    safetyLabels: packet.safetyLabels as unknown as Prisma.InputJsonValue,
    validationStatus: packet.validationStatus,
    situationRoomId: packet.situationRoomId ?? null,
    projectId: packet.projectId ?? null,
    qrPayload: (packet.qrPayload ?? null) as Prisma.InputJsonValue,
    integrityHash: packet.integrityHash,
    integrityHashLimitation: packet.integrityHashLimitation,
  };
}

function packetToUpdateInput(packet: DpalEvidencePacket): Prisma.EnvironmentalEvidencePacketUpdateInput {
  return {
    runId: packet.runId,
    useCaseId: packet.useCaseId ?? null,
    title: packet.title,
    locationLabel: packet.locationLabel ?? null,
    lat: packet.lat ?? null,
    lng: packet.lng ?? null,
    radiusKm: packet.radiusKm ?? null,
    aoiGeoJson: (packet.aoiGeoJson ?? null) as Prisma.InputJsonValue,
    baselineDate: packet.baselineDate ?? null,
    currentDate: packet.currentDate ?? null,
    requestedSources: packet.requestedSources as unknown as Prisma.InputJsonValue,
    providerResults: packet.providerResults as unknown as Prisma.InputJsonValue,
    evidenceLanes: packet.evidenceLanes as unknown as Prisma.InputJsonValue,
    confidence: packet.confidence as unknown as Prisma.InputJsonValue,
    limitations: packet.limitations as unknown as Prisma.InputJsonValue,
    skippedSources: (packet.skippedSources ?? null) as unknown as Prisma.InputJsonValue,
    safetyLabels: packet.safetyLabels as unknown as Prisma.InputJsonValue,
    validationStatus: packet.validationStatus,
    situationRoomId: packet.situationRoomId ?? null,
    projectId: packet.projectId ?? null,
    qrPayload: (packet.qrPayload ?? null) as Prisma.InputJsonValue,
    integrityHash: packet.integrityHash,
    integrityHashLimitation: packet.integrityHashLimitation,
  };
}

/**
 * PostgreSQL-backed store (Prisma). Requires `DATABASE_URL` and a migrated/pushed schema.
 */
export class PrismaEvidencePacketStore implements EvidencePacketStore {
  readonly mode = 'prisma' as const;

  async save(packet: DpalEvidencePacket): Promise<DpalEvidencePacket> {
    const row = await prisma.environmentalEvidencePacket.upsert({
      where: { packetId: packet.packetId },
      create: packetToCreateInput(packet),
      update: packetToUpdateInput(packet),
    });
    return rowToPacket(row);
  }

  async get(packetId: string): Promise<DpalEvidencePacket | null> {
    const row = await prisma.environmentalEvidencePacket.findUnique({ where: { packetId } });
    return row ? rowToPacket(row) : null;
  }

  async list(limit: number): Promise<DpalEvidencePacket[]> {
    const n = Math.min(Math.max(1, limit), 200);
    const rows = await prisma.environmentalEvidencePacket.findMany({
      orderBy: { createdAt: 'desc' },
      take: n,
    });
    return rows.map(rowToPacket);
  }

  async update(packetId: string, patch: Partial<DpalEvidencePacket>): Promise<DpalEvidencePacket | null> {
    const cur = await this.get(packetId);
    if (!cur) return null;
    const { integrityHash: _ih, integrityHashLimitation: _il, ...rest } = cur;
    const merged = {
      ...rest,
      ...patch,
      packetId: cur.packetId,
      runId: patch.runId ?? cur.runId,
      updatedAt: new Date().toISOString(),
    } as Omit<DpalEvidencePacket, 'integrityHash' | 'integrityHashLimitation'>;
    const next = attachIntegrityHashToPacket(merged);
    const row = await prisma.environmentalEvidencePacket.update({
      where: { packetId },
      data: packetToUpdateInput(next),
    });
    return rowToPacket(row);
  }
}

/**
 * In-memory store for development when `DATABASE_URL` is unset, or as an explicit fallback.
 */
export class InMemoryEvidencePacketStore implements EvidencePacketStore {
  readonly mode = 'memory' as const;

  private readonly byId = new Map<string, DpalEvidencePacket>();

  async save(packet: DpalEvidencePacket): Promise<DpalEvidencePacket> {
    this.byId.set(packet.packetId, packet);
    return packet;
  }

  async get(packetId: string): Promise<DpalEvidencePacket | null> {
    return this.byId.get(packetId) ?? null;
  }

  async list(limit: number): Promise<DpalEvidencePacket[]> {
    const n = Math.min(Math.max(1, limit), 200);
    const all = [...this.byId.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return all.slice(0, n);
  }

  async update(packetId: string, patch: Partial<DpalEvidencePacket>): Promise<DpalEvidencePacket | null> {
    const cur = await this.get(packetId);
    if (!cur) return null;
    const { integrityHash: _ih, integrityHashLimitation: _il, ...rest } = cur;
    const merged = {
      ...rest,
      ...patch,
      packetId: cur.packetId,
      runId: patch.runId ?? cur.runId,
      updatedAt: new Date().toISOString(),
    } as Omit<DpalEvidencePacket, 'integrityHash' | 'integrityHashLimitation'>;
    const next = attachIntegrityHashToPacket(merged);
    this.byId.set(packetId, next);
    return next;
  }
}

function createEvidencePacketStore(): EvidencePacketStore {
  if (isDatabaseUrlConfigured()) {
    return new PrismaEvidencePacketStore();
  }
  if (!fallbackWarned) {
    console.warn(FALLBACK_WARN);
    fallbackWarned = true;
  }
  return new InMemoryEvidencePacketStore();
}

export function getEvidencePacketStore(): EvidencePacketStore {
  if (!singleton) {
    singleton = createEvidencePacketStore();
  }
  return singleton;
}

export function getActiveEvidencePacketStoreMode(): 'prisma' | 'memory' {
  return getEvidencePacketStore().mode;
}

/** Test-only reset (clears singleton and fallback warning state). */
export function __resetEvidencePacketStoreForTests(): void {
  singleton = null;
  fallbackWarned = false;
}
