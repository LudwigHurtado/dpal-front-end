import type { ChatMessage } from '../types';
import { buildApiUrl } from '../src/config/api';
import { emitSituationDiagnostics } from './situationRoomService';
import { parseSituationResponseJson, situationApiErrorMessage } from './situationFetchJson';

export interface SituationRoomSummary {
  roomId: string;
  title: string;
  activeUsers?: number;
  participants?: number;
  memberCount?: number;
  lastActivityAt?: number;
  mediaPersistence?: boolean;
}

const normalizeMessage = (m: any): ChatMessage => ({
  id: String(m?.id || m?._id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
  sender: String(m?.sender || 'OPERATIVE'),
  text: String(m?.text || ''),
  timestamp: Number(m?.timestamp || Date.now()),
  isSystem: Boolean(m?.isSystem),
  imageUrl: m?.imageUrl ? String(m.imageUrl) : undefined,
  audioUrl: m?.audioUrl ? String(m.audioUrl) : undefined,
  ledgerProof: String(m?.ledgerProof || `0x${Math.random().toString(16).slice(2)}`),
});

export async function fetchSituationMessages(roomId: string): Promise<ChatMessage[]> {
  emitSituationDiagnostics({ roomId });
  const res = await fetch(buildApiUrl(`/api/situation/${encodeURIComponent(roomId)}/messages?limit=200`));
  const data = (await parseSituationResponseJson(res)) as { messages?: unknown };
  if (!res.ok) {
    throw new Error(
      `Failed to fetch messages: ${situationApiErrorMessage(data, res.status, res.statusText)}`,
    );
  }
  const list = Array.isArray(data?.messages) ? data.messages : [];
  return list.map(normalizeMessage);
}

export async function uploadSituationMedia(
  roomId: string,
  type: 'image' | 'audio',
  dataUrl: string
): Promise<{ url: string; path: string; sizeBytes: number; mimeType: string; storage?: string; persistent?: boolean }> {
  emitSituationDiagnostics({ roomId });
  const res = await fetch(buildApiUrl('/api/situation/media'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, type, dataUrl }),
  });
  const data = (await parseSituationResponseJson(res)) as Record<string, unknown>;
  if (!res.ok) throw new Error(`Failed to upload media: ${situationApiErrorMessage(data, res.status, res.statusText)}`);
  return {
    url: String(data?.url || ''),
    path: String(data?.path || ''),
    sizeBytes: Number(data?.sizeBytes || 0),
    mimeType: String(data?.mimeType || ''),
    storage: data?.storage ? String(data.storage) : undefined,
    persistent: Boolean(data?.persistent),
  };
}

export async function fetchSituationRooms(): Promise<SituationRoomSummary[]> {
  const res = await fetch(buildApiUrl('/api/situation/rooms'));
  const data = (await parseSituationResponseJson(res)) as { rooms?: unknown };
  if (!res.ok) {
    throw new Error(`Failed to fetch rooms: ${situationApiErrorMessage(data, res.status, res.statusText)}`);
  }
  const rooms = Array.isArray(data?.rooms) ? data.rooms : [];
  return rooms.map((room: any) => ({
    roomId: String(room?.roomId || ''),
    title: String(room?.title || 'Situation Room'),
    activeUsers: typeof room?.activeUsers === 'number' ? room.activeUsers : undefined,
    participants: typeof room?.participants === 'number' ? room.participants : undefined,
    memberCount: typeof room?.memberCount === 'number' ? room.memberCount : undefined,
    lastActivityAt: Number(room?.lastActivityAt || 0) || undefined,
    mediaPersistence: typeof room?.mediaPersistence === 'boolean' ? room.mediaPersistence : undefined,
  }));
}

export async function sendSituationMessage(
  roomId: string,
  payload: { sender: string; text?: string; imageUrl?: string; audioUrl?: string; isSystem?: boolean }
): Promise<ChatMessage> {
  emitSituationDiagnostics({ roomId });
  const res = await fetch(buildApiUrl(`/api/situation/${encodeURIComponent(roomId)}/messages`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await parseSituationResponseJson(res)) as { message?: unknown };
  if (!res.ok) {
    throw new Error(`Failed to send message: ${situationApiErrorMessage(data, res.status, res.statusText)}`);
  }
  return normalizeMessage(data?.message);
}
