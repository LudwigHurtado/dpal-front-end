import type { Response } from 'express';

type SseClient = {
  id: string;
  res: Response;
};

const clients = new Map<string, SseClient>();

export function registerResolutionStreamClient(res: Response): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  clients.set(id, { id, res });
  return id;
}

export function removeResolutionStreamClient(id: string): void {
  clients.delete(id);
}

export function broadcastResolutionEvent(event: unknown): void {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of clients.values()) {
    try {
      client.res.write(payload);
    } catch {
      clients.delete(client.id);
    }
  }
}
