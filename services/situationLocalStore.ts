import type { ChatMessage } from '../types';

/** Match App.tsx device scoping so situation history follows the same profile as reports. */
const isMobileDeviceProfile = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
};

const DEVICE_PROFILE = isMobileDeviceProfile() ? 'mobile' : 'desktop';
const scopedKey = (key: string) => `dpal-${DEVICE_PROFILE}-${key}`;

const storageKey = (reportId: string) => scopedKey(`situation-messages-${reportId}`);

function normalizeMessage(raw: unknown): ChatMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  const id = m.id != null ? String(m.id) : '';
  if (!id) return null;
  return {
    id,
    sender: String(m.sender ?? 'OPERATIVE'),
    text: String(m.text ?? ''),
    timestamp: typeof m.timestamp === 'number' ? m.timestamp : Number(m.timestamp) || Date.now(),
    isSystem: Boolean(m.isSystem),
    imageUrl: m.imageUrl != null ? String(m.imageUrl) : undefined,
    audioUrl: m.audioUrl != null ? String(m.audioUrl) : undefined,
    ledgerProof: String(m.ledgerProof ?? `0x${Math.random().toString(16).slice(2)}`),
  };
}

export function loadLocalSituationMessages(reportId: string): ChatMessage[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(reportId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeMessage).filter(Boolean) as ChatMessage[];
  } catch {
    return [];
  }
}

export function saveLocalSituationMessages(reportId: string, messages: ChatMessage[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const toSave = messages.filter((m) => !String(m.id).startsWith('tmp-'));
    const serializable = toSave.map((m) => ({
      ...m,
      timestamp: typeof m.timestamp === 'number' ? m.timestamp : Number(m.timestamp) || Date.now(),
    }));
    localStorage.setItem(storageKey(reportId), JSON.stringify(serializable));
  } catch (e) {
    console.warn('Situation room local save failed (quota or storage):', e);
  }
}

/**
 * Merge API messages with device-local copies (same `reportId` as QR `?reportId=` / situation room link).
 * Server rows win on metadata; local fills in image/audio if the API omitted them after upload failure.
 */
export function mergeSituationMessages(remote: ChatMessage[], local: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const m of remote) {
    byId.set(m.id, { ...m });
  }
  for (const m of local) {
    const r = byId.get(m.id);
    if (!r) {
      byId.set(m.id, { ...m });
    } else {
      byId.set(m.id, {
        ...r,
        imageUrl: r.imageUrl || m.imageUrl,
        audioUrl: r.audioUrl || m.audioUrl,
        text: r.text || m.text,
      });
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.timestamp - b.timestamp);
}
