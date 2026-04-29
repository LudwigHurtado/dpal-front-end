import React, { useEffect, useMemo, useState } from 'react';
import type { Role } from '../../../types/role';
import { goodWheelsCommsService, type GwChatMessage } from '../../../services/goodWheelsCommsService';
import { useGwLang } from '../../../i18n/useGwLang';

type Props = {
  threadId: string;
  role: Role;
  userId: string;
  userName: string;
  title?: string;
};

const POLL_MS = 5000;

const TripChatPanel: React.FC<Props> = ({ threadId, role, userId, userName, title }) => {
  const t = useGwLang((s) => s.t);
  const [messages, setMessages] = useState<GwChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const senderRole = useMemo(() => {
    if (role === 'driver') return 'driver' as const;
    if (role === 'passenger') return 'passenger' as const;
    return 'dispatch' as const;
  }, [role]);
  const latestMessage = messages[messages.length - 1] ?? null;

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
        if (mounted) setError(t('syncIssue'));
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
      setError(t('syncIssue'));
    } finally {
      setLoading(false);
    }
  };

  const listenLatestMessage = () => {
    if (!latestMessage?.text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const speech = new SpeechSynthesisUtterance(`${latestMessage.senderName} says: ${latestMessage.text}`);
    window.speechSynthesis.speak(speech);
  };

  const stopListening = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
  };

  return (
    <div className="gw-card p-5 space-y-3">
      <div className="gw-card-title">{title ?? t('dispatcher')}</div>
      <div className="text-xs text-slate-500">{t('driver')} / {t('passenger')}</div>
      <div className="flex gap-2">
        <button type="button" className="gw-button gw-button-secondary" onClick={listenLatestMessage} disabled={!latestMessage}>
          Listen latest
        </button>
        <button type="button" className="gw-button gw-button-secondary" onClick={stopListening}>
          Stop audio
        </button>
      </div>
      {error && <div className="gw-error">{error}</div>}
      <div className="max-h-52 overflow-auto space-y-2 rounded-xl border border-slate-200 p-3 bg-white/70">
        {messages.length === 0 ? (
          <div className="text-sm text-slate-500">{t('noMessagesYet')}</div>
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
          placeholder={t('typeMessage')}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void send();
          }}
        />
        <button type="button" className="gw-button gw-button-primary" disabled={loading || !draft.trim()} onClick={() => void send()}>
          {t('send')}
        </button>
      </div>
    </div>
  );
};

export default TripChatPanel;
