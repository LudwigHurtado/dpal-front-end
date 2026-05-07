import React, { useState } from 'react';
import { MessageSquare, Send, ShieldCheck, User, Bot } from '../../../../components/icons';
import type {
  FloodAlert,
  FloodSituationMessage,
  FloodSituationParticipantRole,
  FloodSituationRoom,
} from '../floodGuardTypes';
import { ALERT_LEVEL_COLORS, formatRelativeTimestamp } from './floodGuardUi';

interface FloodSituationRoomViewProps {
  room: FloodSituationRoom;
  alert: FloodAlert | null;
  currentParticipantName: string;
  currentParticipantRole: FloodSituationParticipantRole;
  onPostMessage: (message: FloodSituationMessage) => void;
  className?: string;
}

const FloodSituationRoomView: React.FC<FloodSituationRoomViewProps> = ({
  room,
  alert,
  currentParticipantName,
  currentParticipantRole,
  onPostMessage,
  className = '',
}) => {
  const [draft, setDraft] = useState('');
  const palette = alert ? ALERT_LEVEL_COLORS[alert.level] : null;

  const handleSubmit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const message: FloodSituationMessage = {
      messageId: `MSG-${Date.now()}`,
      authorName: currentParticipantName,
      authorRole: currentParticipantRole,
      body: trimmed,
      timestamp: new Date().toISOString(),
    };
    onPostMessage(message);
    setDraft('');
  };

  return (
    <div
      className={`rounded-2xl p-5 border dpal-border-subtle ${className}`}
      style={{ background: 'var(--dpal-card)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4" style={{ color: 'var(--dpal-primary)' }} />
        <div className="text-[10px] font-black tracking-widest uppercase dpal-text-muted">
          Situation Room
        </div>
        {palette && alert && (
          <span
            className="ml-auto text-[10px] font-bold uppercase tracking-wider rounded-md px-2 py-0.5"
            style={{ background: palette.bg, color: palette.fg, border: `1px solid ${palette.border}` }}
          >
            L{alert.level} · {alert.label}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-2">
          <div
            className="rounded-xl px-3 py-3 max-h-[360px] overflow-y-auto"
            style={{ background: 'var(--dpal-surface-alt)' }}
          >
            {room.messages.length === 0 ? (
              <div className="text-xs dpal-text-muted text-center py-8">
                No messages yet. City officials, validators, responders, and citizens coordinate here.
              </div>
            ) : (
              <ul className="space-y-3">
                {room.messages.map((message) => (
                  <li key={message.messageId} className="flex gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: message.authorRole === 'system' ? 'rgba(34,211,238,0.15)' : 'var(--dpal-surface)',
                        border: '1px solid var(--dpal-border)',
                      }}
                    >
                      {message.authorRole === 'system' ? (
                        <Bot className="w-3.5 h-3.5" />
                      ) : (
                        <User className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="font-semibold" style={{ color: 'var(--dpal-text-primary)' }}>
                          {message.authorName}
                        </span>
                        <span className="dpal-text-muted">
                          {message.authorRole === 'system' ? 'system' : message.authorRole.replace(/_/g, ' ')}
                        </span>
                        <span className="dpal-text-muted">·</span>
                        <span className="dpal-text-muted">{formatRelativeTimestamp(message.timestamp)}</span>
                      </div>
                      <div className="text-xs mt-1 whitespace-pre-wrap" style={{ color: 'var(--dpal-text-primary)' }}>
                        {message.body}
                      </div>
                      {message.attachmentLabel && (
                        <div className="text-[10px] dpal-text-muted mt-1">📎 {message.attachmentLabel}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="Post a coordination update…"
              className="flex-1 rounded-lg px-3 py-2 text-sm"
              style={{
                background: 'var(--dpal-input-bg)',
                color: 'var(--dpal-input-text)',
                border: '1px solid var(--dpal-input-border)',
              }}
            />
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-lg px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5 transition hover:opacity-90"
              style={{ background: 'var(--dpal-primary)', color: 'var(--md-sys-color-on-primary, #00201a)' }}
            >
              <Send className="w-3.5 h-3.5" /> Post
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div
            className="rounded-xl px-3 py-3"
            style={{ background: 'var(--dpal-surface-alt)' }}
          >
            <div className="text-[10px] uppercase tracking-wider dpal-text-muted mb-2">Participants</div>
            <ul className="space-y-1.5">
              {room.participants.map((participant) => (
                <li key={participant.participantId} className="text-xs flex justify-between items-center">
                  <span style={{ color: 'var(--dpal-text-primary)' }}>{participant.name}</span>
                  <span className="dpal-text-muted text-[10px]">{participant.role.replace(/_/g, ' ')}</span>
                </li>
              ))}
            </ul>
          </div>

          {alert && (
            <div
              className="rounded-xl px-3 py-3"
              style={{ background: 'var(--dpal-surface-alt)' }}
            >
              <div className="text-[10px] uppercase tracking-wider dpal-text-muted mb-2">Routing</div>
              <div className="text-[11px]" style={{ color: 'var(--dpal-text-primary)' }}>
                {alert.audiences.length} audience(s) · {alert.channels.length} channel(s)
              </div>
              <div className="text-[10px] dpal-text-muted mt-2">
                {alert.audiences.map((a) => a.replace(/_/g, ' ')).join(' · ')}
              </div>
            </div>
          )}

          <div
            className="rounded-xl px-3 py-2 text-[11px] flex items-start gap-2"
            style={{ background: 'var(--dpal-surface)', border: '1px dashed var(--dpal-border)', color: 'var(--dpal-text-secondary)' }}
          >
            <ShieldCheck className="w-3.5 h-3.5 mt-0.5" />
            <span>
              Coordination updates here are not legal records. The DPAL evidence packet for this alert is the
              authoritative civic snapshot.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloodSituationRoomView;
