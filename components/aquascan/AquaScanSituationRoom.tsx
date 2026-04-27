import React, { useEffect, useMemo, useState } from 'react';
import type { AquaScanEvidenceReport } from '../../types/aquascanReport';
import type { ChatMessage } from '../../types';
import { getAquaScanEvidenceReportByRoomId } from '../../services/aquascanReportService';
import {
  loadAquaScanSituationRoom,
  sendAquaScanSituationMessage,
} from '../../services/aquascanSituationRoomService';
import { parseAquaScanSituationRoomIdFromPath } from '../../utils/appRoutes';

interface AquaScanSituationRoomProps {
  roomId?: string | null;
  onBack: () => void;
  onOpenReport: (reportId: string) => void;
  currentUserName?: string;
}

const ACTIONS = [
  'Generate Evidence Packet',
  'Attach Evidence',
  'Request Water Sample',
  'Assign Validator',
  'Mark Needs Evidence',
  'Add note',
] as const;

export default function AquaScanSituationRoom({
  roomId,
  onBack,
  onOpenReport,
  currentUserName = 'DPAL Operative',
}: AquaScanSituationRoomProps): React.ReactElement {
  const resolvedRoomId = useMemo(() => roomId ?? parseAquaScanSituationRoomIdFromPath(window.location.pathname), [roomId]);
  const [report, setReport] = useState<AquaScanEvidenceReport | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [participants, setParticipants] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!resolvedRoomId) {
      setReport(null);
      return;
    }
    setReport(getAquaScanEvidenceReportByRoomId(resolvedRoomId));
  }, [resolvedRoomId]);

  useEffect(() => {
    if (!resolvedRoomId) return;
    let cancelled = false;
    const load = async (): Promise<void> => {
      const result = await loadAquaScanSituationRoom(resolvedRoomId);
      if (cancelled) return;
      setMessages(result.messages);
      setNotice(result.notice ?? null);
      setParticipants(result.participants ?? null);
    };
    void load();
    const timer = window.setInterval(() => void load(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [resolvedRoomId]);

  const postMessage = async (text: string, isSystem = false): Promise<void> => {
    if (!resolvedRoomId || !text.trim() || sending) return;
    setSending(true);
    try {
      const result = await sendAquaScanSituationMessage(resolvedRoomId, {
        sender: isSystem ? 'DPAL System' : currentUserName,
        text,
        isSystem,
      });
      setMessages((prev) => [...prev, result.message].sort((a, b) => a.timestamp - b.timestamp));
      setNotice(result.notice ?? notice);
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  if (!report || !resolvedRoomId) {
    return (
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-800 bg-slate-950/90 p-8 text-slate-200">
        <button type="button" onClick={onBack} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300">
          Back
        </button>
        <h1 className="mt-4 text-2xl font-black text-white">Situation room not found</h1>
        <p className="mt-2 text-sm text-slate-400">This room is local/internal until AquaScan backend storage is connected.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="rounded-[2rem] border border-slate-800 bg-slate-950/90 p-6 text-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-violet-300">AquaScan Situation Room</p>
            <h1 className="mt-1 text-3xl font-black text-white">{report.projectName || report.reportId}</h1>
            <p className="mt-2 text-sm text-slate-400">Room ID: {report.situationRoom.roomId}</p>
            <p className="text-sm text-slate-400">Participants: {participants ?? 'Pending connection'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onBack} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300">
              Back
            </button>
            <button type="button" onClick={() => onOpenReport(report.reportId)} className="rounded-xl border border-cyan-500/40 bg-cyan-900/20 px-3 py-2 text-sm font-semibold text-cyan-100">
              Open report
            </button>
          </div>
        </div>
        {notice ? (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-900/15 px-3 py-2 text-xs text-amber-100">
            {notice}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950/85 p-5">
          <h2 className="text-lg font-bold text-white">Project / Report Summary</h2>
          <p className="mt-3 text-sm text-slate-300">{report.aiIntelligence.summary}</p>
          <div className="mt-4 space-y-2 text-sm text-slate-400">
            <p>Project: {report.projectName || report.projectId || 'Not available'}</p>
            <p>Verification: {report.ledger.verificationStatus}</p>
            <p>Risk level: {report.aiIntelligence.riskLevel || 'Not available'}</p>
            <p>Evidence hash: {report.hashes.evidenceHash || 'Pending generation'}</p>
          </div>
          {report.evidencePacket.status === 'not_generated' ? (
            <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-900/15 p-3 text-sm text-amber-100">
              <p>Evidence Packet not generated yet.</p>
              <p className="mt-1 text-xs text-amber-200">Add photos, lab results, field notes, or validator comments when available.</p>
            </div>
          ) : null}
          <div className="mt-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Action checklist</p>
            <div className="mt-3 space-y-2">
              {ACTIONS.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => void postMessage(`[${action}] requested for report ${report.reportId}.`, true)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:border-violet-500/40 hover:text-white"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950/85 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-white">Live Chat</h2>
            <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
              {notice ? 'Fallback chat' : 'Realtime'}
            </span>
          </div>
          <div className="mt-4 h-[420px] space-y-3 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-500">No messages yet. Start the project discussion here.</p>
            ) : (
              messages.map((message) => (
                <article key={message.id} className={`rounded-xl border px-3 py-2 text-sm ${message.isSystem ? 'border-amber-500/30 bg-amber-900/10 text-amber-100' : 'border-slate-800 bg-slate-950/70 text-slate-200'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{message.sender}</p>
                    <span className="text-[11px] text-slate-500">{new Date(message.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap leading-relaxed">{message.text}</p>
                </article>
              ))
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              placeholder="Add a project note or discussion update..."
              className="min-h-[88px] flex-1 rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={() => void postMessage(draft)}
              disabled={sending || !draft.trim()}
              className="rounded-2xl border border-cyan-500/40 bg-cyan-900/20 px-4 py-3 text-sm font-semibold text-cyan-100 disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950/85 p-5">
          <h2 className="text-lg font-bold text-white">Evidence / Participants</h2>
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Participants</p>
            <p className="mt-2 text-sm text-slate-300">{participants ?? 'Pending connection'}</p>
          </div>
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Evidence sidebar</p>
            {report.evidencePacket.status === 'not_generated' ? (
              <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-900/15 p-3 text-sm text-amber-100">
                <p>Evidence Packet not generated yet.</p>
                <p className="mt-1 text-xs text-amber-200">Add photos, lab results, field notes, or validator comments when available.</p>
              </div>
            ) : null}
            <ul className="mt-2 space-y-2 text-sm text-slate-300">
              {(report.evidencePacket.includedFiles?.length ?? 0) === 0 && (report.evidencePacket.screenshots?.length ?? 0) === 0 ? (
                <li>No uploaded evidence files yet.</li>
              ) : (
                <>
                  {report.evidencePacket.includedFiles?.map((file) => (
                    <li key={file.name}>{file.name} · {file.type}</li>
                  ))}
                  {report.evidencePacket.screenshots?.map((file) => (
                    <li key={file.name}>{file.name} · screenshot</li>
                  ))}
                </>
              )}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
