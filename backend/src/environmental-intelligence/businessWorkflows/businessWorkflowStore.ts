import type { EnvironmentalBusinessWorkflowRun as Row, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type {
  BusinessWorkflowListFilters,
  BusinessWorkflowRun,
  BusinessWorkflowSafetyLabels,
  BusinessWorkflowStatus,
  BusinessWorkflowInput,
  UpdateBusinessWorkflowRunPatch,
} from './businessWorkflowTypes';

export interface BusinessWorkflowStore {
  readonly mode: 'prisma' | 'memory';
  save(run: BusinessWorkflowRun): Promise<BusinessWorkflowRun>;
  get(workflowRunId: string): Promise<BusinessWorkflowRun | null>;
  list(limit: number, filters?: BusinessWorkflowListFilters): Promise<BusinessWorkflowRun[]>;
  update(workflowRunId: string, patch: UpdateBusinessWorkflowRunPatch): Promise<BusinessWorkflowRun | null>;
}

const FALLBACK_WARN =
  '[business-workflows] BusinessWorkflowStore using in-memory fallback; workflow runs are not persistent.';

let singleton: BusinessWorkflowStore | null = null;
let fallbackWarned = false;

export function isBusinessWorkflowDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function rowToRun(row: Row): BusinessWorkflowRun {
  return {
    workflowRunId: row.workflowRunId,
    workflowId: row.workflowId,
    workflowName: row.workflowName,
    status: row.status as BusinessWorkflowStatus,
    profileId: row.profileId ?? undefined,
    packetId: row.packetId ?? undefined,
    validationId: row.validationId ?? undefined,
    useCaseId: row.useCaseId ?? undefined,
    companyName: row.companyName ?? undefined,
    facilityName: row.facilityName ?? undefined,
    claimText: row.claimText ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    radiusKm: row.radiusKm ?? undefined,
    input: row.input as unknown as BusinessWorkflowInput,
    outputSummary: row.outputSummary as Record<string, unknown>,
    safetyLabels: row.safetyLabels as unknown as BusinessWorkflowSafetyLabels,
    limitations: row.limitations as unknown as string[],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString(),
  };
}

function runToCreateInput(r: BusinessWorkflowRun): Prisma.EnvironmentalBusinessWorkflowRunCreateInput {
  return {
    workflowRunId: r.workflowRunId,
    workflowId: r.workflowId,
    workflowName: r.workflowName,
    status: r.status,
    profileId: r.profileId ?? null,
    packetId: r.packetId ?? null,
    validationId: r.validationId ?? null,
    useCaseId: r.useCaseId ?? null,
    companyName: r.companyName ?? null,
    facilityName: r.facilityName ?? null,
    claimText: r.claimText ?? null,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    radiusKm: r.radiusKm ?? null,
    input: r.input as unknown as Prisma.InputJsonValue,
    outputSummary: r.outputSummary as unknown as Prisma.InputJsonValue,
    safetyLabels: r.safetyLabels as unknown as Prisma.InputJsonValue,
    limitations: r.limitations as unknown as Prisma.InputJsonValue,
    completedAt: r.completedAt ? new Date(r.completedAt) : null,
  };
}

function runToUpdateInput(r: BusinessWorkflowRun): Prisma.EnvironmentalBusinessWorkflowRunUpdateInput {
  return {
    workflowId: r.workflowId,
    workflowName: r.workflowName,
    status: r.status,
    profileId: r.profileId ?? null,
    packetId: r.packetId ?? null,
    validationId: r.validationId ?? null,
    useCaseId: r.useCaseId ?? null,
    companyName: r.companyName ?? null,
    facilityName: r.facilityName ?? null,
    claimText: r.claimText ?? null,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    radiusKm: r.radiusKm ?? null,
    input: r.input as unknown as Prisma.InputJsonValue,
    outputSummary: r.outputSummary as unknown as Prisma.InputJsonValue,
    safetyLabels: r.safetyLabels as unknown as Prisma.InputJsonValue,
    limitations: r.limitations as unknown as Prisma.InputJsonValue,
    completedAt: r.completedAt ? new Date(r.completedAt) : null,
  };
}

export class PrismaBusinessWorkflowStore implements BusinessWorkflowStore {
  readonly mode = 'prisma' as const;

  async save(run: BusinessWorkflowRun): Promise<BusinessWorkflowRun> {
    const row = await prisma.environmentalBusinessWorkflowRun.upsert({
      where: { workflowRunId: run.workflowRunId },
      create: runToCreateInput(run),
      update: runToUpdateInput(run),
    });
    return rowToRun(row);
  }

  async get(workflowRunId: string): Promise<BusinessWorkflowRun | null> {
    const row = await prisma.environmentalBusinessWorkflowRun.findUnique({ where: { workflowRunId } });
    return row ? rowToRun(row) : null;
  }

  async list(limit: number, filters?: BusinessWorkflowListFilters): Promise<BusinessWorkflowRun[]> {
    const n = Math.min(Math.max(1, limit), 200);
    const where: Prisma.EnvironmentalBusinessWorkflowRunWhereInput = {};
    if (filters?.workflowId?.trim()) where.workflowId = filters.workflowId.trim();
    if (filters?.status?.trim()) where.status = filters.status.trim();
    const rows = await prisma.environmentalBusinessWorkflowRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: n,
    });
    return rows.map(rowToRun);
  }

  async update(workflowRunId: string, patch: UpdateBusinessWorkflowRunPatch): Promise<BusinessWorkflowRun | null> {
    const cur = await this.get(workflowRunId);
    if (!cur) return null;
    const nextOut = { ...cur.outputSummary };
    if (patch.operatorNotes !== undefined) {
      nextOut.operatorNotes = patch.operatorNotes;
    }
    const merged: BusinessWorkflowRun = {
      ...cur,
      companyName: patch.companyName !== undefined ? patch.companyName : cur.companyName,
      facilityName: patch.facilityName !== undefined ? patch.facilityName : cur.facilityName,
      claimText: patch.claimText !== undefined ? patch.claimText : cur.claimText,
      outputSummary: nextOut,
      updatedAt: new Date().toISOString(),
    };
    const row = await prisma.environmentalBusinessWorkflowRun.update({
      where: { workflowRunId },
      data: runToUpdateInput(merged),
    });
    return rowToRun(row);
  }
}

