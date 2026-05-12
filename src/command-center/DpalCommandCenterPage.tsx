import React from 'react';
import type { View } from '../../App';
import {
  FIELD_OS_SCROLL_SUPER_AGENT_SESSION_KEY,
  FIELD_OS_SUPER_AGENT_HASH,
  WATCH_DEEP_LINK_HASH,
} from '../../utils/appRoutes';
import { COMMAND_CENTER_INVESTOR_PRESETS } from './data/commandCenterInvestorPresets';
import { COMMAND_CENTER_MODULE_REGISTRY, recommendModulesForInvestigation } from './registry/commandCenterModuleRegistry';
import { buildEvidencePacketPreview, evidenceDraftToPreviewText } from './services/commandCenterEvidenceBuilder';
import { runCommandCenterOrchestration } from './services/commandCenterOrchestrator';
import { CommandCenterMapPanel } from './map/CommandCenterMapPanel';
import type {
  CommandCenterModuleKey,
  CommandCenterOrchestrationResult,
  CommandCenterRunContext,
  CommandCenterWorkflowMode,
  EvidencePacketDraftSectionId,
  GuidedInvestigationType,
  WatchWorkflowStepId,
} from './types';

const WATCH_STEPS: { id: WatchWorkflowStepId; label: string }[] = [
  { id: 'location', label: 'Reading location' },
  { id: 'water', label: 'Checking water intelligence' },
  { id: 'satellite', label: 'Checking satellite indicators' },
  { id: 'pollution', label: 'Checking pollution records' },
  { id: 'forest_plastic', label: 'Checking forest / plastic risk' },
  { id: 'evidence', label: 'Building evidence packet' },
];

const MODE_CARDS: {
  id: CommandCenterWorkflowMode;
  title: string;
  bestFor: string;
  description: string;
}[] = [
  {
    id: 'manual',
    title: 'Manual Scan',
    bestFor: 'Advanced users',
    description: 'You choose AquaScan, Earth Observation, Plastic Watch, Forest, pollution audit, carbon, and Situation Room.',
  },
  {
    id: 'guided',
    title: 'Guided Workflow',
    bestFor: 'Normal users',
    description: 'DPAL asks what you are investigating and recommends modules before you preview.',
  },
  {
    id: 'watch',
    title: 'Watch DPAL Work',
    bestFor: 'Demos / training',
    description: 'Visible step-by-step flow — nothing runs until you start the watch preview.',
  },
  {
    id: 'superAgent',
    title: 'Super Agent',
    bestFor: 'Complex investigations',
    description: 'Optional plan suggestions — Command Center still runs without it.',
  },
  {
    id: 'evidenceBuilder',
    title: 'Evidence Packet Builder',
    bestFor: 'Legal / government / reports',
    description: 'Assemble one preview packet from Command Center results with honest safety labels.',
  },
  {
    id: 'investorDemo',
    title: 'Investor Demo',
    bestFor: 'Presentations',
    description: 'Safe presets and demo framing — avoids surprise live API failures.',
  },
];

function defaultDates(): { baseline: string; current: string } {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 30);
  return { baseline: start.toISOString().slice(0, 10), current: end.toISOString().slice(0, 10) };
}

function defaultContext(): CommandCenterRunContext {
  const { baseline, current } = defaultDates();
  return {
    goal: '',
    locationDescription: 'Gerlach, NV, USA',
    latitude: 40.65,
    longitude: -119.35,
    radiusKm: 25,
    baselineDateIso: baseline,
    currentDateIso: current,
    investorDemoFraming: false,
  };
}

