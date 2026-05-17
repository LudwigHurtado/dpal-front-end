import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Copy, Printer } from '../../../../components/icons';
import { DmrvBreadcrumb } from '../components/DmrvBreadcrumb';
import { getCategoryBySlug } from '../dmrvRegistry';
import { dmrvCategoryPath } from '../dmrvNavigation';
import { DmrvReportDisclaimer } from './DmrvReportDisclaimer';
import { useDmrvReport } from './useDmrvReport';
import type { DmrvReport } from './dmrvReportTypes';
import { DmrvReportPreviewEvidence } from './DmrvReportPreviewEvidence';
import './dmrvReportPrint.css';

const STATUS_CHIP: Record<string, string> = {
  complete: 'bg-emerald-100 text-emerald-800',
  partial: 'bg-sky-100 text-sky-900',
  missing: 'bg-slate-100 text-slate-600',
  needs_review: 'bg-amber-100 text-amber-900',
};

export default function DmrvReportPreviewPage(): React.ReactElement {
  const { projectId = '', categorySlug = '' } = useParams<{
    projectId: string;
    categorySlug: string;
  }>();
  const [searchParams] = useSearchParams();
  const typeId = searchParams.get('typeId') ?? 'forest-land-use';
  const shouldPrint = searchParams.get('print') === 'true';
  const navigate = useNavigate();
  const category = getCategoryBySlug(categorySlug);
  const { report, refresh, copyVerifierSummary, exportJson } = useDmrvReport(projectId);

  useEffect(() => {
    refresh({ workflowStep: 'report-preview', changeSummary: 'Opened report preview', actor: 'user' });
  }, [projectId, refresh]);

  useEffect(() => {
    if (shouldPrint && report) {
      const t = window.setTimeout(() => window.print(), 400);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [shouldPrint, report]);

  const backPath = useMemo(
    () => dmrvCategoryPath(categorySlug, typeId, projectId),
    [categorySlug, projectId, typeId],
  );

  if (!report) {
    return (
      <p className="p-6 text-sm text-slate-600">
        Report not available.{' '}
        <Link to="/dmrv" className="font-semibold underline">
          Return to DMRV hub
        </Link>
      </p>
    );
  }

  return (
    <div className="min-h-full bg-[#f4f6f9] text-slate-900">
      <div className="dmrv-report-no-print mx-auto max-w-[900px] px-4 py-4">
        <DmrvBreadcrumb
          crumbs={[
            { label: 'DMRV', onClick: () => navigate('/dmrv') },
            { label: category?.title ?? categorySlug, onClick: () => navigate(backPath) },
            { label: 'Living dMRV Report' },
          ]}
        />
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to workflow
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 rounded-lg bg-[#1e3a5f] px-3 py-2 text-xs font-semibold text-white"
          >
            <Printer className="h-3.5 w-3.5" />
            Export PDF / Print
          </button>
          <button
            type="button"
            onClick={() => copyVerifierSummary()}
            className="inline-flex items-center gap-1 rounded-lg border border-[#1e3a5f]/30 bg-white px-3 py-2 text-xs font-semibold text-[#1e3a5f]"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy verifier summary
          </button>
          <button
            type="button"
            onClick={() => {
              const json = exportJson();
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${projectId}-dmrv-interoperability.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            Download JSON
          </button>
        </div>
      </div>

      <article className="dmrv-report-print-root mx-auto max-w-[900px] bg-white px-8 py-10 shadow-sm print:shadow-none sm:rounded-2xl sm:border sm:border-slate-200">
        <header className="border-b border-slate-200 pb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1e3a5f]">
            DPAL Living dMRV Evidence Report
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-900 md:text-3xl">
            {report.projectContext?.projectName || report.projectId}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {report.categoryLabel} · {report.typeLabel} · Template: {report.reportType}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip label={`Readiness ${report.readinessScore.overall}%`} />
            <Chip label={report.status.replace(/_/g, ' ')} />
            <Chip label={`v${report.version}`} />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Report ID {report.reportId} · Updated {new Date(report.updatedAt).toLocaleString()}
          </p>
        </header>

        <nav className="my-8">
          <h2 className="text-sm font-black uppercase tracking-wide text-[#1e3a5f]">Table of contents</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            {report.sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#section-${s.id}`} className="hover:underline">
                  {i + 1}. {s.title}{' '}
                  <span className="text-[10px] uppercase text-slate-400">({s.status.replace('_', ' ')})</span>
                </a>
              </li>
            ))}
            <li>
              <a href="#satellite-review-history" className="hover:underline">
                Satellite review history
              </a>
            </li>
            <li>
              <a href="#biomass-timeline" className="hover:underline">
                Biomass baseline vs current
              </a>
            </li>
            <li>
              <a href="#threat-register" className="hover:underline">
                Threat register
              </a>
            </li>
            <li>
              <a href="#validator-missions" className="hover:underline">
                Validator mission ledger
              </a>
            </li>
            <li>
              <a href="#blockchain-anchor-ledger" className="hover:underline">
                Blockchain anchor ledger
              </a>
            </li>
            <li>
              <a href="#verifier-checklist" className="hover:underline">
                Verifier review checklist
              </a>
            </li>
            <li>
              <a href="#audit-trail" className="hover:underline">
                Audit trail
              </a>
            </li>
            <li>
              <a href="#blockchain-audit" className="hover:underline">
                Blockchain audit trail
              </a>
            </li>
            <li>
              <a href="#version-history" className="hover:underline">
                Version history
              </a>
            </li>
            <li>
              <a href="#interoperability" className="hover:underline">
                Interoperability metadata
              </a>
            </li>
          </ol>
        </nav>

        <section className="mb-10 dmrv-report-section">
          <h2 className="text-lg font-black text-[#1e3a5f]">Executive summary</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            This draft aggregates configuration from project setup, satellite and data sources, evidence inputs,
            field plots, validation rules, evidence packets, and blockchain anchors. Empty fields are labeled{' '}
            <strong>Missing</strong>, <strong>Needs Review</strong>, or <strong>Not Yet Configured</strong> — DPAL does
            not invent measurements or credit quantities.
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Meta label="AOI / location" value={report.interoperabilityContext.metadata.aoiGeometrySummary || 'Missing'} />
            <Meta label="Reporting period" value={report.interoperabilityContext.metadata.reportingPeriod || 'Missing'} />
            <Meta label="Methodology" value={report.methodologyContext.name || 'Missing'} />
            <Meta
              label="Satellite / provider"
              value={
                report.dataSourceContext.selectedSatellites ||
                report.dataSourceContext.satelliteProvider ||
                'Not Yet Configured'
              }
            />
          </dl>
        </section>

        <StructuredContextSections report={report} />

        <DmrvReportPreviewEvidence report={report} />

        <section className="mb-10 dmrv-report-section">
          <h2 className="text-lg font-black text-[#1e3a5f]">CMI readiness themes</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {report.readinessScore.cmiThemes.map((t) => (
              <div key={t.theme} className="rounded-lg border border-slate-200 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800">{t.label}</span>
                  <span className="text-xs font-bold text-[#1e3a5f]">{t.score}%</span>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-500">{t.rationale}</p>
              </div>
            ))}
          </div>
        </section>

        {report.sections.map((section) => (
          <section
            key={section.id}
            id={`section-${section.id}`}
            className="dmrv-report-section mb-10 border-t border-slate-100 pt-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-black text-slate-900">{section.title}</h2>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_CHIP[section.status]}`}>
                {section.status.replace('_', ' ')}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{section.summary}</p>
            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Field</th>
                  <th className="py-2">Value</th>
                  <th className="py-2 pl-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {section.fields.map((f) => (
                  <tr key={f.key} className="border-b border-slate-50">
                    <td className="py-2 pr-4 font-medium text-slate-700">{f.label}</td>
                    <td className="py-2 text-slate-800">{f.value}</td>
                    <td className="py-2 pl-4 text-right text-[10px] uppercase text-slate-500">{f.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        <section id="blockchain-audit" className="dmrv-report-section mb-10 border-t border-slate-100 pt-8">
          <h2 className="text-lg font-black text-[#1e3a5f]">Blockchain audit trail</h2>
          {report.anchorState.hasUnanchoredChanges ? (
            <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              This report has changes that have not yet been anchored.
            </p>
          ) : null}
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Meta label="Current report hash" value={report.anchorState.currentReportHash} />
            <Meta
              label="Last anchored version"
              value={report.anchorState.lastAnchoredVersionId ?? 'Not anchored'}
            />
            <Meta
              label="Anchor timestamp"
              value={
                report.anchorState.lastAnchoredAt
                  ? new Date(report.anchorState.lastAnchoredAt).toLocaleString()
                  : '—'
              }
            />
            <Meta
              label="Evidence packet hash / refs"
              value={
                report.anchorState.evidencePacketHash ??
                (report.evidenceContext.evidencePacketIds.join(', ') || '—')
              }
            />
          </dl>
          {report.blockchainAnchors.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No blockchain anchors recorded yet.</p>
          ) : (
            <table className="mt-4 w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                  <th className="py-2">Time</th>
                  <th className="py-2">Version</th>
                  <th className="py-2">Report hash</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.blockchainAnchors
                  .slice()
                  .reverse()
                  .map((a) => (
                    <tr key={a.anchorId} className="border-b border-slate-50">
                      <td className="py-2">{new Date(a.timestamp).toLocaleString()}</td>
                      <td className="py-2 font-mono text-[10px]">{a.versionId}</td>
                      <td className="py-2 font-mono text-[10px]">{a.reportJsonHash.slice(0, 16)}…</td>
                      <td className="py-2">{a.status}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </section>

        <section id="version-history" className="dmrv-report-section mb-10 border-t border-slate-100 pt-8">
          <h2 className="text-lg font-black text-[#1e3a5f]">Report version history</h2>
          {report.versions.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No saved versions yet.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {report.versions
                .slice()
                .reverse()
                .map((v) => (
                  <li key={v.versionId} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="font-semibold text-slate-900">{v.label}</p>
                    <p className="text-xs text-slate-600">
                      {new Date(v.createdAt).toLocaleString()} · hash {v.reportJsonHash.slice(0, 14)}…
                      {v.anchored ? ' · anchored' : ''}
                    </p>
                  </li>
                ))}
            </ul>
          )}
        </section>

        <section id="audit-trail" className="dmrv-report-section mb-10 border-t border-slate-100 pt-8">
          <h2 className="text-lg font-black text-[#1e3a5f]">Audit trail</h2>
          {report.auditTrail.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No audit events yet.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-xs">
              {report.auditTrail.slice().reverse().map((e) => (
                <li key={e.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="font-mono text-[10px] text-slate-500">{e.timestamp}</span>
                  <span className="mx-2 font-bold text-slate-700">{e.actor}</span>
                  <span className="text-slate-600">{e.workflowStep}</span>
                  <p className="mt-1 text-slate-800">{e.newSummary}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="interoperability" className="dmrv-report-section mb-10 border-t border-slate-100 pt-8">
          <h2 className="text-lg font-black text-[#1e3a5f]">Interoperability metadata (appendix)</h2>
          <pre className="mt-4 max-h-[320px] overflow-auto rounded-lg bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-100">
            {JSON.stringify(report.interoperabilityContext.metadata, null, 2)}
          </pre>
        </section>

        <DmrvReportDisclaimer reportType={report.reportType} />
      </article>
    </div>
  );
}

function Chip({ label }: { label: string }): React.ReactElement {
  return (
    <span className="rounded-full bg-[#e8f0f7] px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#1e3a5f]">
      {label}
    </span>
  );
}

function Meta({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-slate-800">{value}</dd>
    </div>
  );
}

function StructuredContextSections({ report }: { report: DmrvReport }): React.ReactElement {
  const loc = report.projectContext?.location;
  const aoiSummary =
    report.interoperabilityContext.metadata.aoiGeometrySummary ||
    loc?.aoiSummary ||
    (loc?.latitude && loc?.longitude ? `${loc.latitude}, ${loc.longitude}` : 'Missing');

  return (
    <>
      <section id="project-identity" className="dmrv-report-section mb-10 border-t border-slate-100 pt-8">
        <h2 className="text-lg font-black text-[#1e3a5f]">Project identity & AOI</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Meta label="Project" value={report.projectContext?.projectName || 'Missing'} />
          <Meta label="Organization" value={report.projectContext?.organization || 'Missing'} />
          <Meta label="AOI / geometry" value={aoiSummary} />
          <Meta label="Country / region" value={loc?.countryRegion || 'Missing'} />
          <Meta label="Reporting period" value={report.interoperabilityContext.metadata.reportingPeriod || 'Missing'} />
        </dl>
      </section>

      <section id="data-sources" className="dmrv-report-section mb-10 border-t border-slate-100 pt-8">
        <h2 className="text-lg font-black text-[#1e3a5f]">Data source configuration</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Meta label="Provider" value={report.dataSourceContext.satelliteProvider || 'Not Yet Configured'} />
          <Meta label="Satellites" value={report.dataSourceContext.selectedSatellites || 'Missing'} />
          <Meta label="Cloud cover limit" value={report.dataSourceContext.cloudCoverLimit || 'Missing'} />
          <Meta label="Spatial resolution" value={report.dataSourceContext.spatialResolution || 'Missing'} />
          <Meta label="Source IDs" value={report.dataSourceContext.sourceIds || 'Missing'} />
          <Meta label="API status" value={report.dataSourceContext.apiStatus || 'Not Yet Configured'} />
        </dl>
      </section>

      <section id="evidence-sources" className="dmrv-report-section mb-10 border-t border-slate-100 pt-8">
        <h2 className="text-lg font-black text-[#1e3a5f]">Evidence sources & QA/QC</h2>
        <p className="mt-1 text-xs text-slate-500">QA/QC status: {report.evidenceContext.qaQcStatus}</p>
        {report.evidenceContext.evidenceRows.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No evidence inputs configured yet.</p>
        ) : (
          <table className="mt-4 w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                <th className="py-2 pr-2">Input</th>
                <th className="py-2 pr-2">Type</th>
                <th className="py-2 pr-2">Provider / refs</th>
                <th className="py-2 text-right">QA</th>
              </tr>
            </thead>
            <tbody>
              {report.evidenceContext.evidenceRows.map((row) => (
                <tr key={row.inputKey} className="border-b border-slate-50">
                  <td className="py-2 pr-2 font-medium">{row.inputLabel}</td>
                  <td className="py-2 pr-2">{row.configType}</td>
                  <td className="py-2 pr-2">{row.filesOrRefs}</td>
                  <td className="py-2 text-right uppercase">{row.qaStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section id="field-plots" className="dmrv-report-section mb-10 border-t border-slate-100 pt-8">
        <h2 className="text-lg font-black text-[#1e3a5f]">Field plots / ground truth</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Meta label="Plot count" value={String(report.fieldPlotContext.plotCount)} />
          <Meta label="Sampling method" value={report.fieldPlotContext.samplingMethod || 'Missing'} />
          <Meta label="Field measurements" value={report.fieldPlotContext.fieldMeasurementType || 'Missing'} />
          <Meta label="Linked satellite" value={report.fieldPlotContext.linkedSatellite || 'Not Yet Configured'} />
        </dl>
      </section>

      <section id="calculations" className="dmrv-report-section mb-10 border-t border-slate-100 pt-8">
        <h2 className="text-lg font-black text-[#1e3a5f]">Calculations</h2>
        <dl className="mt-4 grid gap-3 text-sm">
          <Meta label="Summary" value={report.calculationContext.summary} />
          <Meta label="Uncertainty" value={report.calculationContext.uncertaintyNote} />
        </dl>
      </section>

      <section id="validation-rules" className="dmrv-report-section mb-10 border-t border-slate-100 pt-8">
        <h2 className="text-lg font-black text-[#1e3a5f]">Validation rules</h2>
        {report.validationContext.rules.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No validation rules enabled.</p>
        ) : (
          <table className="mt-4 w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                <th className="py-2">Rule</th>
                <th className="py-2 text-center">On</th>
                <th className="py-2 text-right">Result</th>
              </tr>
            </thead>
            <tbody>
              {report.validationContext.rules.map((r) => (
                <tr key={r.ruleId} className="border-b border-slate-50">
                  <td className="py-2">{r.label}</td>
                  <td className="py-2 text-center">{r.enabled ? 'Yes' : 'No'}</td>
                  <td className="py-2 text-right uppercase">{r.result.replace('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section id="evidence-packet" className="dmrv-report-section mb-10 border-t border-slate-100 pt-8">
        <h2 className="text-lg font-black text-[#1e3a5f]">Verifier evidence packet & appendices</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Meta label="Packet title" value={report.evidencePacketContext.title} />
          <Meta label="Packet IDs" value={report.evidencePacketContext.packetIds.join(', ') || 'Missing'} />
          <Meta label="Visibility" value={report.evidencePacketContext.visibility} />
          <Meta label="Appendices" value={report.evidencePacketContext.appendicesSummary} />
        </dl>
      </section>
    </>
  );
}
