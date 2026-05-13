import React, { useCallback, useMemo, useState } from 'react';
import { ArrowLeft } from '../../../../components/icons';
import SatelliteAccountabilityInfographic from '../shared/SatelliteAccountabilityInfographic';
import DisclosureIntegrityEvidencePacket from '../shared/DisclosureIntegrityEvidencePacket';
import { buildExamplePreviewFinding, enrichDisclosureFinding } from '../shared/anomalyScoring';
import type { DisclosureClaimType, DisclosureIntegrityFinding } from '../shared/disclosureIntegrityTypes';
import {
  analyzeDisclosureIntegrity,
  buildDisclosureIntegrityEvidencePacket,
  getConnectedModuleStatus,
  getCrossModuleSignalPreview,
  getSatelliteAccountabilityProviderStatus,
} from '../../../services/satelliteAccountabilityApi';
import type {
  AccountabilityModuleStatusRow,
  AccountabilityProviderRow,
  AccountabilityProviderStatusBundle,
} from '../accountability/providerStatusAggregator';
import type { AccountabilityModuleStatus } from '../shared/accountabilityModuleAdapters';
import { getModuleStatusBadgeClass } from '../shared/accountabilityModuleAdapters';
import { getAccountabilityProviderStatus, groupProviderStatusByCategory } from '../accountability/providerStatusAggregator';

type Props = {
  onReturn: () => void;
};

const CLAIM_TYPES: DisclosureClaimType[] = [
  'carbon_credit',
  'net_zero',
  'methane_emissions',
  'co2_emissions',
  'water_quality',
  'forest_conservation',
  'deforestation_free',
  'pollution_control',
  'hazardous_waste',
  'sustainability_report',
  'regulatory_compliance',
  'other',
];

