import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Loader } from '../../../components/icons';
import { DmrvAiConfigHelper } from './components/DmrvAiConfigHelper';
import { Usgs3depLidarPanel } from '../environmentalIntelligence/components/Usgs3depLidarPanel';
import { USGS_3DEP_TERRAIN_RELEVANCE_NOTE } from './dmrvRecommendedSources';
import { DmrvAoiMapPanel } from './components/DmrvAoiMapPanel';
import { DmrvProjectFormAssist } from './components/DmrvProjectFormAssist';
import { nominatimReverseGeocode } from '../../good-wheels/features/map/nominatimReverseGeocode';
import {
  computePolygonAreaKm2,
  computePolygonCentroid,
  parseStoredAoiPoints,
  type LatLngPoint,
} from './utils/dmrvAoiMapUtils';
import {
  buildDmrvLocationSuggestions,
  type DmrvLocationSuggestions,
} from './utils/dmrvLocationAssist';
import { computeDmrvProjectWorkflowLinks } from './utils/dmrvWorkflowLinks';
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
import { syncDmrvInputConfigsProjectContext } from './services/dmrvInputConfigService';
import type { DmrvMethodologyDomain, DmrvProjectContext } from './services/dmrvProjectContextTypes';
import { DmrvWorkflowShell } from './reporting/DmrvWorkflowShell';
import { DmrvWorkflowReportHeader } from './reporting/DmrvWorkflowReportHeader';
import { DMRV_REPORT_MILESTONES } from './reporting/dmrvReportMilestones';
import {
  anchorReportVersion,
  rebuildAndPersistDmrvReport,
  saveReportSnapshot,
} from './reporting/dmrvReportStore';
import { useDmrvLiveReportSync } from './reporting/useDmrvLiveReportSync';

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
  const [aoiMapPoints, setAoiMapPoints] = useState<LatLngPoint[]>([]);
  const [drawMapTrigger, setDrawMapTrigger] = useState(0);
  const [uploadMapTrigger, setUploadMapTrigger] = useState(0);
  const [locationSuggestions, setLocationSuggestions] = useState<DmrvLocationSuggestions | null>(null);
  const geocodeAbortRef = useRef<AbortController | null>(null);

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

  useEffect(() => {
    if (!ctx) return;
    setAoiMapPoints(parseStoredAoiPoints(ctx.location.aoiGeoJson ?? ''));
  }, [ctx?.location.aoiGeoJson, ctx?.projectId]);

  const validation = useMemo(() => (ctx ? validateDmrvProjectContext(ctx) : null), [ctx]);

  const liveProjectId = ctx?.projectId || defaultDmrvProjectId(categorySlug, typeId);
  useDmrvLiveReportSync(liveProjectId, 'project-config', {
    projectContext: ctx,
    enabled: Boolean(ctx),
  });

  const workflowLinks = useMemo(
    () => (ctx ? computeDmrvProjectWorkflowLinks(ctx, validation) : []),
    [ctx, validation],
  );

  const satelliteReady = Boolean(
    validation?.coordinateOk && (ctx?.projectId.trim() || defaultDmrvProjectId(categorySlug, typeId)),
  );

  const enrichLocationFromMap = useCallback(
    async (points: LatLngPoint[], kind: 'center' | 'polygon') => {
      if (!category) return;
      const centroid =
        kind === 'polygon' && points.length >= 3
          ? computePolygonCentroid(points)
          : points[0] ?? null;
      if (!centroid) return;

      const areaKm2 = kind === 'polygon' ? computePolygonAreaKm2(points) : 0;
      geocodeAbortRef.current?.abort();
      const ac = new AbortController();
      geocodeAbortRef.current = ac;

      const placeLabel = await nominatimReverseGeocode(
        { lat: centroid.lat, lng: centroid.lng },
        ac.signal,
      );

      const suggestions = buildDmrvLocationSuggestions({
        placeLabel,
        categorySlug,
        categoryTitle: category.title,
        typeId,
        typeTitle: dmrvType?.title ?? typeId,
        areaKm2,
        hasPolygon: kind === 'polygon' && points.length >= 3,
      });
      setLocationSuggestions(suggestions);

      setCtx((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        if (!prev.location.countryRegion.trim() && suggestions.suggestedCountryRegion) {
          next.location = {
            ...next.location,
            countryRegion: suggestions.suggestedCountryRegion,
          };
        }
        if (!prev.projectName.trim()) {
          next.projectName = suggestions.suggestedProjectName;
        }
        if (!prev.description.trim()) {
          next.description = suggestions.suggestedDescription;
        }
        if (!prev.methodology.name.trim()) {
          next.methodology = {
            ...next.methodology,
            name: suggestions.suggestedMethodologyName,
            standardFramework: suggestions.suggestedStandardFramework,
            domain: suggestions.suggestedDomain,
            requiredEvidenceSources: suggestions.suggestedEvidenceSources,
          };
        }
        return next;
      });

      setNotice(
        kind === 'polygon'
          ? 'AOI saved — suggested project name and methodology filled where fields were empty.'
          : 'Map location saved — review suggested project name below.',
      );
    },
    [category, categorySlug, dmrvType?.title, typeId],
  );

  const applyAoiFromMap = useCallback((points: LatLngPoint[]) => {
    setCtx((prev) => {
      if (!prev) return prev;
      if (points.length === 1) {
        return {
          ...prev,
          location: {
            ...prev.location,
            latitude: points[0].lat.toFixed(6),
            longitude: points[0].lng.toFixed(6),
            coordinateValidation: 'valid',
          },
        };
      }
      if (points.length < 3) return prev;
      const centroid = computePolygonCentroid(points);
      const areaKm2 = computePolygonAreaKm2(points);
      const aoiId = prev.location.aoiId.trim() || `aoi-${Date.now().toString(36)}`;
      const summary =
        prev.location.aoiSummary.trim() ||
        `Polygon AOI · ${points.length} vertices · ~${areaKm2.toFixed(2)} km²`;
      return {
        ...prev,
        location: {
          ...prev.location,
          latitude: centroid ? centroid.lat.toFixed(6) : prev.location.latitude,
          longitude: centroid ? centroid.lng.toFixed(6) : prev.location.longitude,
          aoiId,
          aoiSummary: summary,
          aoiGeoJson: JSON.stringify(points),
          geoJsonUploaded: true,
          coordinateValidation: 'valid',
        },
      };
    });
    if (points.length >= 3) setAoiMapPoints(points);
  }, []);

  const handleLocationCommitted = useCallback(
    (payload: { points: LatLngPoint[]; kind: 'center' | 'polygon' }) => {
      void enrichLocationFromMap(payload.points, payload.kind);
    },
    [enrichLocationFromMap],
  );

  const applyAllLocationSuggestions = useCallback(() => {
    if (!locationSuggestions) return;
    setCtx((prev) =>
      prev
        ? {
            ...prev,
            projectName: locationSuggestions.suggestedProjectName,
            projectId: locationSuggestions.suggestedProjectId,
            description: locationSuggestions.suggestedDescription,
            location: {
              ...prev.location,
              countryRegion:
                locationSuggestions.suggestedCountryRegion || prev.location.countryRegion,
            },
            methodology: {
              ...prev.methodology,
              name: locationSuggestions.suggestedMethodologyName,
              standardFramework: locationSuggestions.suggestedStandardFramework,
              domain: locationSuggestions.suggestedDomain,
              requiredEvidenceSources: locationSuggestions.suggestedEvidenceSources,
            },
          }
        : prev,
    );
    setNotice('Applied location-based suggestions to project identity and methodology.');
  }, [locationSuggestions]);

  const applySuggestedProjectName = useCallback(() => {
    if (!locationSuggestions) return;
    setCtx((prev) =>
      prev
        ? {
            ...prev,
            projectName: locationSuggestions.suggestedProjectName,
            projectId: locationSuggestions.suggestedProjectId,
          }
        : prev,
    );
  }, [locationSuggestions]);

  const applySuggestedMethodology = useCallback(() => {
    if (!locationSuggestions) return;
    setCtx((prev) =>
      prev
        ? {
            ...prev,
            methodology: {
              ...prev.methodology,
              name: locationSuggestions.suggestedMethodologyName,
              standardFramework: locationSuggestions.suggestedStandardFramework,
              domain: locationSuggestions.suggestedDomain,
              requiredEvidenceSources: locationSuggestions.suggestedEvidenceSources,
            },
          }
        : prev,
    );
  }, [locationSuggestions]);

  const clearAoiFromMap = useCallback(() => {
    setAoiMapPoints([]);
    setCtx((prev) =>
      prev
        ? {
            ...prev,
            location: {
              ...prev.location,
              aoiGeoJson: '',
              geoJsonUploaded: false,
              coordinateValidation: 'pending',
            },
          }
        : prev,
    );
    setLocationSuggestions(null);
  }, []);

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
    syncDmrvInputConfigsProjectContext(saved.projectId);
    rebuildAndPersistDmrvReport(saved.projectId, {
      actor: 'user',
      workflowStep: 'project-config',
      changeSummary: 'Project identity, AOI, methodology, and reporting period saved',
    });
    saveReportSnapshot(saved.projectId, DMRV_REPORT_MILESTONES.projectConfig, 'project-config');
    setNotice('Project configuration saved — satellite and evidence configs linked to this AOI.');
    navigate(dmrvCategoryPath(categorySlug, typeId, saved.projectId), { replace: true });
  }, [categorySlug, ctx, isNew, navigate, typeId]);

  const handleSaveAndOpenSatellite = useCallback(() => {
    if (!ctx) return;
    const saved = isNew ? createDmrvProjectContext(ctx) : updateDmrvProjectContext(ctx.projectId, ctx);
    if (!saved) {
      setNotice('Save project configuration before opening satellite setup.');
      return;
    }
    syncDmrvInputConfigsProjectContext(saved.projectId);
    navigate(dmrvSourceStackPath(saved.projectId, categorySlug, 'satellite', typeId));
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
    if (ctx) {
      updateDmrvProjectContext(pid, ctx);
      syncDmrvInputConfigsProjectContext(pid);
    }
    ensureDmrvProjectContext({
      categorySlug,
      categoryTitle: category?.title ?? categorySlug,
      typeId,
      typeTitle: dmrvType?.title ?? typeId,
      projectId: pid,
    });
    navigate(dmrvSourceStackPath(pid, categorySlug, 'satellite', typeId));
  }, [category?.title, categorySlug, ctx, dmrvType?.title, navigate, typeId]);

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
      if (next) {
        setCtx(next);
        rebuildAndPersistDmrvReport(next.projectId, {
          actor: 'user',
          workflowStep: 'blockchain-anchor',
          changeSummary: `Project blockchain identity anchored (${result.ledgerRecordId ?? 'reference'})`,
          hash: result.configHash,
        });
        const report = saveReportSnapshot(next.projectId, 'Blockchain Anchor v0.9', 'blockchain-anchor');
        const latest = report.versions[report.versions.length - 1];
        if (latest) {
          void anchorReportVersion(next.projectId, latest.versionId, {
            evidenceBundleHash: result.configHash,
            actor: 'user',
            transactionRef: result.ledgerRecordId,
          });
        }
      }
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
      <div className="mx-auto w-full max-w-[min(100%,1520px)] px-4 py-6 sm:px-6 lg:px-8">
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
                Start with the map to define your AOI — DPAL suggests a project name and links location to satellite
                evidence, integrity packets, and blockchain identity. Save before opening satellite configuration.
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
            label="Save & configure satellite"
            primary
            onClick={handleSaveAndOpenSatellite}
            disabled={!satelliteReady}
          />
          <ActionBtn label="Open satellite (quick)" onClick={handleOpenSatelliteConfig} />
        </div>

        {liveProjectId && categorySlug ? (
          <DmrvWorkflowReportHeader
            projectId={liveProjectId}
            categorySlug={categorySlug}
            typeId={typeId}
            className="mb-4"
          />
        ) : null}

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

        <DmrvWorkflowShell
          projectId={ctx.projectId || defaultDmrvProjectId(categorySlug, typeId)}
          categorySlug={categorySlug}
          typeId={typeId}
          workflowStep="project-config"
        >
        <DmrvAiConfigHelper
          variant="project"
          contextSummary={aiContextSummary}
          disabled={!!busy}
          autofillPrompt={`Suggest project configuration fields for DMRV. Return JSON with string fields: projectName, projectId, organization, description, locationLabel, latitude, longitude, aoiId, reportingPeriodStart, reportingPeriodEnd, methodologyName, standardFramework, domain.`}
          onApplyAutofill={(parsed) => {
            if (typeof parsed.projectName === 'string') patch({ projectName: parsed.projectName });
            if (typeof parsed.projectId === 'string') patch({ projectId: parsed.projectId });
            if (typeof parsed.organization === 'string') patch({ organization: parsed.organization });
            if (typeof parsed.description === 'string') patch({ description: parsed.description });
            if (typeof parsed.locationLabel === 'string') patchLocation('countryRegion', parsed.locationLabel);
            if (typeof parsed.latitude === 'string') patchLocation('latitude', parsed.latitude);
            if (typeof parsed.longitude === 'string') patchLocation('longitude', parsed.longitude);
            if (typeof parsed.aoiId === 'string') patchLocation('aoiId', parsed.aoiId);
            if (typeof parsed.reportingPeriodStart === 'string') {
              patchReporting('startDate', parsed.reportingPeriodStart);
            }
            if (typeof parsed.reportingPeriodEnd === 'string') {
              patchReporting('endDate', parsed.reportingPeriodEnd);
            }
            if (typeof parsed.methodologyName === 'string') patchMethodology('name', parsed.methodologyName);
            if (typeof parsed.standardFramework === 'string') {
              patchMethodology('standardFramework', parsed.standardFramework);
            }
            if (typeof parsed.domain === 'string') {
              patchMethodology('domain', parsed.domain as DmrvMethodologyDomain);
            }
          }}
        />

        <div className="mt-4 space-y-4">
          <Section title="Location / AOI">
            <div className="sm:col-span-2">
              <DmrvAoiMapPanel
                latitude={ctx.location.latitude}
                longitude={ctx.location.longitude}
                savedPoints={aoiMapPoints}
                onSavedPointsChange={setAoiMapPoints}
                onApplyToProject={applyAoiFromMap}
                onClearProject={clearAoiFromMap}
                drawTrigger={drawMapTrigger}
                uploadTrigger={uploadMapTrigger}
                onLocationCommitted={handleLocationCommitted}
                autoStartDrawing={aoiMapPoints.length < 3}
              />
            </div>
            <DmrvProjectFormAssist
              workflowLinks={workflowLinks}
              suggestions={locationSuggestions}
              onApplyAllSuggestions={applyAllLocationSuggestions}
              onApplyProjectName={applySuggestedProjectName}
              onApplyMethodology={applySuggestedMethodology}
              onOpenSatellite={handleSaveAndOpenSatellite}
              satelliteReady={satelliteReady}
            />
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
              <button
                type="button"
                onClick={() => setDrawMapTrigger((n) => n + 1)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
              >
                Draw AOI on map
              </button>
              <button
                type="button"
                onClick={() => setUploadMapTrigger((n) => n + 1)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
              >
                Upload GeoJSON
              </button>
            </div>
            <ReadOnly
              label="Coordinate validation"
              value={validation?.coordinateOk ? 'Valid' : 'Pending / invalid'}
            />
            <p className="text-xs text-slate-600 sm:col-span-2">{USGS_3DEP_TERRAIN_RELEVANCE_NOTE}</p>
            <div className="sm:col-span-2">
              <Usgs3depLidarPanel
                lat={ctx.location.latitude}
                lng={ctx.location.longitude}
                compact
              />
            </div>
          </Section>

          <Section title="Project Identity">
            {locationSuggestions && !ctx.projectName.trim() ? (
              <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950 sm:col-span-2">
                Suggested name: <span className="font-semibold">{locationSuggestions.suggestedProjectName}</span> — use
                Apply all in the map section above, or enter your own.
              </p>
            ) : null}
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

        </DmrvWorkflowShell>

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
