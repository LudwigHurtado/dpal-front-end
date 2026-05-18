import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { DmrvProjectContext } from '../services/dmrvProjectContextTypes';
import {
  fetchMrvAgentLatestReport,
  fetchMrvAgentSchedule,
  fetchMrvAgentRuns,
  fetchMrvNotifications,
  mrvApiFailureMessage,
  runMrvAgentNow,
  syncMrvProjectConfigToServer,
  type MrvAgentFindingDto,
  type MrvAgentScheduleDto,
  type MrvNotificationDto,
} from '../services/mrvAgentApi';
import {
  buildMissionTimeline,
  timelineStatusClass,
  type MissionTimelineStep,
} from '../utils/mrvAgentTimeline';

type Props = {
  projectId: string;
  projectContext: DmrvProjectContext | null;
};

function severityClass(severity: string): string {
  if (severity === 'CRITICAL') return 'border-red-300 bg-red-50 text-red-950';
  if (severity === 'WARNING') return 'border-amber-300 bg-amber-50 text-amber-950';
  return 'border-slate-200 bg-slate-50 text-slate-800';
}

function labelForFinding(f: { severity: string; category: string }): string {
  if (f.category === 'VALIDATOR') return 'Validator Review Needed';
  if (f.severity === 'INFO') return 'System Checked';
  if (f.severity === 'WARNING' || f.severity === 'CRITICAL') return 'User Review Needed';
  return 'AI Suggested';
}

export function DmrvSuperAgentPanel({ projectId, projectContext }: Props): React.ReactElement {
  const [schedule, setSchedule] = useState<MrvAgentScheduleDto | null>(null);
  const [readinessScore, setReadinessScore] = useState<number | null>(null);
  const [findings, setFindings] = useState<MrvAgentFindingDto[]>([]);
  const [notifications, setNotifications] = useState<MrvNotificationDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [panelNotice, setPanelNotice] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const hasProject = Boolean(projectId?.trim() && projectContext?.projectId?.trim());

  const refresh = useCallback(async () => {
    if (!hasProject) return;

    const latestResult = await fetchMrvAgentLatestReport(projectId);
    if (!latestResult.ok) {
      setApiError(mrvApiFailureMessage(latestResult.kind, 'latest-report'));
      setSchedule(null);
      setReadinessScore(null);
      setFindings([]);
      setNotifications([]);
      return;
    }

    setApiError(null);

    const [schedResult, runsResult, notesResult] = await Promise.all([
      fetchMrvAgentSchedule(projectId),
      fetchMrvAgentRuns(projectId),
      fetchMrvNotifications(projectId),
    ]);

    if (schedResult.ok) setSchedule(schedResult.data);
    else if (schedResult.kind === 'not_found') {
      setApiError(mrvApiFailureMessage('not_found', 'schedule'));
    }

    setReadinessScore(latestResult.data.readinessScore);
    const lastFindings =
      runsResult.ok && runsResult.data[0]?.agentFindings
        ? runsResult.data[0].agentFindings
        : latestResult.data.lastRun?.agentFindings ?? [];
    setFindings(lastFindings);
    setNotifications(notesResult.ok ? notesResult.data : []);

    if (!runsResult.ok && runsResult.kind !== 'not_found') {
      setApiError((prev) => prev ?? mrvApiFailureMessage(runsResult.kind, 'runs'));
    }
  }, [hasProject, projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!projectContext?.projectId) return;
    void syncMrvProjectConfigToServer(projectId, projectContext);
  }, [projectId, projectContext]);

  const timeline = useMemo(() => buildMissionTimeline(findings), [findings]);

  const handleRunNow = async () => {
    setBusy(true);
    setPanelNotice(null);
    if (projectContext) {
      await syncMrvProjectConfigToServer(projectId, projectContext);
    }
    const result = await runMrvAgentNow(projectId, projectContext ?? undefined);
    setBusy(false);
    if ('error' in result) {
      setPanelNotice(mrvApiFailureMessage(result.error));
      return;
    }
    setPanelNotice(`Run ${result.status} · ${result.findings.length} finding(s)`);
    void refresh();
  };

  if (!hasProject) {
    return (
      <section className="mb-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        Save project configuration first to enable Super Agent scheduling and mission runs.
      </section>
    );
  }

  const agentMode = schedule?.enabled ? 'Super Agent · Scheduled' : 'Super Agent · Paused';
  const lastRunLabel = schedule?.lastRunAt
    ? new Date(schedule.lastRunAt).toLocaleString()
    : 'Never';

  return (
    <section className="mb-4 rounded-2xl border border-[#1e3a5f]/20 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
      <h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-[#1e3a5f]">
        Agent Schedule · Super Agent Mode
      </h2>
      <p className="mt-1 text-xs text-slate-600">
        Server-side readiness missions — not run in the browser. Validator approval remains separate from AI
        recommendations.
      </p>

      {apiError ? (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950">
          {apiError}
        </p>
      ) : null}

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
          <StatusRow label="Agent mode" value={agentMode} />
          <StatusRow label="Wake-up schedule" value={schedule?.cronExpression ?? '0 12 * * * (UTC)'} />
          <StatusRow label="Timezone" value={schedule?.timezone ?? 'America/La_Paz'} />
          <StatusRow label="Last run" value={lastRunLabel} />
          <StatusRow
            label="Next run hint"
            value={schedule?.nextRunHint ?? 'Daily 08:00 Bolivia (12:00 UTC on Railway cron)'}
          />
          <StatusRow label="Latest readiness score" value={readinessScore != null ? `${readinessScore} / 100` : '—'} />
        </div>
        <div className="flex flex-wrap gap-2 content-start">
          <ActionButton
            label={busy ? 'Running…' : 'Run Agent Now'}
            primary
            onClick={() => void handleRunNow()}
            disabled={busy}
          />
          <ActionButton label="Pause Agent" disabled title="Placeholder — disable schedule in a future release" />
          <ActionButton label="Edit Schedule" disabled title="Placeholder — schedule editor coming soon" />
        </div>
      </div>

      {panelNotice ? (
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800">
          {panelNotice}
        </p>
      ) : null}

      <MissionTimeline steps={timeline} />

      <p className="mt-2 text-[10px] text-slate-500">
        Railway cron: <code className="text-[10px]">npm run agent:mrv-cron</code> with schedule{' '}
        <code className="text-[10px]">0 12 * * *</code> (08:00 Bolivia). Anchoring and final packets need your
        confirmation.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <FindingList findings={findings} />
        <NotificationList notifications={notifications} />
      </div>
    </section>
  );
}

