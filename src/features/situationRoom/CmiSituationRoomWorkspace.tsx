/**
 * CMI-aligned Situation Room evidence workspace — persistent room, validator mode, export.
 * Preserves legacy chat APIs; adds registry metadata panels without claiming registry status.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import type { ChatMessage } from '../../../types';
import { GlobalAlertsPanel } from '../../../components/GlobalAlertsPanel';
import { getMessages, sendMessage } from '../../../services/situationRoomService';
import {
  getSituationRoomUrl,
  logSituationRoomQrDiagnostics,
  type SituationRoomViewMode,
} from '../../../utils/situationRoomPaths';
import SituationRoomNotFound from './SituationRoomNotFound';
import {
  ensureReportRoom,
  fetchCmiRoom,
  fetchEvidenceExport,
  fetchValidatorReview,
  patchCmiRoom,
  saveValidatorReview,
  sealCmiRoom,
  type CmiSituationRoom,
  type ValidatorReview,
} from './cmiSituationRoomService';

type Props = {
  roomId: string;
  mode: SituationRoomViewMode;
  reportLocation?: string;
  reportCategory?: string;
  onBack?: () => void;
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-zinc-800 text-zinc-300',
  ACTIVE: 'bg-emerald-900/40 text-emerald-300',
  UNDER_REVIEW: 'bg-amber-900/40 text-amber-300',
  SEALED: 'bg-violet-900/40 text-violet-300',
  ARCHIVED: 'bg-zinc-900 text-zinc-500',
};

const DEFAULT_CAD: Record<string, string> = {
  registryId: '',
  registryProjectId: '',
  methodologyReference: '',
  hostCountry: '',
  article6AuthorizationStatus: '',
  correspondingAdjustmentStatus: '',
  creditingPeriod: '',
  unitStatus: '',
  cadTrustMappingStatus: 'not_mapped',
};

export default function CmiSituationRoomWorkspace({
  roomId,
  mode,
  reportLocation,
  reportCategory,
  onBack,
}: Props): React.ReactElement {
  const [room, setRoom] = useState<CmiSituationRoom | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [validatorDraft, setValidatorDraft] = useState<ValidatorReview>({});
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const readOnly = room?.status === 'SEALED' || room?.status === 'ARCHIVED' || mode === 'sealed';
  const publicMode = mode === 'public';
  const validatorMode = mode === 'validator';

  const canonicalRoomUrl = useMemo(
    () => room?.canonicalUrl ?? getSituationRoomUrl(roomId),
    [room?.canonicalUrl, roomId],
  );

  useEffect(() => {
    logSituationRoomQrDiagnostics(roomId, canonicalRoomUrl);
  }, [roomId, canonicalRoomUrl]);

  const load = useCallback(async () => {
    if (!roomId?.trim()) {
      setNotFound(true);
      setRoom(null);
      return;
    }
    setErr('');
    try {
      let r: CmiSituationRoom;
      try {
        r = await fetchCmiRoom(roomId);
      } catch (ex: unknown) {
        const status = ex && typeof ex === 'object' && 'status' in ex ? (ex as { status: number }).status : 0;
        if (status === 404) {
          r = await ensureReportRoom(roomId);
        } else {
          throw ex;
        }
      }
      setRoom(r);
      setNotFound(false);
      const review = await fetchValidatorReview(roomId);
      if (review) setValidatorDraft(review);
      const msgs = await getMessages(roomId);
      const filtered = publicMode
        ? msgs.filter((m) => !m.isSystem || m.sender?.toLowerCase().includes('system'))
        : msgs;
      setMessages(filtered);
    } catch (ex: unknown) {
      const status = ex && typeof ex === 'object' && 'status' in ex ? (ex as { status: number }).status : 0;
      if (status === 404) {
        setNotFound(true);
        setRoom(null);
        return;
      }
      setErr(ex instanceof Error ? ex.message : 'Could not load Situation Room');
    }
  }, [roomId, publicMode]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    void QRCode.toDataURL(canonicalRoomUrl, { width: 160, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(''));
  }, [canonicalRoomUrl]);

  const cmiAlignment = (room?.cmiAlignment ?? {}) as Record<string, { label?: string; ok?: boolean }>;

  const saveCad = async (patch: Record<string, string>) => {
    if (!room || readOnly) return;
    const cadTrustMetadata = { ...(room.cadTrustMetadata as Record<string, string>), ...patch };
    const updated = await patchCmiRoom(roomId, { cadTrustMetadata } as Partial<CmiSituationRoom>);
    setRoom(updated);
  };

  const handleSend = async () => {
    if (!draft.trim() || readOnly || publicMode) return;
    const saved = await sendMessage(roomId, {
      sender: validatorMode ? 'Validator' : 'DPAL Operative',
      text: draft,
      isSystem: false,
    });
    setMessages((p) => [...p, saved].sort((a, b) => a.timestamp - b.timestamp));
    setDraft('');
  };

  const handleSeal = async () => {
    if (!window.confirm('Seal this room? It will become read-only and integrity hash will be recorded.')) return;
    setBusy(true);
    try {
      const updated = await sealCmiRoom(roomId);
      setRoom(updated);
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      const packet = await fetchEvidenceExport(roomId);
      const blob = new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `dpal-evidence-packet-${roomId}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveValidator = async () => {
    if (readOnly) return;
    setBusy(true);
    try {
      await saveValidatorReview(roomId, validatorDraft);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (notFound) {
    return <SituationRoomNotFound roomId={roomId} onReturnHome={onBack} />;
  }

  if (!room) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Loading Situation Room…
      </div>
    );
  }

  const cad = { ...DEFAULT_CAD, ...((room.cadTrustMetadata as Record<string, string>) ?? {}) };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/95 px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {onBack && (
              <button type="button" onClick={onBack} className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300">
                ← Back
              </button>
            )}
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-400">
              {publicMode ? 'Public QR Room' : validatorMode ? 'Validator Room' : readOnly ? 'Sealed Evidence Room' : 'Situation Room'}
            </p>
            <h1 className="mt-1 truncate text-2xl font-black text-white">{room.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${STATUS_STYLES[room.status] ?? STATUS_STYLES.ACTIVE}`}>
                {room.status}
              </span>
              <span className="font-mono text-[10px] text-zinc-500">ID: {room.roomId}</span>
            </div>
            <p className="mt-2 break-all font-mono text-[10px] text-cyan-700/90">{canonicalUrl}</p>
          </div>
          <div className="flex flex-wrap items-start gap-3">
            {qrDataUrl && (
              <img src={qrDataUrl} alt="Situation Room QR" className="h-28 w-28 rounded-lg border border-zinc-700 bg-white p-1" />
            )}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(canonicalUrl)}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-900"
              >
                Copy link
              </button>
              {qrDataUrl && (
                <a
                  href={qrDataUrl}
                  download={`situation-room-${roomId}-qr.png`}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-900"
                >
                  Download QR
                </a>
              )}
              {!publicMode && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleExport()}
                  className="rounded-lg bg-cyan-800 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-cyan-700 disabled:opacity-50"
                >
                  Generate Evidence Packet
                </button>
              )}
              {!readOnly && !publicMode && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSeal()}
                  className="rounded-lg border border-violet-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-300 hover:bg-violet-950/40 disabled:opacity-50"
                >
                  Seal room
                </button>
              )}
            </div>
          </div>
        </div>
        {err && <p className="mx-auto mt-3 max-w-7xl text-xs text-rose-400">{err}</p>}
        <p className="mx-auto mt-3 max-w-7xl text-[10px] text-zinc-500">
          DPAL stores supporting MRV/evidence documentation. Registry-level data may be mapped to CAD Trust-compatible metadata where applicable. This workspace is not a carbon registry.
        </p>
      </header>

      {!publicMode && <GlobalAlertsPanel reportLocation={reportLocation} reportCategory={reportCategory} />}

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Evidence timeline</h2>
            <ul className="mt-3 space-y-2 text-xs text-zinc-300">
              <li>Room created · integrity {room.integrityHash ? 'hash recorded' : 'pending seal'}</li>
              {room.sealedAt && <li>Sealed · {new Date(room.sealedAt).toLocaleString()}</li>}
              {room.blockchainAnchorId && <li>Anchor · {room.blockchainAnchorId}</li>}
            </ul>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              {validatorMode ? 'Validator transcript' : 'Situation Room transcript'}
            </h2>
            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
              {messages.length === 0 && <p className="text-xs text-zinc-500">No messages yet.</p>}
              {messages.map((m) => (
                <div key={m.id} className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 px-3 py-2 text-xs">
                  <span className="font-bold text-cyan-600/90">{m.sender}</span>
                  <span className="ml-2 text-[10px] text-zinc-600">{new Date(m.timestamp).toLocaleString()}</span>
                  <p className="mt-1 text-zinc-200">{m.text}</p>
                </div>
              ))}
            </div>
            {!readOnly && !publicMode && (
              <div className="mt-3 flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={readOnly ? 'Room is read-only' : 'Add coordination note…'}
                  disabled={readOnly}
                  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm disabled:opacity-50"
                  onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={readOnly || !draft.trim()}
                  className="rounded-xl bg-emerald-800 px-4 py-2 text-[10px] font-bold uppercase tracking-wider disabled:opacity-40"
                >
                  Send
                </button>
              </div>
            )}
          </section>

          {(validatorMode || !publicMode) && (
            <section className="rounded-2xl border border-amber-900/40 bg-amber-950/10 p-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Validator review</h2>
              {publicMode ? (
                <p className="mt-2 text-xs text-zinc-500">Validator notes are not shown in the public room.</p>
              ) : (
                <div className="mt-3 grid gap-2 text-sm">
                  {(['validatorIdentity', 'organization', 'accreditation', 'conflictOfInterestDisclosure', 'finalNote', 'attestationSignature'] as const).map((field) => (
                    <label key={field} className="block text-[10px] uppercase tracking-wider text-zinc-500">
                      {field.replace(/([A-Z])/g, ' $1')}
                      <input
                        disabled={readOnly}
                        value={String(validatorDraft[field] ?? '')}
                        onChange={(e) => setValidatorDraft((v) => ({ ...v, [field]: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 disabled:opacity-50"
                      />
                    </label>
                  ))}
                  {!readOnly && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleSaveValidator()}
                      className="mt-2 rounded-lg border border-amber-700 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-300"
                    >
                      Save validator review
                    </button>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">CMI / Carbon Market Infrastructure Alignment</h2>
            <ul className="mt-3 space-y-2">
              {Object.entries(cmiAlignment)
                .filter(([k]) => !['disclaimer'].includes(k))
                .map(([key, val]) => (
                  <li key={key} className="flex items-start gap-2 text-xs">
                    <span className={val?.ok ? 'text-emerald-400' : 'text-zinc-500'}>{val?.ok ? '✓' : '○'}</span>
                    <span className="text-zinc-300">{val?.label ?? key}</span>
                  </li>
                ))}
            </ul>
          </section>

          {!publicMode && (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">CAD Trust / registry metadata</h2>
              <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
                DPAL stores supporting MRV/evidence documentation. Registry-level data may be mapped to CAD Trust-compatible metadata where applicable.
              </p>
              <div className="mt-3 space-y-2">
                {Object.keys(DEFAULT_CAD).map((key) => (
                  <label key={key} className="block text-[9px] uppercase tracking-wider text-zinc-500">
                    {key}
                    <input
                      disabled={readOnly}
                      value={cad[key] ?? ''}
                      onChange={(e) => void saveCad({ [key]: e.target.value })}
                      className="mt-0.5 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs disabled:opacity-50"
                    />
                  </label>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 font-mono text-[10px]">
            <h2 className="font-sans text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Integrity</h2>
            <p className="mt-2 break-all text-zinc-400">{room.integrityHash ?? '— pending seal —'}</p>
            <h2 className="mt-4 font-sans text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Blockchain anchor</h2>
            <p className="mt-2 break-all text-zinc-400">{room.blockchainAnchorId ?? 'Not anchored'}</p>
          </section>
        </aside>
      </main>

      <footer className="border-t border-zinc-800 px-4 py-6 text-center text-[10px] text-zinc-600">
        Reports & exports · Evidence packet JSON via Generate Evidence Packet · Room URL {buildSituationRoomUrl({ roomId })}
      </footer>
    </div>
  );
}
