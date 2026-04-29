import { buildApiUrl } from '../../config/api';

export type GwBroadcastAudience = 'all' | 'nearby' | 'mission' | 'emergency' | 'community' | 'surge' | 'charity' | 'hazard';
export type GwSenderRole = 'driver' | 'passenger' | 'dispatch' | 'system';

export type GwBroadcast = {
  id: string;
  audience: GwBroadcastAudience;
  tripId?: string;
  text: string;
  status?: 'open' | 'accepted' | 'closed';
  createdAt: string;
  senderName: string;
  senderRole: GwSenderRole;
  acknowledgements: Array<{ driverId: string; at: string }>;
};

export type GwChatMessage = {
  id: string;
  threadId: string;
  text: string;
  createdAt: string;
  senderId: string;
  senderName: string;
  senderRole: GwSenderRole;
};

type Json = Record<string, unknown>;

async function asJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T;
  return data;
}

export const goodWheelsCommsService = {
  async listBroadcasts(input?: { audience?: GwBroadcastAudience; limit?: number }): Promise<GwBroadcast[]> {
    const query = new URLSearchParams();
    if (input?.audience) query.set('audience', input.audience);
    if (input?.limit) query.set('limit', String(input.limit));
    const url = buildApiUrl(`/api/good-wheels/broadcasts${query.size ? `?${query}` : ''}`);
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) throw new Error(`Failed to list broadcasts (${res.status})`);
    const data = await asJson<{ broadcasts?: GwBroadcast[] }>(res);
    return Array.isArray(data.broadcasts) ? data.broadcasts : [];
  },

  async createBroadcast(payload: {
    audience: GwBroadcastAudience;
    text: string;
    senderName: string;
    senderRole?: GwSenderRole;
  }): Promise<GwBroadcast> {
    const res = await fetch(buildApiUrl('/api/good-wheels/broadcasts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload satisfies Json),
    });
    if (!res.ok) throw new Error(`Failed to create broadcast (${res.status})`);
    const data = await asJson<{ broadcast: GwBroadcast }>(res);
    return data.broadcast;
  },

  async acknowledgeBroadcast(broadcastId: string, driverId: string): Promise<GwBroadcast> {
    const res = await fetch(buildApiUrl(`/api/good-wheels/broadcasts/${encodeURIComponent(broadcastId)}/ack`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId }),
    });
    if (!res.ok) throw new Error(`Failed to acknowledge broadcast (${res.status})`);
    const data = await asJson<{ broadcast: GwBroadcast }>(res);
    return data.broadcast;
  },

  async listThreadMessages(threadId: string, limit = 200): Promise<GwChatMessage[]> {
    const query = new URLSearchParams({ limit: String(limit) });
    const res = await fetch(buildApiUrl(`/api/good-wheels/chat/${encodeURIComponent(threadId)}/messages?${query}`), {
      method: 'GET',
    });
    if (!res.ok) throw new Error(`Failed to list messages (${res.status})`);
    const data = await asJson<{ messages?: GwChatMessage[] }>(res);
    return Array.isArray(data.messages) ? data.messages : [];
  },

  async sendThreadMessage(threadId: string, payload: {
    text: string;
    senderId: string;
    senderName: string;
    senderRole: GwSenderRole;
  }): Promise<GwChatMessage> {
    const res = await fetch(buildApiUrl(`/api/good-wheels/chat/${encodeURIComponent(threadId)}/messages`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload satisfies Json),
    });
    if (!res.ok) throw new Error(`Failed to send message (${res.status})`);
    const data = await asJson<{ message: GwChatMessage }>(res);
    return data.message;
  },
};
