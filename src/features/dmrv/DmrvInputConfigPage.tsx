import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Loader } from '../../../components/icons';
import { DmrvAiConfigHelper, type DmrvAiHelperVariant } from './components/DmrvAiConfigHelper';
import { DmrvBreadcrumb } from './components/DmrvBreadcrumb';
import { DmrvDataSourceFields } from './components/dmrvInputConfigFields';
import { DmrvSatellitePicker } from './components/DmrvSatellitePicker';
import { DMRV_SATELLITE_SETTINGS_KEY } from './dmrvSatelliteCatalog';
import { DmrvInputSymbol } from './components/dmrvInputSymbols';
import { DmrvProjectContextBanner } from './components/DmrvProjectContextBanner';
import { DmrvWorkflowProgress } from './components/DmrvWorkflowProgress';
import { getCategoryBySlug, getTypeForCategory } from './dmrvRegistry';
import { getDmrvInputByKey, resolveDmrvInputDef } from './dmrvInputRegistry';
import { dmrvCategoryPath } from './dmrvNavigation';
import { anchorDmrvInputConfig } from './services/dmrvBlockchainAnchor';
import {
  buildDefaultConfig,
  computeCompletenessScore,
  generateDmrvEvidencePacket,
  getDmrvInputConfig,
  projectContextSnapshot,
  saveDmrvInputConfig,
  testDmrvInputSource,
} from './services/dmrvInputConfigService';
import { ensureDmrvProjectContext } from './services/dmrvProjectContextService';
import type { DmrvConfigStatus, DmrvInputConfig } from './services/dmrvInputConfigTypes';

export type DmrvInputConfigPageProps = {
  onReturn?: () => void;
  onNavigate?: (view: string) => void;
};

const STATUS_LABELS: Record<DmrvConfigStatus, string> = {
  not_configured: 'Not configured',
  draft: 'Draft',
  ready: 'Ready',
  verified: 'Verified',
  blockchain_anchored: 'Blockchain anchored',
};

const STATUS_STYLES: Record<DmrvConfigStatus, string> = {
  not_configured: 'bg-slate-100 text-slate-700 border-slate-200',
  draft: 'bg-amber-50 text-amber-900 border-amber-200',
  ready: 'bg-sky-50 text-sky-900 border-sky-200',
  verified: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  blockchain_anchored: 'bg-[#1e3a5f] text-white border-[#1e3a5f]',
};

