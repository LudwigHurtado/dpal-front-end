import type {
  EnvironmentalAccountabilityProfile as EnvironmentalAccountabilityProfileRow,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type {
  AccountabilityProfileListFilters,
  AccountabilityProfileSafetyLabels,
  AccountabilityProfileStatus,
  AccountabilityProfileType,
  AccountabilityProfileValidationStatus,
  DpalAccountabilityProfile,
  UpdateAccountabilityProfileInput,
} from './accountabilityProfileTypes';

export interface AccountabilityProfileStore {
  readonly mode: 'prisma' | 'memory';
  save(profile: DpalAccountabilityProfile): Promise<DpalAccountabilityProfile>;
  get(profileId: string): Promise<DpalAccountabilityProfile | null>;
  list(limit: number, filters?: AccountabilityProfileListFilters): Promise<DpalAccountabilityProfile[]>;
  update(profileId: string, patch: UpdateAccountabilityProfileInput): Promise<DpalAccountabilityProfile | null>;
  addEvidencePacket(profileId: string, packetId: string): Promise<DpalAccountabilityProfile | null>;
}

const FALLBACK_WARN =
  '[accountability-profiles] AccountabilityProfileStore using in-memory fallback; profiles are not persistent.';

let singleton: AccountabilityProfileStore | null = null;
let fallbackWarned = false;

export function isAccountabilityDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function rowToProfile(row: EnvironmentalAccountabilityProfileRow): DpalAccountabilityProfile {
  return {
    profileId: row.profileId,
    profileType: row.profileType as AccountabilityProfileType,
    companyName: row.companyName ?? undefined,
    facilityName: row.facilityName ?? undefined,
    facilityId: row.facilityId ?? undefined,
    address: row.address ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    radiusKm: row.radiusKm ?? undefined,
    useCaseId: row.useCaseId ?? undefined,
    claimText: row.claimText ?? undefined,
    claimSourceUrl: row.claimSourceUrl ?? undefined,
    status: row.status as AccountabilityProfileStatus,
    riskLevel: row.riskLevel ?? undefined,
    anomalySummary: row.anomalySummary ?? undefined,
    validationStatus: row.validationStatus as AccountabilityProfileValidationStatus,
    safetyLabels: row.safetyLabels as unknown as AccountabilityProfileSafetyLabels,
    limitations: row.limitations as unknown as string[],
    evidencePacketIds: row.evidencePacketIds as unknown as string[],
    situationRoomIds: row.situationRoomIds as unknown as string[],
    projectIds: row.projectIds as unknown as string[],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function profileToCreateInput(p: DpalAccountabilityProfile): Prisma.EnvironmentalAccountabilityProfileCreateInput {
  return {
    profileId: p.profileId,
    profileType: p.profileType,
    companyName: p.companyName ?? null,
    facilityName: p.facilityName ?? null,
    facilityId: p.facilityId ?? null,
    address: p.address ?? null,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    radiusKm: p.radiusKm ?? null,
    useCaseId: p.useCaseId ?? null,
    claimText: p.claimText ?? null,
    claimSourceUrl: p.claimSourceUrl ?? null,
    status: p.status,
    riskLevel: p.riskLevel ?? null,
    anomalySummary: p.anomalySummary ?? null,
    validationStatus: p.validationStatus,
    safetyLabels: p.safetyLabels as unknown as Prisma.InputJsonValue,
    limitations: p.limitations as unknown as Prisma.InputJsonValue,
    evidencePacketIds: p.evidencePacketIds as unknown as Prisma.InputJsonValue,
    situationRoomIds: p.situationRoomIds as unknown as Prisma.InputJsonValue,
    projectIds: p.projectIds as unknown as Prisma.InputJsonValue,
  };
}

function profileToUpdateInput(p: DpalAccountabilityProfile): Prisma.EnvironmentalAccountabilityProfileUpdateInput {
  return {
    profileType: p.profileType,
    companyName: p.companyName ?? null,
    facilityName: p.facilityName ?? null,
    facilityId: p.facilityId ?? null,
    address: p.address ?? null,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    radiusKm: p.radiusKm ?? null,
    useCaseId: p.useCaseId ?? null,
    claimText: p.claimText ?? null,
    claimSourceUrl: p.claimSourceUrl ?? null,
    status: p.status,
    riskLevel: p.riskLevel ?? null,
    anomalySummary: p.anomalySummary ?? null,
    validationStatus: p.validationStatus,
    safetyLabels: p.safetyLabels as unknown as Prisma.InputJsonValue,
    limitations: p.limitations as unknown as Prisma.InputJsonValue,
    evidencePacketIds: p.evidencePacketIds as unknown as Prisma.InputJsonValue,
    situationRoomIds: p.situationRoomIds as unknown as Prisma.InputJsonValue,
    projectIds: p.projectIds as unknown as Prisma.InputJsonValue,
  };
}

function mergeProfile(
  cur: DpalAccountabilityProfile,
  patch: UpdateAccountabilityProfileInput,
): DpalAccountabilityProfile {
  const M: DpalAccountabilityProfile = { ...cur, updatedAt: new Date().toISOString() };
  (Object.keys(patch) as (keyof UpdateAccountabilityProfileInput)[]).forEach((key) => {
    const v = patch[key];
    if (v === undefined) return;
    if (key === 'safetyLabels' && typeof v === 'object' && v !== null) {
      M.safetyLabels = { ...cur.safetyLabels, ...v };
      return;
    }
    (M as Record<string, unknown>)[key] = v;
  });
  return M;
}

export class PrismaAccountabilityProfileStore implements AccountabilityProfileStore {
  readonly mode = 'prisma' as const;

  async save(profile: DpalAccountabilityProfile): Promise<DpalAccountabilityProfile> {
    const row = await prisma.environmentalAccountabilityProfile.upsert({
      where: { profileId: profile.profileId },
      create: profileToCreateInput(profile),
      update: profileToUpdateInput(profile),
    });
    return rowToProfile(row);
  }

  async get(profileId: string): Promise<DpalAccountabilityProfile | null> {
    const row = await prisma.environmentalAccountabilityProfile.findUnique({ where: { profileId } });
    return row ? rowToProfile(row) : null;
  }

  async list(limit: number, filters?: AccountabilityProfileListFilters): Promise<DpalAccountabilityProfile[]> {
    const n = Math.min(Math.max(1, limit), 200);
    const where: Prisma.EnvironmentalAccountabilityProfileWhereInput = {};
    if (filters?.useCaseId?.trim()) where.useCaseId = filters.useCaseId.trim();
    if (filters?.status?.trim()) where.status = filters.status.trim();
    if (filters?.companyName?.trim()) {
      where.companyName = { contains: filters.companyName.trim(), mode: 'insensitive' };
    }
    const rows = await prisma.environmentalAccountabilityProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: n,
    });
    return rows.map(rowToProfile);
  }

  async update(profileId: string, patch: UpdateAccountabilityProfileInput): Promise<DpalAccountabilityProfile | null> {
    const cur = await this.get(profileId);
    if (!cur) return null;
    const merged = mergeProfile(cur, patch);
    const row = await prisma.environmentalAccountabilityProfile.update({
      where: { profileId },
      data: profileToUpdateInput(merged),
    });
    return rowToProfile(row);
  }

  async addEvidencePacket(profileId: string, packetId: string): Promise<DpalAccountabilityProfile | null> {
    const cur = await this.get(profileId);
    if (!cur) return null;
    const id = packetId.trim();
    if (!id) return cur;
    const ids = [...cur.evidencePacketIds];
    if (!ids.includes(id)) ids.push(id);
    return this.update(profileId, { evidencePacketIds: ids, status: 'evidence_collected' });
  }
}

export class InMemoryAccountabilityProfileStore implements AccountabilityProfileStore {
  readonly mode = 'memory' as const;

  private readonly byId = new Map<string, DpalAccountabilityProfile>();

  async save(profile: DpalAccountabilityProfile): Promise<DpalAccountabilityProfile> {
    this.byId.set(profile.profileId, profile);
    return profile;
  }

  async get(profileId: string): Promise<DpalAccountabilityProfile | null> {
    return this.byId.get(profileId) ?? null;
  }

  async list(limit: number, filters?: AccountabilityProfileListFilters): Promise<DpalAccountabilityProfile[]> {
    const n = Math.min(Math.max(1, limit), 200);
    let all = [...this.byId.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (filters?.useCaseId?.trim()) {
      all = all.filter((p) => p.useCaseId === filters.useCaseId!.trim());
    }
    if (filters?.status?.trim()) {
      all = all.filter((p) => p.status === filters.status!.trim());
    }
    if (filters?.companyName?.trim()) {
      const q = filters.companyName.trim().toLowerCase();
      all = all.filter((p) => (p.companyName ?? '').toLowerCase().includes(q));
    }
    return all.slice(0, n);
  }

  async update(profileId: string, patch: UpdateAccountabilityProfileInput): Promise<DpalAccountabilityProfile | null> {
    const cur = await this.get(profileId);
    if (!cur) return null;
    const merged = mergeProfile(cur, patch);
    this.byId.set(profileId, merged);
    return merged;
  }

  async addEvidencePacket(profileId: string, packetId: string): Promise<DpalAccountabilityProfile | null> {
    const cur = await this.get(profileId);
    if (!cur) return null;
    const id = packetId.trim();
    if (!id) return cur;
    const ids = [...cur.evidencePacketIds];
    if (!ids.includes(id)) ids.push(id);
    return this.update(profileId, { evidencePacketIds: ids, status: 'evidence_collected' });
  }
}

function createAccountabilityProfileStore(): AccountabilityProfileStore {
  if (isAccountabilityDatabaseConfigured()) {
    return new PrismaAccountabilityProfileStore();
  }
  if (!fallbackWarned) {
    console.warn(FALLBACK_WARN);
    fallbackWarned = true;
  }
  return new InMemoryAccountabilityProfileStore();
}

export function getAccountabilityProfileStore(): AccountabilityProfileStore {
  if (!singleton) {
    singleton = createAccountabilityProfileStore();
  }
  return singleton;
}

export function getActiveAccountabilityProfileStoreMode(): 'prisma' | 'memory' {
  return getAccountabilityProfileStore().mode;
}

export function __resetAccountabilityProfileStoreForTests(): void {
  singleton = null;
  fallbackWarned = false;
}
