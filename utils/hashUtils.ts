function normalizeValue(value: unknown): unknown {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => normalizeValue(item));
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, normalizeValue(item)]);
    return Object.fromEntries(entries);
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Number(value.toFixed(12)) : null;
  }
  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeValue(value));
}

function bytesToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256Text(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(digest);
}

export async function sha256Json(value: unknown): Promise<string> {
  return sha256Text(stableStringify(value));
}

export async function sha256Bytes(input: ArrayBuffer | Uint8Array): Promise<string> {
  const buffer = input instanceof Uint8Array ? input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) : input;
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return bytesToHex(digest);
}
