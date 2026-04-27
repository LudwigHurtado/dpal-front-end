import React, { useEffect, useMemo, useState } from 'react';
import type { ChatMessage } from '../../types';
import { getCarbReportByRoomId } from '../../services/carbReportService';
import { parseCarbSituationRoomIdFromPath } from '../../utils/appRoutes';

interface CarbSituationRoomProps {
  roomId?: string | null;
  onReturn: () => void;
}

function buildLocalMessage(sender: string, text: string, isSystem = false): ChatMessage {
  return {
    id: `carb-room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sender,
    text,
    timestamp: Date.now(),
    isSystem,
    ledgerProof: 'local-carb-room-message',
  };
}

export default function CarbSituationRoom({ roomId, onReturn }: CarbSituationRoomProps): React.ReactElement {
  const resolvedRoomId = useMemo(() => roomId ?? parseCarbSituationRoomIdFromPath(window.location.pathname), [roomId]);
  const report = useMemo(
    () => (resolvedRoomId ? getCarbReportByRoomId(resolvedRoomId) : null),
    [resolvedRoomId],
  );
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!report) {
      setMessages([]);
      return;
    }
    setMessages([
      buildLocalMessage(
        'DPAL System',
        `Situation room initialized for CARB report ${report.reportId}.`,
        true,
      ),
    ]);
  }, [report]);

  if (!report || !resolvedRoomId) {
    return (
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-800 bg-slate-950/90 p-8 text-slate-200">
        <button type="button" onClick={onReturn} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300">
          Back
        </button>
        <h1 className="mt-4 text-2xl font-black text-white">CARB Situation Room not found</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <section className="rounded-[2rem] border border-slate-800 bg-slate-950/90 p-6 text-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-violet-300">CARB Situation Room</p>
            <h1 className="mt-1 text-3xl font-black text-white">{report.facilityIdentity.facilityName}</h1>
            <p className="mt-2 text-sm text-slate-400">Room ID: {report.situationRoom.roomId}</p>
            <p className="mt-1 text-xs text-slate-400">
              Level 3: Ongoing review space for notes, documents, satellite evidence, legal review, and regulator-ready investigation.
            </p>
          </div>
          <button type="button" onClick={onReturn} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300">
            Back
          </button>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950/85 p-5">
        <h2 className="text-lg font-bold text-white">Discussion</h2>
        <div className="mt-4 h-[380px] space-y-3 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
          {messages.map((message) => (
            <article key={message.id} className={`rounded-xl border px-3 py-2 text-sm ${message.isSystem ? 'border-amber-500/30 bg-amber-900/10 text-amber-100' : 'border-slate-800 bg-slate-950/70 text-slate-200'}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{message.sender}</p>
                <span className="text-[11px] text-slate-500">{new Date(message.timestamp).toLocaleString()}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap leading-relaxed">{message.text}</p>
            </article>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            placeholder="Add CARB investigation notes..."
            className="min-h-[88px] flex-1 rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={() => {
              if (!draft.trim()) return;
              setMessages((prev) => [...prev, buildLocalMessage('DPAL Operative', draft)]);
              setDraft('');
            }}
            className="rounded-2xl border border-cyan-500/40 bg-cyan-900/20 px-4 py-3 text-sm font-semibold text-cyan-100"
          >
            Send
          </button>
        </div>
      </section>
    </div>
  );
}
