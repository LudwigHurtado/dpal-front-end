import { goodWheelsRideAdapter } from './adapters/goodWheelsRideAdapter';
import type { TripMessage } from '../types/rideConnection';

const makeId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const goodWheelsChatService = {
  async sendMessage(input: Omit<TripMessage, 'id' | 'createdAt'>): Promise<TripMessage> {
    const message: TripMessage = {
      ...input,
      id: makeId('msg'),
      createdAt: new Date().toISOString(),
    };
    await goodWheelsRideAdapter.appendMessage(message);
    return message;
  },
  listMessages(rideId: string): Promise<TripMessage[]> {
    return goodWheelsRideAdapter.listMessages(rideId);
  },
};

