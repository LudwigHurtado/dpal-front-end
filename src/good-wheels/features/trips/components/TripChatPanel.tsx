import React, { useEffect, useMemo, useState } from 'react';
import type { Role } from '../../../types/role';
import { goodWheelsCommsService, type GwChatMessage } from '../../../services/goodWheelsCommsService';

type Props = {
  threadId: string;
  role: Role;
  userId: string;
  userName: string;
  title?: string;
};

const POLL_MS = 5000;

const TripChatPanel: React.FC<Props> = ({ threadId, role, userId, userName, title }) => {
  const [messages, setMessages] = useState<GwChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const senderRole = useMemo(() => {
    if (role === 'driver') return 'driver' as const;
    if (role === 'passenger') return 'passenger' as const;
    return 'dispatch' as const;
  }, [role]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const next = await goodWheelsCommsService.listThreadMessages(threadId, 120);
        if (mounted) {
          setMessages(next);
          setError(null);
        }
      } catch {
        if (mounted) setError('Chat sync unavailable right now.');
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [threadId]);

  const send = async () => {
    if (!draft.trim() || loading) return;
    setLoading(true);
    try {
      const msg = await goodWheelsCommsService.sendThreadMessage(threadId, {
        text: draft.trim(),
        senderId: userId,
        senderName: userName,
        senderRole,
      });
      setMessages((prev) => [...prev, msg]);
      setDraft('');
      setError(null);
    } catch {
      setError('Could not send this message.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gw-card p-5 space-y-3">
      <div className="gw-card-title">{title ?? 'Trip chat'}</div>
      <div className="text-xs text-slate-500">Driver and passenger can coordinate here in real time.</div>
      {error && <div className="gw-error">{error}</div>}
      <div className="max-h-52 overflow-auto space-y-2 rounded-xl border border-slate-200 p-3 bg-white/70">
        {messages.length === 0 ? (
          <div className="text-sm text-slate-500">No messages yet.</div>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === userId;
            return (
              <div key={m.id} className={mine ? 'text-right' : 'text-left'}>
                <div className={mine ? 'inline-block rounded-xl bg-sky-600 text-white px-3 py-2 text-sm' : 'inline-block rounded-xl bg-slate-200 text-slate-800 px-3 py-2 text-sm'}>
                  {m.text}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {m.senderName} · {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="flex gap-2">
        <input
          className="gw-input"
          placeholder="Type a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void send();
          }}
        />
        <button type="button" className="gw-button gw-button-primary" disabled={loading || !draft.trim()} onClick={() => void send()}>
          Send
        </button>
      </div>
    </div>
  );
};

export default TripChatPanel;
