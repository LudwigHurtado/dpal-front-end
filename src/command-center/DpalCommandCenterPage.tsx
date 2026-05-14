import React from 'react';
import type { View } from '../../App';
import {
  FIELD_OS_SCROLL_SUPER_AGENT_SESSION_KEY,
  FIELD_OS_SUPER_AGENT_HASH,
  WATCH_DEEP_LINK_HASH,
} from '../../utils/appRoutes';
import { COMMAND_CENTER_SAVED_SCENARIO_PRESETS } from './data/commandCenterSavedScenariosPresets';
import { COMMAND_CENTER_MODULE_REGISTRY, recommendModulesForInvestigation } from './registry/commandCenterModuleRegistry';
import { buildEvidencePacketPreview, evidenceDraftToPreviewText } from './services/commandCenterEvidenceBuilder';
import {
  cancelCommandCenterRun,
  mapBackendRunToOrchestration,
  pollCommandCenterRunUntilTerminal,
  startCommandCenterRun,
} from './services/commandCenterBackendRunClient';
import {
  type AutopilotMachineState,
  type AutopilotStep,
  buildAutopilotSteps,
  mergeOrchestrationChunks,
} from './services/commandCenterAutopilotPlan';
import { runCommandCenterOrchestration } from './services/commandCenterOrchestrator';
import { CommandCenterMapPanel } from './map/CommandCenterMapPanel';
import { CommandCenterSourceRegistryStrip } from './components/CommandCenterSourceRegistryStrip';
import AiReportReaderChatBox from '../features/aiReportReader/AiReportReaderChatBox';
import { buildAiReportReaderSnapshot } from '../features/aiReportReader/buildAiReportReaderSnapshot';
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
  { id: 'evidence', label: 'Building evidence draft' },
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
    description: 'DPAL asks what you are investigating and recommends modules before you run scans.',
  },
  {
    id: 'watch',
    title: 'Live Run Monitor',
    bestFor: 'Training / walkthroughs',
    description: 'Visible step-by-step flow — nothing runs until you start the monitor sequence.',
  },
  {
    id: 'superAgent',
    title: 'Super Agent',
    bestFor: 'Complex investigations',
    description: 'Optional plan suggestions — Command Center still runs without it.',
  },
  {
    id: 'evidenceBuilder',
    title: 'Evidence Draft Builder',
    bestFor: 'Legal / government / reports',
    description: 'Assemble one evidence draft from Command Center results with honest safety labels.',
  },
  {
    id: 'savedScenarios',
    title: 'Saved Scenarios',
    bestFor: 'Repeat investigations',
    description: 'Named AOIs and module sets — load context then run live scans or dry_run from the mission bar.',
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
  lines.push(`${picked.length + 1}. Build evidence draft in Command Center`);
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

function workspaceViewForModule(key: CommandCenterModuleKey): View {
  return (COMMAND_CENTER_MODULE_REGISTRY.find((r) => r.key === key)?.workspaceView ?? 'mainMenu') as View;
}

function liveAutopilotModuleHint(module: CommandCenterModuleKey, runMode: 'dry_run' | 'live'): string | null {
  if (runMode !== 'live') return null;
  if (module === 'plasticWatch') return 'Live: Plastic Watch scan when API is reachable.';
  if (module === 'water' || module === 'forestIntegrity' || module === 'earthObservation') {
    return 'Live: Command Center backend adapter when API is reachable.';
  }
  return 'Pending live wiring — open full workspace.';
}

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
  const [mapLayoutNonce, setMapLayoutNonce] = React.useState(0);
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

  const [autopilotState, setAutopilotState] = React.useState<AutopilotMachineState>('idle');
  const [autopilotSteps, setAutopilotSteps] = React.useState<AutopilotStep[]>([]);
  const [autopilotStepIndex, setAutopilotStepIndex] = React.useState(0);
  const [runningModuleKey, setRunningModuleKey] = React.useState<CommandCenterModuleKey | null>(null);
  const [backendRunId, setBackendRunId] = React.useState<string | null>(null);
  /** Active backend run id for cancel while autopilot is in flight. */
  const backendRunActiveRef = React.useRef<string | null>(null);
  const autopilotPausedRef = React.useRef(false);
  const autopilotStopRef = React.useRef(false);
  const autopilotInFlightRef = React.useRef(false);

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

  const modulesForBatch = React.useCallback((): CommandCenterModuleKey[] => {
    if (workflowMode === 'guided' && guidedConfirmed.length) return guidedConfirmed;
    if (workflowMode === 'superAgent' && superPlan?.modules?.length) return superPlan.modules;
    if (selectedManualList.length) return selectedManualList;
    return ALL_MODULE_KEYS;
  }, [workflowMode, guidedConfirmed, superPlan, selectedManualList]);

  const commandCenterMapCenter = React.useMemo(() => {
    if (!Number.isFinite(ctx.latitude) || !Number.isFinite(ctx.longitude)) return undefined;
    if (Math.abs(ctx.latitude) > 90 || Math.abs(ctx.longitude) > 180) return undefined;
    return { lat: ctx.latitude, lng: ctx.longitude };
  }, [ctx.latitude, ctx.longitude]);

  const commandCenterEvidenceMarkers = React.useMemo(() => {
    if (!orchestration?.results?.length || !commandCenterMapCenter) return [];
    const markable = new Set(['success', 'partial', 'preview_ready']);
    const rows = orchestration.results.filter((r) => markable.has(r.status));
    if (!rows.length) return [];
    const { lat, lng } = commandCenterMapCenter;
    const n = rows.length;
    return rows.map((r, i) => {
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

  const runBatchLabel = runMode === 'live' ? 'Run Selected Scans' : 'Run Unified Preview';
  const guidedRunLabel = runBatchLabel;

  const runPreview = React.useCallback(
    async (modules: CommandCenterModuleKey[]) => {
      if (!modules.length) return;
      setBusy(true);
      try {
        const res = await runCommandCenterOrchestration({
          modules,
          context: { ...ctx, investorDemoFraming: workflowMode === 'savedScenarios' },
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

  const applySavedScenarioPreset = React.useCallback((presetId: (typeof COMMAND_CENTER_SAVED_SCENARIO_PRESETS)[number]['id']) => {
    const p = COMMAND_CENTER_SAVED_SCENARIO_PRESETS.find((x) => x.id === presetId);
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
      title: 'DPAL Command Center — evidence draft',
      includedSectionIds: ids,
      orchestration: orchestration ?? undefined,
    });
    setEvidencePreviewText(evidenceDraftToPreviewText(draft));
  };

  const waitUnpause = React.useCallback(async () => {
    while (autopilotPausedRef.current && !autopilotStopRef.current) {
      setAutopilotState('paused');
      await new Promise<void>((r) => {
        window.setTimeout(r, 220);
      });
    }
  }, []);

  const startLiveAutopilot = React.useCallback(async () => {
    if (autopilotInFlightRef.current || busy) return;
    const mods = modulesForBatch();
    if (!mods.length) return;
    autopilotInFlightRef.current = true;
    autopilotStopRef.current = false;
    autopilotPausedRef.current = false;
    try {
      setBusy(true);
      setAutopilotState('queued');
      setBackendRunId(null);
      backendRunActiveRef.current = null;
      setOrchestration(null);
      setEvidencePreviewText('');

      const steps = buildAutopilotSteps(mods);
      setAutopilotSteps(steps);
      setAutopilotStepIndex(0);
      setAutopilotState('running');

      const backendTry = await startCommandCenterRun({
        modules: mods,
        context: { ...ctx } as unknown as Record<string, unknown>,
        runMode,
      });
      let backendOrchestration: CommandCenterOrchestrationResult | null = null;
      if (backendTry.backend === 'accepted') {
        setBackendRunId(backendTry.runId);
        backendRunActiveRef.current = backendTry.runId;
        const polled = await pollCommandCenterRunUntilTerminal(backendTry.runId, {
          cancelled: () => autopilotStopRef.current,
          maxWaitMs: 8 * 60_000,
        });
        if (polled.backend === 'ok') {
          backendOrchestration = mapBackendRunToOrchestration(polled.payload);
          setOrchestration(backendOrchestration);
        }
        if (polled.backend === 'stopped' || polled.backend === 'lost') {
          backendRunActiveRef.current = null;
        }
        if (polled.backend === 'stopped') {
          setAutopilotState('stopped');
          return;
        }
      }

      if (autopilotStopRef.current) {
        setAutopilotState('stopped');
        return;
      }

      let merged: CommandCenterOrchestrationResult | null = backendOrchestration;

      try {
        for (let i = 0; i < steps.length; i++) {
          await waitUnpause();
          if (autopilotStopRef.current) {
            setAutopilotState('stopped');
            return;
          }
          setAutopilotStepIndex(i);
          const step = steps[i];

          if (step.kind === 'module' && step.module) {
            setRunningModuleKey(step.module);
          } else {
            setRunningModuleKey(null);
          }

          try {
            if (step.kind === 'validate') {
              await new Promise<void>((r) => window.setTimeout(r, 320));
            } else if (step.kind === 'module' && step.module && backendOrchestration) {
              await new Promise<void>((r) => window.setTimeout(r, 120));
            } else if (step.kind === 'module' && step.module) {
              const chunk = await runCommandCenterOrchestration({
                modules: [step.module],
                context: { ...ctx, investorDemoFraming: workflowMode === 'savedScenarios' },
                runMode,
              });
              merged = mergeOrchestrationChunks(merged, chunk);
              setOrchestration(merged);
            } else if (step.kind === 'evidence') {
              const ids = (Object.keys(evidenceSections) as EvidencePacketDraftSectionId[]).filter((k) => evidenceSections[k]);
              const draft = buildEvidencePacketPreview({
                title: 'DPAL Command Center — evidence draft',
                includedSectionIds: ids.length ? ids : EVIDENCE_SECTION_DEFAULTS,
                orchestration: merged ?? undefined,
              });
              setEvidencePreviewText(evidenceDraftToPreviewText(draft));
              await new Promise<void>((r) => window.setTimeout(r, 200));
            } else if (step.kind === 'nextActions') {
              await new Promise<void>((r) => window.setTimeout(r, 180));
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            setOrchestration((prev) =>
              prev
                ? {
                    ...prev,
                    orchestrationWarnings: [...prev.orchestrationWarnings, `${step.id}: ${msg}`],
                  }
                : null,
            );
          }
        }
        if (!autopilotStopRef.current) setAutopilotState('completed');
      } catch (e) {
        setAutopilotState('error');
        const msg = e instanceof Error ? e.message : String(e);
        setOrchestration((prev) =>
          prev
            ? { ...prev, orchestrationWarnings: [...prev.orchestrationWarnings, `autopilot: ${msg}`] }
            : null,
        );
      }
    } finally {
      setRunningModuleKey(null);
      setBusy(false);
      autopilotInFlightRef.current = false;
      backendRunActiveRef.current = null;
    }
  }, [busy, ctx, evidenceSections, modulesForBatch, runMode, waitUnpause, workflowMode]);

  const pauseAutopilot = React.useCallback(() => {
    autopilotPausedRef.current = true;
    setAutopilotState('paused');
  }, []);

  const continueAutopilot = React.useCallback(() => {
    autopilotPausedRef.current = false;
    if (autopilotInFlightRef.current) setAutopilotState('running');
  }, []);

  const stopAutopilot = React.useCallback(() => {
    autopilotStopRef.current = true;
    autopilotPausedRef.current = false;
    void cancelCommandCenterRun(backendRunActiveRef.current);
    if (autopilotInFlightRef.current) setAutopilotState('stopped');
  }, []);

  const currentAutopilotModuleView = React.useMemo((): View | null => {
    const step = autopilotSteps[autopilotStepIndex];
    if (step?.kind === 'module' && step.module) return workspaceViewForModule(step.module);
    return null;
  }, [autopilotSteps, autopilotStepIndex]);

  const openWorkspaceTarget = React.useMemo((): View | null => {
    if (currentAutopilotModuleView) return currentAutopilotModuleView;
    if (runningModuleKey) return workspaceViewForModule(runningModuleKey);
    return null;
  }, [currentAutopilotModuleView, runningModuleKey]);

  const commandCenterReaderSnapshot = React.useMemo(
    () =>
      buildAiReportReaderSnapshot({
        pageType: 'command_center',
        runId: backendRunId ?? undefined,
        title: 'Command Center run',
        description: ctx.goal || undefined,
        location: ctx.locationDescription,
        dates: { start: ctx.baselineDateIso, end: ctx.currentDateIso },
        moduleResults: orchestration?.results,
        evidencePacket: evidencePreviewText ? { evidenceDraftText: evidencePreviewText } : undefined,
        commandCenterRun: orchestration
          ? {
              settledAtIso: orchestration.settledAtIso,
              runMode: orchestration.runMode,
              modules: orchestration.modules,
              results: orchestration.results,
              orchestrationWarnings: orchestration.orchestrationWarnings,
            }
          : undefined,
        currentVisibleSections: [workflowMode, autopilotState],
        extra: {
          latitude: ctx.latitude,
          longitude: ctx.longitude,
          radiusKm: ctx.radiusKm,
        },
      }),
    [
      autopilotState,
      backendRunId,
      ctx.baselineDateIso,
      ctx.currentDateIso,
      ctx.goal,
      ctx.latitude,
      ctx.longitude,
      ctx.locationDescription,
      ctx.radiusKm,
      evidencePreviewText,
      orchestration,
      workflowMode,
    ],
  );

  const runningStatusChip =
    runningModuleKey && (autopilotState === 'running' || autopilotState === 'queued')
      ? `${runningModuleKey} · running`
      : null;

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

  const safetyStrip = (
    <div className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-[11px] leading-relaxed text-slate-800">
      <span className="font-bold text-slate-900">Safety: </span>
      Live and preview outputs are <span className="font-semibold">evidence leads</span>, not final verification. No automatic
      publication, no automatic blockchain anchoring, no automatic VIU or carbon credit issuance, and no human_verified label
      unless reviewer data confirms it. Pending live wiring: open the full workspace for authoritative module flows.
    </div>
  );

  return (
    <div className="mx-auto max-w-[1600px] px-3 pb-20 pt-4 text-slate-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onReturn}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Back
        </button>
      </div>

      <header className="mb-4 rounded-xl border border-slate-800 bg-slate-950 px-4 py-4 text-slate-50 shadow-md">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-teal-300">DPAL · Live Mission Console</p>
        <h1 className="mt-1 text-xl font-bold tracking-tight md:text-2xl">Command Center</h1>
        <p className="mt-2 max-w-3xl text-xs text-slate-300 md:text-sm">
          Map-first coordination for real DPAL module scans. The backend run engine performs live provider work where adapters are
          wired; pending modules stay in structured pending states until you open the full workspace. Results here are evidence
          leads — full module workspaces remain authoritative for AOI review, overlays, comparisons, and evidence packets.
        </p>
      </header>

      {/* Mission bar */}
      <section className="mb-3 rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-sm md:p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-teal-300">Mission bar</p>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <label className="min-w-[8rem] flex-1 text-[11px] text-slate-200">
            <span className="font-semibold">Goal</span>
            <input
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-50"
              value={ctx.goal}
              onChange={(e) => setCtx((c) => ({ ...c, goal: e.target.value }))}
            />
          </label>
          <label className="min-w-[12rem] flex-[2] text-[11px] text-slate-200">
            <span className="font-semibold">Location</span>
            <input
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-50"
              value={ctx.locationDescription}
              onChange={(e) => setCtx((c) => ({ ...c, locationDescription: e.target.value }))}
            />
          </label>
          <label className="w-[7.5rem] text-[11px] text-slate-200">
            <span className="font-semibold">Lat</span>
            <input
              type="number"
              step="any"
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-50"
              value={ctx.latitude}
              onChange={(e) => setCtx((c) => ({ ...c, latitude: Number(e.target.value) }))}
            />
          </label>
          <label className="w-[7.5rem] text-[11px] text-slate-200">
            <span className="font-semibold">Lng</span>
            <input
              type="number"
              step="any"
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-50"
              value={ctx.longitude}
              onChange={(e) => setCtx((c) => ({ ...c, longitude: Number(e.target.value) }))}
            />
          </label>
          <label className="w-[6.5rem] text-[11px] text-slate-200">
            <span className="font-semibold">Radius km</span>
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-50"
              value={ctx.radiusKm}
              onChange={(e) => setCtx((c) => ({ ...c, radiusKm: Number(e.target.value) || 1 }))}
            />
          </label>
          <label className="w-[9.5rem] text-[11px] text-slate-200">
            <span className="font-semibold">Baseline</span>
            <input
              type="date"
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-50"
              value={ctx.baselineDateIso}
              onChange={(e) => setCtx((c) => ({ ...c, baselineDateIso: e.target.value }))}
            />
          </label>
          <label className="w-[9.5rem] text-[11px] text-slate-200">
            <span className="font-semibold">Current</span>
            <input
              type="date"
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-50"
              value={ctx.currentDateIso}
              onChange={(e) => setCtx((c) => ({ ...c, currentDateIso: e.target.value }))}
            />
          </label>
          <label className="w-[11rem] text-[11px] text-slate-200">
            <span className="font-semibold">Run mode</span>
            <select
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-50"
              value={runMode}
              onChange={(e) => setRunMode(e.target.value as 'dry_run' | 'live')}
            >
              <option value="dry_run">dry_run (no live provider calls)</option>
              <option value="live">live (wired APIs)</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-2 lg:ml-auto">
            <button
              type="button"
              disabled={busy || !modulesForBatch().length}
              onClick={() => void startLiveAutopilot()}
              className="rounded-lg bg-teal-500 px-3 py-2 text-xs font-bold text-slate-950 shadow hover:bg-teal-400 disabled:opacity-50"
            >
              Start Live Run
            </button>
            <button
              type="button"
              disabled={busy || !modulesForBatch().length}
              onClick={() => void runPreview(modulesForBatch())}
              className="rounded-lg border border-teal-400 bg-slate-950 px-3 py-2 text-xs font-bold text-teal-200 hover:bg-slate-900 disabled:opacity-50"
            >
              {runBatchLabel}
            </button>
          </div>
        </div>
        {runMode === 'live' ? (
          <p className="mt-3 text-[10px] text-amber-200">
            Live mode calls real provider routes where the Command Center backend has wired adapters (Plastic Watch, Water,
            Forest Integrity, Earth Observation). Other modules return pending_adapter until wired — use Open Full Workspace.
          </p>
        ) : null}
      </section>

      {safetyStrip}

      <div className="mt-3">
        <CommandCenterSourceRegistryStrip />
      </div>

      {/* Main: mode rail | map | autopilot — mobile: map, autopilot, rail, then mode panels */}
      <div className="mt-4 flex flex-col gap-4 xl:grid xl:grid-cols-[10.5rem_minmax(0,1fr)_18rem] xl:items-start">
        <nav
          aria-label="Workflow mode"
          className="order-4 flex flex-row flex-wrap gap-1 border-slate-200 xl:order-1 xl:flex-col xl:border-r xl:pr-3"
        >
          {MODE_CARDS.map((m) => (
            <button
              key={m.id}
              type="button"
              title={`${m.bestFor} — ${m.description}`}
              onClick={() => setWorkflowMode(m.id)}
              className={`rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold transition xl:w-full ${
                workflowMode === m.id
                  ? 'border-teal-600 bg-teal-50 text-teal-950 ring-1 ring-teal-500'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="block leading-tight">{m.title}</span>
              <span className="mt-0.5 block text-[9px] font-normal text-slate-500">{m.bestFor}</span>
            </button>
          ))}
        </nav>

        <div className="order-1 min-w-0 xl:order-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
            <h2 className="text-sm font-bold text-slate-900">AOI map</h2>
            {commandCenterMapCenter ? (
              <p className="mt-1 text-xs font-medium text-slate-700">
                Live map center: {commandCenterMapCenter.lat.toFixed(5)}, {commandCenterMapCenter.lng.toFixed(5)} · radius{' '}
                {Number.isFinite(ctx.radiusKm) ? ctx.radiusKm : '—'} km
              </p>
            ) : (
              <p className="mt-1 text-xs text-amber-800">Enter valid coordinates in the mission bar.</p>
            )}
            <button
              type="button"
              className="mt-2 rounded border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-100"
              onClick={() => setMapLayoutNonce((n) => n + 1)}
            >
              Reset map to current context
            </button>
            <div className="mt-3">
              <CommandCenterMapPanel
                center={commandCenterMapCenter}
                radiusKm={ctx.radiusKm}
                evidenceMarkers={commandCenterEvidenceMarkers}
                layoutNonce={mapLayoutNonce}
                runningStatusChip={runningStatusChip}
              />
            </div>
          </div>
        </div>

        <aside className="order-2 min-w-0 xl:order-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-slate-50 shadow-sm md:p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-teal-300">
              Live run · {runMode === 'live' ? 'live' : 'dry_run'}
            </p>
            <p className="mt-1 text-[11px] text-slate-300">
              {runMode === 'live'
                ? 'Live run executes wired backend adapters in sequence. One failed module does not abort the run unless you press Stop.'
                : 'dry_run uses the same steps without live provider calls — safe for setup and training.'}
            </p>
            <p className="mt-2 text-[10px] font-semibold uppercase text-slate-400">State: {autopilotState}</p>
            {backendRunId ? (
              <p className="mt-1 text-[10px] text-teal-200">Backend run id (reserved): {backendRunId}</p>
            ) : (
              <p className="mt-1 text-[10px] text-slate-500">
                Backend orchestration idle — Start Live Run to POST /api/command-center/runs when the server accepts it.
              </p>
            )}
            <ol className="mt-3 max-h-52 list-decimal space-y-1 overflow-y-auto pl-4 text-[11px] text-slate-200">
              {autopilotSteps.length === 0 ? (
                <li className="text-slate-500">Idle — press Start Live Run.</li>
              ) : (
                autopilotSteps.map((s, idx) => {
                  const liveHint = s.kind === 'module' && s.module ? liveAutopilotModuleHint(s.module, runMode) : null;
                  return (
                  <li
                    key={s.id}
                    className={
                      idx < autopilotStepIndex
                        ? 'text-teal-300'
                        : idx === autopilotStepIndex && autopilotState === 'running'
                          ? 'font-bold text-white'
                          : ''
                    }
                  >
                    {s.label}
                    {liveHint ? (
                      <span className="block text-[9px] font-normal text-slate-500">{liveHint}</span>
                    ) : null}
                  </li>
                  );
                })
              )}
            </ol>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !modulesForBatch().length}
                onClick={() => void startLiveAutopilot()}
                className="rounded bg-teal-500 px-2 py-1.5 text-[11px] font-bold text-slate-950 disabled:opacity-50"
              >
                Start Live Run
              </button>
              <button
                type="button"
                disabled={autopilotState !== 'running' && autopilotState !== 'queued'}
                onClick={pauseAutopilot}
                className="rounded border border-slate-500 px-2 py-1.5 text-[11px] text-slate-100 disabled:opacity-40"
              >
                Pause
              </button>
              <button
                type="button"
                disabled={autopilotState !== 'paused'}
                onClick={continueAutopilot}
                className="rounded border border-slate-500 px-2 py-1.5 text-[11px] text-slate-100 disabled:opacity-40"
              >
                Continue
              </button>
              <button type="button" onClick={stopAutopilot} className="rounded border border-red-400/60 px-2 py-1.5 text-[11px] text-red-200">
                Stop
              </button>
            </div>
            {openWorkspaceTarget ? (
              <button
                type="button"
                className="mt-3 w-full rounded-lg border border-teal-400/50 py-2 text-[11px] font-semibold text-teal-200 hover:bg-slate-800"
                onClick={() => onNavigate(openWorkspaceTarget)}
              >
                Open Full Workspace for current step
              </button>
            ) : null}
          </div>
        </aside>
      </div>

      {/* Mode-specific panels */}
      <div className="mt-6 space-y-4">
        {workflowMode === 'manual' && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Manual Scan</h2>
            <p className="mt-1 text-[11px] text-slate-600">
              Modules included in the live run and in &quot;{runBatchLabel}&quot; (mission bar). Wired modules use the Command
              Center backend run engine; others return pending_adapter until wired.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
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
          </section>
        )}

        {workflowMode === 'guided' && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Guided Workflow</h2>
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
            <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
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
              className="mt-3 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {guidedRunLabel}
            </button>
          </section>
        )}

        {workflowMode === 'watch' && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Live Run Monitor</h2>
            <p className="mt-1 text-xs text-slate-700">
              Step animation then batch scan using Manual module checkboxes. Nothing runs on load.
            </p>
            <p className="mt-2 text-xs">
              Step:{' '}
              <span className="font-semibold">
                {watchActive ? WATCH_STEPS[watchStepIdx]?.label ?? 'Finishing…' : 'Idle'}
              </span>
              {watchPaused ? <span className="ml-2 text-amber-800">(paused)</span> : null}
            </p>
            <ol className="mt-2 list-decimal pl-4 text-xs text-slate-700">
              {WATCH_STEPS.map((s) => (
                <li key={s.id} className={watchDoneSteps.includes(s.id) ? 'font-semibold text-emerald-800' : ''}>
                  {s.label}
                </li>
              ))}
            </ol>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={Boolean(watchTimer.current)}
                onClick={startWatchPreview}
                className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                Start monitor sequence
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
          </section>
        )}

        {workflowMode === 'superAgent' && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Super Agent (optional)</h2>
            <textarea
              className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-sm"
              rows={3}
              placeholder="Investigation goal…"
              value={superGoal}
              onChange={(e) => setSuperGoal(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-2">
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
              <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                <ol className="list-decimal pl-4">
                  {superPlan.lines.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ol>
                <button
                  type="button"
                  className="mt-2 rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white"
                  onClick={() => {
                    const o = {} as Record<CommandCenterModuleKey, boolean>;
                    ALL_MODULE_KEYS.forEach((k) => {
                      o[k] = superPlan.modules.includes(k);
                    });
                    setManualModules(o);
                    void runPreview(superPlan.modules);
                  }}
                >
                  Use plan + {runMode === 'live' ? 'live scans' : 'preview'}
                </button>
              </div>
            ) : null}
          </section>
        )}

        {workflowMode === 'evidenceBuilder' && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Evidence Draft Builder</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(evidenceSections) as EvidencePacketDraftSectionId[]).map((id) => (
                <label key={id} className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[11px]">
                  <input type="checkbox" checked={evidenceSections[id]} onChange={() => toggleEvidenceSection(id)} />
                  {id}
                </label>
              ))}
            </div>
            <button type="button" onClick={buildEvidence} className="mt-3 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
              Build evidence draft
            </button>
            <button
              type="button"
              className="mt-3 ml-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
              onClick={() => {
                const ids = (Object.keys(evidenceSections) as EvidencePacketDraftSectionId[]).filter((k) => evidenceSections[k]);
                const draft = buildEvidencePacketPreview({
                  title: 'DPAL Command Center — evidence draft',
                  includedSectionIds: ids,
                  orchestration: orchestration ?? undefined,
                });
                const text = evidenceDraftToPreviewText(draft);
                setEvidencePreviewText(text);
                void navigator.clipboard.writeText(text).catch(() => {});
              }}
            >
              Copy draft
            </button>
          </section>
        )}

        {workflowMode === 'savedScenarios' && (
          <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Saved scenario presets</h2>
            <p className="mt-1 text-xs text-amber-900">
              Loads coordinates and module checkboxes; use the mission bar to run a live run, dry_run, or batch scans.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {COMMAND_CENTER_SAVED_SCENARIO_PRESETS.map((p) => (
                <article key={p.id} className="rounded-lg border border-amber-100 bg-white p-3 text-xs shadow-sm">
                  <h3 className="font-bold text-slate-900">{p.title}</h3>
                  <p className="mt-1 text-slate-600">{p.subtitle}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded bg-emerald-800 px-2 py-1 text-[11px] font-semibold text-white"
                      onClick={() => {
                        applySavedScenarioPreset(p.id);
                        void runPreview(p.defaultModules);
                      }}
                    >
                      Load + preview
                    </button>
                    <button
                      type="button"
                      className="rounded border border-slate-300 px-2 py-1 text-[11px]"
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

      {/* Lower: results + evidence + claims */}
      <section className="mt-8 space-y-6">
        <h2 className="text-base font-bold text-slate-900">Live provider results</h2>
        {orchestration ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-slate-500">
                Settled at {orchestration.settledAtIso} · batch runMode {orchestration.runMode}
              </p>
            </div>
            {orchestration.orchestrationWarnings.length ? (
              <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
                {orchestration.orchestrationWarnings.join(' · ')}
              </p>
            ) : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {orchestration.results.map((r) => {
                const warn =
                  r.status === 'error' || r.status === 'rate_limited' || r.status === 'unavailable'
                    ? 'border-amber-300 bg-amber-50/50'
                    : 'border-slate-100 bg-slate-50';
                return (
                  <article key={r.moduleKey} className={`rounded-xl border p-4 text-xs ${warn}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-slate-900">{r.moduleKey}</h3>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700">{r.status}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">
                      runMode: <span className="font-semibold text-slate-700">{r.runMode}</span>
                    </p>
                    <p className="mt-2 text-slate-800">{r.headline}</p>
                    {r.errorMessage ? (
                      <p className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-900">{r.errorMessage}</p>
                    ) : null}
                    <div className="mt-2">
                      <p className="text-[10px] font-semibold uppercase text-slate-500">Limitations</p>
                      <ul className="mt-1 list-disc pl-4 text-[11px] text-slate-600">
                        {r.limitations.map((l, i) => (
                          <li key={i}>{l}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-2">
                      <p className="text-[10px] font-semibold uppercase text-slate-500">Provider lanes</p>
                      <ul className="mt-1 space-y-1 text-[11px]">
                        {r.providerLanes.map((p) => (
                          <li key={p.id}>
                            {p.label}: <span className="font-semibold">{p.state}</span>
                            {p.detail ? <span className="text-slate-500"> — {p.detail}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {r.evidenceRefs.length ? (
                      <div className="mt-2">
                        <p className="text-[10px] font-semibold uppercase text-slate-500">Evidence refs</p>
                        <ul className="mt-1 list-disc pl-4 text-[11px] text-slate-600">
                          {r.evidenceRefs.map((er) => (
                            <li key={er.id}>
                              {er.href ? (
                                <a href={er.href} className="text-emerald-900 underline" target="_blank" rel="noreferrer">
                                  {er.label}
                                </a>
                              ) : (
                                er.label
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {r.openWorkspaceView ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-lg bg-emerald-800 px-2 py-1 text-[11px] font-semibold text-white shadow hover:bg-emerald-900"
                          onClick={() => onNavigate(r.openWorkspaceView as View)}
                        >
                          Open Full Workspace
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
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Run scans or Start Live Run to populate provider cards.</p>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Evidence draft</h3>
          <textarea
            className="mt-2 h-48 w-full rounded-lg border border-slate-200 p-2 font-mono text-[11px]"
            readOnly
            placeholder="Live run step or Evidence Draft Builder fills this…"
            value={evidencePreviewText}
          />
          <AiReportReaderChatBox
            tone="paper"
            defaultOpen={false}
            pageType="command_center"
            runId={backendRunId ?? undefined}
            reportSnapshot={commandCenterReaderSnapshot}
            commandCenterRun={
              orchestration
                ? {
                    settledAtIso: orchestration.settledAtIso,
                    runMode: orchestration.runMode,
                    modules: orchestration.modules,
                    results: orchestration.results,
                    orchestrationWarnings: orchestration.orchestrationWarnings,
                  }
                : undefined
            }
            evidencePacket={evidencePreviewText ? { evidenceDraftText: evidencePreviewText } : undefined}
            title="Ask about this Command Center evidence draft"
          />
        </div>

        {claimPanel}
      </section>
    </div>
  );
};

export default DpalCommandCenterPage;