function suggestPlanFromGoal(goal: string): { lines: string[]; modules: CommandCenterModuleKey[] } {
  const g = goal.toLowerCase();
  const modules = new Set<CommandCenterModuleKey>(['situationRoom']);
  if (/water|flood|aqua|river|wetland/i.test(g)) modules.add('water');
  if (/pollution|carb|epa|emission|facility|ghg/i.test(g)) modules.add('pollutionAudit');
  if (/forest|deforest|fire|gfw|afolu/i.test(g)) modules.add('forestIntegrity');
  if (/plastic|pace|emit|hyperspectral|coastal/i.test(g)) modules.add('plasticWatch');
  if (/carbon|mrv|viu|offset|ndvi/i.test(g)) modules.add('carbonViu');
  if (/satellite|landsat|earth|leo|imagery|ndvi|nbr/i.test(g)) modules.add('earthObservation');
  if (modules.size <= 1) {
    ['water', 'pollutionAudit', 'earthObservation', 'forestIntegrity', 'plasticWatch', 'carbonViu'].forEach((k) =>
      modules.add(k as CommandCenterModuleKey),
    );
  }
  const order: CommandCenterModuleKey[] = [
    'water',
    'pollutionAudit',
    'earthObservation',
    'forestIntegrity',
    'plasticWatch',
    'carbonViu',
    'situationRoom',
  ];
  const picked = order.filter((m) => modules.has(m));
  const lines = picked.map((m, i) => `${i + 1}. Open ${COMMAND_CENTER_MODULE_REGISTRY.find((r) => r.key === m)?.label ?? m}`);
  lines.push(`${picked.length + 1}. Build evidence packet preview in Command Center`);
  lines.push(`${picked.length + 2}. Request human review before any external claim`);
  return { lines, modules: picked };
}

type Props = {
  onReturn: () => void;
  onNavigate: (view: View) => void;
};

const ALL_MODULE_KEYS = COMMAND_CENTER_MODULE_REGISTRY.map((r) => r.key);

const EVIDENCE_SECTION_DEFAULTS: EvidencePacketDraftSectionId[] = [
  'location',
  'moduleResults',
  'evidenceRefs',
  'limitations',
  'claimSafety',
  'humanReview',
  'blockchain',
];

