import React from 'react';
import type { DmrvReport } from './dmrvReportTypes';

function Meta({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-slate-800">{value}</dd>
    </div>
  );
}

export function DmrvReportPreviewEvidence({ report }: { report: DmrvReport }): React.ReactElement {
  const s = report.evidenceSummary;
  const baseline = report.biomassTimeline.find((b) => b.snapshotType === 'baseline');
  const current = report.biomassTimeline.find((b) => b.snapshotType === 'current');
  const comparison = report.biomassTimeline.find((b) => b.snapshotType === 'comparison');

  return (
    <>
      <section id="satellite-review-history" className="dmrv-report-section mb-10 border-t border-slate-100 pt-8">
        <h2 className="text-lg font-black text-[#1e3a5f]">Satellite review history</h2>
        <p className="mt-1 text-xs text-slate-500">Last review: {s.lastSatelliteReviewAt}</p>
        {report.satelliteReviewHistory.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No satellite reviews recorded yet.</p>
        ) : (
          <table className="mt-4 w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                <th className="py-2 pr-2">Date</th>
                <th className="py-2 pr-2">Satellite / sensor</th>
                <th className="py-2 pr-2">Indices</th>
                <th className="py-2 pr-2">Summary</th>
                <th className="py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.satelliteReviewHistory.map((r) => (
                <tr key={r.reviewId} className="border-b border-slate-50">
                  <td className="py-2 pr-2">{r.reviewedAt.slice(0, 10)}</td>
                  <td className="py-2 pr-2">
                    {r.satellite}
                    {r.sensor ? ` / ${r.sensor}` : ''}
                  </td>
                  <td className="py-2 pr-2">{r.indices.join(', ')}</td>
                  <td className="py-2 pr-2">{r.resultSummary}</td>
                  <td className="py-2 text-right uppercase">{r.status.replace('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section id="biomass-timeline" className="dmrv-report-section mb-10 border-t border-slate-100 pt-8">
        <h2 className="text-lg font-black text-[#1e3a5f]">Biomass baseline vs current</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Meta label="Baseline biomass" value={s.baselineBiomassTonsPerHa} />
          <Meta label="Current biomass" value={s.currentBiomassTonsPerHa} />
          <Meta label="Change" value={s.biomassChangeTonsPerHa} />
          <Meta label="Last biomass update" value={s.lastBiomassUpdateAt} />
        </dl>
        {(baseline || current || comparison) && (
          <table className="mt-4 w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                <th className="py-2">Type</th>
                <th className="py-2">Biomass t/ha</th>
                <th className="py-2">CO₂e</th>
                <th className="py-2">Method</th>
                <th className="py-2 text-right">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {report.biomassTimeline.map((b) => (
                <tr key={b.snapshotId} className="border-b border-slate-50">
                  <td className="py-2 capitalize">{b.snapshotType.replace('_', ' ')}</td>
                  <td className="py-2">
                    {b.estimatedBiomassTonsPerHa !== undefined ? b.estimatedBiomassTonsPerHa.toFixed(1) : 'Missing'}
                  </td>
                  <td className="py-2">
                    {b.estimatedCo2e !== undefined ? b.estimatedCo2e.toFixed(1) : 'Missing'}
                  </td>
                  <td className="py-2">{b.calculationMethod}</td>
                  <td className="py-2 text-right">{b.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section id="threat-register" className="dmrv-report-section mb-10 border-t border-slate-100 pt-8">
        <h2 className="text-lg font-black text-[#1e3a5f]">Threat register</h2>
        <p className="mt-1 text-xs text-slate-500">Open threats: {s.openThreatCount}</p>
        {report.threatRegister.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No threats registered.</p>
        ) : (
          <table className="mt-4 w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                <th className="py-2">Type</th>
                <th className="py-2">Severity</th>
                <th className="py-2">Description</th>
                <th className="py-2">Action</th>
                <th className="py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.threatRegister.map((t) => (
                <tr key={t.threatId} className="border-b border-slate-50">
                  <td className="py-2">{t.threatType.replace(/_/g, ' ')}</td>
                  <td className="py-2">{t.severity}</td>
                  <td className="py-2">{t.description}</td>
                  <td className="py-2">{t.recommendedAction}</td>
                  <td className="py-2 text-right">{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section id="validator-missions" className="dmrv-report-section mb-10 border-t border-slate-100 pt-8">
        <h2 className="text-lg font-black text-[#1e3a5f]">Validator mission ledger</h2>
        {report.validatorMissions.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No validator missions dispatched yet.</p>
        ) : (
          <table className="mt-4 w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                <th className="py-2">Mission</th>
                <th className="py-2">Type</th>
                <th className="py-2">Evidence</th>
                <th className="py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.validatorMissions.map((m) => (
                <tr key={m.missionId} className="border-b border-slate-50">
                  <td className="py-2 font-medium">{m.title}</td>
                  <td className="py-2">{m.missionType.replace(/_/g, ' ')}</td>
                  <td className="py-2">{m.evidenceCollected.length ? m.evidenceCollected.join(', ') : 'Missing'}</td>
                  <td className="py-2 text-right">{m.missionStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section id="blockchain-anchor-ledger" className="dmrv-report-section mb-10 border-t border-slate-100 pt-8">
        <h2 className="text-lg font-black text-[#1e3a5f]">Blockchain anchor ledger</h2>
        {(report.unanchoredChanges || report.anchorState.hasUnanchoredChanges) && (
          <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            This report has changes that have not yet been anchored.
          </p>
        )}
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Meta label="Current report hash" value={report.anchorState.currentReportHash.slice(0, 24) + '…'} />
          <Meta label="Anchored version" value={s.anchoredVersionLabel} />
        </dl>
        {report.blockchainAnchorLedger.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No per-object anchors yet.</p>
        ) : (
          <table className="mt-4 w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                <th className="py-2">Type</th>
                <th className="py-2">Object</th>
                <th className="py-2">Hash</th>
                <th className="py-2 text-right">When</th>
              </tr>
            </thead>
            <tbody>
              {report.blockchainAnchorLedger.map((a) => (
                <tr key={a.anchorId} className="border-b border-slate-50">
                  <td className="py-2">{a.anchorType.replace(/_/g, ' ')}</td>
                  <td className="py-2 font-mono text-[10px]">{a.sourceObjectId}</td>
                  <td className="py-2 font-mono text-[10px]">{(a.reportJsonHash ?? '').slice(0, 12)}…</td>
                  <td className="py-2 text-right">{a.createdAt.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section id="verifier-checklist" className="dmrv-report-section mb-10 border-t border-slate-100 pt-8">
        <h2 className="text-lg font-black text-[#1e3a5f]">Verifier review checklist (VVB readiness)</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {s.verifierReadinessGaps.length === 0 ? (
            <li>No automated gaps flagged — human verifier review still required.</li>
          ) : (
            s.verifierReadinessGaps.map((g) => <li key={g}>{g}</li>)
          )}
        </ul>
      </section>
    </>
  );
}