export class InMemoryBusinessWorkflowStore implements BusinessWorkflowStore {
  readonly mode = 'memory' as const;

  private readonly byId = new Map<string, BusinessWorkflowRun>();

  async save(run: BusinessWorkflowRun): Promise<BusinessWorkflowRun> {
    this.byId.set(run.workflowRunId, run);
    return run;
  }

  async get(workflowRunId: string): Promise<BusinessWorkflowRun | null> {
    return this.byId.get(workflowRunId) ?? null;
  }

  async list(limit: number, filters?: BusinessWorkflowListFilters): Promise<BusinessWorkflowRun[]> {
    const n = Math.min(Math.max(1, limit), 200);
    let all = [...this.byId.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (filters?.workflowId?.trim()) {
      all = all.filter((r) => r.workflowId === filters.workflowId!.trim());
    }
    if (filters?.status?.trim()) {
      all = all.filter((r) => r.status === filters.status!.trim());
    }
    return all.slice(0, n);
  }

  async update(workflowRunId: string, patch: UpdateBusinessWorkflowRunPatch): Promise<BusinessWorkflowRun | null> {
    const cur = await this.get(workflowRunId);
    if (!cur) return null;
    const nextOut = { ...cur.outputSummary };
    if (patch.operatorNotes !== undefined) {
      nextOut.operatorNotes = patch.operatorNotes;
    }
    const merged: BusinessWorkflowRun = {
      ...cur,
      companyName: patch.companyName !== undefined ? patch.companyName : cur.companyName,
      facilityName: patch.facilityName !== undefined ? patch.facilityName : cur.facilityName,
      claimText: patch.claimText !== undefined ? patch.claimText : cur.claimText,
      outputSummary: nextOut,
      updatedAt: new Date().toISOString(),
    };
    this.byId.set(workflowRunId, merged);
    return merged;
  }
}

function createBusinessWorkflowStore(): BusinessWorkflowStore {
  if (isBusinessWorkflowDatabaseConfigured()) {
    return new PrismaBusinessWorkflowStore();
  }
  if (!fallbackWarned) {
    console.warn(FALLBACK_WARN);
    fallbackWarned = true;
  }
  return new InMemoryBusinessWorkflowStore();
}

export function getBusinessWorkflowStore(): BusinessWorkflowStore {
  if (!singleton) {
    singleton = createBusinessWorkflowStore();
  }
  return singleton;
}

export function getActiveBusinessWorkflowStoreMode(): 'prisma' | 'memory' {
  return getBusinessWorkflowStore().mode;
}

export function __resetBusinessWorkflowStoreForTests(): void {
  singleton = null;
  fallbackWarned = false;
}
