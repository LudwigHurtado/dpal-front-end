import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Loader } from '../../../components/icons';
import { DmrvAiConfigHelper, type DmrvAiHelperVariant } from './components/DmrvAiConfigHelper';
import { DmrvFieldPlotAiAssistant } from './components/DmrvFieldPlotAiAssistant';
import { DmrvFieldPlotGuidedPanel } from './components/DmrvFieldPlotGuidedPanel';
import { DmrvFieldPlotIntegrityPanel } from './components/DmrvFieldPlotIntegrityPanel';
import { DmrvFieldPlotSectionHelper } from './components/DmrvFieldPlotSectionHelper';
import { DmrvFieldPlotValidationCards } from './components/DmrvFieldPlotValidationCards';
import { DmrvBreadcrumb } from './components/DmrvBreadcrumb';
import { DmrvDataSourceFields } from './components/dmrvInputConfigFields';
import { DmrvSatellitePicker } from './components/DmrvSatellitePicker';
import { SceneLivePreviewCard } from './components/SceneLivePreviewCard';
import { DeepMethodologyCounsel } from './components/DeepMethodologyCounsel';
import { DmrvMethodologyPresetPanel } from './components/DmrvMethodologyPresetPanel';
import { DmrvSectionAiStrip } from './components/DmrvSectionAiStrip';
import { Usgs3depLidarPanel } from '../environmentalIntelligence/components/Usgs3depLidarPanel';
import { DmrvGediLidarGallery } from './components/DmrvGediLidarGallery';
import { USGS_3DEP_TERRAIN_RELEVANCE_NOTE } from './dmrvRecommendedSources';
import { runSceneSteppedAutofill } from './utils/sceneAutofillSteps';
import { DMRV_SATELLITE_SETTINGS_KEY } from './dmrvSatelliteCatalog';
import { DmrvInputSymbol } from './components/dmrvInputSymbols';
import { DmrvProjectContextBanner } from './components/DmrvProjectContextBanner';
import { DmrvWorkflowProgress } from './components/DmrvWorkflowProgress';
import { getCategoryBySlug, getTypeForCategory } from './dmrvRegistry';
import { getDmrvInputByKey, resolveDmrvInputDef } from './dmrvInputRegistry';
import { dmrvCategoryPath, dmrvSourceStackPath, inputKeyToSourceStackKind } from './dmrvNavigation';
import { anchorDmrvInputConfig } from './services/dmrvBlockchainAnchor';
import {
  buildDefaultConfig,
  computeCompletenessScore,
  generateDmrvEvidencePacket,
  getDmrvInputConfig,
  listDmrvInputConfigsForProject,
  projectContextSnapshot,
  saveDmrvInputConfig,
  testDmrvInputSource,
} from './services/dmrvInputConfigService';
import { ensureDmrvProjectContext } from './services/dmrvProjectContextService';
import {
  getMethodologyPresetById,
  type DmrvMethodologyPreset,
  type MethodologyApplicationTrace,
} from './dmrvMethodologyPresets';
import type { DmrvConfigStatus, DmrvInputConfig } from './services/dmrvInputConfigTypes';
import type { DmrvDataSourceSettings, DmrvValidationRules } from './services/dmrvInputConfigTypes';
import type { FieldPlotDraft } from './services/dmrvFieldPlotConfigTypes';
import { settingsToFieldPlot } from './services/dmrvFieldPlotConfigTypes';
import {
  applyFieldPlotDraft,
  buildFieldPlotValidationRules,
  buildSuggestedFieldPlotDraft,
  computeFieldPlotIntegrity,
  gatherEvidenceSourceLabels,
  markFieldPlotDraftReviewed,
} from './services/dmrvFieldPlotConfigService';
import { DmrvWorkflowShell } from './reporting/DmrvWorkflowShell';
import { DmrvWorkflowReportHeader } from './reporting/DmrvWorkflowReportHeader';
import { appendEvidencePacketToReport, recordSatelliteReviewFromConfig } from './reporting/dmrvReportEngine';
import { DMRV_REPORT_MILESTONES } from './reporting/dmrvReportMilestones';
import {
  anchorReportVersion,
  rebuildAndPersistDmrvReport,
  saveReportSnapshot,
} from './reporting/dmrvReportStore';
import { useDmrvLiveReportSync } from './reporting/useDmrvLiveReportSync';

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
  const [scenePreviewUpdating, setScenePreviewUpdating] = useState(false);
  const [sceneAutofillStatus, setSceneAutofillStatus] = useState<string | null>(null);
  const [methodologyTrace, setMethodologyTrace] = useState<MethodologyApplicationTrace | null>(null);
  const [fieldPlotDraft, setFieldPlotDraft] = useState<FieldPlotDraft | null>(null);
  const [showFieldPlotDraftReview, setShowFieldPlotDraftReview] = useState(false);
  const [helperPrefill, setHelperPrefill] = useState<string | null>(null);

  const liveWorkflowStep = useMemo(() => {
    if (config?.configType === 'satellite') return 'satellite-config';
    if (config?.configType === 'field-plots') return 'field-plots';
    if (inputKey === 'validation-rules') return 'validation-rules';
    if (config?.configType === 'blockchain') return 'blockchain-anchor';
    return config?.configType ?? inputKey;
  }, [config?.configType, inputKey]);

  useDmrvLiveReportSync(projectId, liveWorkflowStep, {
    activeInputConfig: config,
    projectContext: storedProject,
    enabled: Boolean(config && projectId),
  });

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

  const isFieldPlots = config?.configType === 'field-plots';
  const integrityScore = config ? computeCompletenessScore(config) : 0;

  const fieldPlotIntegrity = useMemo(() => {
    if (!config || !isFieldPlots) return null;
    const plot = settingsToFieldPlot(config.dataSourceSettings);
    return computeFieldPlotIntegrity(plot, storedProject, config);
  }, [config, isFieldPlots, storedProject]);

  const fieldPlotValidationRules = useMemo(() => {
    if (!config || !isFieldPlots) return [];
    const plot = settingsToFieldPlot(config.dataSourceSettings);
    return buildFieldPlotValidationRules(plot, storedProject, config);
  }, [config, isFieldPlots, storedProject]);

  const aiHelperVariant: DmrvAiHelperVariant =
    inputKey === 'satellite-imagery'
      ? 'satellite-imagery'
      : inputKey === 'lidar'
        ? 'lidar'
        : 'input';

  const projectLat = storedProject?.location.latitude;
  const projectLng = storedProject?.location.longitude;

  const methodologyRecommendContext = useMemo(() => {
    if (!projectId) {
      return { selectedSources: [] as string[], hasFieldPlots: false, projectContext: '' };
    }
    const siblingConfigs = listDmrvInputConfigsForProject(projectId);
    const sources: string[] = [];
    let hasFieldPlots = false;
    for (const c of siblingConfigs) {
      if (c.inputKey === 'field-plots' || c.configType === 'field-plots') hasFieldPlots = true;
      if (c.inputKey === 'satellite-imagery') sources.push('Satellite Imagery');
      if (c.inputKey === 'lidar') sources.push('LiDAR');
      if (c.inputKey === 'biomass-data') sources.push('Biomass Data');
      if (c.inputKey === 'activity-data') sources.push('Activity Data');
      if (c.inputKey === 'soil-samples') sources.push('Soil Samples');
    }
    const ctxParts = [
      storedProject?.projectName,
      storedProject?.methodology?.name,
      storedProject?.methodology?.standardFramework,
      storedProject?.methodology?.domain,
      config?.projectContext.methodology,
    ].filter(Boolean);
    return {
      selectedSources: sources,
      hasFieldPlots,
      projectContext: ctxParts.join(' '),
    };
  }, [config?.projectContext.methodology, projectId, storedProject]);

  const handleApplyMethodologyPreset = useCallback(
    (
      preset: DmrvMethodologyPreset,
      dataSourcePatch: DmrvDataSourceSettings,
      validationRules: DmrvValidationRules,
    ) => {
      setConfig((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          dataSourceSettings: { ...prev.dataSourceSettings, ...dataSourcePatch },
          validationRules: { ...validationRules },
          projectContext: {
            ...prev.projectContext,
            methodology: preset.shortName,
          },
          status: prev.status === 'not_configured' ? 'draft' : prev.status,
        };
      });
      setNotice(`Applied "${preset.shortName}" — fields and evidence rules updated for verifier review.`);
    },
    [],
  );

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
        methodologyTrace: methodologyTrace ?? undefined,
      },
      null,
      2,
    );
  }, [categorySlug, config, inputDef.label, inputKey, integrityScore, methodologyTrace, typeId]);

  const typeTitle = dmrvType?.title ?? typeId;

  const appliedMethodologyPreset = useMemo(() => {
    const id = String(config?.dataSourceSettings.methodologyPresetId ?? '');
    return id ? getMethodologyPresetById(id) : undefined;
  }, [config?.dataSourceSettings.methodologyPresetId]);

  const satellitePickContext = useMemo(() => {
    if (!config) return '';
    return JSON.stringify(
      {
        section: 'satellite_pick',
        dmrvType: typeTitle,
        category: categorySlug,
        selectedSatellites: config.dataSourceSettings[DMRV_SATELLITE_SETTINGS_KEY],
        missions: ['landsat-9', 'sentinel-2', 'sentinel-1', 'modis', 'pace', 'sentinel-5p'],
      },
      null,
      2,
    );
  }, [categorySlug, config, typeTitle]);

  const sceneCoverageContext = useMemo(() => {
    if (!config) return '';
    return JSON.stringify(
      { section: 'scene_coverage', dmrvType: typeTitle, dataSourceSettings: config.dataSourceSettings },
      null,
      2,
    );
  }, [config, typeTitle]);

  const evidenceRulesContext = useMemo(() => {
    if (!config) return '';
    return JSON.stringify(
      { section: 'evidence_rules', dmrvType: typeTitle, validationRules: config.validationRules },
      null,
      2,
    );
  }, [config, typeTitle]);

  const evidencePacketContext = useMemo(() => {
    if (!config) return '';
    return JSON.stringify(
      { section: 'evidence_packet', dmrvType: typeTitle, evidencePacket: config.evidencePacket },
      null,
      2,
    );
  }, [config, typeTitle]);

  const applySceneSettings = useCallback((parsed: Record<string, unknown>) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const next = { ...prev.dataSourceSettings };
      for (const [key, value] of Object.entries(parsed)) {
        if (key === 'selectedSatellites') continue;
        if (typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number') {
          next[key] = value;
        }
      }
      return { ...prev, dataSourceSettings: next };
    });
  }, []);

  const applySceneField = useCallback((key: string, value: string | boolean) => {
    applySceneSettings({ [key]: value });
  }, [applySceneSettings]);

  const handleAnimatedSceneAutofill = useCallback(
    async (
      parsed: Record<string, unknown>,
      helpers: {
        applyField: (key: string, value: string | boolean) => void;
        setStatus: (message: string) => void;
      },
    ) => {
      setSceneAutofillStatus('Preparing suggested scene configuration…');
      await runSceneSteppedAutofill(parsed, typeTitle, applySceneField, (message) => {
        setSceneAutofillStatus(message);
        helpers.setStatus(message);
      });
      if (config?.configType === 'satellite') {
        recordSatelliteReviewFromConfig(config, {
          sceneAutofill: true,
          message: 'Scene configuration applied — run live Earth Observation scan when API is ready.',
        });
      }
      window.setTimeout(() => setSceneAutofillStatus(null), 2400);
    },
    [applySceneField, config, typeTitle],
  );

  const sceneDs = config?.dataSourceSettings;
  const scenePreviewFingerprint = useMemo(() => {
    if (!sceneDs) return '';
    return [
      sceneDs.provider,
      sceneDs.collection,
      sceneDs.startDate,
      sceneDs.endDate,
      sceneDs.cloudCoverLimit,
      sceneDs.resolution,
      sceneDs.minimumCoveragePct,
      sceneDs.aoiRequired,
      sceneDs.refreshFrequency,
    ].join('|');
  }, [sceneDs]);

  useEffect(() => {
    if (!config || config.configType !== 'satellite') return undefined;
    setScenePreviewUpdating(true);
    const timer = window.setTimeout(() => setScenePreviewUpdating(false), 480);
    return () => window.clearTimeout(timer);
  }, [config?.configType, scenePreviewFingerprint]);

  const aoiExists = Boolean(
    storedProject?.location.aoiId?.trim() || config?.projectContext.locationAoiId?.trim(),
  );

  const applyValidationRules = useCallback((parsed: Record<string, unknown>) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const next = { ...prev.validationRules };
      for (const key of Object.keys(next) as (keyof typeof next)[]) {
        if (typeof parsed[key] === 'boolean') next[key] = parsed[key] as boolean;
      }
      return { ...prev, validationRules: next };
    });
  }, []);

  const applyEvidencePacket = useCallback((parsed: Record<string, unknown>) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const next = { ...prev.evidencePacket };
      if (typeof parsed.title === 'string') next.title = parsed.title;
      if (
        parsed.publicVisibility === 'private' ||
        parsed.publicVisibility === 'validator_only' ||
        parsed.publicVisibility === 'public'
      ) {
        next.publicVisibility = parsed.publicVisibility;
      }
      for (const key of [
        'includeMapSnapshot',
        'includeRawDataReference',
        'includeReviewerNotes',
        'includeAttachments',
        'generateQrCode',
      ] as const) {
        if (typeof parsed[key] === 'boolean') next[key] = parsed[key];
      }
      return { ...prev, evidencePacket: next };
    });
  }, []);

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

  const applySatellitePick = useCallback((parsed: Record<string, unknown>) => {
    const raw = parsed.selectedSatellites ?? parsed.satelliteIds;
    if (typeof raw === 'string') {
      patchDataSource(DMRV_SATELLITE_SETTINGS_KEY, raw);
    } else if (Array.isArray(raw)) {
      patchDataSource(
        DMRV_SATELLITE_SETTINGS_KEY,
        raw.filter((id): id is string => typeof id === 'string').join(','),
      );
    }
  }, [patchDataSource]);

  const handleAiFillFieldPlots = useCallback(() => {
    if (!config || !storedProject) return;
    const evidenceLabels = gatherEvidenceSourceLabels(projectId, typeId);
    const draft = buildSuggestedFieldPlotDraft({
      project: storedProject,
      typeId,
      typeTitle,
      evidenceSourceLabels: evidenceLabels,
    });
    setFieldPlotDraft(draft);
    setShowFieldPlotDraftReview(true);
    setConfig((prev) => (prev ? applyFieldPlotDraft(prev, draft) : prev));
    setNotice('AI suggested draft applied — review every field before saving.');
  }, [config, projectId, storedProject, typeId, typeTitle]);

  const scrollToFieldPlotField = useCallback((fieldKey: string) => {
    const el = document.getElementById(`field-plot-${fieldKey}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleBulkAutofill = useCallback(
    (parsed: Record<string, unknown>) => {
      applySatellitePick(parsed);
      const nestedDs = parsed.dataSourceSettings;
      if (nestedDs && typeof nestedDs === 'object' && !Array.isArray(nestedDs)) {
        applySceneSettings(nestedDs as Record<string, unknown>);
      } else {
        applySceneSettings(parsed);
      }
      const nestedRules = parsed.validationRules;
      if (nestedRules && typeof nestedRules === 'object' && !Array.isArray(nestedRules)) {
        applyValidationRules(nestedRules as Record<string, unknown>);
      }
      const nestedPacket = parsed.evidencePacket;
      if (nestedPacket && typeof nestedPacket === 'object' && !Array.isArray(nestedPacket)) {
        applyEvidencePacket(nestedPacket as Record<string, unknown>);
      }
    },
    [applyEvidencePacket, applySatellitePick, applySceneSettings, applyValidationRules],
  );

  const bulkAutofillPrompt = useMemo(() => {
    if (!config) return undefined;
    if (config.configType === 'satellite') {
      return `Suggest a complete satellite MRV configuration for ${typeTitle}. Return JSON only:
{
  "selectedSatellites": "landsat-9,sentinel-2,sentinel-1",
  "provider": "string",
  "collection": "string",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "cloudCoverLimit": "string",
  "resolution": "string",
  "minimumCoveragePct": "string",
  "refreshFrequency": "string",
  "aoiRequired": boolean,
  "validationRules": {
    "requireCoordinates": boolean,
    "requireTimestamp": boolean,
    "requireSourceDocument": boolean,
    "requireReviewerApproval": boolean,
    "requireFieldVerification": boolean,
    "requireBeforeAfterComparison": boolean,
    "requireAnomalyDetection": boolean,
    "requireUncertaintyScore": boolean
  },
  "evidencePacket": {
    "title": "string",
    "publicVisibility": "private|validator_only|public",
    "includeMapSnapshot": boolean,
    "includeRawDataReference": boolean,
    "includeReviewerNotes": boolean,
    "includeAttachments": boolean,
    "generateQrCode": boolean
  }
}
Use only mission IDs: landsat-9, sentinel-2, sentinel-1, modis, pace, sentinel-5p.`;
    }
    if (config.configType === 'field-plots') {
      return `Suggest field plot dataSourceSettings for ${typeTitle}. Return JSON only:
{
  "dataSourceSettings": {
    "plotId": "string",
    "latitude": "string",
    "longitude": "string",
    "gpsAccuracySource": "string",
    "speciesLandCover": "string",
    "sampleDate": "YYYY-MM-DD",
    "surveyor": "string",
    "plotSizeRadius": "string",
    "biomassEvidence": "string",
    "photoAttachments": "string",
    "provenanceNotes": "string",
    "minimumPlotCount": "string",
    "photosRequired": boolean
  },
  "validationRules": {
    "requireCoordinates": true,
    "requireTimestamp": true,
    "requireFieldVerification": true,
    "requireReviewerApproval": boolean
  }
}`;
    }
    return `Suggest dataSourceSettings and validationRules for ${typeTitle} DMRV input "${inputDef.label}" (configType: ${config.configType}). Return JSON:
{
  "dataSourceSettings": { },
  "validationRules": { }
}`;
  }, [config, inputDef.label, typeTitle]);

  const handleSave = useCallback(() => {
    if (!config) return;
    const saved = saveDmrvInputConfig(config);
    setConfig(saved);
    rebuildAndPersistDmrvReport(saved.projectId, {
      actor: 'user',
      workflowStep: saved.configType,
      changeSummary: `Saved ${saved.inputLabel} configuration`,
      fieldChanged: saved.inputKey,
    });
    if (saved.configType === 'satellite') {
      saveReportSnapshot(saved.projectId, DMRV_REPORT_MILESTONES.dataSources, 'satellite-config');
    } else if (saved.configType === 'field-plots') {
      saveReportSnapshot(saved.projectId, DMRV_REPORT_MILESTONES.fieldPlots, 'field-plots');
    } else if (saved.inputKey === 'validation-rules') {
      saveReportSnapshot(saved.projectId, DMRV_REPORT_MILESTONES.validation, 'validation-rules');
    }
    setNotice('Configuration saved locally — living report updated.');
  }, [config]);

  const handleTest = useCallback(async () => {
    if (!config) return;
    setBusy('test');
    const result = await testDmrvInputSource(config);
    setBusy(null);
    setNotice(result.message);
    if (config.configType === 'satellite') {
      recordSatelliteReviewFromConfig(config, { ok: result.ok, message: result.message });
    }
  }, [config]);

  const handleEvidence = useCallback(async () => {
    if (!config) return;
    setBusy('evidence');
    const result = await generateDmrvEvidencePacket(config);
    setBusy(null);
    if (result.ok && result.packetId) {
      const next = saveDmrvInputConfig({ ...config, evidencePacketId: result.packetId });
      setConfig(next);
      rebuildAndPersistDmrvReport(next.projectId, {
        actor: 'user',
        workflowStep: 'evidence-packet',
        changeSummary: `Evidence packet ${result.packetId} generated`,
        sourceEvidenceId: result.packetId,
      });
      saveReportSnapshot(next.projectId, DMRV_REPORT_MILESTONES.evidencePacket, 'evidence-packet');
      appendEvidencePacketToReport(next.projectId, {
        packetId: result.packetId,
        title: next.evidencePacket.title || next.inputLabel,
        inputKeys: [next.inputKey],
        status: 'generated',
      });
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
      rebuildAndPersistDmrvReport(next.projectId, {
        actor: 'user',
        workflowStep: 'blockchain-anchor',
        changeSummary: `Blockchain anchor recorded (${result.ledgerRecordId ?? result.lastAnchoredHash ?? 'reference'})`,
        hash: result.lastAnchoredHash,
      });
      const report = saveReportSnapshot(next.projectId, DMRV_REPORT_MILESTONES.verifier, 'blockchain-anchor');
      const latest = report.versions[report.versions.length - 1];
      if (latest) {
        void anchorReportVersion(next.projectId, latest.versionId, {
          evidencePacketId: next.evidencePacketId,
          evidenceBundleHash: result.lastAnchoredHash,
          actor: 'user',
          transactionRef: result.ledgerRecordId,
        });
      }
      setNotice(`Anchored via ${result.provider}. Living report hash recorded.`);
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

  const backPath = dmrvCategoryPath(categorySlug, typeId, projectId);
  const sourceStackKind = inputKeyToSourceStackKind(inputKey);
  const sourceStackPath =
    sourceStackKind && projectId
      ? dmrvSourceStackPath(projectId, categorySlug, sourceStackKind, typeId)
      : null;

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
            <DmrvInputSymbol
              inputKey={inputDef.key}
              configType={inputDef.configType}
              label={inputDef.label}
              size={48}
              accentColor={category.color}
            />
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

        {projectId && categorySlug ? (
          <DmrvWorkflowReportHeader
            projectId={projectId}
            categorySlug={categorySlug}
            typeId={typeId}
            className="mb-4"
          />
        ) : null}

        <DmrvWorkflowProgress activeStep={isFieldPlots ? 3 : 2} />

        {sourceStackPath ? (
          <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
            Step 1: pick {sourceStackKind === 'lidar' ? 'LiDAR' : 'satellite'} missions and sensors in the{' '}
            <Link to={sourceStackPath} className="font-bold text-[#1e3a5f] underline">
              source stack workspace
            </Link>
            . Step 2: return here for scene dates, coverage rules, and evidence packet settings.
          </p>
        ) : null}

        {storedProject ? (
          <>
            <DmrvProjectContextBanner project={storedProject} />
            {isFieldPlots ? (
              <DmrvFieldPlotSectionHelper
                title="Project Context"
                intro="Project name, AOI, methodology, and reporting period flow into field plot suggestions and validation."
                sectionId="project-context"
                contextSummary={aiContextSummary}
                disabled={!!busy}
                onOpenFullHelper={setHelperPrefill}
              />
            ) : null}
          </>
        ) : null}

        {isFieldPlots && fieldPlotIntegrity ? (
          <>
            <DmrvFieldPlotIntegrityPanel
              breakdown={fieldPlotIntegrity}
              disabled={!!busy}
              onImproveScore={() => {
                scrollToFieldPlotField('latitude');
                handleAiFillFieldPlots();
              }}
              onAskAiFix={() =>
                setHelperPrefill('How can I improve my field plot configuration integrity score?')
              }
            />
            <DmrvFieldPlotSectionHelper
              title="Configuration Integrity Score"
              intro="The score tracks project context, coordinates, land cover, provenance, and evidence readiness."
              sectionId="integrity"
              contextSummary={JSON.stringify(fieldPlotIntegrity, null, 2)}
              disabled={!!busy}
              onOpenFullHelper={setHelperPrefill}
            />
          </>
        ) : (
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
        )}

        {notice ? (
          <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
            {notice}
          </p>
        ) : null}

        <DmrvWorkflowShell
          projectId={projectId}
          categorySlug={categorySlug}
          typeId={typeId}
          workflowStep={inputDef.configType}
        >
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]">
          <main className="space-y-4">
            {config.configType === 'satellite' ? (
              <Panel title="Pick satellites for this MRV use">
                <DmrvSatellitePicker
                  selectedRaw={config.dataSourceSettings[DMRV_SATELLITE_SETTINGS_KEY]}
                  onChange={(ids) => patchDataSource(DMRV_SATELLITE_SETTINGS_KEY, ids)}
                />
                <DmrvSectionAiStrip
                  sectionLabel="Satellite pick"
                  hint={`Ask which missions fit ${typeTitle} — or suggest a stack for you.`}
                  contextSummary={satellitePickContext}
                  disabled={!!busy}
                  starters={[
                    'Which satellites for forest carbon?',
                    'Do I need SAR if it is often cloudy?',
                  ]}
                  autofillPrompt={`Suggest satellite mission IDs for ${typeTitle} DMRV. Return JSON: { "selectedSatellites": "landsat-9,sentinel-2,sentinel-1" } using only: landsat-9, sentinel-2, sentinel-1, modis, pace, sentinel-5p.`}
                  onApply={applySatellitePick}
                />
              </Panel>
            ) : null}

            {config.configType === 'biomass' ? (
              <Panel title="Methodology Preset">
                <DmrvMethodologyPresetPanel
                  config={config}
                  typeId={typeId}
                  typeTitle={typeTitle}
                  recommendContext={methodologyRecommendContext}
                  onApplyPreset={handleApplyMethodologyPreset}
                  onTraceCreated={setMethodologyTrace}
                  disabled={!!busy}
                />
              </Panel>
            ) : null}

            {config.configType === 'biomass' ? (
              <DeepMethodologyCounsel
                projectId={projectId}
                dmrvTypeId={typeId}
                dmrvTypeName={typeTitle}
                selectedMethodologyId={String(config.dataSourceSettings.methodologyPresetId ?? '')}
                methodologyPreset={appliedMethodologyPreset}
                selectedSources={methodologyRecommendContext.selectedSources}
                formState={config.dataSourceSettings as Record<string, unknown>}
                evidenceRules={config.validationRules}
                blockchainAnchored={config.blockchain.status === 'anchored'}
                disabled={!!busy}
              />
            ) : null}

            <Panel title={config.configType === 'satellite' ? 'Scene & coverage settings' : 'Data Source Settings'}>
              {config.configType === 'satellite' ? (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start">
                  <div className="min-w-0 space-y-3">
                    <p className="text-xs text-slate-600">
                      Configure how DPAL will query scenes — the live preview updates as you adjust provider, dates,
                      cloud limits, and coverage rules. No catalog search runs until you execute scene search in the
                      workflow.
                    </p>
                    <DmrvDataSourceFields
                      configType={config.configType}
                      settings={config.dataSourceSettings}
                      onChange={patchDataSource}
                    />
                    <DmrvSectionAiStrip
                      sectionLabel="Scene coverage"
                      hint="Cloud limits, dates, and coverage rules for your AOI."
                      contextSummary={sceneCoverageContext}
                      disabled={!!busy}
                      starters={[
                        'What cloud cover limit is reasonable?',
                        'How do I align dates with reporting period?',
                      ]}
                      autofillPrompt={`Suggest scene & coverage settings for ${typeTitle} satellite MRV. Return JSON with string/boolean fields only: provider, collection, startDate, endDate, cloudCoverLimit, resolution, minimumCoveragePct, refreshFrequency, aoiRequired.`}
                      onApply={applySceneSettings}
                      onAnimatedApply={handleAnimatedSceneAutofill}
                    />
                  </div>
                  <SceneLivePreviewCard
                    provider={String(sceneDs?.provider ?? '')}
                    product={String(sceneDs?.collection ?? '')}
                    dateStart={String(sceneDs?.startDate ?? '')}
                    dateEnd={String(sceneDs?.endDate ?? '')}
                    cloudCover={
                      sceneDs?.cloudCoverLimit !== undefined && sceneDs?.cloudCoverLimit !== ''
                        ? String(sceneDs.cloudCoverLimit)
                        : undefined
                    }
                    resolution={String(sceneDs?.resolution ?? '')}
                    minimumCoverage={
                      sceneDs?.minimumCoveragePct !== undefined && sceneDs?.minimumCoveragePct !== ''
                        ? String(sceneDs.minimumCoveragePct)
                        : undefined
                    }
                    aoiRequired={Boolean(sceneDs?.aoiRequired)}
                    refreshFrequency={String(sceneDs?.refreshFrequency ?? '')}
                    dmrvTypeId={typeId}
                    dmrvTypeName={typeTitle}
                    aoiExists={aoiExists}
                    isUpdating={scenePreviewUpdating}
                    autofillStatus={sceneAutofillStatus}
                  />
                </div>
              ) : config.configType === 'lidar' ? (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-start">
                  <div className="min-w-0 space-y-3">
                    <DmrvGediLidarGallery compact className="rounded-xl border border-slate-200 bg-white p-3" />
                    <p className="text-xs text-slate-600">
                      Configure LiDAR provider and point-cloud settings. {USGS_3DEP_TERRAIN_RELEVANCE_NOTE}
                    </p>
                    <DmrvDataSourceFields
                      configType={config.configType}
                      settings={config.dataSourceSettings}
                      onChange={patchDataSource}
                    />
                    <DmrvSectionAiStrip
                      sectionLabel="LiDAR terrain evidence"
                      hint="USGS 3DEP elevation and LiDAR reference links for your AOI center."
                      contextSummary={aiContextSummary}
                      disabled={!!busy}
                      starters={[
                        'Want me to check whether LiDAR terrain evidence helps this project?',
                        'For a flood project, how does LiDAR help slope and drainage?',
                      ]}
                      autofillPrompt={`Suggest lidar dataSourceSettings for ${typeTitle}. Return JSON with string/boolean fields: provider, pointCloudSource, verticalAccuracy, groundClassificationRequired, canopyHeightModel, uploadUrl.`}
                      onApply={applySceneSettings}
                    />
                  </div>
                  <Usgs3depLidarPanel
                    lat={projectLat}
                    lng={projectLng}
                    radiusKm={5}
                  />
                </div>
              ) : isFieldPlots ? (
                <>
                  <DmrvFieldPlotGuidedPanel
                    settings={config.dataSourceSettings}
                    draft={fieldPlotDraft}
                    showDraftReview={showFieldPlotDraftReview}
                    hasAoi={aoiExists}
                    disabled={!!busy}
                    onChange={patchDataSource}
                    onAiFill={handleAiFillFieldPlots}
                    onMarkReviewed={() => {
                      setConfig((prev) => (prev ? markFieldPlotDraftReviewed(prev) : prev));
                      setNotice('Marked AI draft as reviewed. Save when ready.');
                    }}
                    onDismissDraftReview={() => setShowFieldPlotDraftReview(false)}
                  />
                  <DmrvFieldPlotSectionHelper
                    title="Field Plot AI Guide"
                    intro="Field plots are ground-truth evidence that helps verify what the satellite sees. GPS, land-cover, survey date, plot size, photos, and provenance notes are typical requirements."
                    sectionId="data-source"
                    contextSummary={aiContextSummary}
                    disabled={!!busy}
                    onFillDraft={handleAiFillFieldPlots}
                    onOpenFullHelper={setHelperPrefill}
                  />
                </>
              ) : (
                <>
                  <DmrvDataSourceFields
                    configType={config.configType}
                    settings={config.dataSourceSettings}
                    onChange={patchDataSource}
                  />
                  <DmrvSectionAiStrip
                    sectionLabel="Data source fields"
                    hint="Ask for values to paste into the fields above."
                    contextSummary={aiContextSummary}
                    disabled={!!busy}
                    starters={[
                      'What should I enter for this evidence source?',
                      'Which fields are required before I can save?',
                    ]}
                    autofillPrompt={`Suggest dataSourceSettings for ${typeTitle} ${inputDef.label}. Return JSON with string/boolean field keys matching this config type.`}
                    onApply={applySceneSettings}
                  />
                </>
              )}
            </Panel>

            <Panel title={isFieldPlots ? 'Validation Rules' : 'Evidence Rules'}>
              {isFieldPlots ? (
                <>
                  <DmrvFieldPlotValidationCards
                    rules={fieldPlotValidationRules}
                    disabled={!!busy}
                    onScrollToField={scrollToFieldPlotField}
                  />
                  <DmrvFieldPlotSectionHelper
                    title="Validation Rules"
                    intro="These rules show what reviewers expect before field evidence supports satellite MRV and blockchain anchoring."
                    sectionId="validation"
                    contextSummary={evidenceRulesContext}
                    disabled={!!busy}
                    onOpenFullHelper={setHelperPrefill}
                  />
                </>
              ) : (
                <ValidationRules config={config} onPatch={patchValidation} />
              )}
              {config.configType === 'satellite' ? (
                <DmrvSectionAiStrip
                  sectionLabel="Evidence rules"
                  hint="Validation gates before scene search and evidence packets."
                  contextSummary={evidenceRulesContext}
                  disabled={!!busy}
                  starters={[
                    'What rules should forest satellite MRV use?',
                    'When is before/after comparison required?',
                  ]}
                  autofillPrompt={`Suggest validation rule booleans for ${typeTitle} satellite evidence. Return JSON with only boolean keys: requireCoordinates, requireTimestamp, requireSourceDocument, requireReviewerApproval, requireFieldVerification, requireBeforeAfterComparison, requireAnomalyDetection, requireUncertaintyScore.`}
                  onApply={applyValidationRules}
                />
              ) : null}
            </Panel>

            <Panel title="Evidence Packet Settings">
              <EvidenceFields config={config} onPatch={patchEvidence} />
              {isFieldPlots ? (
                <DmrvFieldPlotSectionHelper
                  title="Evidence Packet Readiness"
                  intro="Configure what goes into the reviewer packet — map snapshots, attachments, and visibility."
                  sectionId="evidence-packet"
                  contextSummary={evidencePacketContext}
                  disabled={!!busy}
                  onOpenFullHelper={setHelperPrefill}
                />
              ) : null}
              {config.configType === 'satellite' ? (
                <DmrvSectionAiStrip
                  sectionLabel="Package settings"
                  hint="What goes into the reviewer packet and public visibility."
                  contextSummary={evidencePacketContext}
                  disabled={!!busy}
                  starters={[
                    'What should the evidence packet title say?',
                    'Should map snapshots be included?',
                  ]}
                  autofillPrompt={`Suggest evidence packet settings for ${typeTitle} satellite MRV. Return JSON: title (string), publicVisibility (private|validator_only|public), includeMapSnapshot, includeRawDataReference, includeReviewerNotes, includeAttachments, generateQrCode (booleans).`}
                  onApply={applyEvidencePacket}
                />
              ) : null}
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
            {isFieldPlots ? (
              <DmrvFieldPlotAiAssistant
                contextSummary={aiContextSummary}
                disabled={!!busy}
                prefillQuestion={helperPrefill}
                onClearPrefill={() => setHelperPrefill(null)}
                onFillConfiguration={handleAiFillFieldPlots}
                autofillPrompt={bulkAutofillPrompt}
                onApplyAutofill={handleBulkAutofill}
              />
            ) : (
              <DmrvAiConfigHelper
                variant={aiHelperVariant}
                contextSummary={aiContextSummary}
                disabled={!!busy}
                autofillPrompt={bulkAutofillPrompt}
                onApplyAutofill={handleBulkAutofill}
              />
            )}
            <Panel title="Evidence + Blockchain Status">
              <BlockchainPanel config={config} />
              {isFieldPlots ? (
                <DmrvFieldPlotSectionHelper
                  title="Blockchain Anchor"
                  intro="Anchoring stores a tamper-evident reference after field evidence and validation are complete."
                  sectionId="blockchain"
                  contextSummary={JSON.stringify(config.blockchain, null, 2)}
                  disabled={!!busy}
                  onOpenFullHelper={setHelperPrefill}
                />
              ) : null}
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
        </DmrvWorkflowShell>

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
