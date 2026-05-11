/**
 * In-memory ring buffer of recent provider call events for observability.
 * No secrets or raw provider payloads — metadata only.
 */

export type ProviderCallStatus =
  | "started"
  | "completed"
  | "failed"
  | "cache_hit"
  | "cache_miss"
  | "coalesced"
  | "skipped_cooldown"
  | "rate_limited"
  | "unavailable";

export interface ProviderCallEvent {
  id: string;
  providerName: string;
  operation: string;
  requestKey: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  status: ProviderCallStatus;
  errorType: string | null;
  source: string | null;
  latRounded3: string | null;
  lngRounded3: string | null;
}

const MAX_EVENTS = 800;
const events: ProviderCallEvent[] = [];
let seq = 0;

function nextId(): string {
  seq += 1;
  return `prov_${Date.now()}_${seq}`;
}

export function recordProviderCallEvent(
  e: Omit<ProviderCallEvent, "id"> & { id?: string },
): ProviderCallEvent {
  const row: ProviderCallEvent = {
    id: e.id ?? nextId(),
    providerName: e.providerName,
    operation: e.operation,
    requestKey: e.requestKey,
    startedAt: e.startedAt,
    completedAt: e.completedAt ?? null,
    durationMs: e.durationMs ?? null,
    status: e.status,
    errorType: e.errorType ?? null,
    source: e.source ?? null,
    latRounded3: e.latRounded3 ?? null,
    lngRounded3: e.lngRounded3 ?? null,
  };
  events.push(row);
  while (events.length > MAX_EVENTS) events.shift();
  return row;
}

export function getRecentProviderCallEvents(): ProviderCallEvent[] {
  return events.slice();
}

export function clearProviderCallEventsForTests(): void {
  events.length = 0;
}

export function getTotalsByProvider(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of events) {
    out[e.providerName] = (out[e.providerName] ?? 0) + 1;
  }
  return out;
}

export function getTotalsByStatus(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of events) {
    out[e.status] = (out[e.status] ?? 0) + 1;
  }
  return out;
}
