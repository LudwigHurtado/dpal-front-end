import { createHash } from 'crypto';
import type { DpalEvidencePacket } from './evidencePacketTypes';
import { INTEGRITY_HASH_LIMITATION } from './evidencePacketSafety';

function stableSerialize(value: unknown): string {
    const walk = (v: unknown): unknown => {
    if (v === null || v === undefined) return v;
    if (typeof v === 'bigint') return v.toString();
    if (typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(walk);
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o).sort((a, b) => a.localeCompare(b));
    const out: Record<string, unknown> = {};
    for (const k of keys) {
      if (k === 'integrityHash' || k === 'integrityHashLimitation') continue;
      out[k] = walk(o[k]);
    }
    return out;
  };
  return JSON.stringify(walk(value));
}

export type PacketHashInput = Omit<DpalEvidencePacket, 'integrityHash' | 'integrityHashLimitation'>;

export function computeEvidencePacketIntegrityHash(packet: PacketHashInput): string {
  const body = stableSerialize(packet);
  return createHash('sha256').update(body, 'utf8').digest('hex');
}

export function attachIntegrityHashToPacket<T extends PacketHashInput>(packet: T): T & { integrityHash: string; integrityHashLimitation: string } {
  const integrityHash = computeEvidencePacketIntegrityHash(packet);
  return {
    ...packet,
    integrityHash,
    integrityHashLimitation: INTEGRITY_HASH_LIMITATION,
  };
}
