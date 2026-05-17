import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Loader } from '../../../components/icons';
import { DmrvAiConfigHelper } from './components/DmrvAiConfigHelper';
import { DmrvBreadcrumb } from './components/DmrvBreadcrumb';
import { DmrvWorkflowProgress } from './components/DmrvWorkflowProgress';
import { getCategoryBySlug, getTypeForCategory } from './dmrvRegistry';
import { dmrvCategoryPath, dmrvSourceStackPath } from './dmrvNavigation';
import {
  anchorDmrvProjectIdentity,
  buildDefaultProjectContext,
  createDmrvProjectContext,
  defaultDmrvProjectId,
  ensureDmrvProjectContext,
  generateDmrvProjectHash,
  getDmrvProjectContext,
  updateDmrvProjectContext,
  validateDmrvProjectContext,
} from './services/dmrvProjectContextService';
import type { DmrvMethodologyDomain, DmrvProjectContext } from './services/dmrvProjectContextTypes';

export type DmrvProjectConfigPageProps = {
  onReturn?: () => void;
  onNavigate?: (view: string) => void;
};

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/15';

export default function DmrvProjectConfigPage({
  onReturn,
  onNavigate,
}: DmrvProjectConfigPageProps): React.ReactElement {
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !routeProjectId || routeProjectId === 'new';
  const categorySlug = searchParams.get('categorySlug') ?? 'carbon-land';
  const typeId = searchParams.get('typeId') ?? 'forest-land-use';

  const category = getCategoryBySlug(categorySlug);
  const dmrvType = getTypeForCategory(categorySlug, typeId);

  const [ctx, setCtx] = useState<DmrvProjectContext | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!category) return;
    if (isNew) {
      setCtx(
        buildDefaultProjectContext({
          categorySlug,
          categoryTitle: category.title,
          typeId,
          typeTitle: dmrvType?.title ?? typeId,
        }),
      );
      return;
    }
    const existing = getDmrvProjectContext(routeProjectId!);
    setCtx(
      existing ??
        buildDefaultProjectContext({
          categorySlug,
          categoryTitle: category.title,
          typeId,
          typeTitle: dmrvType?.title ?? typeId,
          projectId: routeProjectId,
        }),
    );
  }, [category, categorySlug, dmrvType?.title, isNew, routeProjectId, typeId]);

  const validation = useMemo(() => (ctx ? validateDmrvProjectContext(ctx) : null), [ctx]);

  const aiContextSummary = useMemo(() => {
    if (!ctx) return '';
    return JSON.stringify(
      {
        categorySlug,
        typeId,
        status: ctx.status,
        validation,
        projectName: ctx.projectName,
        projectId: ctx.projectId,
        organization: ctx.organization,
        location: ctx.location,
        reporting: ctx.reporting,
        methodology: ctx.methodology,
        reviewer: ctx.reviewer,
        blockchain: ctx.blockchain,
      },
      null,
      2,
    );
  }, [categorySlug, ctx, typeId, validation]);

  const patch = useCallback((patchCtx: Partial<DmrvProjectContext>) => {
    setCtx((prev) => (prev ? { ...prev, ...patchCtx } : prev));
  }, []);

  const patchLocation = useCallback((key: keyof DmrvProjectContext['location'], value: string | boolean) => {
    setCtx((prev) => (prev ? { ...prev, location: { ...prev.location, [key]: value } } : prev));
  }, []);

  const patchReporting = useCallback((key: keyof DmrvProjectContext['reporting'], value: string) => {
    setCtx((prev) => (prev ? { ...prev, reporting: { ...prev.reporting, [key]: value } } : prev));
  }, []);

  const patchMethodology = useCallback(
    (key: keyof DmrvProjectContext['methodology'], value: string | DmrvMethodologyDomain) => {
      setCtx((prev) => (prev ? { ...prev, methodology: { ...prev.methodology, [key]: value } } : prev));
    },
    [],
  );

  const patchReviewer = useCallback(
    (key: keyof DmrvProjectContext['reviewer'], value: string | boolean) => {
      setCtx((prev) => (prev ? { ...prev, reviewer: { ...prev.reviewer, [key]: value } } : prev));
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (!ctx) return;
    const saved = isNew ? createDmrvProjectContext(ctx) : updateDmrvProjectContext(ctx.projectId, ctx);
    if (!saved) {
      setNotice('Could not save project context.');
      return;
    }
    setCtx(saved);
    setNotice('Project configuration saved.');
    navigate(dmrvCategoryPath(categorySlug, typeId, saved.projectId), { replace: true });
  }, [categorySlug, ctx, isNew, navigate, typeId]);

  const handleSkipToCategory = useCallback(() => {
    const pid = ctx?.projectId?.trim() || defaultDmrvProjectId(categorySlug, typeId);
    ensureDmrvProjectContext({
      categorySlug,
      categoryTitle: category?.title ?? categorySlug,
      typeId,
      typeTitle: dmrvType?.title ?? typeId,
      projectId: pid,
    });
    navigate(dmrvCategoryPath(categorySlug, typeId, pid));
  }, [category?.title, categorySlug, ctx?.projectId, dmrvType?.title, navigate, typeId]);

  const handleOpenSatelliteConfig = useCallback(() => {
    const pid = ctx?.projectId?.trim() || defaultDmrvProjectId(categorySlug, typeId);
    ensureDmrvProjectContext({
      categorySlug,
      categoryTitle: category?.title ?? categorySlug,
      typeId,
      typeTitle: dmrvType?.title ?? typeId,
      projectId: pid,
    });
    navigate(dmrvSourceStackPath(pid, categorySlug, 'satellite', typeId));
  }, [category?.title, categorySlug, ctx?.projectId, dmrvType?.title, navigate, typeId]);

  const handleGenerateHash = useCallback(async () => {
    if (!ctx) return;
    setBusy('hash');
    const hash = await generateDmrvProjectHash(ctx);
    setCtx((prev) =>
      prev ? { ...prev, blockchain: { ...prev.blockchain, configHash: hash, status: 'pending' } } : prev,
    );
    setBusy(null);
    setNotice('Project config hash generated (integrity digest — not a chain transaction until anchored).');
  }, [ctx]);

  const handleAnchor = useCallback(async () => {
    if (!ctx) return;
    setBusy('anchor');
    const saved = updateDmrvProjectContext(ctx.projectId, ctx) ?? ctx;
    const result = await anchorDmrvProjectIdentity(saved);
    setBusy(null);
    if (result.ok) {
      const next = updateDmrvProjectContext(saved.projectId, {
        blockchain: {
          status: 'anchored',
          configHash: result.configHash,
          ledgerRecordId: result.ledgerRecordId,
          qrEvidenceRootUrl: result.qrEvidenceRootUrl,
          anchoredAt: result.anchoredAt,
        },
        status: 'blockchain_ready',
      });
      if (next) setCtx(next);
      setNotice('Project identity anchored via configured ledger adapter.');
    } else {
      setCtx((prev) =>
        prev
          ? {
              ...prev,
              blockchain: { status: 'unavailable', serviceMessage: result.message },
            }
          : prev,
      );
      setNotice(result.message);
    }
  }, [ctx]);

  if (!category || !ctx) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        DMRV project configuration unavailable.{' '}
        <Link to="/dmrv" className="font-semibold underline">
          Return to DMRV hub
        </Link>
      </p>
    );
  }

  const backPath = dmrvCategoryPath(categorySlug, typeId, isNew ? undefined : ctx.projectId);

  return (
    <div className="min-h-full bg-white text-slate-900">
      <div className="mx-auto w-full max-w-[min(100%,1200px)] px-4 py-6 sm:px-6 lg:px-8">
        <DmrvBreadcrumb
          crumbs={[
            { label: 'DMRV', onClick: () => navigate('/dmrv') },
            { label: category.title, onClick: () => navigate(backPath) },
            { label: dmrvType?.title ?? typeId, onClick: () => navigate(backPath) },
            { label: 'Project Configuration' },
          ]}
        />

        <header className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <button
                type="button"
                onClick={() => navigate(backPath)}
                className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to {dmrvType?.title ?? 'category'}
              </button>
              <h1 className="text-xl font-black text-[#1e3a5f] md:text-2xl">Project Configuration</h1>
              <p className="mt-1 text-sm text-slate-600">
                Optional project identity, AOI, methodology, reporting period, and blockchain root record. You can configure
                evidence sources from the DMRV selector icons without completing every field here.
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${
                validation?.complete
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              {validation?.complete ? 'Complete' : ctx.status === 'draft' ? 'Draft' : 'Optional'}
            </span>
          </div>
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          <ActionBtn
            label="Skip — open category & configure evidence"
            onClick={handleSkipToCategory}
          />
          <ActionBtn
            label="Open satellite config"
            primary
            onClick={handleOpenSatelliteConfig}
          />
        </div>

        <DmrvWorkflowProgress activeStep={0} />

        {notice ? (
          <p className="my-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
            {notice}
          </p>
        ) : null}

        {!validation?.complete ? (
          <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
            Project profile is optional for now — you can configure satellites and other evidence inputs first. When you
            are ready for integrity scoring or evidence packets, complete:{' '}
            {validation?.missing.join(', ') ?? 'the fields above'}.
          </p>
        ) : null}

        <DmrvAiConfigHelper variant="project" contextSummary={aiContextSummary} disabled={!!busy} />

        <div className="mt-4 space-y-4">
          <Section title="Project Identity">
            <Field label="Project name" value={ctx.projectName} onChange={(v) => patch({ projectName: v })} />
            <Field label="Project ID" value={ctx.projectId} onChange={(v) => patch({ projectId: v })} />
            <Field label="Organization / owner" value={ctx.organization} onChange={(v) => patch({ organization: v })} />
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-[10px] font-bold uppercase text-slate-500">Project description</span>
              <textarea
                className={inputClass}
                rows={2}
                value={ctx.description}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </label>
            <ReadOnly label="Category" value={category.title} />
            <ReadOnly label="DMRV type" value={dmrvType?.title ?? typeId} />
          </Section>

          <Section title="Location / AOI">
            <Field
              label="Country / region"
              value={ctx.location.countryRegion}
              onChange={(v) => patchLocation('countryRegion', v)}
            />
            <Field label="Latitude" value={ctx.location.latitude} onChange={(v) => patchLocation('latitude', v)} />
            <Field label="Longitude" value={ctx.location.longitude} onChange={(v) => patchLocation('longitude', v)} />
            <Field label="AOI ID" value={ctx.location.aoiId} onChange={(v) => patchLocation('aoiId', v)} />
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-[10px] font-bold uppercase text-slate-500">Saved AOI summary</span>
              <textarea
                className={inputClass}
                rows={2}
                value={ctx.location.aoiSummary}
                onChange={(e) => patchLocation('aoiSummary', e.target.value)}
                placeholder="Describe boundary, hectares, or upload reference…"
              />
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800">
                Draw AOI (map)
              </button>
              <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800">
                Upload GeoJSON
              </button>
            </div>
            <ReadOnly
              label="Coordinate validation"
              value={validation?.coordinateOk ? 'Valid' : 'Pending / invalid'}
            />
          </Section>

          <Section title="Reporting Period">
            <Field
              label="Start date"
              type="date"
              value={ctx.reporting.startDate}
              onChange={(v) => patchReporting('startDate', v)}
            />
            <Field
              label="End date"
              type="date"
              value={ctx.reporting.endDate}
              onChange={(v) => patchReporting('endDate', v)}
            />
            <Field
              label="Monitoring frequency"
              value={ctx.reporting.monitoringFrequency}
              onChange={(v) => patchReporting('monitoringFrequency', v)}
            />
            <Field
              label="Baseline year"
              value={ctx.reporting.baselineYear}
              onChange={(v) => patchReporting('baselineYear', v)}
            />
            <Field
              label="Comparison period"
              value={ctx.reporting.comparisonPeriod}
              onChange={(v) => patchReporting('comparisonPeriod', v)}
            />
          </Section>

          <Section title="Methodology">
            <Field
              label="Methodology name"
              value={ctx.methodology.name}
              onChange={(v) => patchMethodology('name', v)}
            />
            <Field
              label="Standard / framework"
              value={ctx.methodology.standardFramework}
              onChange={(v) => patchMethodology('standardFramework', v)}
            />
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">Domain</span>
              <select
                className={inputClass}
                value={ctx.methodology.domain}
                onChange={(e) => patchMethodology('domain', e.target.value as DmrvMethodologyDomain)}
              >
                <option value="carbon">Carbon</option>
                <option value="biodiversity">Biodiversity</option>
                <option value="pollution">Pollution</option>
                <option value="water">Water</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <Field
              label="Required evidence sources"
              value={ctx.methodology.requiredEvidenceSources}
              onChange={(v) => patchMethodology('requiredEvidenceSources', v)}
            />
            <Field
              label="Uncertainty rules"
              value={ctx.methodology.uncertaintyRules}
              onChange={(v) => patchMethodology('uncertaintyRules', v)}
            />
          </Section>

          <Section title="Validator / Reviewer">
            <Field label="Reviewer name" value={ctx.reviewer.name} onChange={(v) => patchReviewer('name', v)} />
            <Field
              label="Reviewer organization"
              value={ctx.reviewer.organization}
              onChange={(v) => patchReviewer('organization', v)}
            />
            <Field label="Reviewer role" value={ctx.reviewer.role} onChange={(v) => patchReviewer('role', v)} />
            <Toggle
              label="Review required"
              checked={ctx.reviewer.reviewRequired}
              onChange={(v) => patchReviewer('reviewRequired', v)}
            />
            <Toggle
              label="Human verification required"
              checked={ctx.reviewer.humanVerificationRequired}
              onChange={(v) => patchReviewer('humanVerificationRequired', v)}
            />
          </Section>

          <Section title="Blockchain Project Identity">
            <ReadOnly label="Project config hash" value={ctx.blockchain.configHash ?? '—'} mono />
            <ReadOnly label="Project ledger ID" value={ctx.blockchain.ledgerRecordId ?? '—'} mono />
            <ReadOnly label="Blockchain status" value={ctx.blockchain.status} />
            {ctx.blockchain.qrEvidenceRootUrl ? (
              <a
                href={ctx.blockchain.qrEvidenceRootUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1e3a5f] underline sm:col-span-2"
              >
                QR evidence root link <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
            {ctx.blockchain.serviceMessage ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 sm:col-span-2">
                {ctx.blockchain.serviceMessage}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <ActionBtn
                label={busy === 'hash' ? 'Generating…' : 'Generate project config hash'}
                onClick={() => void handleGenerateHash()}
                disabled={!!busy}
              />
              <ActionBtn
                label={busy === 'anchor' ? 'Anchoring…' : 'Anchor project identity'}
                primary
                onClick={() => void handleAnchor()}
                disabled={!!busy}
              />
              <ActionBtn label="View ledger" onClick={() => onNavigate?.('transparencyDatabase')} />
            </div>
          </Section>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <ActionBtn label="Save configuration" primary onClick={handleSave} />
          <ActionBtn
            label="Save & return to category"
            onClick={() => {
              handleSave();
            }}
          />
        </div>

        {onReturn ? (
          <button type="button" onClick={onReturn} className="mt-4 text-sm font-semibold text-slate-600 underline">
            Main menu
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-[#1e3a5f]">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}): React.ReactElement {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-bold uppercase text-slate-500">{label}</span>
      <input type={type} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function ReadOnly({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}): React.ReactElement {
  return (
    <div>
      <span className="text-[10px] font-bold uppercase text-slate-500">{label}</span>
      <p className={`mt-0.5 text-sm text-slate-800 ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</p>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}): React.ReactElement {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      <span className="text-sm text-slate-800">{label}</span>
    </label>
  );
}

function ActionBtn({
  label,
  onClick,
  primary,
  disabled,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-2.5 text-sm font-bold ${
        primary
          ? 'bg-[#1e3a5f] text-white hover:bg-[#152a47] disabled:opacity-60'
          : 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 disabled:opacity-60'
      }`}
    >
      {label}
    </button>
  );
}
