import React, { useMemo, useState } from 'react';
import type { DmrvType } from '../dmrvRegistry';

export type MrvAiProviderId = 'gemini' | 'openai' | 'anthropic';

type MrvAiProviderOption = {
  id: MrvAiProviderId;
  label: string;
  shortLabel: string;
  description: string;
};

type MrvAiProviderResult = {
  provider: MrvAiProviderId;
  label: string;
  model: string;
  status: 'ok' | 'error';
  summary: string;
  validatorReasoningSummary: string;
  evidenceReadiness: string;
  missingEvidence: string[];
  riskFlags: string[];
  recommendedNextSteps: string[];
  validatorQuestions: string[];
  confidence: number | null;
  error?: string;
};

type MrvAiAuditRecord = {
  requestId: string;
  createdAt: string;
  inputHash: string;
  requestedProviders: MrvAiProviderId[];
  results: MrvAiProviderResult[];
  validatorDigest?: {
    providerCount: number;
    successfulProviders: MrvAiProviderId[];
    failedProviders: Array<{ provider: MrvAiProviderId; error: string }>;
    consensusReadiness: string[];
    combinedMissingEvidence: string[];
    combinedRiskFlags: string[];
    combinedNextSteps: string[];
    validatorReasoningSummaries: Array<{ provider: MrvAiProviderId; model: string; summary: string }>;
  };
  disclosure?: string;
};

type MrvMultiAiValidatorPanelProps = {
  selectedType: DmrvType;
  projectId?: string | null;
};

const PROVIDERS: MrvAiProviderOption[] = [
  {
    id: 'gemini',
    label: 'Gemini',
    shortLabel: 'Gemini',
    description: 'Primary DPAL assistant when Google AI is configured.',
  },
  {
    id: 'openai',
    label: 'ChatGPT / OpenAI',
    shortLabel: 'ChatGPT',
    description: 'Backup reviewer for independent MRV comparison.',
  },
  {
    id: 'anthropic',
    label: 'Claude / Anthropic',
    shortLabel: 'Claude',
    description: 'Second backup reviewer for validator cross-checking.',
  },
];

const DEFAULT_PROMPT =
  'Review this MRV selection for validator readiness. Identify missing evidence, risk flags, and next steps before a validator relies on this packet.';

function apiBase(): string {
  const configured = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || '';
  return String(configured).replace(/\/$/, '');
}

function selectedModeLabel(selectedProviders: MrvAiProviderId[]): string {
  if (selectedProviders.length === 3) return 'All three AIs';
  const only = PROVIDERS.find((p) => p.id === selectedProviders[0]);
  return only?.label ?? 'Selected AI';
}

