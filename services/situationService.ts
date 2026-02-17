import type { ChatMessage } from '../types';
import { getApiBase } from '../constants';

const apiBase = getApiBase();

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
  const res = await fetch(`${apiBase}/api/situation/${encodeURIComponent(roomId)}/messages?limit=200`);
  if (!res.ok) throw new Error(`Failed to fetch messages (${res.status})`);
  const data = await res.json();
  const list = Array.isArray(data?.messages) ? data.messages : [];
  return list.map(normalizeMessage);
}

export async function uploadSituationMedia(
  roomId: string,
  type: 'image' | 'audio',
  dataUrl: string
): Promise<{ url: string; path: string; sizeBytes: number; mimeType: string }> {
  const res = await fetch(`${apiBase}/api/situation/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, type, dataUrl }),
  });
  if (!res.ok) throw new Error(`Failed to upload media (${res.status})`);
  const data = await res.json();
  return {
    url: String(data?.url || ''),
    path: String(data?.path || ''),
    sizeBytes: Number(data?.sizeBytes || 0),
    mimeType: String(data?.mimeType || ''),
  };
}

export async function sendSituationMessage(
  roomId: string,
  payload: { sender: string; text?: string; imageUrl?: string; audioUrl?: string; isSystem?: boolean }
): Promise<ChatMessage> {
  const res = await fetch(`${apiBase}/api/situation/${encodeURIComponent(roomId)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to send message (${res.status})`);
  const data = await res.json();
  return normalizeMessage(data?.message);
}
