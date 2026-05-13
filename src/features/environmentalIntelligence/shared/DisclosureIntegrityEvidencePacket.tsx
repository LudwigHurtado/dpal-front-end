import React from 'react';
import type { DisclosureIntegrityFinding } from './disclosureIntegrityTypes';
import { getAnomalyBadgeClass, getLegalSafeFindingLabel, getRecommendedActions } from './anomalyScoring';
import { getSatelliteRegistryEntry } from './satelliteSourceRegistry';

const REQUIRED_DISCLAIMER =
  'Satellite-derived and public-record evidence is not automatically a final legal, regulatory, or carbon-credit determination. DPAL preserves the signal, source, location, timestamp, confidence level, and validation status so reviewers can evaluate the claim transparently.';

export type DisclosureIntegrityEvidencePacketProps = {
  finding: DisclosureIntegrityFinding;
};

export const DisclosureIntegrityEvidencePacket: React.FC<DisclosureIntegrityEvidencePacketProps> = ({ finding }) => {
  const actions = getRecommendedActions(finding);
  const statusLabel = getLegalSafeFindingLabel(finding.anomalyStatus);
  const badgeClass = getAnomalyBadgeClass(finding.anomalyStatus);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="border-b border-slate-100 pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Disclosure integrity evidence</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">
          {finding.companyName}
          {finding.facilityName ? <span className="text-slate-600"> — {finding.facilityName}</span> : null}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>{statusLabel}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Anomaly score: {finding.anomalyScore}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Confidence: {finding.confidenceLevel.replace(/_/g, ' ')}
          </span>
        </div>
        {finding.evidenceStrengthSummary ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evidence strength</h3>
            <p className="mt-1 text-sm font-semibold text-slate-900">{finding.evidenceStrengthSummary.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{finding.evidenceStrengthSummary.detail}</p>
            <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">Tier: {finding.evidenceStrengthSummary.tier.replace(/_/g, ' ')}</p>
          </div>
        ) : null}
        {finding.providerReadinessSnapshot ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Provider readiness snapshot</h3>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700 sm:grid-cols-4">
              <div>
                <dt className="text-slate-500">Live</dt>
                <dd className="font-semibold">{finding.providerReadinessSnapshot.liveCount}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Partial</dt>
                <dd className="font-semibold">{finding.providerReadinessSnapshot.partialCount}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Metadata only</dt>
                <dd className="font-semibold">{finding.providerReadinessSnapshot.metadataOnlyCount}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Preview only</dt>
                <dd className="font-semibold">{finding.providerReadinessSnapshot.previewOnlyCount}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Planned / future</dt>
                <dd className="font-semibold">{finding.providerReadinessSnapshot.plannedOrFutureCount}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Unavailable</dt>
                <dd className="font-semibold">{finding.providerReadinessSnapshot.unavailableCount}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Not configured</dt>
                <dd className="font-semibold">{finding.providerReadinessSnapshot.notConfiguredCount}</dd>
              </div>
            </dl>
            {finding.providerReadinessSnapshot.warnings.length ? (
              <ul className="mt-2 list-disc pl-4 text-xs text-amber-900">
                {finding.providerReadinessSnapshot.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {finding.anomalyScoreExplanations?.length ? (
          <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/60 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-800">How the anomaly score shifts (transparent)</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-sky-950">
              {finding.anomalyScoreExplanations.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </header>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Claim reviewed</h3>
          <p className="mt-1 text-sm font-medium text-slate-900">{finding.claim.claimType.replace(/_/g, ' ')}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{finding.claim.claimText}</p>
          {finding.claim.reportingPeriod ? (
            <p className="mt-2 text-xs text-slate-500">Reporting period: {finding.claim.reportingPeriod}</p>
          ) : null}
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Legal-safe summary</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{finding.legalSafeSummary}</p>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observed signals &amp; source lanes</h3>
        <ul className="mt-2 space-y-2">
          {finding.observedSignals.map((s) => {
            const reg = getSatelliteRegistryEntry(s.providerId);
            return (
              <li key={s.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <span className="font-semibold text-slate-900">{s.providerLabel}</span>
                {reg ? (
                  <span className="ml-2 text-slate-500">
                    ({reg.status.replace(/_/g, ' ')} · {reg.confidenceRole.replace(/_/g, ' ')})
                  </span>
                ) : null}
                <div className="mt-1">
                  <span className="font-medium">Signal:</span> {s.signalType.replace(/_/g, ' ')}
                </div>
                {s.sourceModuleLabel ? (
                  <div className="mt-0.5 text-slate-600">
                    <span className="font-medium">Source module:</span> {s.sourceModuleLabel}
                  </div>
                ) : null}
                <div className="mt-1 text-slate-600">{s.sourceSummary}</div>
                {s.limitations.length ? (
                  <ul className="mt-1 list-disc pl-4 text-slate-500">
                    {s.limitations.map((L, i) => (
                      <li key={i}>{L}</li>
                    ))}
                  </ul>
                ) : null}
                {s.previewOnly ? (
                  <p className="mt-1 font-medium text-amber-800">Preview-only lane — not live verified.</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4 rounded-xl border border-slate-100 bg-white p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cross-module corroboration</h3>
        <p className="mt-1 text-xs text-slate-600">
          {(() => {
            const mods = new Set(finding.observedSignals.map((s) => s.sourceModuleId).filter(Boolean));
            const provs = new Set(finding.observedSignals.map((s) => s.providerId));
            return (
              <>
                <span className="font-medium text-slate-800">{mods.size}</span> distinct module
                {mods.size === 1 ? '' : 's'} linked in this packet;{' '}
                <span className="font-medium text-slate-800">{provs.size}</span> provider lane
                {provs.size === 1 ? '' : 's'} referenced. Corroboration supports triage — not automatic proof.
              </>
            );
          })()}
        </p>
      </div>

      {finding.riskFlags.length ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risk flags</h3>
          <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
            {finding.riskFlags.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recommended actions</h3>
        <ul className="mt-1 list-decimal pl-5 text-xs text-slate-700">
          {actions.map((a, i) => (
            <li key={i} className="py-0.5">
              {a}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:grid-cols-3">
        <div>
          <span className="font-semibold text-slate-700">Evidence packet</span>
          <p className="text-slate-600">{finding.evidencePacketReady ? 'Ready for export' : 'Shell / needs data'}</p>
        </div>
        <div>
          <span className="font-semibold text-slate-700">QR readiness</span>
          <p className="text-slate-600">{finding.qrReady ? 'QR payload can be generated' : 'Pending packet completeness'}</p>
        </div>
        <div>
          <span className="font-semibold text-slate-700">Blockchain audit</span>
          <p className="text-slate-600">
            {finding.blockchainReady
              ? 'Anchoring-ready when ledger route is configured'
              : 'Preview hash — not written to production ledger'}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Official record &amp; field validation</span>
        <p className="mt-1 text-xs text-slate-600">
          Attach EPA/CARB or other filing references when available. Field validation is required before operational or
          legal conclusions when signals remain screening-level, metadata-only, or preview-only.
        </p>
      </div>

      <div className="mt-4">
        <span className="font-semibold text-slate-700">Validator review</span>
        <p className="text-xs text-slate-600">
          {finding.anomalyStatus === 'requires_validator_review' || finding.anomalyStatus === 'high_priority_review'
            ? 'Validator review recommended based on anomaly status.'
            : 'Validator review optional — maintain reviewer trail regardless.'}
        </p>
      </div>

      <footer className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-sky-950">
        {REQUIRED_DISCLAIMER}
      </footer>
    </section>
  );
};

export default DisclosureIntegrityEvidencePacket;