export default function DmrvInputConfigPage({
  onReturn,
  onNavigate,
}: DmrvInputConfigPageProps): React.ReactElement {
  const {
    projectId = '',
    categorySlug = '',
    inputKey = '',
  } = useParams<{ projectId: string; categorySlug: string; inputKey: string }>();
  const [searchParams] = useSearchParams();
  const typeId = searchParams.get('typeId') ?? 'forest-land-use';
  const navigate = useNavigate();

  const category = getCategoryBySlug(categorySlug);
  const dmrvType = getTypeForCategory(categorySlug, typeId);
  const storedProject = useMemo(() => {
    if (!projectId || !category) return null;
    return ensureDmrvProjectContext({
      categorySlug,
      categoryTitle: category.title,
      typeId,
      typeTitle: dmrvType?.title ?? typeId,
      projectId,
    });
  }, [category, categorySlug, dmrvType?.title, projectId, typeId]);
  const inputDef = useMemo(
    () => getDmrvInputByKey(inputKey) ?? resolveDmrvInputDef(inputKey.replace(/-/g, ' ')),
    [inputKey],
  );

  const [config, setConfig] = useState<DmrvInputConfig | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!categorySlug || !inputKey || !projectId) return;
    const existing = getDmrvInputConfig(projectId, categorySlug, inputKey);
    const base =
      existing ??
      buildDefaultConfig({
        projectId,
        categorySlug,
        typeId,
        inputKey,
        inputLabel: inputDef.label,
      });
    const snapshot = projectContextSnapshot(storedProject);
    setConfig({ ...base, projectContext: snapshot });
  }, [categorySlug, inputKey, projectId, typeId, inputDef.label, storedProject]);

  const integrityScore = config ? computeCompletenessScore(config) : 0;

  const aiHelperVariant: DmrvAiHelperVariant =
    inputKey === 'satellite-imagery' ? 'satellite-imagery' : 'input';

  const aiContextSummary = useMemo(() => {
    if (!config) return '';
    return JSON.stringify(
      {
        category: categorySlug,
        typeId,
        inputKey,
        inputLabel: inputDef.label,
        configType: config.configType,
        status: config.status,
        integrityScore,
        dataSourceSettings: config.dataSourceSettings,
        validationRules: config.validationRules,
        evidencePacket: config.evidencePacket,
        projectContext: config.projectContext,
      },
      null,
      2,
    );
  }, [categorySlug, config, inputDef.label, inputKey, integrityScore, typeId]);

  const patchDataSource = useCallback((key: string, value: string | boolean) => {
    setConfig((prev) =>
      prev ? { ...prev, dataSourceSettings: { ...prev.dataSourceSettings, [key]: value } } : prev,
    );
  }, []);

  const patchValidation = useCallback((key: keyof DmrvInputConfig['validationRules'], value: boolean) => {
    setConfig((prev) =>
      prev ? { ...prev, validationRules: { ...prev.validationRules, [key]: value } } : prev,
    );
  }, []);

  const patchEvidence = useCallback(
    (key: keyof DmrvInputConfig['evidencePacket'], value: string | boolean) => {
      setConfig((prev) =>
        prev ? { ...prev, evidencePacket: { ...prev.evidencePacket, [key]: value } } : prev,
      );
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (!config) return;
    const saved = saveDmrvInputConfig(config);
    setConfig(saved);
    setNotice('Configuration saved locally.');
  }, [config]);

  const handleTest = useCallback(async () => {
    if (!config) return;
    setBusy('test');
    const result = await testDmrvInputSource(config);
    setBusy(null);
    setNotice(result.message);
  }, [config]);

  const handleEvidence = useCallback(async () => {
    if (!config) return;
    setBusy('evidence');
    const result = await generateDmrvEvidencePacket(config);
    setBusy(null);
    if (result.ok && result.packetId) {
      const next = saveDmrvInputConfig({ ...config, evidencePacketId: result.packetId });
      setConfig(next);
    }
    setNotice(result.message);
  }, [config]);

  const handleAnchor = useCallback(async () => {
    if (!config) return;
    setBusy('anchor');
    const result = await anchorDmrvInputConfig({
      projectId: config.projectId,
      categorySlug: config.categorySlug,
      inputKey: config.inputKey,
      config,
      evidencePacketId: config.evidencePacketId,
    });
    setBusy(null);
    if (result.ok && result.anchored) {
      const next = saveDmrvInputConfig({
        ...config,
        blockchain: {
          status: 'anchored',
          lastAnchoredHash: result.lastAnchoredHash,
          anchoredAt: result.anchoredAt,
          ledgerRecordId: result.ledgerRecordId,
          qrEvidenceUrl: result.qrEvidenceUrl,
        },
      });
      setConfig(next);
      setNotice(`Anchored via ${result.provider}.`);
    } else if (!result.ok) {
      setConfig((prev) =>
        prev
          ? {
              ...prev,
              blockchain: {
                status: 'unavailable',
                serviceMessage: result.message,
              },
            }
          : prev,
      );
      setNotice(result.message);
    }
  }, [config]);

  if (!category || !config) {
    return (
      <div>
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          DMRV configuration could not be loaded.{' '}
          <Link to="/dmrv" className="font-semibold underline">
            Return to DMRV hub
          </Link>{' '}
          and open an evidence input from the selector icons.
        </p>
      </div>
    );
  }

  const typeTitle = dmrvType?.title ?? typeId;
  const backPath = dmrvCategoryPath(categorySlug, typeId, projectId);

  return (
    <div className="min-h-full bg-white text-slate-900">
      <div className="mx-auto w-full max-w-[min(100%,1520px)] px-4 py-6 sm:px-6 lg:px-8">
        <DmrvBreadcrumb
          crumbs={[
            { label: 'DMRV', onClick: () => navigate('/dmrv') },
            { label: category.title, onClick: () => navigate(`/dmrv/${categorySlug}`) },
            { label: typeTitle, onClick: () => navigate(backPath) },
            { label: `${inputDef.label} Configuration` },
          ]}
        />

        <header className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex min-w-0 items-start gap-4">
            <button
              type="button"
              onClick={() => navigate(backPath)}
              className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <DmrvInputSymbol label={inputDef.label} size={48} accentColor={category.color} />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{category.title}</p>
              <h1 className="text-xl font-black text-[#1e3a5f] md:text-2xl">{inputDef.label}</h1>
              <p className="mt-1 text-sm text-slate-600">{inputDef.shortDescription}</p>
              <p className="mt-1 text-xs text-slate-500">
                DMRV type: <span className="font-semibold">{typeTitle}</span> · Role: {inputDef.validationRole}
              </p>
            </div>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_STYLES[config.status]}`}
          >
            {STATUS_LABELS[config.status]}
          </span>
        </header>

        <DmrvWorkflowProgress activeStep={2} />

        {storedProject ? <DmrvProjectContextBanner project={storedProject} /> : null}

        <div className="mb-4 rounded-xl border border-[#1e3a5f]/20 bg-[#e8f0f7] px-4 py-3">
          <p className="text-sm font-semibold text-[#1e3a5f]">
            Configuration Integrity Score: {integrityScore}%
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80">
            <div
              className="h-full rounded-full bg-[#1e3a5f] transition-all"
              style={{ width: `${integrityScore}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Tracks data source settings, validation rules, evidence packet readiness, and blockchain link for this
            input — project identity is managed in project configuration.
          </p>
        </div>

        {notice ? (
          <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
            {notice}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]">
          <main className="space-y-4">
            {config.configType === 'satellite' ? (
              <Panel title="Pick satellites for this MRV use">
                <DmrvSatellitePicker
                  selectedRaw={config.dataSourceSettings[DMRV_SATELLITE_SETTINGS_KEY]}
                  onChange={(ids) => patchDataSource(DMRV_SATELLITE_SETTINGS_KEY, ids)}
                />
              </Panel>
            ) : null}

            <Panel title={config.configType === 'satellite' ? 'Scene & coverage settings' : 'Data Source Settings'}>
              <DmrvDataSourceFields
                configType={config.configType}
                settings={config.dataSourceSettings}
                onChange={patchDataSource}
              />
            </Panel>

            <Panel title="Validation Rules">
              <ValidationRules config={config} onPatch={patchValidation} />
            </Panel>

            <Panel title="Evidence Packet Settings">
              <EvidenceFields config={config} onPatch={patchEvidence} />
            </Panel>

            <div className="flex flex-wrap gap-2">
              <ActionButton label="Save Configuration" primary onClick={handleSave} disabled={!!busy} />
              <ActionButton
                label={busy === 'test' ? 'Testing…' : 'Test Data Source'}
                onClick={() => void handleTest()}
                disabled={!!busy}
                icon={busy === 'test' ? <Loader className="h-4 w-4 animate-spin" /> : undefined}
              />
              <ActionButton
                label={busy === 'evidence' ? 'Generating…' : 'Generate Evidence Packet'}
                onClick={() => void handleEvidence()}
                disabled={!!busy}
              />
            </div>
          </main>

          <aside className="space-y-4">
            <DmrvAiConfigHelper variant={aiHelperVariant} contextSummary={aiContextSummary} disabled={!!busy} />
            <Panel title="Evidence + Blockchain Status">
              <BlockchainPanel config={config} />
            </Panel>
            <Panel title="Blockchain Link">
              <div className="space-y-3 text-sm">
                <ActionButton
                  label={busy === 'anchor' ? 'Anchoring…' : 'Anchor to Blockchain'}
                  primary
                  onClick={() => void handleAnchor()}
                  disabled={!!busy}
                />
                <ActionButton
                  label="View Ledger Record"
                  onClick={() => onNavigate?.('transparencyDatabase')}
                />
                {config.blockchain.qrEvidenceUrl ? (
                  <a
                    href={config.blockchain.qrEvidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1e3a5f] underline"
                  >
                    QR evidence link <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </Panel>
          </aside>
        </div>

        {onReturn ? (
          <button
            type="button"
            onClick={onReturn}
            className="mt-6 text-sm font-semibold text-slate-600 underline hover:text-slate-900"
          >
            Main menu
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-[#1e3a5f]">{title}</h2>
      {children}
    </section>
  );
}

function ProjectFields({
  config,
  onPatch,
}: {
  config: DmrvInputConfig;
  onPatch: (key: keyof DmrvInputConfig['projectContext'], value: string) => void;
}): React.ReactElement {
  const fields: { key: keyof DmrvInputConfig['projectContext']; label: string }[] = [
    { key: 'projectName', label: 'Project name' },
    { key: 'projectId', label: 'Project ID' },
    { key: 'locationAoiId', label: 'Location / AOI ID' },
    { key: 'methodology', label: 'Methodology' },
    { key: 'reportingPeriod', label: 'Reporting period' },
    { key: 'responsibleOrganization', label: 'Responsible organization' },
    { key: 'validatorReviewer', label: 'Validator / reviewer' },
  ];
  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <label key={f.key} className="block space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-500">{f.label}</span>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={config.projectContext[f.key]}
            onChange={(e) => onPatch(f.key, e.target.value)}
          />
        </label>
      ))}
    </div>
  );
}

