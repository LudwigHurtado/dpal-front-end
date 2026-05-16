import React, { useState } from 'react';
import { Check, ChevronRight, Package, Play } from '../../../../components/icons';
import {
  DMRV_WORKFLOW_STEPS,
  PROFILE_SECTION_KEYS,
  type DmrvFamilyDef,
  type DmrvTypeDef,
} from '../dmrvCatalog';

type Tab = 'profile' | 'workflow';

type Props = {
  family: DmrvFamilyDef;
  dmrvType: DmrvTypeDef;
  onNavigate?: (view: string) => void;
};

export function ProfileWorkflowView({ family, dmrvType, onNavigate }: Props): React.ReactElement {
  const [tab, setTab] = useState<Tab>('profile');
  const [workflowStep, setWorkflowStep] = useState(1);
  const [expandedSection, setExpandedSection] = useState<string>('purpose');

  const p = dmrvType.profile;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setTab('profile')}
          className={`rounded-xl px-4 py-2 text-sm font-bold uppercase tracking-wide ${
            tab === 'profile' ? 'bg-slate-950 text-white' : 'border border-slate-300 bg-white text-slate-800'
          }`}
        >
          DMRV Profile
        </button>
        <button
          type="button"
          onClick={() => setTab('workflow')}
          className={`rounded-xl px-4 py-2 text-sm font-bold uppercase tracking-wide ${
            tab === 'workflow' ? 'bg-slate-950 text-white' : 'border border-slate-300 bg-white text-slate-800'
          }`}
        >
          DMRV Workflow
        </button>
      </div>

      {tab === 'profile' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
          <nav className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm">
            <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              Profile sections
            </p>
            <ul className="space-y-0.5 font-mono text-[11px]">
              <li className="px-2 text-slate-500">DMRV Profile</li>
              <li className="px-2 text-slate-500">│</li>
              {PROFILE_SECTION_KEYS.map((s, i) => (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => setExpandedSection(s.key)}
                    className={`w-full rounded-lg px-2 py-1 text-left ${
                      expandedSection === s.key ? 'bg-slate-100 font-bold text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-slate-400">
                      {i === PROFILE_SECTION_KEYS.length - 1 ? '└── ' : '├── '}
                    </span>
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-md">
            {PROFILE_SECTION_KEYS.map((s) => {
              if (expandedSection !== s.key && expandedSection !== 'all') return null;
              const value = s.key === 'purpose' ? p.purpose : p[s.key];
              return (
                <section key={s.key} className="mb-6 last:mb-0">
                  <h3
                    className="text-sm font-black uppercase tracking-wide"
                    style={{ color: family.hex }}
                  >
                    {s.label}
                  </h3>
                  {s.key === 'purpose' ? (
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{value as string}</p>
                  ) : (
                    <ul className="mt-2 space-y-1 pl-4 text-sm text-slate-700">
                      {(value as string[]).map((item) => (
                        <li key={item} className="list-disc marker:text-slate-400">
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
            <button
              type="button"
              onClick={() => setExpandedSection('all')}
              className="mt-2 text-xs font-bold text-slate-600 underline hover:text-slate-900"
            >
              Show all sections
            </button>
          </div>
        </div>
      )}

      {tab === 'workflow' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(280px,340px)_1fr]">
          <ol className="space-y-2 rounded-2xl border border-slate-300 bg-white p-4 shadow-md">
            {DMRV_WORKFLOW_STEPS.map((step) => {
              const done = step.id < workflowStep;
              const current = step.id === workflowStep;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => setWorkflowStep(step.id)}
                    className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                      current
                        ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/20'
                        : done
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                        done ? 'bg-emerald-600 text-white' : current ? 'bg-slate-950 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" /> : step.id}
                    </span>
                    <span>
                      <span className="block text-xs font-black uppercase tracking-wide text-slate-900">
                        {step.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-slate-600">{step.detail}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-md">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Current step</p>
            <h3 className="mt-1 text-lg font-black text-slate-900">
              {DMRV_WORKFLOW_STEPS.find((s) => s.id === workflowStep)?.label}
            </h3>
            <p className="mt-2 text-sm text-slate-700">
              {DMRV_WORKFLOW_STEPS.find((s) => s.id === workflowStep)?.detail}
            </p>
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Workflow steps configure scope only. DPAL does not auto-verify, auto-publish, or issue credits without
              human validator approval and configured backends.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {workflowStep > 1 && (
                <button
                  type="button"
                  onClick={() => setWorkflowStep((s) => Math.max(1, s - 1))}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800"
                >
                  Previous
                </button>
              )}
              {workflowStep < 9 && (
                <button
                  type="button"
                  onClick={() => setWorkflowStep((s) => Math.min(9, s + 1))}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
                >
                  Next step
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
              {workflowStep === 9 && (
                <>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('previewEvidencePacket')}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900"
                  >
                    <Package className="h-4 w-4" />
                    Evidence Packet
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('commandCenter')}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white"
                  >
                    <Play className="h-4 w-4" />
                    Command Center
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
