import type {
  CarbonPuraEvidenceEvent as EventRow,
  CarbonPuraEvidencePacket as PacketRow,
  CarbonPuraProject as ProjectRow,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { computeCarbonPuraEvidenceHash } from './carbonPuraHash';
import type {
  CarbonPuraEvidenceEventRecord,
  CarbonPuraEvidencePacketRecord,
  CarbonPuraProjectRecord,
} from './carbonPuraEvidenceTypes';

export interface CarbonPuraEvidenceStore {
  readonly mode: 'prisma' | 'memory';
  listProjects(partnerKey: string): Promise<CarbonPuraProjectRecord[]>;
  createProject(input: {
    projectId: string;
    partnerKey: string;
    name: string;
    status?: string;
    locationLabel?: string | null;
  }): Promise<CarbonPuraProjectRecord>;
  getProject(projectId: string): Promise<CarbonPuraProjectRecord | null>;
  listEvents(projectId: string): Promise<CarbonPuraEvidenceEventRecord[]>;
  createEvent(input: Omit<CarbonPuraEvidenceEventRecord, 'id' | 'eventId' | 'evidenceHash' | 'createdAt'> & {
    eventId?: string;
  }): Promise<CarbonPuraEvidenceEventRecord>;
  listPackets(projectId: string): Promise<CarbonPuraEvidencePacketRecord[]>;
  createDraftPacket(input: {
    projectId: string;
    partnerKey: string;
    title: string;
    summary?: string | null;
    eventIds: string[];
  }): Promise<CarbonPuraEvidencePacketRecord>;
}

const FALLBACK_WARN =
  '[carbonpura] CarbonPuraEvidenceStore using in-memory fallback; evidence chain is not persistent.';

let singleton: CarbonPuraEvidenceStore | null = null;
let fallbackWarned = false;

export function isDatabaseUrlConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function rowToProject(row: ProjectRow): CarbonPuraProjectRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    partnerKey: row.partnerKey,
    name: row.name,
    status: row.status,
    locationLabel: row.locationLabel,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function rowToEvent(row: EventRow): CarbonPuraEvidenceEventRecord {
  return {
    id: row.id,
    eventId: row.eventId,
    projectId: row.projectId,
    partnerKey: row.partnerKey,
    moduleId: row.moduleId,
    moduleName: row.moduleName,
    sourceSuite: row.sourceSuite,
    eventType: row.eventType,
    title: row.title,
    summary: row.summary,
    status: row.status,
    coordinates: row.coordinates,
    aoiGeoJson: row.aoiGeoJson,
    provider: row.provider,
    confidenceUse: row.confidenceUse,
    rawPayloadJson: row.rawPayloadJson,
    limitationsJson: row.limitationsJson,
    evidenceHash: row.evidenceHash,
    createdAt: row.createdAt.toISOString(),
  };
}

function rowToPacket(row: PacketRow): CarbonPuraEvidencePacketRecord {
  const eventIds = Array.isArray(row.eventIds) ? (row.eventIds as string[]) : [];
  return {
    id: row.id,
    packetId: row.packetId,
    projectId: row.projectId,
    partnerKey: row.partnerKey,
    status: row.status,
    title: row.title,
    summary: row.summary,
    eventIds,
    packetHash: row.packetHash,
    qrUrl: row.qrUrl,
    jsonExportUrl: row.jsonExportUrl,
    pdfExportUrl: row.pdfExportUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function newEventId(): string {
  return `cp-ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function newPacketId(): string {
  return `cp-pkt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildEventHash(body: Record<string, unknown>): string {
  return computeCarbonPuraEvidenceHash(body);
}

function buildPacketHash(body: Record<string, unknown>): string {
  return computeCarbonPuraEvidenceHash(body);
}

export class PrismaCarbonPuraEvidenceStore implements CarbonPuraEvidenceStore {
  readonly mode = 'prisma' as const;

  async listProjects(partnerKey: string): Promise<CarbonPuraProjectRecord[]> {
    const rows = await prisma.carbonPuraProject.findMany({
      where: { partnerKey },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map(rowToProject);
  }

  async createProject(input: {
    projectId: string;
    partnerKey: string;
    name: string;
    status?: string;
    locationLabel?: string | null;
  }): Promise<CarbonPuraProjectRecord> {
    const row = await prisma.carbonPuraProject.upsert({
      where: { projectId: input.projectId },
      create: {
        projectId: input.projectId,
        partnerKey: input.partnerKey,
        name: input.name,
        status: input.status ?? 'draft',
        locationLabel: input.locationLabel ?? null,
      },
      update: {
        name: input.name,
        status: input.status ?? 'draft',
        locationLabel: input.locationLabel ?? null,
      },
    });
    return rowToProject(row);
  }

  async getProject(projectId: string): Promise<CarbonPuraProjectRecord | null> {
    const row = await prisma.carbonPuraProject.findUnique({ where: { projectId } });
    return row ? rowToProject(row) : null;
  }

  async listEvents(projectId: string): Promise<CarbonPuraEvidenceEventRecord[]> {
    const rows = await prisma.carbonPuraEvidenceEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(rowToEvent);
  }

  async createEvent(
    input: Omit<CarbonPuraEvidenceEventRecord, 'id' | 'eventId' | 'evidenceHash' | 'createdAt'> & {
      eventId?: string;
    },
  ): Promise<CarbonPuraEvidenceEventRecord> {
    const eventId = input.eventId ?? newEventId();
    const hashBody = {
      projectId: input.projectId,
      partnerKey: input.partnerKey,
      moduleId: input.moduleId,
      moduleName: input.moduleName,
      sourceSuite: input.sourceSuite,
      eventType: input.eventType,
      title: input.title,
      summary: input.summary,
      status: input.status,
      coordinates: input.coordinates,
      aoiGeoJson: input.aoiGeoJson,
      provider: input.provider,
      confidenceUse: input.confidenceUse,
      rawPayloadJson: input.rawPayloadJson,
      limitationsJson: input.limitationsJson,
    };
    const evidenceHash = buildEventHash(hashBody);
    const row = await prisma.carbonPuraEvidenceEvent.create({
      data: {
        eventId,
        projectId: input.projectId,
        partnerKey: input.partnerKey,
        moduleId: input.moduleId,
        moduleName: input.moduleName,
        sourceSuite: input.sourceSuite,
        eventType: input.eventType,
        title: input.title,
        summary: input.summary,
        status: input.status,
        coordinates: (input.coordinates ?? null) as Prisma.InputJsonValue,
        aoiGeoJson: (input.aoiGeoJson ?? null) as Prisma.InputJsonValue,
        provider: input.provider,
        confidenceUse: input.confidenceUse,
        rawPayloadJson: (input.rawPayloadJson ?? null) as Prisma.InputJsonValue,
        limitationsJson: (input.limitationsJson ?? null) as Prisma.InputJsonValue,
        evidenceHash,
      },
    });
    return rowToEvent(row);
  }

  async listPackets(projectId: string): Promise<CarbonPuraEvidencePacketRecord[]> {
    const rows = await prisma.carbonPuraEvidencePacket.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(rowToPacket);
  }

  async createDraftPacket(input: {
    projectId: string;
    partnerKey: string;
    title: string;
    summary?: string | null;
    eventIds: string[];
  }): Promise<CarbonPuraEvidencePacketRecord> {
    const packetId = newPacketId();
    const status = 'draft';
    const hashBody = {
      packetId,
      projectId: input.projectId,
      partnerKey: input.partnerKey,
      status,
      title: input.title,
      summary: input.summary ?? null,
      eventIds: [...input.eventIds].sort(),
    };
    const packetHash = buildPacketHash(hashBody);
    const row = await prisma.carbonPuraEvidencePacket.create({
      data: {
        packetId,
        projectId: input.projectId,
        partnerKey: input.partnerKey,
        status,
        title: input.title,
        summary: input.summary ?? null,
        eventIds: input.eventIds as Prisma.InputJsonValue,
        packetHash,
        qrUrl: null,
        jsonExportUrl: null,
        pdfExportUrl: null,
      },
    });
    return rowToPacket(row);
  }
}

export class InMemoryCarbonPuraEvidenceStore implements CarbonPuraEvidenceStore {
  readonly mode = 'memory' as const;

  private readonly projects = new Map<string, CarbonPuraProjectRecord>();
  private readonly events = new Map<string, CarbonPuraEvidenceEventRecord>();
  private readonly packets = new Map<string, CarbonPuraEvidencePacketRecord>();

  async listProjects(partnerKey: string): Promise<CarbonPuraProjectRecord[]> {
    return [...this.projects.values()]
      .filter((p) => p.partnerKey === partnerKey)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async createProject(input: {
    projectId: string;
    partnerKey: string;
    name: string;
    status?: string;
    locationLabel?: string | null;
  }): Promise<CarbonPuraProjectRecord> {
    const now = new Date().toISOString();
    const existing = this.projects.get(input.projectId);
    const next: CarbonPuraProjectRecord = {
      id: existing?.id ?? `mem-proj-${input.projectId}`,
      projectId: input.projectId,
      partnerKey: input.partnerKey,
      name: input.name,
      status: input.status ?? 'draft',
      locationLabel: input.locationLabel ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.projects.set(input.projectId, next);
    return next;
  }

  async getProject(projectId: string): Promise<CarbonPuraProjectRecord | null> {
    return this.projects.get(projectId) ?? null;
  }

  async listEvents(projectId: string): Promise<CarbonPuraEvidenceEventRecord[]> {
    return [...this.events.values()]
      .filter((e) => e.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createEvent(
    input: Omit<CarbonPuraEvidenceEventRecord, 'id' | 'eventId' | 'evidenceHash' | 'createdAt'> & {
      eventId?: string;
    },
  ): Promise<CarbonPuraEvidenceEventRecord> {
    const eventId = input.eventId ?? newEventId();
    const hashBody = {
      projectId: input.projectId,
      partnerKey: input.partnerKey,
      moduleId: input.moduleId,
      moduleName: input.moduleName,
      sourceSuite: input.sourceSuite,
      eventType: input.eventType,
      title: input.title,
      summary: input.summary,
      status: input.status,
      coordinates: input.coordinates,
      aoiGeoJson: input.aoiGeoJson,
      provider: input.provider,
      confidenceUse: input.confidenceUse,
      rawPayloadJson: input.rawPayloadJson,
      limitationsJson: input.limitationsJson,
    };
    const evidenceHash = buildEventHash(hashBody);
    const createdAt = new Date().toISOString();
    const record: CarbonPuraEvidenceEventRecord = {
      id: `mem-ev-${eventId}`,
      eventId,
      projectId: input.projectId,
      partnerKey: input.partnerKey,
      moduleId: input.moduleId,
      moduleName: input.moduleName,
      sourceSuite: input.sourceSuite,
      eventType: input.eventType,
      title: input.title,
      summary: input.summary,
      status: input.status,
      coordinates: input.coordinates,
      aoiGeoJson: input.aoiGeoJson,
      provider: input.provider,
      confidenceUse: input.confidenceUse,
      rawPayloadJson: input.rawPayloadJson,
      limitationsJson: input.limitationsJson,
      evidenceHash,
      createdAt,
    };
    this.events.set(eventId, record);
    return record;
  }

  async listPackets(projectId: string): Promise<CarbonPuraEvidencePacketRecord[]> {
    return [...this.packets.values()]
      .filter((p) => p.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createDraftPacket(input: {
    projectId: string;
    partnerKey: string;
    title: string;
    summary?: string | null;
    eventIds: string[];
  }): Promise<CarbonPuraEvidencePacketRecord> {
    const packetId = newPacketId();
    const status = 'draft';
    const packetHash = buildPacketHash({
      packetId,
      projectId: input.projectId,
      partnerKey: input.partnerKey,
      status,
      title: input.title,
      summary: input.summary ?? null,
      eventIds: [...input.eventIds].sort(),
    });
    const now = new Date().toISOString();
    const record: CarbonPuraEvidencePacketRecord = {
      id: `mem-pkt-${packetId}`,
      packetId,
      projectId: input.projectId,
      partnerKey: input.partnerKey,
      status,
      title: input.title,
      summary: input.summary ?? null,
      eventIds: input.eventIds,
      packetHash,
      qrUrl: null,
      jsonExportUrl: null,
      pdfExportUrl: null,
      createdAt: now,
      updatedAt: now,
    };
    this.packets.set(packetId, record);
    return record;
  }
}

function createStore(): CarbonPuraEvidenceStore {
  if (isDatabaseUrlConfigured()) {
    return new PrismaCarbonPuraEvidenceStore();
  }
  if (!fallbackWarned) {
    console.warn(FALLBACK_WARN);
    fallbackWarned = true;
  }
  return new InMemoryCarbonPuraEvidenceStore();
}

export function getCarbonPuraEvidenceStore(): CarbonPuraEvidenceStore {
  if (!singleton) singleton = createStore();
  return singleton;
}

export function getActiveCarbonPuraEvidenceStoreMode(): 'prisma' | 'memory' {
  return getCarbonPuraEvidenceStore().mode;
}

export function __resetCarbonPuraEvidenceStoreForTests(): void {
  singleton = null;
  fallbackWarned = false;
}