function downloadAuditRecord(record: MrvAiAuditRecord): void {
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${record.requestId || 'dpal-mrv-ai-audit'}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function saveAuditRecordLocally(record: MrvAiAuditRecord): void {
  try {
    const key = 'dpal:mrv-ai-audit-records';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const next = Array.isArray(existing) ? [record, ...existing].slice(0, 25) : [record];
    localStorage.setItem(key, JSON.stringify(next));
  } catch (error) {
    console.warn('Unable to store MRV AI audit record locally', error);
  }
}

export function MrvMultiAiValidatorPanel({
  selectedType,
  projectId,
}: MrvMultiAiValidatorPanelProps): React.ReactElement {
  const [selectedProviders, setSelectedProviders] = useState<MrvAiProviderId[]>(['gemini']);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [auditRecord, setAuditRecord] = useState<MrvAiAuditRecord | null>(null);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const endpoint = useMemo(() => `${apiBase()}/api/mrv-ai`, []);

  const toggleProvider = (provider: MrvAiProviderId) => {
    setSelectedProviders((current) => {
      if (current.includes(provider)) {
        const next = current.filter((p) => p !== provider);
        return next.length ? next : current;
      }
      return [...current, provider];
    });
  };

  const selectAll = () => setSelectedProviders(['gemini', 'openai', 'anthropic']);
  const selectOne = (provider: MrvAiProviderId) => setSelectedProviders([provider]);

  const runReview = async () => {
    setIsRunning(true);
    setError(null);
    setBackupStatus(null);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providers: selectedProviders,
          prompt,
          projectId: projectId || undefined,
          mrvTypeId: selectedType.id,
          mrvTypeTitle: selectedType.title,
          context: {
            description: selectedType.description,
            connectors: selectedType.connectors,
            inputs: selectedType.inputs,
            dataLayers: selectedType.dataLayers,
            riskFlags: selectedType.riskFlags,
            workflow: selectedType.workflow,
            evaluationMetrics: selectedType.evaluationMetrics,
          },
        }),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error || `MRV AI router failed with HTTP ${response.status}`);
      }

      setAuditRecord(body.auditRecord);
      saveAuditRecordLocally(body.auditRecord);
      setBackupStatus(body.backup?.message || 'Audit record prepared for validator backup.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unknown MRV AI error.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-white via-indigo-50/50 to-sky-50 p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700">
            MRV Multi-AI Validator Backup
          </p>
          <h3 className="mt-1 text-lg font-black text-[#1e3a5f]">
            Compare one AI or all three before validator review
          </h3>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
            Run Gemini, ChatGPT, and Claude separately or together. DPAL stores the model outputs,
            reviewable reasoning summaries, input hash, provider names, and timestamps for the evidence packet.
          </p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-900 shadow-sm">
          Mode: {selectedModeLabel(selectedProviders)}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {PROVIDERS.map((provider) => {
          const active = selectedProviders.includes(provider.id);
          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => toggleProvider(provider.id)}
              className={`rounded-2xl border p-3 text-left transition ${
                active
                  ? 'border-indigo-500 bg-white shadow-md ring-2 ring-indigo-100'
                  : 'border-slate-200 bg-white/70 hover:border-indigo-300 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-black text-slate-900">{provider.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                    active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {active ? 'On' : 'Off'}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{provider.description}</p>
              <div className="mt-3 flex gap-2">
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    selectOne(provider.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      selectOne(provider.id);
                    }
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
                >
                  Use only {provider.shortLabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={selectAll}
          className="rounded-xl border border-indigo-300 bg-white px-3 py-2 text-xs font-black text-indigo-800 hover:bg-indigo-50"
        >
          Select all three AIs
        </button>
        <button
          type="button"
          onClick={() => setPrompt(DEFAULT_PROMPT)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
        >
          Reset validator question
        </button>
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-black uppercase tracking-wide text-slate-700">Validator question</span>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-3 text-sm text-slate-800 shadow-inner outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={runReview}
          disabled={isRunning}
          className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRunning ? 'Running MRV AI review…' : 'Run selected AI review'}
        </button>
        {auditRecord ? (
          <button
            type="button"
            onClick={() => downloadAuditRecord(auditRecord)}
            className="rounded-xl border border-slate-400 bg-white px-4 py-2.5 text-sm font-black text-slate-900 hover:bg-slate-50"
          >
            Download validator audit JSON
          </button>
        ) : null}
        <span className="text-xs text-slate-500">
          Endpoint: <span className="font-mono">/api/mrv-ai</span>
        </span>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
          {error}
        </div>
      ) : null}

      {backupStatus ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          {backupStatus}
        </div>
      ) : null}

      {auditRecord ? <AuditRecordView record={auditRecord} /> : null}

      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
        Validator note: DPAL stores provider outputs and concise validator reasoning summaries. It does not expose
        private hidden chain-of-thought, and this review is not a certification, credit issuance, or regulatory approval.
      </p>
    </section>
  );
}

function AuditRecordView({ record }: { record: MrvAiAuditRecord }): React.ReactElement {
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="grid gap-2 text-xs md:grid-cols-3">
          <div>
            <p className="font-black uppercase text-slate-500">Audit ID</p>
            <p className="mt-1 break-all font-mono text-slate-800">{record.requestId}</p>
          </div>
          <div>
            <p className="font-black uppercase text-slate-500">Created</p>
            <p className="mt-1 text-slate-800">{new Date(record.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="font-black uppercase text-slate-500">Input hash</p>
            <p className="mt-1 break-all font-mono text-slate-800">{record.inputHash}</p>
          </div>
        </div>
      </div>

      {record.validatorDigest ? (
        <div className="rounded-xl border border-indigo-100 bg-white p-3">
          <h4 className="text-sm font-black text-[#1e3a5f]">Combined validator digest</h4>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <DigestList title="Missing evidence" items={record.validatorDigest.combinedMissingEvidence} />
            <DigestList title="Risk flags" items={record.validatorDigest.combinedRiskFlags} />
            <DigestList title="Next steps" items={record.validatorDigest.combinedNextSteps} />
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-3">
        {record.results.map((result) => (
          <ProviderResultCard key={result.provider} result={result} />
        ))}
      </div>
    </div>
  );
}

function DigestList({ title, items }: { title: string; items: string[] }): React.ReactElement {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
      {items.length ? (
        <ul className="mt-2 space-y-1 text-xs text-slate-700">
          {items.slice(0, 5).map((item) => (
            <li key={item} className="rounded-lg bg-slate-50 px-2 py-1">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-slate-500">No items returned.</p>
      )}
    </div>
  );
}

function ProviderResultCard({ result }: { result: MrvAiProviderResult }): React.ReactElement {
  const ok = result.status === 'ok';
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-black text-slate-900">{result.label}</h4>
          <p className="mt-0.5 text-[11px] font-mono text-slate-500">{result.model}</p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
            ok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {ok ? 'OK' : 'Error'}
        </span>
      </div>

      <p className="mt-3 rounded-xl bg-slate-50 p-2 text-xs font-bold text-slate-700">
        Readiness: {result.evidenceReadiness}
        {typeof result.confidence === 'number' ? ` · Confidence ${Math.round(result.confidence * 100)}%` : ''}
      </p>

      {result.error ? <p className="mt-3 text-xs font-semibold text-red-700">{result.error}</p> : null}

      <Section title="Answer" text={result.summary} />
      <Section title="Validator reasoning summary" text={result.validatorReasoningSummary} />

      <MiniList title="Missing evidence" items={result.missingEvidence} />
      <MiniList title="Risk flags" items={result.riskFlags} />
      <MiniList title="Recommended next steps" items={result.recommendedNextSteps} />
      <MiniList title="Validator questions" items={result.validatorQuestions} />
    </article>
  );
}

function Section({ title, text }: { title: string; text: string }): React.ReactElement {
  return (
    <div className="mt-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-700">{text || 'No text returned.'}</p>
    </div>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }): React.ReactElement {
  return (
    <div className="mt-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{title}</p>
      {items.length ? (
        <ul className="mt-1 space-y-1 text-xs text-slate-700">
          {items.slice(0, 4).map((item) => (
            <li key={item} className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-slate-500">None returned.</p>
      )}
    </div>
  );
}
