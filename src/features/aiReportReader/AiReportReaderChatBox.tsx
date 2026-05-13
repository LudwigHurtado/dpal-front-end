import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildAiReportReaderSnapshot } from './buildAiReportReaderSnapshot';
import {
  postReportReaderChat,
  type ReportReaderChatMessage,
  type ReportReaderChatMode,
  type ReportReaderChatResponse,
} from './reportReaderChatApi';

export type AiReportReaderChatBoxProps = {
  title?: string;
  reportId?: string;
  roomId?: string;
  runId?: string;
  reportSnapshot?: unknown;
  evidencePacket?: unknown;
  commandCenterRun?: unknown;
  defaultOpen?: boolean;
  /** When false, the card is omitted (e.g. list views with many rows). */
  enabled?: boolean;
  pageType?: import('./buildAiReportReaderSnapshot').AiReportReaderPageType;
  /** `paper` for light shells (Command Center); default `ink` for dark report surfaces. */
  tone?: 'ink' | 'paper';
};

function mergeContext(props: AiReportReaderChatBoxProps): Record<string, unknown> {
  const base =
    props.reportSnapshot && typeof props.reportSnapshot === 'object' && !Array.isArray(props.reportSnapshot)
      ? { ...(props.reportSnapshot as Record<string, unknown>) }
      : buildAiReportReaderSnapshot({
          pageType: props.pageType ?? 'generic',
          reportId: props.reportId,
          roomId: props.roomId,
          runId: props.runId,
          title: props.title,
        });
  if (props.reportId) base.reportId = props.reportId;
  if (props.roomId) base.roomId = props.roomId;
  if (props.runId) base.runId = props.runId;
  if (props.title) base.title = props.title;
  if (props.evidencePacket != null) base.evidencePacket = props.evidencePacket;
  return base;
}

