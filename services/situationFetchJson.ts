/**
 * Some hosts (e.g. Railway) return **plain text** for rate limits (`Too many requests…`) or
 * proxy errors while the client still calls `res.json()`, which throws `Unexpected token …`.
 * This helper reads the body once and throws a readable error instead.
 */
export async function parseJsonResponseBody(res: Response, contextLabel = 'API'): Promise<unknown> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    if (!res.ok) throw new Error(`${contextLabel} HTTP ${res.status} ${res.statusText} (empty body)`);
    return {};
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const snippet = trimmed.length > 220 ? `${trimmed.slice(0, 220)}…` : trimmed;
    throw new Error(
      `${contextLabel} returned non-JSON (HTTP ${res.status} ${res.statusText}). Body starts with: ${snippet}`,
    );
  }
}

/** Alias for situation / incident chat fetches — clearer call sites. */
export const parseSituationResponseJson = (res: Response) => parseJsonResponseBody(res, 'Situation API');

export function situationApiErrorMessage(data: unknown, status: number, statusText: string): string {
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message.trim()) return o.message;
    if (typeof o.error === 'string' && o.error.trim()) return o.error;
  }
  return `HTTP ${status}${statusText ? ` ${statusText}` : ''}`;
}
