import React from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle,
  FileText,
  MapPin,
  ShieldCheck,
} from '../../../../components/icons';

const PlayCircle: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <polygon points="10 8 16 12 10 16 10 8" />
  </svg>
);

/**
 * Stage 12J — FloodGuard Start Wizard / Operator Onboarding.
 *
 * Renders the top-of-dashboard project card, data-mode chips, guided
 * workflow checklist, and "How to get real results" helper. Pure UI — no
 * backend changes are required to use it.
 */

export type FloodGuardSessionStatus = 'not_started' | 'active' | 'demo_mode';

export type FloodGuardWorkflowStepId =
  | 'review_city'
  | 'open_agent_monitor'
  | 'refresh_evaluation'
  | 'dispatch_safe_mission'
  | 'generate_evidence'
  | 'generate_routing_preview'
  | 'anchor_evidence'
  | 'open_verification';

export interface FloodGuardWorkflowStep {
  id: FloodGuardWorkflowStepId;
  title: string;
  description: string;
  relatedTab: string;
  expectedResult: string;
}

export const FLOODGUARD_WORKFLOW_STEPS: FloodGuardWorkflowStep[] = [
  {
    id: 'review_city',
    title: 'Step 1 — Review City Flood Map',
    description: 'Open the City Flood Map and confirm zones, alert pins, and the active city.',
    relatedTab: 'City Flood Map',
    expectedResult: 'You can identify which Geo-ID zones are at higher alert levels.',
  },
  {
    id: 'open_agent_monitor',
    title: 'Step 2 — Open Agent Monitor',
    description: 'Switch to the Agent Monitor tab. This is the operational heart of FloodGuard.',
    relatedTab: 'Agent Monitor',
    expectedResult: 'You see integration cards for rainfall, satellite, and water level.',
  },
  {
    id: 'refresh_evaluation',
    title: 'Step 3 — Refresh zone evaluation',
    description:
      'Press Refresh in Agent Monitor to pull the latest agentic evaluation for every zone.',
    relatedTab: 'Agent Monitor',
    expectedResult:
      'Each zone shows risk reasons, agent findings, mission safety classification, and recommended/blocked missions.',
  },
  {
    id: 'dispatch_safe_mission',
    title: 'Step 4 — Dispatch a safe mission (only if allowed)',
    description:
      'Dispatch a recommended mission only if the safety classification permits it. Unsafe missions are rejected server-side.',
    relatedTab: 'Agent Monitor',
    expectedResult: 'A FloodGuard dispatched mission and a DPAL bridge mission record are created.',
  },
  {
    id: 'generate_evidence',
    title: 'Step 5 — Generate evidence packet',
    description: 'Open the Evidence Packet tab for the selected alert and generate the packet.',
    relatedTab: 'Evidence Packet',
    expectedResult: 'A SHA-256 content hash, summary, and provenance digests are created.',
  },
  {
    id: 'generate_routing_preview',
    title: 'Step 6 — Generate routing preview (dry run)',
    description:
      'Open Alert Settings → Routing Preview. Choose dry_run and generate a preview. No real notifications are sent.',
    relatedTab: 'Alert Settings',
    expectedResult:
      'You see who would receive an alert and which decisions are routable or blocked, with reasons.',
  },
  {
    id: 'anchor_evidence',
    title: 'Step 7 — Anchor on DPAL ledger',
    description:
      'Return to Evidence Packet and click "Anchor on DPAL ledger". The mock DPAL chain is used by default.',
    relatedTab: 'Evidence Packet',
    expectedResult:
      'A persistent ledger record is created with a composite anchoring hash and provenance digests.',
  },
  {
    id: 'open_verification',
    title: 'Step 8 — Open public verification page',
    description: 'In the ledger block, click "Open verification page" to view the public-safe record.',
    relatedTab: 'Public verification',
    expectedResult:
      'The /floodguard/verify/:ledgerRecordId page renders without exposing any private data.',
  },
];

export type FloodGuardDataMode =
  | 'api_connected'
  | 'local_fallback'
  | 'live_adapter'
  | 'synthetic_fallback';

export interface FloodGuardStartPanelProps {
  projectName: string;
  cityName: string;
  cityCountry?: string;
  dataMode: FloodGuardDataMode;
  modeChips: string[];
  sessionStatus: FloodGuardSessionStatus;
  sessionStartedAt: string | null;
  activeAlertCount: number;
  selectedZoneCount: number;
  recommendedNextStep: string;
  completedSteps: FloodGuardWorkflowStepId[];
  onStartSession: () => void;
  onJumpToTab?: (tab: 'overview' | 'agent_monitor' | 'evidence' | 'settings') => void;
  legalDisclaimer: string;
  className?: string;
}