function ValidationRules({
  config,
  onPatch,
}: {
  config: DmrvInputConfig;
  onPatch: (key: keyof DmrvInputConfig['validationRules'], value: boolean) => void;
}): React.ReactElement {
  const rules: { key: keyof DmrvInputConfig['validationRules']; label: string }[] = [
    { key: 'requireCoordinates', label: 'Require coordinates' },
    { key: 'requireTimestamp', label: 'Require timestamp' },
    { key: 'requireSourceDocument', label: 'Require source document' },
    { key: 'requireReviewerApproval', label: 'Require reviewer approval' },
    { key: 'requireFieldVerification', label: 'Require field verification' },
    { key: 'requireBeforeAfterComparison', label: 'Require before/after comparison' },
    { key: 'requireAnomalyDetection', label: 'Require anomaly detection' },
    { key: 'requireUncertaintyScore', label: 'Require uncertainty score' },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rules.map((r) => (
        <label
          key={r.key}
          className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
        >
          <input
            type="checkbox"
            checked={config.validationRules[r.key]}
            onChange={(e) => onPatch(r.key, e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          {r.label}
        </label>
      ))}
    </div>
  );
}

function EvidenceFields({
  config,
  onPatch,
}: {
  config: DmrvInputConfig;
  onPatch: (key: keyof DmrvInputConfig['evidencePacket'], value: string | boolean) => void;
}): React.ReactElement {
  const ep = config.evidencePacket;
  const toggles: { key: keyof DmrvInputConfig['evidencePacket']; label: string }[] = [
    { key: 'includeMapSnapshot', label: 'Include map snapshot' },
    { key: 'includeRawDataReference', label: 'Include raw data reference' },
    { key: 'includeReviewerNotes', label: 'Include reviewer notes' },
    { key: 'includeAttachments', label: 'Include attachments' },
    { key: 'generateQrCode', label: 'Generate QR code' },
  ];
  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-[10px] font-bold uppercase text-slate-500">Evidence packet title</span>
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={ep.title}
          onChange={(e) => onPatch('title', e.target.value)}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-[10px] font-bold uppercase text-slate-500">Public visibility</span>
        <select
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={ep.publicVisibility}
          onChange={(e) => onPatch('publicVisibility', e.target.value)}
        >
          <option value="private">Private</option>
          <option value="validator_only">Validator only</option>
          <option value="public">Public</option>
        </select>
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        {toggles.map((t) => (
          <label
            key={String(t.key)}
            className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              checked={Boolean(ep[t.key])}
              onChange={(e) => onPatch(t.key, e.target.checked)}
              className="h-4 w-4"
            />
            {t.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function BlockchainPanel({ config }: { config: DmrvInputConfig }): React.ReactElement {
  const bc = config.blockchain;
  return (
    <dl className="space-y-2 text-sm">
      <Row label="Blockchain status" value={bc.status} />
      <Row label="Last anchored hash" value={bc.lastAnchoredHash ?? '—'} mono />
      <Row label="Timestamp" value={bc.anchoredAt ? new Date(bc.anchoredAt).toLocaleString() : '—'} />
      <Row label="Ledger record ID" value={bc.ledgerRecordId ?? '—'} mono />
      <Row label="Evidence packet ID" value={config.evidencePacketId ?? '—'} mono />
      {bc.serviceMessage ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {bc.serviceMessage}
        </p>
      ) : null}
    </dl>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }): React.ReactElement {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-slate-800 ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</dd>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  primary,
  disabled,
  icon,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
        primary
          ? 'bg-[#1e3a5f] text-white hover:bg-[#152a47] disabled:opacity-60'
          : 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 disabled:opacity-60'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
