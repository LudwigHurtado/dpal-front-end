import type { EnvironmentalValidationRequest as EnvironmentalValidationRequestRow, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type {
  DpalValidationRequest,
  EnvironmentalValidationRequestStatus,
  EnvironmentalValidationRequestType,
  EnvironmentalValidationResult,
  EnvironmentalValidationTargetType,
  EnvironmentalValidationSafetyLabels,
  UpdateValidationRequestPatch,
  ValidationRequestListFilters,
} from './validationTypes';

export interface ValidationRequestStore {
  readonly mode: 'prisma' | 'memory';
  save(request: DpalValidationRequest): Promise<DpalValidationRequest>;
  get(validationId: string): Promise<DpalValidationRequest | null>;
  list(limit: number, filters?: ValidationRequestListFilters): Promise<DpalValidationRequest[]>;
  update(validationId: string, patch: Partial<DpalValidationRequest>): Promise<DpalValidationRequest | null>;
}

const FALLBACK_WARN =
  '[env-validation] ValidationRequestStore using in-memory fallback; requests are not persistent.';

let singleton: ValidationRequestStore | null = null;
let fallbackWarned = false;

export function isValidationDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function rowToRequest(row: EnvironmentalValidationRequestRow): DpalValidationRequest {
  return {
    validationId: row.validationId,
    targetType: row.targetType as EnvironmentalValidationTargetType,
    targetId: row.targetId,
    profileId: row.profileId ?? undefined,
    packetId: row.packetId ?? undefined,
    useCaseId: row.useCaseId ?? undefined,
    requestType: row.requestType as DpalValidationRequest['requestType'],
    status: row.status as EnvironmentalValidationRequestStatus,
    priority: row.priority,
    requestedBy: row.requestedBy ?? undefined,
    assignedTo: row.assignedTo ?? undefined,
    reviewerName: row.reviewerName ?? undefined,
    reviewerRole: row.reviewerRole ?? undefined,
    reviewNotes: row.reviewNotes ?? undefined,
    validationResult: (row.validationResult ?? undefined) as EnvironmentalValidationResult | undefined,
    safetyLabels: row.safetyLabels as unknown as EnvironmentalValidationSafetyLabels,
    limitations: row.limitations as unknown as string[],
    evidenceRefs: row.evidenceRefs,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString(),
  };
}

function requestToCreateInput(r: DpalValidationRequest): Prisma.EnvironmentalValidationRequestCreateInput {
  return {
    validationId: r.validationId,
    targetType: r.targetType,
    targetId: r.targetId,
    profileId: r.profileId ?? null,
    packetId: r.packetId ?? null,
    useCaseId: r.useCaseId ?? null,
    requestType: r.requestType,
    status: r.status,
    priority: r.priority,
    requestedBy: r.requestedBy ?? null,
    assignedTo: r.assignedTo ?? null,
    reviewerName: r.reviewerName ?? null,
    reviewerRole: r.reviewerRole ?? null,
    reviewNotes: r.reviewNotes ?? null,
    validationResult: r.validationResult ?? null,
    safetyLabels: r.safetyLabels as unknown as Prisma.InputJsonValue,
    limitations: r.limitations as unknown as Prisma.InputJsonValue,
    evidenceRefs: r.evidenceRefs as unknown as Prisma.InputJsonValue,
    completedAt: r.completedAt ? new Date(r.completedAt) : null,
  };
}

function requestToUpdateInput(r: DpalValidationRequest): Prisma.EnvironmentalValidationRequestUpdateInput {
  return {
    targetType: r.targetType,
    targetId: r.targetId,
    profileId: r.profileId ?? null,
    packetId: r.packetId ?? null,
    useCaseId: r.useCaseId ?? null,
    requestType: r.requestType,
    status: r.status,
    priority: r.priority,
    requestedBy: r.requestedBy ?? null,
    assignedTo: r.assignedTo ?? null,
    reviewerName: r.reviewerName ?? null,
    reviewerRole: r.reviewerRole ?? null,
    reviewNotes: r.reviewNotes ?? null,
    validationResult: r.validationResult ?? null,
    safetyLabels: r.safetyLabels as unknown as Prisma.InputJsonValue,
    limitations: r.limitations as unknown as Prisma.InputJsonValue,
    evidenceRefs: r.evidenceRefs as unknown as Prisma.InputJsonValue,
    completedAt: r.completedAt ? new Date(r.completedAt) : null,
  };
}

function mergeRequest(cur: DpalValidationRequest, patch: Partial<DpalValidationRequest>): DpalValidationRequest {
  const M: DpalValidationRequest = { ...cur, updatedAt: new Date().toISOString() };
  (Object.keys(patch) as (keyof DpalValidationRequest)[]).forEach((key) => {
    const v = patch[key];
    if (v === undefined) return;
    if (key === 'safetyLabels' && typeof v === 'object' && v !== null) {
      M.safetyLabels = { ...cur.safetyLabels, ...v };
      return;
    }
    if (key === 'limitations' && Array.isArray(v)) {
      M.limitations = v;
      return;
    }
    (M as Record<string, unknown>)[key] = v;
  });
  return M;
}

export class PrismaValidationRequestStore implements ValidationRequestStore {
  readonly mode = 'prisma' as const;

  async save(request: DpalValidationRequest): Promise<DpalValidationRequest> {
    const row = await prisma.environmentalValidationRequest.upsert({
      where: { validationId: request.validationId },
      create: requestToCreateInput(request),
      update: requestToUpdateInput(request),
    });
    return rowToRequest(row);
  }

  async get(validationId: string): Promise<DpalValidationRequest | null> {
    const row = await prisma.environmentalValidationRequest.findUnique({ where: { validationId } });
    return row ? rowToRequest(row) : null;
  }

  async list(limit: number, filters?: ValidationRequestListFilters): Promise<DpalValidationRequest[]> {
    const n = Math.min(Math.max(1, limit), 200);
    const where: Prisma.EnvironmentalValidationRequestWhereInput = {};
    if (filters?.status?.trim()) where.status = filters.status.trim();
    if (filters?.targetType?.trim()) where.targetType = filters.targetType.trim();
    if (filters?.packetId?.trim()) where.packetId = filters.packetId.trim();
    if (filters?.profileId?.trim()) where.profileId = filters.profileId.trim();
    const rows = await prisma.environmentalValidationRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: n,
    });
    return rows.map(rowToRequest);
  }

  async update(validationId: string, patch: Partial<DpalValidationRequest>): Promise<DpalValidationRequest | null> {
    const cur = await this.get(validationId);
    if (!cur) return null;
    const merged = mergeRequest(cur, patch);
    const row = await prisma.environmentalValidationRequest.update({
      where: { validationId },
      data: requestToUpdateInput(merged),
    });
    return rowToRequest(row);
  }
}