const MODE_LABEL: Record<FloodGuardDataMode, string> = {
  api_connected: 'API connected',
  local_fallback: 'Local fallback',
  live_adapter: 'Live adapter',
  synthetic_fallback: 'Synthetic fallback',
};

const SESSION_LABEL: Record<FloodGuardSessionStatus, string> = {
  not_started: 'Session not started',
  active: 'Session active',
  demo_mode: 'Demo monitoring active',
};

function Chip({
  children,
  tone = 'cyan',
}: {
  children: React.ReactNode;
  tone?: 'cyan' | 'amber' | 'emerald' | 'slate';
}) {
  const palette = {
    cyan: { bg: 'rgba(34,211,238,0.16)', fg: '#67e8f9', border: 'rgba(34,211,238,0.4)' },
    amber: { bg: 'rgba(245,158,11,0.15)', fg: '#fde68a', border: 'rgba(245,158,11,0.4)' },
    emerald: { bg: 'rgba(34,197,94,0.16)', fg: '#86efac', border: 'rgba(34,197,94,0.4)' },
    slate: { bg: 'rgba(148,163,184,0.18)', fg: '#cbd5e1', border: 'rgba(148,163,184,0.4)' },
  }[tone];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: palette.bg, color: palette.fg, border: `1px solid ${palette.border}` }}
    >
      {children}
    </span>
  );
}

function chipToneFor(label: string): 'cyan' | 'amber' | 'emerald' | 'slate' {
  const lower = label.toLowerCase();
  if (lower.includes('live') || lower.includes('connected')) return 'emerald';
  if (lower.includes('mock') || lower.includes('fallback') || lower.includes('synthetic'))
    return 'amber';
  if (lower.includes('preview')) return 'slate';
  return 'cyan';
}

