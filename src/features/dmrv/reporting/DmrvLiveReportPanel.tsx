import React, { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Copy, FileText, Package, Printer, Shield, Sparkles } from '../../../../components/icons';
import { DmrvAiConfigHelper } from '../components/DmrvAiConfigHelper';
import { dmrvReportPreviewPath } from '../dmrvNavigation';
import { getDmrvProjectContext } from '../services/dmrvProjectContextService';
import { generateDmrvEvidencePacket, listDmrvInputConfigsForProject } from '../services/dmrvInputConfigService';
import { DmrvReportDisclaimer } from './DmrvReportDisclaimer';
import { useDmrvReport } from './useDmrvReport';
import { rebuildAndPersistDmrvReport } from './dmrvReportStore';
import type { DmrvReportEvidenceSummary } from './dmrvReportEvidenceTypes';
import type { DmrvReportSection } from './dmrvReportTypes';

const STATUS_CHIP: Record<string, string> = {
  complete: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  partial: 'bg-sky-50 text-sky-900 border-sky-200',
  missing: 'bg-slate-100 text-slate-600 border-slate-200',
  needs_review: 'bg-amber-50 text-amber-900 border-amber-200',
};

export type DmrvLiveReportPanelProps = {
  projectId: string;
  categorySlug: string;
  typeId: string;
  workflowStep?: string;
};