export class InMemoryValidationRequestStore implements ValidationRequestStore {
  readonly mode = 'memory' as const;

  private readonly byId = new Map<string, DpalValidationRequest>();

  async save(request: DpalValidationRequest): Promise<DpalValidationRequest> {
    this.byId.set(request.validationId, request);
    return request;
  }

  async get(validationId: string): Promise<DpalValidationRequest | null> {
    return this.byId.get(validationId) ?? null;
  }

  async list(limit: number, filters?: ValidationRequestListFilters): Promise<DpalValidationRequest[]> {
    const n = Math.min(Math.max(1, limit), 200);
    const all = [...this.byId.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const f = all.filter((r) => {
      if (filters?.status?.trim() && r.status !== filters.status.trim()) return false;
      if (filters?.targetType?.trim() && r.targetType !== filters.targetType.trim()) return false;
      if (filters?.packetId?.trim() && r.packetId !== filters.packetId.trim()) return false;
      if (filters?.profileId?.trim() && r.profileId !== filters.profileId.trim()) return false;
      return true;
    });
    return f.slice(0, n);
  }

  async update(validationId: string, patch: Partial<DpalValidationRequest>): Promise<DpalValidationRequest | null> {
    const cur = await this.get(validationId);
    if (!cur) return null;
    const merged = mergeRequest(cur, patch);
    this.byId.set(validationId, merged);
    return merged;
  }
}

function createValidationRequestStore(): ValidationRequestStore {
  if (isValidationDatabaseConfigured()) {
    return new PrismaValidationRequestStore();
  }
  if (!fallbackWarned) {
    console.warn(FALLBACK_WARN);
    fallbackWarned = true;
  }
  return new InMemoryValidationRequestStore();
}

export function getValidationRequestStore(): ValidationRequestStore {
  if (!singleton) {
    singleton = createValidationRequestStore();
  }
  return singleton;
}

export function __resetValidationRequestStoreForTests(): void {
  singleton = null;
  fallbackWarned = false;
}

/** Apply safe metadata patch (no status / validationResult transitions). */
export function mergeSafePatch(
  cur: DpalValidationRequest,
  patch: UpdateValidationRequestPatch,
): Partial<DpalValidationRequest> {
  const out: Partial<DpalValidationRequest> = {};
  if (patch.priority !== undefined) out.priority = patch.priority;
  if (patch.requestedBy !== undefined) out.requestedBy = patch.requestedBy;
  if (patch.useCaseId !== undefined) out.useCaseId = patch.useCaseId;
  if (patch.reviewNotes !== undefined) out.reviewNotes = patch.reviewNotes;
  if (patch.limitations !== undefined) out.limitations = patch.limitations;
  if (patch.evidenceRefs !== undefined) out.evidenceRefs = patch.evidenceRefs;
  return out;
}
