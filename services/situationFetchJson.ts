/**
 * Some hosts return **plain text** for rate limits (`Too many requests…`) while clients call
 * `res.json()`, which throws `Unexpected token …`. This module reads the body once, preserves
 * HTTP status / optional Retry-After, and throws {@link SituationFetchError} for structured handling.
 */

export class SituationFetchError extends Error {
  readonly status: number;

  readonly statusText: string;

  readonly contextLabel: string;

  /** Milliseconds to wait before retrying, from `Retry-After` when present. */
  readonly retryAfterMs?: number;

  /** First ~400 chars of body when useful for diagnostics (non-JSON, etc.). */
  readonly bodyPreview?: string;

  constructor(opts: {
    message: string;
    status: number;
    statusText: string;
    contextLabel: string;
    retryAfterMs?: number;
    bodyPreview?: string;
  }) {
    super(opts.message);
    this.name = 'SituationFetchError';
    this.status = opts.status;
    this.statusText = opts.statusText;
    this.contextLabel = opts.contextLabel;
    this.retryAfterMs = opts.retryAfterMs;
    this.bodyPreview = opts.bodyPreview;
  }
}

/** Parse `Retry-After` as seconds or HTTP-date → milliseconds to wait from now. */
export function parseRetryAfterMs(header: string | null): number | undefined {
  if (header == null || header.trim() === '') return undefined;
  const trimmed = header.trim();
  const sec = Number(trimmed);
  if (!Number.isNaN(sec) && sec >= 0) return sec * 1000;
  const when = Date.parse(trimmed);
  if (!Number.isNaN(when)) return Math.max(0, when - Date.now());
  return undefined;
}

export async function parseJsonResponseBody(res: Response, contextLabel = 'API'): Promise<unknown> {
  const retryAfterMs = parseRetryAfterMs(res.headers.get('Retry-After'));
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    if (!res.ok) {
      throw new SituationFetchError({
        message: `${contextLabel} HTTP ${res.status} ${res.statusText} (empty body)`,
        status: res.status,
        statusText: res.statusText,
        contextLabel,
        retryAfterMs,
      });
    }
    return {};
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const snippet = trimmed.length > 220 ? `${trimmed.slice(0, 220)}…` : trimmed;
    const preview = trimmed.length > 400 ? `${trimmed.slice(0, 400)}…` : trimmed;
    throw new SituationFetchError({
      message: `${contextLabel} returned non-JSON (HTTP ${res.status} ${res.statusText}). Body starts with: ${snippet}`,
      status: res.status,
      statusText: res.statusText,
      contextLabel,
      retryAfterMs,
      bodyPreview: preview,
    });
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
