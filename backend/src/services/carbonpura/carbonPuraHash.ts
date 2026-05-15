import { createHash } from 'crypto';

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
      if (k === 'evidenceHash' || k === 'packetHash') continue;
      out[k] = walk(o[k]);
    }
    return out;
  };
  return JSON.stringify(walk(value));
}

export function computeCarbonPuraEvidenceHash(payload: Record<string, unknown>): string {
  return createHash('sha256').update(stableSerialize(payload), 'utf8').digest('hex');
}
