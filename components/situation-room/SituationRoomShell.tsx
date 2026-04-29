import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import type { ChatMessage } from '../../types';
import type { SituationRoomRecord, SituationRoomSourceType } from '../../services/situationRoomService';
import {
  buildSituationRoomUrl,
  buildTransparencyUrl,
  generateEvidenceHash,
  getMessages,
  sendMessage,
} from '../../services/situationRoomService';

type Props = {
  sourceType: SituationRoomSourceType;
  reportId?: string;
  projectId?: string;
  roomId: string;
  title: string;
  category: string;
  evidencePacket?: unknown;
  aiSummary?: unknown;
  location?: SituationRoomRecord['location'];
  ledger?: SituationRoomRecord['ledger'];
  onBack?: () => void;
};

type TabId = 'coordination' | 'verification' | 'community';

export default function SituationRoomShell(props: Props): React.ReactElement {
  const [tab, setTab] = useState<TabId>('coordination');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [offline, setOffline] = useState(false);
  const [qrTransparency, setQrTransparency] = useState<string>('');
  const [qrRoom, setQrRoom] = useState<string>('');
  const [evidenceHash, setEvidenceHash] = useState<string>('');

  const transparencyUrl = useMemo(
    () => buildTransparencyUrl({ reportId: props.reportId, projectId: props.projectId, type: props.sourceType }),
    [props.reportId, props.projectId, props.sourceType],
  );
  const roomUrl = useMemo(
    () =>
      props.reportId
        ? buildSituationRoomUrl({ reportId: props.reportId })
        : buildSituationRoomUrl({ roomId: props.roomId, projectId: props.projectId, type: props.sourceType }),
    [props.reportId, props.projectId, props.roomId, props.sourceType],
  );

  useEffect(() => {
    void QRCode.toDataURL(transparencyUrl, { width: 144, margin: 1 }).then(setQrTransparency).catch(() => setQrTransparency(''));
    void QRCode.toDataURL(roomUrl, { width: 144, margin: 1 }).then(setQrRoom).catch(() => setQrRoom(''));
  }, [transparencyUrl, roomUrl]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const list = await getMessages(props.roomId);
        if (cancelled) return;
        setMessages(list);
        setOffline(false);
      } catch {
        if (cancelled) return;
        setOffline(true);
      }
    };
    void load();
    const timer = window.setInterval(load, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [props.roomId]);

  useEffect(() => {
    void generateEvidenceHash(props.evidencePacket).then(setEvidenceHash).catch(() => setEvidenceHash(''));
  }, [props.evidencePacket]);

  const sendDraft = async (): Promise<void> => {
    if (!draft.trim()) return;
    try {
      const saved = await sendMessage(props.roomId, { sender: 'DPAL Operative', text: draft });
      setMessages((prev) => [...prev, saved].sort((a, b) => a.timestamp - b.timestamp));
      setDraft('');
      setOffline(false);
    } catch {
      setOffline(true);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <section className="rounded-[2rem] border border-slate-800 bg-slate-950/90 p-5 text-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-300">Situation Room</p>
            <h1 className="mt-1 text-2xl font-black text-white">{props.title}</h1>
            <p className="mt-1 text-xs text-slate-400">
              {props.category} · room {props.roomId} · {props.reportId ? `report ${props.reportId}` : `project ${props.projectId ?? 'n/a'}`}
            </p>
          </div>
          {props.onBack ? (
            <button type="button" onClick={props.onBack} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300">Back</button>
          ) : null}
        </div>
        {offline ? (
          <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-900/20 px-3 py-2 text-xs text-amber-100">
            Situation Room backend unavailable. Local report context is still visible, but chat/media sync is paused.
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/85 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-cyan-300">Ledger Verification QR</p>
          {qrTransparency ? <img src={qrTransparency} alt="Transparency QR" className="mt-2 h-36 w-36 rounded-lg border border-slate-700 bg-white p-1" /> : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <a href={transparencyUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200">Open report</a>
            <button type="button" onClick={() => navigator.clipboard.writeText(transparencyUrl)} className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200">Copy link</button>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/85 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-cyan-300">Situation Room Share QR</p>
          {qrRoom ? <img src={qrRoom} alt="Situation room QR" className="mt-2 h-36 w-36 rounded-lg border border-slate-700 bg-white p-1" /> : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <a href={roomUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200">Open room</a>
            <button type="button" onClick={() => navigator.clipboard.writeText(roomUrl)} className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200">Copy link</button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/85 p-4">
        <div className="flex gap-2">
          {(['coordination', 'verification', 'community'] as TabId[]).map((id) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase ${tab === id ? 'bg-cyan-900/50 text-cyan-100 border border-cyan-500/40' : 'border border-slate-700 text-slate-300'}`}>
              {id}
            </button>
          ))}
        </div>

        {tab === 'coordination' ? (
          <div className="mt-4 space-y-3">
            <div className="h-64 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/50 p-3">
              {messages.map((m) => (
                <article key={m.id} className="mb-2 rounded-lg border border-slate-700 bg-slate-950/70 p-2 text-sm text-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-400"><span>{m.sender}</span><span>{new Date(m.timestamp).toLocaleString()}</span></div>
                  <p className="mt-1 whitespace-pre-wrap">{m.text}</p>
                </article>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[86px] flex-1 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white" placeholder="Message coordination room..." />
              <button type="button" onClick={() => void sendDraft()} className="rounded-xl border border-cyan-500/50 bg-cyan-900/20 px-4 py-2 text-sm font-semibold text-cyan-100">Send</button>
            </div>
          </div>
        ) : null}

        {tab === 'verification' ? (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3 text-sm text-slate-200">
              <p className="text-xs font-black uppercase tracking-wider text-cyan-300">Ledger / Hash</p>
              <p className="mt-2">Evidence Hash: {evidenceHash || 'pending'}</p>
              <p>Status: {props.ledger?.verificationStatus || 'pending'}</p>
              <p>Chain: {props.ledger?.chain || 'not anchored yet'}</p>
              <p>Tx: {props.ledger?.transactionId || 'Ledger pending - evidence packet hash generated but not yet anchored.'}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3 text-sm text-slate-200">
              <p className="text-xs font-black uppercase tracking-wider text-cyan-300">Evidence / AI Summary</p>
              <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap text-xs text-slate-300">{JSON.stringify(props.evidencePacket ?? {}, null, 2)}</pre>
            </div>
          </div>
        ) : null}

        {tab === 'community' ? (
          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/50 p-3 text-sm text-slate-200">
            <p className="text-xs font-black uppercase tracking-wider text-cyan-300">Community Feed</p>
            <p className="mt-2">Public discussion and actions are linked to this room share URL.</p>
            <p className="mt-1 text-xs text-slate-400">{roomUrl}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
