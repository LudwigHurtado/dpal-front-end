import React, { useCallback, useEffect, useState } from 'react';
import type { DmrvProjectContext } from '../services/dmrvProjectContextTypes';
import {
  fetchMrvAgentLatestReport,
  fetchMrvAgentSchedule,
  fetchMrvAgentRuns,
  fetchMrvNotifications,
  runMrvAgentNow,
  syncMrvProjectConfigToServer,
  type MrvAgentFindingDto,
  type MrvAgentScheduleDto,
  type MrvNotificationDto,
} from '../services/mrvAgentApi';

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
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    const [sched, latest, runs, notes] = await Promise.all([
      fetchMrvAgentSchedule(projectId),
      fetchMrvAgentLatestReport(projectId),
      fetchMrvAgentRuns(projectId),
      fetchMrvNotifications(projectId),
    ]);
    setApiReachable(sched !== null || latest !== null);
    setSchedule(sched);
    setReadinessScore(latest?.readinessScore ?? null);
    const lastFindings = runs[0]?.agentFindings ?? latest?.lastRun?.agentFindings ?? [];
    setFindings(lastFindings);
    setNotifications(notes);
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!projectContext?.projectId) return;
    void syncMrvProjectConfigToServer(projectId, projectContext);
  }, [projectId, projectContext]);

  const handleRunNow = async () => {
    setBusy(true);
    setPanelNotice(null);
    if (projectContext) {
      await syncMrvProjectConfigToServer(projectId, projectContext);
    }
    const result = await runMrvAgentNow(projectId, projectContext ?? undefined);
    setBusy(false);
    if (!result) {
      setPanelNotice(
        'Super Agent API unavailable — ensure VITE_API_BASE points at the Prisma backend with DATABASE_URL.',
      );
      return;
    }
    setPanelNotice(`Run ${result.status} · ${result.findings.length} finding(s)`);
    void refresh();
  };

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

      <motionGrid
        schedule={schedule}
        agentMode={agentMode}
        lastRunLabel={lastRunLabel}
        readinessScore={readinessScore}
        apiReachable={apiReachable}
        busy={busy}
        onRunNow={() => void handleRunNow()}
      />

      {panelNotice ? (
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800">
          {panelNotice}
        </p>
      ) : null}

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
          {notifications.slice(0, 8).map((n) => (
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

function motionGrid(props: {
  schedule: MrvAgentScheduleDto | null;
  agentMode: string;
  lastRunLabel: string;
  readinessScore: number | null;
  apiReachable: boolean | null;
  busy: boolean;
  onRunNow: () => void;
}): React.ReactElement {
  const {
    schedule,
    agentMode,
    lastRunLabel,
    readinessScore,
    apiReachable,
    busy,
    onRunNow,
  } = props;

  return (
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
        <StatusRow
          label="Latest readiness score"
          value={readinessScore != null ? `${readinessScore} / 100` : '—'}
        />
        {apiReachable === false ? (
          <p className="text-xs text-amber-800">Backend agent routes not reachable.</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2 content-start">
        <ActionButton label={busy ? 'Running…' : 'Run Agent Now'} primary onClick={onRunNow} disabled={busy} />
        <ActionButton label="Pause Agent" disabled title="Placeholder — disable schedule in a future release" />
        <ActionButton label="Edit Schedule" disabled title="Placeholder — schedule editor coming soon" />
      </div>
    </div>
  );
}