function MissionTimeline({ steps }: { steps: MissionTimelineStep[] }): React.ReactElement {
  const hasRun = steps.some((s) => s.status !== 'Pending');
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
      <h3 className="text-[10px] font-bold uppercase text-slate-500">Agent mission timeline</h3>
      {!hasRun ? (
        <p className="mt-2 text-xs text-slate-500">No mission run yet — timeline fills after Run Agent Now or cron.</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className={`flex gap-3 rounded-lg border px-2 py-2 text-xs ${timelineStatusClass(step.status)}`}
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/80 text-[10px] font-bold">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-bold">{step.label}</span>
                  <span className="flex flex-wrap gap-1">
                    <span className="rounded bg-white/70 px-1.5 py-0.5 text-[9px] font-bold uppercase">
                      {step.status}
                    </span>
                    <span className="rounded bg-white/70 px-1.5 py-0.5 text-[9px] font-bold uppercase">
                      {step.sourceLabel}
                    </span>
                  </span>
                </div>
                <p className="mt-0.5 leading-snug">{step.message}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="flex justify-between gap-2 text-xs">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="text-right text-slate-900">{value}</span>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  primary,
  disabled,
  title,
}: {
  label: string;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
  title?: string;
}): React.ReactElement {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-3 py-2 text-xs font-bold ${
        primary
          ? 'bg-[#1e3a5f] text-white hover:bg-[#152a47] disabled:opacity-60'
          : 'border border-slate-300 bg-white text-slate-700 disabled:opacity-50'
      }`}
    >
      {label}
    </button>
  );
}

function FindingList({ findings }: { findings: MrvAgentFindingDto[] }): React.ReactElement {
  return (
    <div>
      <h3 className="text-[10px] font-bold uppercase text-slate-500">Latest findings</h3>
      {findings.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">No findings yet — run the agent to assess readiness.</p>
      ) : (
        <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto">
          {findings.slice(0, 12).map((f) => (
            <li key={f.id} className={`rounded-lg border px-2 py-2 text-xs ${severityClass(f.severity)}`}>
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="font-bold">{f.title}</span>
                <span className="rounded bg-white/70 px-1.5 py-0.5 text-[9px] font-bold uppercase">
                  {labelForFinding(f)}
                </span>
              </div>
              <p className="mt-1">{f.message}</p>
              {f.action ? <p className="mt-1 font-semibold">→ {f.action}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NotificationList({ notifications }: { notifications: MrvNotificationDto[] }): React.ReactElement {
  return (
    <div>
      <h3 className="text-[10px] font-bold uppercase text-slate-500">Notifications</h3>
      {notifications.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">No alerts — ordinary successful runs do not notify.</p>
      ) : (
        <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto">
          {notifications.map((n) => (
            <li key={n.id} className={`rounded-lg border px-2 py-2 text-xs ${severityClass(n.severity)}`}>
              <p className="font-bold">{n.title}</p>
              <p className="mt-0.5">{n.message}</p>
              <p className="mt-1 text-[10px] text-slate-500">{new Date(n.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
