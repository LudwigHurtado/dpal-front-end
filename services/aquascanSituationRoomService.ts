import type { ChatMessage } from '../types';
import { fetchSituationMessages, fetchSituationRooms, sendSituationMessage } from './situationService';
import {
  loadLocalSituationMessages,
  mergeSituationMessages,
  saveLocalSituationMessages,
} from './situationLocalStore';

export type AquaScanSituationRoomLoadResult = {
  messages: ChatMessage[];
  mode: 'realtime' | 'local-fallback';
  notice?: string;
  participants?: number;
};

function buildLocalMessage(roomId: string, payload: { sender: string; text?: string; isSystem?: boolean }): ChatMessage {
  return {
    id: `local-${roomId}-${Date.now()}`,
    sender: payload.sender,
    text: payload.text ?? '',
    timestamp: Date.now(),
    isSystem: payload.isSystem,
    ledgerProof: `0x${Math.random().toString(16).slice(2)}`,
  };
}

export async function loadAquaScanSituationRoom(roomId: string): Promise<AquaScanSituationRoomLoadResult> {
  const local = loadLocalSituationMessages(roomId);
  try {
    const [remoteMessages, rooms] = await Promise.all([fetchSituationMessages(roomId), fetchSituationRooms()]);
    const room = rooms.find((entry) => entry.roomId === roomId);
    return {
      messages: mergeSituationMessages(remoteMessages, local),
      mode: 'realtime',
      participants: room?.memberCount ?? room?.participants ?? room?.activeUsers,
    };
  } catch {
    return {
      messages: local,
      mode: 'local-fallback',
      notice: 'Local development chat - real-time backend pending.',
    };
  }
}

export async function sendAquaScanSituationMessage(
  roomId: string,
  payload: { sender: string; text?: string; isSystem?: boolean },
): Promise<{ message: ChatMessage; mode: 'realtime' | 'local-fallback'; notice?: string }> {
  try {
    const message = await sendSituationMessage(roomId, payload);
    const local = mergeSituationMessages([message], loadLocalSituationMessages(roomId));
    saveLocalSituationMessages(roomId, local);
    return { message, mode: 'realtime' };
  } catch {
    const message = buildLocalMessage(roomId, payload);
    const local = [...loadLocalSituationMessages(roomId), message].sort((a, b) => a.timestamp - b.timestamp);
    saveLocalSituationMessages(roomId, local);
    return {
      message,
      mode: 'local-fallback',
      notice: 'Local development chat - real-time backend pending.',
    };
  }
}