export function DmrvLiveReportPanel({
  projectId,
  categorySlug,
  typeId,
  workflowStep,
}: DmrvLiveReportPanelProps): React.ReactElement {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [aiSection, setAiSection] = useState<DmrvReportSection | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    report,
    refresh,
    snapshot,
    anchorVersion,
    copyVerifierSummary,
    exportJson,
    missingSections,
    completedSections,
    needsReviewSections,
  } = useDmrvReport(projectId);

  const project = useMemo(() => getDmrvProjectContext(projectId), [projectId, report?.updatedAt]);

  const aiContext = useMemo(() => {
    if (!report) return '';
    const missing = missingSections.map((s) => s.title).join(', ') || 'none';
    const needsReview = needsReviewSections.map((s) => s.title).join(', ') || 'none';
    const satellite = report.dataSourceContext.selectedSatellites || report.dataSourceContext.satelliteProvider;
    const s = report.evidenceSummary;
    const unanchored = report.unanchoredChanges || report.anchorState.hasUnanchoredChanges
      ? 'This report has unanchored changes since the last blockchain anchor.'
      : 'Current report hash matches the last anchor (or no anchor yet).';
    const lastReview = report.satelliteReviewHistory[report.satelliteReviewHistory.length - 1];
    return [
      `Living dMRV evidence report for ${report.projectContext?.projectName || projectId}.`,
      `Category: ${report.categoryLabel}, type: ${report.typeLabel}, template: ${report.reportType}.`,
      lastReview
        ? `Your last satellite review was ${s.lastSatelliteReviewAt} using ${lastReview.satellite} (${lastReview.status}).`
        : 'No satellite review on record yet.',
      s.baselineBiomassTonsPerHa !== 'Missing' && s.currentBiomassTonsPerHa === 'Missing'
        ? 'Baseline biomass exists, but current biomass has not been calculated.'
        : `Baseline biomass: ${s.baselineBiomassTonsPerHa}; current: ${s.currentBiomassTonsPerHa}; change: ${s.biomassChangeTonsPerHa}.`,
      s.openThreatCount > 0
        ? `I found ${s.openThreatCount} open threat(s). Ask if the user wants to create validator missions.`
        : 'No open threats in the register.',
      `Validator missions: ${s.validatorMissionCount}; evidence packets: ${s.evidencePacketCount}.`,
      `Anchored version: ${s.anchoredVersionLabel}.`,
      `AOI: ${report.interoperabilityContext.metadata.aoiGeometrySummary || 'Not Yet Configured'}.`,
      `Methodology: ${report.methodologyContext.name || 'Missing'}.`,
      `Satellite: ${satellite || 'Not Yet Configured'}; cloud limit: ${report.dataSourceContext.cloudCoverLimit || 'Missing'}.`,
      `Field plots: ${report.fieldPlotContext.plotCount} plot(s) — ${report.fieldPlotContext.status === 'missing' ? 'incomplete for verifier review' : report.fieldPlotContext.status}.`,
      `Readiness ${report.readinessScore.overall}%. Missing sections: ${missing}. Needs review: ${needsReview}.`,
      unanchored,
      `Verifier gaps: ${s.verifierReadinessGaps.join('; ') || 'none'}.`,
      aiSection
        ? `User asks about "${aiSection.title}" (${aiSection.status}). Missing hints: ${aiSection.missingHints.join('; ') || 'none'}.`
        : '',
      'Never invent measurements, credits, or validator approval. Use Missing / Needs Review / Not Yet Configured for unknown fields.',
    ].join('\n');
  }, [aiSection, missingSections, needsReviewSections, projectId, report]);

  const latestVersion = report?.versions[report.versions.length - 1];

  const handleFillMissingWithAi = useCallback(() => {
    rebuildAndPersistDmrvReport(projectId, {
      actor: 'ai',
      workflowStep: workflowStep ?? 'ai-assist',
      changeSummary: 'Refreshed report from saved workflow data (no invented field values)',
    });
    const gaps = report?.evidenceSummary.verifierReadinessGaps ?? [];
    setAiSection(missingSections[0] ?? needsReviewSections[0] ?? null);
    setNotice(
      gaps.length
        ? `Report refreshed. Ask the AI helper below: "What is missing for verifier review?" (${gaps.length} gap(s) flagged).`
        : 'Report refreshed. Use the AI helper below to ask about satellite, biomass, or threats.',
    );
  }, [missingSections, needsReviewSections, projectId, report?.evidenceSummary.verifierReadinessGaps, workflowStep]);

  const handleAnchorReport = useCallback(async () => {
    if (!report || !latestVersion) {
      setNotice('Save a report snapshot before anchoring.');
      return;
    }
    setBusy(true);
    const anchored = await anchorVersion(latestVersion.versionId, {
      evidencePacketId: report.evidenceContext.evidencePacketIds[0],
      evidenceBundleHash: report.evidenceContext.evidencePacketIds.join('|') || undefined,
    });
    setBusy(false);
    if (anchored) {
      setNotice('Report version anchored (hash + references only — not full PDF on-chain).');
    }
  }, [anchorVersion, latestVersion, report]);

  const handleAddToEvidencePacket = useCallback(async () => {
    const configs = listDmrvInputConfigsForProject(projectId);
    const target = configs.find((c) => c.configType === 'satellite') ?? configs[0];
    if (!target) {
      setNotice('Configure an evidence input before generating a packet.');
      return;
    }
    setBusy(true);
    const result = await generateDmrvEvidencePacket(target);
    setBusy(false);
    if (result.ok) {
      refresh({
        workflowStep: 'evidence-packet',
        changeSummary: `Evidence packet ${result.packetId ?? 'created'} linked to living report`,
        actor: 'user',
      });
      snapshot('Evidence Packet Generated v0.8', 'evidence-packet');
      setNotice(result.message);
    } else {
      setNotice(result.message);
    }
  }, [projectId, refresh, snapshot]);

  if (!report) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Live report unavailable — save a project ID first.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#1e3a5f]/20 bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-t-2xl bg-[#1e3a5f] px-4 py-3 text-left text-white"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
      >
        <span>
          <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-white/70">
            Living report · v{report.version}
          </span>
          <span className="text-sm font-bold">Live dMRV Evidence Report</span>
        </span>
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>

      {!collapsed ? (
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#1e3a5f]/30 bg-[#e8f0f7] px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#1e3a5f]">
              {report.reportType}
            </span>
            <span className="text-[10px] text-slate-500">
              Updated {new Date(report.updatedAt).toLocaleString()}
            </span>
          </div>

          {(report.unanchoredChanges || report.anchorState.hasUnanchoredChanges) ? (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-950">
              Unanchored changes: Yes — this report has changes that have not yet been anchored.
            </p>
          ) : report.blockchainAnchors.length > 0 ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900">
              Last anchor: {new Date(report.anchorState.lastAnchoredAt ?? '').toLocaleString()} · hash{' '}
              <span className="font-mono text-[10px]">{report.anchorState.lastAnchoredHash?.slice(0, 12)}…</span>
            </p>
          ) : null}

          <div>
            <div className="flex items-end justify-between gap-2">
              <p className="text-xs font-semibold text-slate-600">Report readiness score</p>
              <p className="text-2xl font-black text-[#1e3a5f]">{report.readinessScore.overall}%</p>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#1e3a5f] transition-all"
                style={{ width: `${report.readinessScore.overall}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              {completedSections.length} complete · {missingSections.length} missing ·{' '}
              {needsReviewSections.length} need review
            </p>
          </div>

          <EvidenceMetricsGrid summary={report.evidenceSummary} />

          <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2 text-[10px] text-slate-600">
            <p>
              <span className="font-bold text-slate-800">Report hash:</span>{' '}
              <span className="font-mono">{report.anchorState.currentReportHash.slice(0, 16)}…</span>
            </p>
            {report.evidenceContext.evidencePacketIds[0] ? (
              <p className="mt-0.5">
                <span className="font-bold text-slate-800">Evidence packet:</span>{' '}
                {report.evidenceContext.evidencePacketIds[0]}
              </p>
            ) : null}
          </div>

          <SectionList title="Missing sections" sections={missingSections} />
          <SectionList title="Needs review" sections={needsReviewSections} emptyLabel="No review flags." />
          <SectionList
            title="Complete"
            sections={completedSections.slice(0, 4)}
            emptyLabel="None yet — configure workflow steps to populate the report."
          />

          {report.versions.length > 0 ? (
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Version history</p>
              <ul className="mt-1 max-h-28 space-y-1 overflow-y-auto text-[11px]">
                {report.versions
                  .slice()
                  .reverse()
                  .map((v) => (
                    <li key={v.versionId} className="rounded border border-slate-100 bg-white px-2 py-1">
                      <span className="font-semibold text-slate-800">{v.label}</span>
                      <span className="text-slate-500"> · {new Date(v.createdAt).toLocaleString()}</span>
                      {v.anchored ? (
                        <span className="ml-1 text-emerald-700">anchored</span>
                      ) : null}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          {notice ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">{notice}</p>
          ) : null}

          <div className="flex flex-col gap-2">
            <PanelBtn
              label="Preview Full Report"
              icon={<FileText className="h-3.5 w-3.5" />}
              onClick={() => navigate(dmrvReportPreviewPath(projectId, categorySlug, typeId))}
            />
            <PanelBtn
              label={busy ? 'Anchoring…' : 'Anchor Snapshot'}
              icon={<Shield className="h-3.5 w-3.5" />}
              onClick={() => void handleAnchorReport()}
              disabled={busy || !latestVersion}
            />
            <PanelBtn
              label="Export PDF"
              icon={<Printer className="h-3.5 w-3.5" />}
              onClick={() =>
                navigate(dmrvReportPreviewPath(projectId, categorySlug, typeId, { print: true }))
              }
            />
            <PanelBtn
              label="Export JSON"
              icon={<Copy className="h-3.5 w-3.5" />}
              onClick={() => {
                exportJson();
                setNotice('Report JSON exported to clipboard/download flow.');
              }}
            />
            <PanelBtn label="Copy Verifier Summary" icon={<Copy className="h-3.5 w-3.5" />} onClick={() => { copyVerifierSummary(); setNotice('Verifier summary copied.'); }} />
            <PanelBtn
              label="Fill Missing With AI"
              icon={<Sparkles className="h-3.5 w-3.5" />}
              onClick={handleFillMissingWithAi}
            />
            <PanelBtn
              label="Explain This Section"
              icon={<Sparkles className="h-3.5 w-3.5" />}
              onClick={() => {
                const target = aiSection ?? missingSections[0] ?? needsReviewSections[0] ?? completedSections[0];
                if (target) setAiSection(target);
                else setNotice('No sections to explain yet — configure a workflow step first.');
              }}
            />
            <PanelBtn
              label={busy ? 'Working…' : 'Add to Evidence Packet'}
              icon={<Package className="h-3.5 w-3.5" />}
              onClick={() => void handleAddToEvidencePacket()}
              disabled={busy}
            />
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">AI helper</p>
              <div className="flex flex-wrap gap-1">
                {(aiSection ? [aiSection] : missingSections.slice(0, 3)).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => setAiSection(s)}
                  >
                    Explain: {s.title}
                  </button>
                ))}
              </div>
              <DmrvAiConfigHelper
                variant="input"
                compact
                contextSummary={aiContext}
                autofillPrompt="Analyze this living dMRV report. List missing sections and safe next steps. Do not invent data. Mark unknowns as Missing, Needs Review, or Not Yet Configured."
              />
            </div>

          <DmrvReportDisclaimer reportType={report.reportType} compact />

          {project ? (
            <Link
              to={`/dmrv/projects/${encodeURIComponent(projectId)}/config`}
              className="block text-center text-[11px] font-semibold text-[#1e3a5f] underline"
            >
              Edit project configuration
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SectionList({
  title,
  sections,
  emptyLabel,
}: {
  title: string;
  sections: DmrvReportSection[];
  emptyLabel?: string;
}): React.ReactElement {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{title}</p>
      {sections.length === 0 ? (
        <p className="mt-1 text-xs text-slate-500">{emptyLabel ?? '—'}</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {sections.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-slate-800">{s.title}</span>
              <span
                className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase ${STATUS_CHIP[s.status]}`}
              >
                {s.status.replace('_', ' ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EvidenceMetricsGrid({ summary }: { summary: DmrvReportEvidenceSummary }): React.ReactElement {
  const rows: { label: string; value: string }[] = [
    { label: 'Last satellite review', value: summary.lastSatelliteReviewAt },
    { label: 'Last biomass update', value: summary.lastBiomassUpdateAt },
    { label: 'Baseline biomass', value: summary.baselineBiomassTonsPerHa },
    { label: 'Current biomass', value: summary.currentBiomassTonsPerHa },
    { label: 'Open threats', value: String(summary.openThreatCount) },
    { label: 'Validator missions', value: String(summary.validatorMissionCount) },
    { label: 'Evidence packets', value: String(summary.evidencePacketCount) },
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-2 gap-y-1.5 rounded-lg border border-[#1e3a5f]/15 bg-[#f8fafc] px-2.5 py-2 text-[10px]">
      {rows.map((r) => (
        <div key={r.label}>
          <dt className="font-bold uppercase tracking-wide text-slate-500">{r.label}</dt>
          <dd className="font-semibold text-slate-800">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PanelBtn({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#1e3a5f]/25 bg-white px-3 py-2 text-xs font-semibold text-[#1e3a5f] hover:bg-[#e8f0f7] disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}