const FloodGuardStartPanel: React.FC<FloodGuardStartPanelProps> = ({
  projectName,
  cityName,
  cityCountry,
  dataMode,
  modeChips,
  sessionStatus,
  sessionStartedAt,
  activeAlertCount,
  selectedZoneCount,
  recommendedNextStep,
  completedSteps,
  onStartSession,
  onJumpToTab,
  legalDisclaimer,
  className = '',
}) => {
  const sessionLine = sessionStartedAt
    ? `${SESSION_LABEL[sessionStatus]} · started ${new Date(sessionStartedAt).toLocaleString()}`
    : SESSION_LABEL[sessionStatus];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Project / session card */}
      <div
        className="rounded-2xl p-5 border dpal-border-subtle"
        style={{ background: 'var(--dpal-card)' }}
      >
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <ShieldCheck
              className="w-5 h-5 shrink-0 mt-0.5"
              style={{ color: 'var(--dpal-primary)' }}
            />
            <div className="space-y-2 min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">
                Active FloodGuard Project
              </div>
              <h2
                className="text-base md:text-lg font-extrabold"
                style={{ color: 'var(--dpal-text-primary)' }}
              >
                {projectName}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
                <div>
                  <span className="dpal-text-muted">City:</span>{' '}
                  <span style={{ color: 'var(--dpal-text-primary)' }}>
                    {cityName}
                    {cityCountry ? `, ${cityCountry}` : ''}
                  </span>
                </div>
                <div>
                  <span className="dpal-text-muted">Mode:</span>{' '}
                  <span style={{ color: 'var(--dpal-text-primary)' }}>{MODE_LABEL[dataMode]}</span>
                </div>
                <div>
                  <span className="dpal-text-muted">Session:</span>{' '}
                  <span style={{ color: 'var(--dpal-text-primary)' }}>{sessionLine}</span>
                </div>
                <div>
                  <span className="dpal-text-muted">Active alerts:</span>{' '}
                  <span style={{ color: 'var(--dpal-text-primary)' }}>{activeAlertCount}</span>
                </div>
                <div>
                  <span className="dpal-text-muted">Zones in scope:</span>{' '}
                  <span style={{ color: 'var(--dpal-text-primary)' }}>{selectedZoneCount}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {modeChips.map((chip) => (
                  <Chip key={chip} tone={chipToneFor(chip)}>
                    {chip}
                  </Chip>
                ))}
              </div>

              <div
                className="mt-2 rounded-xl px-3 py-2"
                style={{ background: 'var(--dpal-surface-alt)' }}
              >
                <div className="text-[10px] dpal-text-muted uppercase tracking-wider">
                  Recommended next step
                </div>
                <div className="text-sm mt-0.5" style={{ color: 'var(--dpal-text-primary)' }}>
                  {recommendedNextStep}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0 lg:items-end">
            <button
              type="button"
              onClick={onStartSession}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
              style={{
                background: 'var(--dpal-primary)',
                color: 'var(--md-sys-color-on-primary, #00201a)',
              }}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              {sessionStatus === 'not_started' ? 'Start Monitoring Session' : 'Run FloodGuard Workflow'}
            </button>
            {onJumpToTab && (
              <button
                type="button"
                onClick={() => onJumpToTab('agent_monitor')}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold border dpal-border-subtle"
                style={{
                  background: 'var(--dpal-surface-alt)',
                  color: 'var(--dpal-text-primary)',
                }}
              >
                <Bot className="w-3.5 h-3.5" />
                Jump to Agent Monitor
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Guided workflow checklist (only after session starts) */}
      {sessionStatus !== 'not_started' && (
        <div
          className="rounded-2xl p-5 border dpal-border-subtle space-y-3"
          style={{ background: 'var(--dpal-card)' }}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: 'var(--dpal-primary)' }} />
            <span className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">
              Guided FloodGuard Workflow
            </span>
          </div>
          <div className="text-xs dpal-text-secondary">
            Follow the steps in order. Each step lists the related tab and the result you should
            see.
          </div>
          <ol className="space-y-2">
            {FLOODGUARD_WORKFLOW_STEPS.map((step) => {
              const done = completedSteps.includes(step.id);
              return (
                <li
                  key={step.id}
                  className="rounded-xl p-3 flex items-start gap-2"
                  style={{
                    background: done
                      ? 'rgba(34,197,94,0.08)'
                      : 'var(--dpal-surface-alt)',
                    border: `1px solid ${done ? 'rgba(34,197,94,0.35)' : 'var(--dpal-border)'}`,
                  }}
                >
                  <div className="mt-0.5 shrink-0">
                    {done ? (
                      <CheckCircle className="w-4 h-4" style={{ color: '#86efac' }} />
                    ) : (
                      <span
                        className="inline-block w-3.5 h-3.5 rounded-full"
                        style={{
                          background: 'var(--dpal-surface)',
                          border: '1px solid var(--dpal-border)',
                        }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-xs font-semibold"
                      style={{ color: 'var(--dpal-text-primary)' }}
                    >
                      {step.title}
                    </div>
                    <div className="text-[11px] mt-0.5 dpal-text-secondary">{step.description}</div>
                    <div className="text-[10px] mt-1 dpal-text-muted">
                      Tab: <span className="font-semibold">{step.relatedTab}</span> · Expected:{' '}
                      {step.expectedResult}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* How to get real results */}
      <div
        className="rounded-2xl p-4 border dpal-border-subtle space-y-2"
        style={{ background: 'var(--dpal-card)' }}
      >
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" style={{ color: 'var(--dpal-primary)' }} />
          <span className="text-[10px] font-black uppercase tracking-widest dpal-text-muted">
            How to get real results
          </span>
        </div>
        <p className="text-xs dpal-text-secondary leading-relaxed">
          To get real results, begin with remote intelligence. FloodGuard first evaluates rainfall,
          satellite water expansion, NDWI, flood-wet confidence, water-level / gauge readings,
          historical vulnerability, and exposure data. Human missions are only recommended when the
          safety gate allows.
        </p>
        <p className="text-xs dpal-text-secondary leading-relaxed">
          Phone images and videos are <span className="font-semibold">not</span> the starting layer.
          Camera and citizen detections are supporting signals used to corroborate the remote
          monitoring stack.
        </p>
      </div>

      {/* Legal disclaimer chip block */}
      <div
        className="rounded-2xl p-3 text-[11px] flex items-start gap-2"
        style={{
          background: 'var(--dpal-surface)',
          border: '1px dashed var(--dpal-border)',
          color: 'var(--dpal-text-secondary)',
        }}
      >
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#fde68a' }} />
        <div>{legalDisclaimer}</div>
      </div>
    </div>
  );
};

export default FloodGuardStartPanel;
