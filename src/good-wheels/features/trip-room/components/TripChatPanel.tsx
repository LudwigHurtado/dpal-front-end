import React, { useEffect, useState } from 'react';
import type { TripMessage } from '../../../types/rideConnection';
import { goodWheelsChatService } from '../../../services/goodWheelsChatService';

type Props = {
  rideId: string;
  userId: string;
  userName: string;
  senderRole: 'passenger' | 'driver' | 'system';
};

const TripChatPanel: React.FC<Props> = ({ rideId, userId, userName, senderRole }) => {
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const next = await goodWheelsChatService.listMessages(rideId);
      if (mounted) setMessages(next);
    };
    void load();
    const timer = window.setInterval(() => void load(), 3000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [rideId]);

  const send = async () => {
    if (!draft.trim()) return;
    await goodWheelsChatService.sendMessage({
      rideId,
      senderId: userId,
      senderRole,
      body: draft.trim(),
    });
    setDraft('');
    const next = await goodWheelsChatService.listMessages(rideId);
    setMessages(next);
  };

  return (
    <div className="gw-card p-4 space-y-3">
      <div className="gw-card-title">Trip chat</div>
      <div className="max-h-56 overflow-auto rounded-xl border border-slate-200 p-2 bg-white">
        {messages.length === 0 ? (
          <div className="text-sm text-slate-500">No messages yet.</div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <div key={msg.id} className={msg.senderId === userId ? 'text-right' : 'text-left'}>
                <div className={msg.senderId === userId ? 'inline-block rounded-lg bg-sky-600 text-white px-3 py-2 text-sm' : 'inline-block rounded-lg bg-slate-100 text-slate-800 px-3 py-2 text-sm'}>
                  {msg.body}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input className="gw-input" placeholder={`Message as ${userName}`} value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button type="button" className="gw-button gw-button-primary" onClick={() => void send()}>
          Send
        </button>
      </div>
    </div>
  );
};

export default TripChatPanel;