const AiReportReaderChatBox: React.FC<AiReportReaderChatBoxProps> = (props) => {
  const { enabled = true, defaultOpen = true, title, tone = 'ink' } = props;
  const [open, setOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<ReportReaderChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMeta, setLastMeta] = useState<Pick<ReportReaderChatResponse, 'fallbackUsed' | 'safetyWarnings'> | null>(null);
  const messagesRef = useRef<ReportReaderChatMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const mergedSnapshot = useMemo(
    () => mergeContext(props),
    [props.reportSnapshot, props.evidencePacket, props.reportId, props.roomId, props.runId, props.title, props.pageType],
  );

  const send = useCallback(
    async (question: string, mode: ReportReaderChatMode = 'report_reader') => {
      const q = question.trim();
      if (!q || busy) return;
      setBusy(true);
      setError(null);
      const nextMessages: ReportReaderChatMessage[] = [...messagesRef.current, { role: 'user', content: q }];
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      setInput('');
      try {
        const res = await postReportReaderChat({
          reportId: props.reportId,
          roomId: props.roomId,
          runId: props.runId,
          reportSnapshot: mergedSnapshot,
          evidencePacket: props.evidencePacket ?? mergedSnapshot.evidencePacket,
          commandCenterRun: props.commandCenterRun,
          messages: nextMessages,
          question: q,
          mode,
        });
        setLastMeta({ fallbackUsed: res.fallbackUsed, safetyWarnings: res.safetyWarnings });
        const withAssistant = [...nextMessages, { role: 'assistant' as const, content: res.answer }];
        messagesRef.current = withAssistant;
        setMessages(withAssistant);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        const fail = [
          ...nextMessages,
          {
            role: 'assistant' as const,
            content:
              'The AI Report Reader could not reach the DPAL assistant endpoint. Check that your API host implements POST /api/dpal-assistant/report-reader/chat and that the app is pointed at the correct backend.',
          },
        ];
        messagesRef.current = fail;
        setMessages(fail);
      } finally {
        setBusy(false);
      }
    },
    [busy, mergedSnapshot, props.commandCenterRun, props.evidencePacket, props.reportId, props.roomId, props.runId],
  );

  if (!enabled) return null;

  const shell =
    tone === 'paper'
      ? 'border-slate-200 bg-white text-slate-900 shadow-sm'
      : 'border-slate-700/80 bg-slate-950/80 text-slate-100 shadow-sm';
  const sub = tone === 'paper' ? 'text-slate-600' : 'text-slate-400';
  const heading = tone === 'paper' ? 'text-slate-900' : 'text-white';
  const panel = tone === 'paper' ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-900/60';
  const userBubble = tone === 'paper' ? 'ml-4 bg-sky-100 text-slate-900' : 'ml-4 bg-cyan-950/50 text-cyan-50';
  const botBubble = tone === 'paper' ? 'mr-4 bg-slate-100 text-slate-900' : 'mr-4 bg-slate-800/80 text-slate-100';
  const btn = tone === 'paper' ? 'border-slate-300 bg-white text-slate-800' : 'border-slate-600 bg-slate-900 text-slate-100';

  return (
    <section className={`mt-4 rounded-2xl border p-4 ${shell}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${tone === 'paper' ? 'text-teal-800' : 'text-teal-300'}`}>AI Report Reader</p>
          <h3 className={`mt-0.5 text-sm font-bold ${heading}`}>{title ?? 'Ask about this record'}</h3>
          <p className={`mt-1 text-[11px] leading-snug ${sub}`}>
            Ask questions about the report, evidence, provider lanes, and missing verification.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`rounded-lg border px-2 py-1 text-[10px] font-semibold hover:opacity-90 ${tone === 'paper' ? 'border-slate-300 text-slate-700' : 'border-slate-600 text-slate-200 hover:bg-slate-900'}`}
        >
          {open ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {open ? (
        <>
          <p
            className={`mt-2 rounded-lg border px-2 py-1.5 text-[10px] leading-relaxed ${
              tone === 'paper' ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-amber-500/30 bg-amber-950/30 text-amber-100'
            }`}
          >
            AI analysis is assistance only. It does not verify, publish, certify, or create legal conclusions.
          </p>

          {lastMeta?.fallbackUsed ? (
            <p className="mt-2 inline-flex rounded-full border border-amber-400/50 bg-amber-900/40 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
              Deterministic fallback (no AI provider output)
            </p>
          ) : lastMeta && lastMeta.fallbackUsed === false ? (
            <p className="mt-2 inline-flex rounded-full border border-emerald-500/40 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
              AI provider response
            </p>
          ) : null}

          <div className={`mt-3 max-h-52 space-y-2 overflow-y-auto rounded-xl border p-2 ${panel}`}>
            {messages.length === 0 ? (
              <p className={`text-[11px] ${tone === 'paper' ? 'text-slate-500' : 'text-slate-500'}`}>No messages yet — use the shortcuts or type a question.</p>
            ) : (
              messages.map((m, i) => (
                <div
                  key={`${m.role}-${i}`}
                  className={`rounded-lg px-2 py-1.5 text-[11px] leading-relaxed ${
                    m.role === 'user' ? userBubble : botBubble
                  }`}
                >
                  <span className={`text-[9px] font-bold uppercase ${tone === 'paper' ? 'text-slate-500' : 'text-slate-500'}`}>{m.role}</span>
                  <p className="mt-0.5 whitespace-pre-wrap">{m.content}</p>
                </div>
              ))
            )}
          </div>

          {error ? <p className={`mt-2 text-[11px] ${tone === 'paper' ? 'text-red-700' : 'text-red-300'}`}>{error}</p> : null}

          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => void send('Summarize this record for an operative.', 'report_reader')}
              className={`rounded-lg border px-2 py-1 text-[10px] font-semibold disabled:opacity-50 ${btn}`}
            >
              Summarize
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void send('What evidence is missing or not established?', 'evidence_audit')}
              className={`rounded-lg border px-2 py-1 text-[10px] font-semibold disabled:opacity-50 ${btn}`}
            >
              Missing Evidence
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void send('What should be done next?', 'next_steps')}
              className={`rounded-lg border px-2 py-1 text-[10px] font-semibold disabled:opacity-50 ${btn}`}
            >
              Next Steps
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void send('What can DPAL not conclude from this context?', 'report_reader')}
              className={`rounded-lg border px-2 py-1 text-[10px] font-semibold disabled:opacity-50 ${btn}`}
            >
              What can DPAL not conclude?
            </button>
          </div>

          <label className={`mt-3 block text-[10px] font-semibold ${tone === 'paper' ? 'text-slate-600' : 'text-slate-400'}`}>
            Ask about this report…
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={2}
              disabled={busy}
              className={`mt-1 w-full rounded-xl border px-3 py-2 text-[12px] ${
                tone === 'paper'
                  ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400'
                  : 'border-slate-700 bg-slate-900 text-white placeholder:text-slate-600'
              }`}
              placeholder="e.g. Which providers were used?"
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !input.trim()}
              onClick={() => void send(input, 'report_reader')}
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-teal-500 disabled:opacity-50"
            >
              {busy ? 'Thinking…' : 'Send'}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
};

export default AiReportReaderChatBox;