const DpalCommandCenterPage: React.FC<Props> = ({ onReturn, onNavigate }) => {
  const [workflowMode, setWorkflowMode] = React.useState<CommandCenterWorkflowMode>('manual');
  const [ctx, setCtx] = React.useState<CommandCenterRunContext>(() => defaultContext());
  const [manualModules, setManualModules] = React.useState<Record<CommandCenterModuleKey, boolean>>(() => {
    const o = {} as Record<CommandCenterModuleKey, boolean>;
    ALL_MODULE_KEYS.forEach((k) => {
      o[k] = true;
    });
    return o;
  });
  const [guidedType, setGuidedType] = React.useState<GuidedInvestigationType>('full_environmental');
  const [guidedConfirmed, setGuidedConfirmed] = React.useState<CommandCenterModuleKey[]>(() =>
    recommendModulesForInvestigation('full_environmental'),
  );
  const [runMode, setRunMode] = React.useState<'dry_run' | 'live'>('dry_run');
  const [busy, setBusy] = React.useState(false);
  const [orchestration, setOrchestration] = React.useState<CommandCenterOrchestrationResult | null>(null);
  const [watchActive, setWatchActive] = React.useState(false);
  const [watchPaused, setWatchPaused] = React.useState(false);
  const watchPausedRef = React.useRef(false);
  const [watchStepIdx, setWatchStepIdx] = React.useState(0);
  const [watchDoneSteps, setWatchDoneSteps] = React.useState<WatchWorkflowStepId[]>([]);
  const watchTimer = React.useRef<number | null>(null);
  const [superGoal, setSuperGoal] = React.useState('');
  const [superPlan, setSuperPlan] = React.useState<{ lines: string[]; modules: CommandCenterModuleKey[] } | null>(null);
  const [evidenceSections, setEvidenceSections] = React.useState<Record<EvidencePacketDraftSectionId, boolean>>(() => {
    const o = {} as Record<EvidencePacketDraftSectionId, boolean>;
    EVIDENCE_SECTION_DEFAULTS.forEach((id) => {
      o[id] = true;
    });
    (['waterEvidence', 'satelliteEvidence', 'pollutionEvidence', 'dronePhoto'] as EvidencePacketDraftSectionId[]).forEach(
      (id) => {
        o[id] = false;
      },
    );
    return o;
  });
  const [evidencePreviewText, setEvidencePreviewText] = React.useState('');

  React.useEffect(() => {
    setGuidedConfirmed(recommendModulesForInvestigation(guidedType));
  }, [guidedType]);

  React.useEffect(() => {
    watchPausedRef.current = watchPaused;
  }, [watchPaused]);

  React.useEffect(() => {
    return () => {
      if (watchTimer.current) window.clearInterval(watchTimer.current);
    };
  }, []);

  const selectedManualList = React.useMemo(
    () => ALL_MODULE_KEYS.filter((k) => manualModules[k]),
    [manualModules],
  );

  const commandCenterMapCenter = React.useMemo(() => {
    if (!Number.isFinite(ctx.latitude) || !Number.isFinite(ctx.longitude)) return undefined;
    if (Math.abs(ctx.latitude) > 90 || Math.abs(ctx.longitude) > 180) return undefined;
    return { lat: ctx.latitude, lng: ctx.longitude };
  }, [ctx.latitude, ctx.longitude]);

  const commandCenterEvidenceMarkers = React.useMemo(() => {
    if (!orchestration?.results?.length || !commandCenterMapCenter) return [];
    const { lat, lng } = commandCenterMapCenter;
    const n = orchestration.results.length;
    return orchestration.results.map((r, i) => {
      const step = 0.0014;
      const ang = (i * 2 * Math.PI) / Math.max(1, n);
      return {
        id: `${r.moduleKey}-${i}`,
        label: r.headline,
        lat: lat + step * Math.cos(ang),
        lng: lng + step * Math.sin(ang),
        type: r.moduleKey,
      };
    });
  }, [orchestration, commandCenterMapCenter]);

  const runPreview = React.useCallback(
    async (modules: CommandCenterModuleKey[]) => {
      setBusy(true);
      try {
        const res = await runCommandCenterOrchestration({
          modules,
          context: { ...ctx, investorDemoFraming: workflowMode === 'investorDemo' },
          runMode,
        });
        setOrchestration(res);
      } finally {
        setBusy(false);
      }
    },
    [ctx, runMode, workflowMode],
  );

  const stopWatchTimer = React.useCallback(() => {
    if (watchTimer.current) {
      window.clearInterval(watchTimer.current);
      watchTimer.current = null;
    }
  }, []);

  const startWatchPreview = React.useCallback(() => {
    setOrchestration(null);
    setWatchStepIdx(0);
    setWatchDoneSteps([]);
    setWatchPaused(false);
    watchPausedRef.current = false;
    setWatchActive(true);
    stopWatchTimer();
    const modules = selectedManualList.length ? selectedManualList : ALL_MODULE_KEYS;
    watchTimer.current = window.setInterval(() => {
      if (watchPausedRef.current) return;
      setWatchStepIdx((idx) => {
        const step = WATCH_STEPS[idx];
        if (step) {
          setWatchDoneSteps((prev) => (prev.includes(step.id) ? prev : [...prev, step.id]));
        }
        if (idx >= WATCH_STEPS.length - 1) {
          stopWatchTimer();
          void runPreview(modules);
          setWatchActive(false);
          return idx;
        }
        return idx + 1;
      });
    }, 900);
  }, [runPreview, selectedManualList, stopWatchTimer]);

  const pauseWatch = React.useCallback(() => {
    watchPausedRef.current = true;
    setWatchPaused(true);
  }, []);
  const continueWatch = React.useCallback(() => {
    watchPausedRef.current = false;
    setWatchPaused(false);
  }, []);

  const applyInvestorPreset = React.useCallback((presetId: (typeof COMMAND_CENTER_INVESTOR_PRESETS)[number]['id']) => {
    const p = COMMAND_CENTER_INVESTOR_PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    setCtx((c) => ({
      ...c,
      locationDescription: p.locationLabel,
      latitude: p.latitude,
      longitude: p.longitude,
      radiusKm: p.radiusKm,
      investorDemoFraming: true,
      goal: p.title,
    }));
    const o = {} as Record<CommandCenterModuleKey, boolean>;
    ALL_MODULE_KEYS.forEach((k) => {
      o[k] = p.defaultModules.includes(k);
    });
    setManualModules(o);
  }, []);

  const openFieldOsSuperAgent = React.useCallback(() => {
    try {
      sessionStorage.setItem(FIELD_OS_SCROLL_SUPER_AGENT_SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
    onNavigate('fieldOS');
    try {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${FIELD_OS_SUPER_AGENT_HASH}`);
    } catch {
      /* ignore */
    }
  }, [onNavigate]);

  const openModuleWithWatch = React.useCallback(
    (view: View) => {
      try {
        if (typeof window !== 'undefined' && window.location.hash !== WATCH_DEEP_LINK_HASH) {
          window.history.replaceState(
            window.history.state,
            '',
            `${window.location.pathname}${window.location.search}${WATCH_DEEP_LINK_HASH}`,
          );
        }
      } catch {
        /* ignore */
      }
      onNavigate(view);
    },
    [onNavigate],
  );

  const toggleEvidenceSection = (id: EvidencePacketDraftSectionId) => {
    setEvidenceSections((s) => ({ ...s, [id]: !s[id] }));
  };

  const buildEvidence = () => {
    const ids = (Object.keys(evidenceSections) as EvidencePacketDraftSectionId[]).filter((k) => evidenceSections[k]);
    const draft = buildEvidencePacketPreview({
      title: 'DPAL Command Center — evidence packet preview',
      includedSectionIds: ids,
      orchestration: orchestration ?? undefined,
    });
    setEvidencePreviewText(evidenceDraftToPreviewText(draft));
  };

  const claimPanel = (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-800">
      <h3 className="text-sm font-bold text-slate-900">Claim safety labels</h3>
      <ul className="mt-2 list-disc pl-4 space-y-1">
        <li>pending_verification: true</li>
        <li>human_verified: false (unless reviewer data confirms)</li>
        <li>blockchain_anchored: false (unless a chain record exists)</li>
      </ul>
      <p className="mt-2 text-[11px] text-slate-600">
        Command Center does not issue VIUs, carbon credits, or public reports. No automatic human verification or anchoring.
      </p>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 text-slate-900">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onReturn}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Back
        </button>
      </div>

      <header className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800">DPAL Command Center</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">One screen. Multiple ways to run DPAL.</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Choose how you want to work today. All modes share the same module registry, orchestration, evidence preview shape,
          and safety labels — without replacing existing module workspaces.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-slate-900">Choose Your DPAL Workflow</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {MODE_CARDS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setWorkflowMode(m.id)}
              className={`rounded-2xl border p-5 text-left shadow-sm transition ${
                workflowMode === m.id
                  ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-200'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Mode</p>
              <h3 className="mt-1 text-base font-bold text-slate-900">{m.title}</h3>
              <p className="mt-1 text-[11px] font-semibold text-emerald-900">Best for: {m.bestFor}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">{m.description}</p>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Shared context</h2>
            <p className="mt-1 text-[11px] text-slate-600">Used by Manual, Guided, Watch, and Evidence builder. Investor Demo presets fill these fields.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="font-semibold text-slate-700">Goal</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  value={ctx.goal}
                  onChange={(e) => setCtx((c) => ({ ...c, goal: e.target.value }))}
                />
              </label>
              <label className="block text-xs sm:col-span-2">
                <span className="font-semibold text-slate-700">Location description</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  value={ctx.locationDescription}
                  onChange={(e) => setCtx((c) => ({ ...c, locationDescription: e.target.value }))}
                />
              </label>
              <label className="block text-xs">
                <span className="font-semibold text-slate-700">Latitude</span>
                <input
                  type="number"
                  step="any"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  value={ctx.latitude}
                  onChange={(e) => setCtx((c) => ({ ...c, latitude: Number(e.target.value) }))}
                />
              </label>
              <label className="block text-xs">
                <span className="font-semibold text-slate-700">Longitude</span>
                <input
                  type="number"
                  step="any"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  value={ctx.longitude}
                  onChange={(e) => setCtx((c) => ({ ...c, longitude: Number(e.target.value) }))}
                />
              </label>
              <label className="block text-xs">
                <span className="font-semibold text-slate-700">Radius (km)</span>
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  value={ctx.radiusKm}
                  onChange={(e) => setCtx((c) => ({ ...c, radiusKm: Number(e.target.value) || 1 }))}
                />
              </label>
              <label className="block text-xs">
                <span className="font-semibold text-slate-700">Run mode</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  value={runMode}
                  onChange={(e) => setRunMode(e.target.value as 'dry_run' | 'live')}
                >
                  <option value="dry_run">dry_run — preview frames only</option>
                  <option value="live">live — use module workspaces (batch not wired)</option>
                </select>
              </label>
              <label className="block text-xs">
                <span className="font-semibold text-slate-700">Baseline date</span>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  value={ctx.baselineDateIso}
                  onChange={(e) => setCtx((c) => ({ ...c, baselineDateIso: e.target.value }))}
                />
              </label>
              <label className="block text-xs">
                <span className="font-semibold text-slate-700">Current date</span>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  value={ctx.currentDateIso}
                  onChange={(e) => setCtx((c) => ({ ...c, currentDateIso: e.target.value }))}
                />
              </label>
            </div>
          </section>

          {workflowMode === 'manual' && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">Manual Scan</h2>
              <p className="mt-1 text-[11px] text-slate-600">Select modules, then run a unified preview. Default for advanced users.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {COMMAND_CENTER_MODULE_REGISTRY.map((row) => (
                  <label key={row.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={manualModules[row.key]}
                      onChange={() => setManualModules((m) => ({ ...m, [row.key]: !m[row.key] }))}
                    />
                    {row.shortLabel}
                  </label>
                ))}
              </div>
              <button
                type="button"
                disabled={busy || selectedManualList.length === 0}
                onClick={() => void runPreview(selectedManualList)}
                className="mt-4 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-900 disabled:opacity-50"
              >
                Run Unified Preview
              </button>
            </section>
          )}

          {workflowMode === 'guided' && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">Guided Workflow</h2>
              <p className="mt-1 text-[11px] text-slate-600">What are you investigating?</p>
              <div className="mt-3 flex flex-col gap-2">
                {(
                  [
                    ['water', 'Water issue'],
                    ['pollution', 'Pollution issue'],
                    ['forest', 'Forest loss'],
                    ['plastic', 'Plastic risk'],
                    ['carbon', 'Carbon / impact claim'],
                    ['full_environmental', 'Full environmental review'],
                  ] as const
                ).map(([id, label]) => (
                  <label key={id} className="flex items-center gap-2 text-sm">
                    <input type="radio" name="guided" checked={guidedType === id} onChange={() => setGuidedType(id)} />
                    {label}
                  </label>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                <p className="font-semibold text-slate-800">Recommended</p>
                <ul className="mt-2 list-disc pl-4">
                  {guidedConfirmed.map((k) => (
                    <li key={k}>{COMMAND_CENTER_MODULE_REGISTRY.find((r) => r.key === k)?.label ?? k}</li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                disabled={busy || guidedConfirmed.length === 0}
                onClick={() => void runPreview(guidedConfirmed)}
                className="mt-4 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-900 disabled:opacity-50"
              >
                Run Guided Preview
              </button>
            </section>
          )}

          {workflowMode === 'watch' && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">Watch DPAL Work</h2>
              <p className="mt-1 text-[11px] text-slate-600">
                Visible autopilot — uses Manual module selection for the final preview batch. Nothing runs on load.
              </p>
              <p className="mt-3 text-xs text-slate-700">
                Current step:{' '}
                <span className="font-semibold">
                  {watchActive ? WATCH_STEPS[watchStepIdx]?.label ?? 'Finishing…' : 'Idle — press Start'}
                </span>
                {watchPaused ? <span className="ml-2 text-amber-800">(paused)</span> : null}
              </p>
              <ol className="mt-3 list-decimal pl-4 text-xs text-slate-700 space-y-1">
                {WATCH_STEPS.map((s) => (
                  <li key={s.id} className={watchDoneSteps.includes(s.id) ? 'text-emerald-800 font-semibold' : ''}>
                    {s.label}
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={Boolean(watchTimer.current)}
                  onClick={startWatchPreview}
                  className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Start Watch Preview
                </button>
                <button type="button" onClick={pauseWatch} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs">
                  Pause
                </button>
                <button type="button" onClick={continueWatch} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs">
                  Continue
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopWatchTimer();
                    setWatchActive(false);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                >
                  Stop
                </button>
              </div>
              <p className="mt-3 text-[11px] text-slate-500">
                Modules used in the final preview match your Manual Scan checkboxes (see Manual mode to adjust).
              </p>
            </section>
          )}

          {workflowMode === 'superAgent' && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">Super Agent (optional)</h2>
              <p className="mt-2 text-xs text-slate-700">
                Super Agent can suggest an investigation plan, but Command Center can run manually without it. This mode does
                not move or duplicate Super Agent execution — it only proposes steps here.
              </p>
              <textarea
                className="mt-3 w-full rounded-lg border border-slate-300 p-2 text-sm"
                rows={3}
                placeholder="Example: Investigate whether this site has water pollution and carbon-risk issues."
                value={superGoal}
                onChange={(e) => setSuperGoal(e.target.value)}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSuperPlan(suggestPlanFromGoal(superGoal))}
                  className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold"
                >
                  Suggest plan
                </button>
                <button type="button" onClick={openFieldOsSuperAgent} className="rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white">
                  Open Field OS Super Agent
                </button>
              </div>
              {superPlan ? (
                <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                  <p className="font-semibold text-slate-800">Suggested plan</p>
                  <ol className="mt-2 list-decimal pl-4 space-y-1">
                    {superPlan.lines.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ol>
                  <button
                    type="button"
                    className="mt-3 rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white"
                    onClick={() => {
                      const o = {} as Record<CommandCenterModuleKey, boolean>;
                      ALL_MODULE_KEYS.forEach((k) => {
                        o[k] = superPlan.modules.includes(k);
                      });
                      setManualModules(o);
                      void runPreview(superPlan.modules);
                    }}
                  >
                    Use This Plan (loads module checkboxes + preview)
                  </button>
                </div>
              ) : null}
            </section>
          )}

          {workflowMode === 'evidenceBuilder' && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">Evidence Packet Builder</h2>
              <p className="mt-1 text-[11px] text-slate-600">Assemble preview sections from the latest Command Center run.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(evidenceSections) as EvidencePacketDraftSectionId[]).map((id) => (
                  <label key={id} className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[11px]">
                    <input type="checkbox" checked={evidenceSections[id]} onChange={() => toggleEvidenceSection(id)} />
                    {id}
                  </label>
                ))}
              </div>
              <button type="button" onClick={buildEvidence} className="mt-4 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
                Build evidence preview
              </button>
                <button
                  type="button"
                  className="mt-4 ml-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                  onClick={() => {
                    const ids = (Object.keys(evidenceSections) as EvidencePacketDraftSectionId[]).filter(
                      (k) => evidenceSections[k],
                    );
                    const draft = buildEvidencePacketPreview({
                      title: 'DPAL Command Center — evidence packet preview',
                      includedSectionIds: ids,
                      orchestration: orchestration ?? undefined,
                    });
                    const text = evidenceDraftToPreviewText(draft);
                    setEvidencePreviewText(text);
                    void navigator.clipboard.writeText(text).catch(() => {});
                  }}
                >
                  Copy preview text
                </button>
              <p className="mt-2 text-[10px] text-amber-800">Export is preview-only unless a dedicated export service is connected later.</p>
            </section>
          )}

          {workflowMode === 'investorDemo' && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">Investor Demo Mode</h2>
              <p className="mt-1 text-xs text-amber-900">
                Demo / preview framing — presets load coordinates and module checkboxes only. No live provider batch runs from
                this screen.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {COMMAND_CENTER_INVESTOR_PRESETS.map((p) => (
                  <article key={p.id} className="rounded-xl border border-amber-100 bg-white p-4 text-xs shadow-sm">
                    <p className="text-[10px] font-bold uppercase text-amber-800">Demo preset</p>
                    <h3 className="mt-1 text-sm font-bold text-slate-900">{p.title}</h3>
                    <p className="mt-1 text-slate-600">{p.subtitle}</p>
                    <p className="mt-2 text-[11px] text-slate-700">{p.limitationNote}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-emerald-800 px-2 py-1 text-[11px] font-semibold text-white"
                        onClick={() => {
                          applyInvestorPreset(p.id);
                          void runPreview(p.defaultModules);
                        }}
                      >
                        Load preset + preview
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-300 px-2 py-1 text-[11px]"
                        onClick={() => onNavigate(p.primaryWorkspace as View)}
                      >
                        Open module
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          {claimPanel}
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Evidence packet preview</h3>
            <textarea
              className="mt-2 h-48 w-full rounded-lg border border-slate-200 p-2 font-mono text-[11px]"
              readOnly
              placeholder="Build evidence preview from Evidence Packet Builder…"
              value={evidencePreviewText}
            />
          </div>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Command Center Map</h2>
        <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-slate-600">
          Leaflet + OpenStreetMap for this control panel. Google Maps remains the engine for Locator / Lost &amp; Found; Good
          Wheels keeps its own React-Leaflet maps. WRI MapBuilder is scoped as a future Environmental Atlas layer — not the
          core map here.
        </p>
        <div className="mt-4">
          <CommandCenterMapPanel
            center={commandCenterMapCenter}
            radiusKm={ctx.radiusKm}
            evidenceMarkers={commandCenterEvidenceMarkers}
          />
        </div>
      </section>

      {orchestration ? (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900">Shared result grid</h2>
            <span className="text-[11px] text-slate-500">
              Settled at {orchestration.settledAtIso} · mode {orchestration.runMode}
            </span>
          </div>
          {orchestration.orchestrationWarnings.length ? (
            <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
              {orchestration.orchestrationWarnings.join(' · ')}
            </p>
          ) : null}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {orchestration.results.map((r) => (
              <article key={r.moduleKey} className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-slate-900">{r.moduleKey}</h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700">{r.status}</span>
                </div>
                <p className="mt-2 text-slate-800">{r.headline}</p>
                <div className="mt-2">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">Limitations</p>
                  <ul className="mt-1 list-disc pl-4 text-[11px] text-slate-600">
                    {r.limitations.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-2">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">Provider status</p>
                  <ul className="mt-1 space-y-1 text-[11px]">
                    {r.providerLanes.map((p) => (
                      <li key={p.id}>
                        {p.label}: <span className="font-semibold">{p.state}</span>
                        {p.detail ? <span className="text-slate-500"> — {p.detail}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
                {r.openWorkspaceView ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 px-2 py-1 text-[11px]"
                      onClick={() => onNavigate(r.openWorkspaceView as View)}
                    >
                      Open module
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-emerald-300 px-2 py-1 text-[11px] text-emerald-900"
                      onClick={() => openModuleWithWatch(r.openWorkspaceView as View)}
                    >
                      Open with Watch hash
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default DpalCommandCenterPage;