export const SatelliteAccountabilityPage: React.FC<Props> = ({ onReturn }) => {
  const [companyName, setCompanyName] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [claimType, setClaimType] = useState<DisclosureClaimType>('methane_emissions');
  const [claimText, setClaimText] = useState('');
  const [locationText, setLocationText] = useState('');
  const [reportingPeriod, setReportingPeriod] = useState('');
  const [togglePace, setTogglePace] = useState(true);
  const [toggleGedi, setToggleGedi] = useState(true);
  const [togglePublic, setTogglePublic] = useState(true);

  const [apiNotice, setApiNotice] = useState<string | null>(null);
  const [finding, setFinding] = useState<DisclosureIntegrityFinding>(() => buildExamplePreviewFinding());
  const [providerContext, setProviderContext] = useState<AccountabilityProviderStatusBundle>(() =>
    getAccountabilityProviderStatus(null),
  );

  const exampleFinding = useMemo(() => buildExamplePreviewFinding(), []);

  const crossModuleExamples = useMemo(() => [...getCrossModuleSignalPreview()], []);

  const runLocalPreview = useCallback(() => {
    const base = buildExamplePreviewFinding();
    const next: DisclosureIntegrityFinding = {
      ...base,
      id: `finding-local-${Date.now()}`,
      companyName: companyName.trim() || base.companyName,
      facilityName: facilityName.trim() || base.facilityName,
      claim: {
        ...base.claim,
        companyName: companyName.trim() || base.claim.companyName,
        facilityName: facilityName.trim() || base.claim.facilityName,
        claimType,
        claimText: claimText.trim() || base.claim.claimText,
        reportingPeriod: reportingPeriod.trim() || base.claim.reportingPeriod,
        location: locationText.trim() || base.claim.location,
      },
    };
    setFinding(enrichDisclosureFinding(next));
    setApiNotice('Preview scenario — not a live finding. Updated from local form (no API call).');
  }, [claimText, claimType, companyName, facilityName, locationText, reportingPeriod]);

  const tryAnalyzeApi = useCallback(async () => {
    setApiNotice(null);
    const res = await analyzeDisclosureIntegrity({
      companyName: companyName.trim() || 'Example Facility — Preview Only',
      facilityName: facilityName.trim() || undefined,
      claimType,
      claimText: claimText.trim() || 'Preview claim text',
      lat: undefined,
      lng: undefined,
      radiusKm: 10,
      reportingPeriod: reportingPeriod.trim() || undefined,
      selectedProviders: [
        ...(togglePace ? ['PACE_OCI'] : []),
        ...(toggleGedi ? ['GEDI_LIDAR'] : []),
        ...(togglePublic ? ['EPA_DATASET'] : []),
      ],
    });
    if (res.ok && res.finding) {
      setFinding(enrichDisclosureFinding(res.finding));
      setApiNotice(
        res.mode === 'live'
          ? 'Live mode response — verify each lane before publication.'
          : 'Live provider unavailable — preview mode only.',
      );
      if (res.warnings?.length) {
        setApiNotice((prev) => [prev, ...(res.warnings ?? [])].filter(Boolean).join(' '));
      }
      return;
    }
    runLocalPreview();
    setApiNotice((prev) => `${prev ?? ''} API unavailable — showing preview-only.`.trim());
  }, [claimText, claimType, companyName, facilityName, reportingPeriod, runLocalPreview, toggleGedi, togglePace, togglePublic]);

  const tryEvidencePacket = useCallback(async () => {
    const res = await buildDisclosureIntegrityEvidencePacket({ finding });
    if (res.ok && res.finding) {
      setFinding(enrichDisclosureFinding(res.finding as DisclosureIntegrityFinding));
      setApiNotice(res.shellMessage ?? 'Evidence packet shell returned.');
      return;
    }
    setApiNotice('Evidence packet shell — final scientific validation requires provider data, field validation, official records, or qualified review.');
  }, [finding]);

  React.useEffect(() => {
    void (async () => {
      const [p, m] = await Promise.all([getSatelliteAccountabilityProviderStatus(), getConnectedModuleStatus()]);
      if (p.ok) {
        setProviderContext(
          getAccountabilityProviderStatus({
            ok: true,
            lanes: p.lanes,
            providerSummary: p.providerSummary,
            providers: p.providers as AccountabilityProviderRow[] | undefined,
            mode: p.mode,
            warnings: [...(p.warnings ?? []), ...(m.notice ? [m.notice] : [])],
            ...(m.modules.length ? { modules: m.modules as AccountabilityModuleStatusRow[] } : {}),
          }),
        );
      } else {
        setProviderContext(
          getAccountabilityProviderStatus({
            ok: false,
            ...(m.modules.length ? { modules: m.modules as AccountabilityModuleStatusRow[] } : {}),
            warnings: m.notice ? [m.notice] : [],
          }),
        );
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-16 font-sans text-slate-900">
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <button
          type="button"
          onClick={onReturn}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Satellite Intelligence + Disclosure Integrity</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Accountability Engine</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
            Cross-check satellite signals, public records, company disclosures, and field evidence. Supports investigation
            and transparency — not automatic legal conclusions.
          </p>
        </section>

        <div className="mt-8">
          <SatelliteAccountabilityInfographic />
        </div>

        {providerContext.notice ? (
          <p className="mt-8 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            {providerContext.notice}
          </p>
        ) : null}

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Connected DPAL Modules</h2>
          <p className="mt-1 text-xs text-slate-500">
            Adapter summaries route evidence into the accountability model — they do not replace source modules.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {providerContext.modules.map((m) => (
              <article key={m.moduleId} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{m.label}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getModuleStatusBadgeClass(m.status as AccountabilityModuleStatus)}`}
                  >
                    {m.statusLabel}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{m.contributes}</p>
                <p className="mt-3 text-[10px] font-semibold uppercase text-slate-500">Supported claim types</p>
                <p className="text-xs text-slate-700">{m.supportedClaimTypes.join(', ')}</p>
                <p className="mt-2 text-[10px] font-semibold uppercase text-slate-500">Supported signal types</p>
                <p className="text-xs text-slate-700">{m.supportedSignalTypes.join(', ')}</p>
                {m.limitations.length ? (
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold uppercase text-slate-500">Limitations</p>
                    <ul className="list-disc pl-4 text-xs text-slate-600">
                      {m.limitations.map((L, i) => (
                        <li key={i}>{L}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {m.route ? (
                  <a className="mt-3 inline-block text-xs font-semibold text-sky-800 hover:underline" href={m.route}>
                    Open module
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Provider Readiness</h2>
          <p className="mt-1 text-xs text-slate-500">
            Registry lanes with honest labels: Live, Partial, Metadata only, Preview only, Planned, Future, Unavailable,
            Not configured.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-slate-500">Live</dt>
              <dd className="font-semibold text-slate-900">{providerContext.providerSummary.liveCount}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Partial</dt>
              <dd className="font-semibold text-slate-900">{providerContext.providerSummary.partialCount}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Metadata only</dt>
              <dd className="font-semibold text-slate-900">{providerContext.providerSummary.metadataOnlyCount}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Preview only</dt>
              <dd className="font-semibold text-slate-900">{providerContext.providerSummary.previewOnlyCount}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Planned / future</dt>
              <dd className="font-semibold text-slate-900">{providerContext.providerSummary.plannedOrFutureCount}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Unavailable</dt>
              <dd className="font-semibold text-slate-900">{providerContext.providerSummary.unavailableCount}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Not configured</dt>
              <dd className="font-semibold text-slate-900">{providerContext.providerSummary.notConfiguredCount}</dd>
            </div>
          </dl>
          {Object.entries(groupProviderStatusByCategory(providerContext.providers)).map(([group, rows]) => (
            <div key={group} className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{group.replace(/_/g, ' ')}</h3>
              <ul className="mt-2 space-y-1 text-xs text-slate-700">
                {rows.map((r) => (
                  <li key={r.id}>
                    <span className="font-semibold text-slate-900">{r.label}</span>{' '}
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                      {r.displayLabel}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Cross-Module Signal Summary</h2>
          <p className="mt-2 text-sm font-semibold text-amber-900">Example mapping — not a live finding.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Module</th>
                  <th className="py-2 pr-3 font-semibold">Signal type</th>
                  <th className="py-2 font-semibold">Typical outcome</th>
                </tr>
              </thead>
              <tbody>
                {crossModuleExamples.map((row) => (
                  <tr key={row.module} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium text-slate-900">{row.module}</td>
                    <td className="py-2 pr-3 text-slate-700">{row.signal}</td>
                    <td className="py-2 text-slate-600">{row.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:p-6">
          <h2 className="text-lg font-semibold text-slate-900">How the engine decides</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>A disclosure claim is not judged alone — it is compared to observations, public records, and field context.</li>
            <li>Satellite signals are cross-checked across lanes and modules when adapters are available.</li>
            <li>Official records provide strong triage context but still require qualified interpretation.</li>
            <li>Company text is treated as a claim record — parsed and compared without inferring intent or guilt.</li>
            <li>Anomaly score is a transparent review-priority heuristic — not a fraud verdict.</li>
            <li>Validator review is required before high-stakes external conclusions.</li>
          </ul>
        </section>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Disclosure integrity demo input</h2>
          <p className="mt-1 text-xs text-slate-500">
            Local preview — optional API analyze when `/api/satellite-accountability` is deployed on your API host.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-700">
              Company name
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Riverfront Energy Cooperative"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Facility / project name
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                placeholder="Optional"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Claim type
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={claimType}
                onChange={(e) => setClaimType(e.target.value as DisclosureClaimType)}
              >
                {CLAIM_TYPES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Reporting period
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={reportingPeriod}
                onChange={(e) => setReportingPeriod(e.target.value)}
                placeholder="e.g. FY2025 Q1"
              />
            </label>
            <label className="col-span-full block text-xs font-semibold text-slate-700">
              Claimed statement
              <textarea
                className="mt-1 min-h-[88px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={claimText}
                onChange={(e) => setClaimText(e.target.value)}
                placeholder="Paste neutral claim language for comparison"
              />
            </label>
            <label className="col-span-full block text-xs font-semibold text-slate-700">
              Location / AOI (placeholder text)
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder="Describe AOI or paste WKT in a future build"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-700">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={togglePace} onChange={(e) => setTogglePace(e.target.checked)} />
              PACE_OCI lane (preview/metadata on most hosts)
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={toggleGedi} onChange={(e) => setToggleGedi(e.target.checked)} />
              GEDI_LIDAR lane
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={togglePublic} onChange={(e) => setTogglePublic(e.target.checked)} />
              EPA public record lane
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runLocalPreview}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Update preview locally
            </button>
            <button
              type="button"
              onClick={() => void tryAnalyzeApi()}
              className="rounded-lg border border-sky-600 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-900 hover:bg-sky-100"
            >
              Try API analyze (optional)
            </button>
            <button
              type="button"
              onClick={() => void tryEvidencePacket()}
              className="rounded-lg border border-slate-400 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              Request evidence packet shell
            </button>
          </div>
          {apiNotice ? <p className="mt-3 text-xs text-amber-800">{apiNotice}</p> : null}
        </section>

        <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 md:p-6">
          <h2 className="text-lg font-semibold text-amber-950">Example finding</h2>
          <p className="mt-2 text-sm font-semibold text-amber-950">Preview scenario — not a live finding.</p>
          <p className="mt-2 text-sm text-amber-950">
            Status: <span className="font-semibold">Potential mismatch — requires validator review</span> (illustrative
            combined label; technical status: {exampleFinding.anomalyStatus.replace(/_/g, ' ')}).
          </p>
          <p className="mt-1 text-xs text-amber-900">
            Company: {exampleFinding.companyName}
          </p>
          <div className="mt-4 text-xs text-amber-950">
            <p>Anomaly score: {exampleFinding.anomalyScore}</p>
            <p>Confidence: {exampleFinding.confidenceLevel}</p>
            {exampleFinding.anomalyScoreExplanations?.length ? (
              <div className="mt-2">
                <p className="font-medium">Score explanations</p>
                <ul className="list-disc pl-5">
                  {exampleFinding.anomalyScoreExplanations.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="mt-2 font-medium">Observed signals: {exampleFinding.observedSignals.length}</p>
            <p className="mt-1">Claim: {exampleFinding.claim.claimText}</p>
            <p className="mt-2 font-medium">Risk flags</p>
            <ul className="list-disc pl-5">
              {exampleFinding.riskFlags.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="mt-2 font-medium">Recommended actions</p>
            <ul className="list-decimal pl-5">
              {exampleFinding.recommendedActions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <p className="mt-2">Evidence packet ready: {exampleFinding.evidencePacketReady ? 'yes' : 'no (shell)'}</p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Evidence packet preview</h2>
          <DisclosureIntegrityEvidencePacket finding={finding} />
        </section>

        <section className="mt-10 rounded-2xl border border-orange-200 bg-orange-50/50 p-5 md:p-6">
          <h2 className="text-lg font-semibold text-orange-950">Safety / legal caution</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-orange-950">
            <li>Do not use defamatory labels — use potential mismatch, unresolved anomaly, or requires review.</li>
            <li>Satellite-indicated signals are screening context until field validation or official records align.</li>
            <li>Blockchain and QR readiness describe workflow capability — preview hashes are not ledger writes.</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default SatelliteAccountabilityPage;
