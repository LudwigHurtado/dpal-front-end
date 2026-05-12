import { SituationFetchError } from './situationFetchJson';

const RATE_LIMIT_MESSAGE_RE = /\b429\b|too many requests|rate\s*limit/i;

/**
 * Detects rate limiting from structured {@link SituationFetchError} or legacy `Error` messages.
 */
export function detectRateLimitError(error: unknown): boolean {
  if (error instanceof SituationFetchError) {
    if (error.status === 429) return true;
    if (error.bodyPreview && RATE_LIMIT_MESSAGE_RE.test(error.bodyPreview)) return true;
    if (RATE_LIMIT_MESSAGE_RE.test(error.message)) return true;
    return false;
  }
  const msg = error instanceof Error ? error.message : String(error);
  return RATE_LIMIT_MESSAGE_RE.test(msg);
}

/**
 * Chooses backoff duration: honors `Retry-After` from {@link SituationFetchError} when larger than `fallbackMs`.
 */
export function getBackoffMs(error: unknown, fallbackMs: number): number {
  if (error instanceof SituationFetchError && typeof error.retryAfterMs === 'number' && error.retryAfterMs > 0) {
    return Math.max(fallbackMs, error.retryAfterMs);
  }
  return fallbackMs;
}

/**
 * `lastRateLimitHitAt` = wall-clock ms when a rate limit was observed; skip polls while inside the backoff window.
 */
export function shouldSkipPoll(lastRateLimitHitAt: number | null, backoffMs: number): boolean {
  if (lastRateLimitHitAt == null || backoffMs <= 0) return false;
  return Date.now() < lastRateLimitHitAt + backoffMs;
}
