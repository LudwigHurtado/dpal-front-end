import type { DpalEvidencePacket } from './evidencePacketTypes';
import { attachIntegrityHashToPacket } from './evidencePacketHash';

export interface EvidencePacketStore {
  save(packet: DpalEvidencePacket): Promise<DpalEvidencePacket>;
  get(packetId: string): Promise<DpalEvidencePacket | null>;
  list(limit: number): Promise<DpalEvidencePacket[]>;
  update(packetId: string, patch: Partial<DpalEvidencePacket>): Promise<DpalEvidencePacket | null>;
}

/**
 * In-memory store for development and until a Prisma `DpalEvidencePacket` (or JSON column) exists.
 * TODO: Back with PostgreSQL via Prisma — keep this interface so routes stay unchanged.
 */
export class InMemoryEvidencePacketStore implements EvidencePacketStore {
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

let singleton: EvidencePacketStore | null = null;

export function getEvidencePacketStore(): EvidencePacketStore {
  if (!singleton) {
    singleton = new InMemoryEvidencePacketStore();
  }
  return singleton;
}

/** Test-only reset */
export function __resetEvidencePacketStoreForTests(): void {
  singleton = null;
}
