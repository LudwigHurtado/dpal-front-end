import { getSelectedSourceIds } from './dmrvSourceSelectionService';
import { getDmrvProjectContext } from './dmrvProjectContextService';
import type { DmrvProjectContext } from './dmrvProjectContextTypes';
import {
  getDmrvInputConfig,
  saveDmrvInputConfig,
  listDmrvInputConfigsForProject,
} from './dmrvInputConfigService';
import type { DmrvInputConfig } from './dmrvInputConfigTypes';
import type {
  FieldPlotDraft,
  FieldPlotFieldMeta,
  FieldPlotFieldStatus,
  FieldPlotSettingKey,
  FieldPlotSuggestion,
  FieldPlotValidationRule,
} from './dmrvFieldPlotConfigTypes';
import {
  settingsToFieldPlot,
  fieldPlotToSettings,
  type FieldPlotConfig,
} from './dmrvFieldPlotConfigTypes';

function plotStr(plot: FieldPlotConfig, key: FieldPlotSettingKey): string {
  const v = plot[key];
  return typeof v === 'string' ? v.trim() : '';
}

/** DEV FALLBACK ONLY — replace with backend persistence when /api/dmrv/field-plots exists. */
const DEV_FALLBACK_LABEL = 'DEV FALLBACK ONLY — replace with backend persistence.';

export const FIELD_PLOT_FIELD_DEFS: FieldPlotFieldMeta[] = [
  {
    key: 'plotId',
    label: 'Plot ID',
    explanation: 'Unique ID for the ground plot or survey point.',
    example: 'SCZ-FL-001',
  },
  {
    key: 'latitude',
    label: 'Latitude',
    explanation: 'GPS latitude of the field plot center.',
    example: '-17.7833',
  },
  {
    key: 'longitude',
    label: 'Longitude',
    explanation: 'GPS longitude of the field plot center.',
    example: '-63.1821',
  },
  {
    key: 'gpsAccuracySource',
    label: 'GPS Accuracy / Source',
    explanation:
      'How accurate the location is and whether it came from GPS, map click, polygon centroid, or uploaded file.',
    example: 'GPS handheld ±5m / AOI centroid',
  },
  {
    key: 'speciesLandCover',
    label: 'Species / Land Cover',
    explanation: 'Dominant tree species, vegetation type, or land-cover class.',
    example: 'Tropical dry forest / mixed native canopy',
  },
  {
    key: 'sampleDate',
    label: 'Survey Date',
    explanation: 'Date the plot was observed or measured.',
    example: '2026-05-01',
    inputType: 'date',
  },
  {
    key: 'surveyor',
    label: 'Surveyor / Organization',
    explanation: 'Who collected the field data.',
    example: 'Community forestry team / DPAL field partner',
  },
  {
    key: 'plotSizeRadius',
    label: 'Plot Size / Radius',
    explanation: 'Field plot area used for biomass or land-cover validation.',
    example: '20m radius or 0.1 ha',
  },
  {
    key: 'biomassEvidence',
    label: 'Biomass / Canopy / DBH Evidence',
    explanation: 'Tree measurements or biomass-related evidence if available.',
    example: 'DBH inventory for 12 trees; canopy height 18m',
  },
  {
    key: 'photoAttachments',
    label: 'Photo / Evidence Attachments',
    explanation: 'Ground photos, GPS screenshots, field notes, or survey files.',
    example: 'plot-001-gps.jpg, canopy-photo.jpg',
  },
  {
    key: 'provenanceNotes',
    label: 'Provenance Notes',
    explanation: 'Where the data came from and how it can be verified.',
    example: 'Ground survey linked to project AOI; photos on file',
    inputType: 'textarea',
  },
];

function slugify(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'PLOT';
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function inferLandCover(typeTitle: string, typeId: string): string {
  const lower = `${typeTitle} ${typeId}`.toLowerCase();
  if (lower.includes('forest') || lower.includes('land use')) {
    return 'Forest / Land Use — confirm dominant species';
  }
  if (lower.includes('wetland') || lower.includes('mangrove')) {
    return 'Wetland / coastal vegetation — confirm dominant cover class';
  }
  if (lower.includes('grass') || lower.includes('grazing')) {
    return 'Grassland / grazing land — confirm cover type';
  }
  return 'Land cover — confirm dominant class with field notes';
}

export function getFieldPlotFieldStatus(
  key: FieldPlotSettingKey,
  value: string | boolean,
  draft?: FieldPlotDraft | null,
): FieldPlotFieldStatus {
  if (typeof value === 'boolean') return value ? 'filled' : 'missing';
  const trimmed = value.trim();
  if (!trimmed) {
    const suggested = draft?.suggestions.some((s) => s.key === key);
    return suggested ? 'suggested' : 'missing';
  }
  const suggestion = draft?.suggestions.find((s) => s.key === key);
  if (suggestion?.needsReview && suggestion.value === trimmed) return 'needs_review';
  if (draft?.settings[key] === trimmed && draft.suggestions.some((s) => s.key === key && s.needsReview)) {
    return 'needs_review';
  }
  return 'filled';
}

export function buildSuggestedFieldPlotDraft(params: {
  project: DmrvProjectContext | null;
  typeId: string;
  typeTitle: string;
  evidenceSourceLabels?: string[];
}): FieldPlotDraft {
  const { project, typeId, typeTitle, evidenceSourceLabels = [] } = params;
  const missingItems: string[] = [];
  const suggestions: FieldPlotSuggestion[] = [];
  const settings: Partial<Record<FieldPlotSettingKey, string | boolean>> = {};

  const projectSlug = slugify(project?.projectName ?? project?.projectId ?? typeId);
  const plotId = `${projectSlug}-FIELD-001`;
  settings.plotId = plotId;
  suggestions.push({
    key: 'plotId',
    value: plotId,
    source: 'Project name + DMRV type',
    needsReview: true,
  });

  const lat = project?.location.latitude?.trim() ?? '';
  const lng = project?.location.longitude?.trim() ?? '';
  const hasAoi = Boolean(project?.location.aoiId?.trim() || project?.location.aoiGeoJson?.trim());

  if (lat && lng) {
    settings.latitude = lat;
    settings.longitude = lng;
    const gpsNote = hasAoi ? 'AOI centroid' : 'Project location';
    settings.gpsAccuracySource = `${gpsNote} — confirm with handheld GPS if claiming plot-level precision`;
    suggestions.push(
      { key: 'latitude', value: lat, source: gpsNote, needsReview: !hasAoi },
      { key: 'longitude', value: lng, source: gpsNote, needsReview: !hasAoi },
      {
        key: 'gpsAccuracySource',
        value: String(settings.gpsAccuracySource),
        source: 'Project AOI / location',
        needsReview: true,
      },
    );
  } else {
    missingItems.push('Location / AOI — draw or select an AOI in project configuration first');
  }

  const landCover = inferLandCover(typeTitle, typeId);
  settings.speciesLandCover = landCover;
  suggestions.push({
    key: 'speciesLandCover',
    value: landCover,
    source: `DMRV type: ${typeTitle}`,
    needsReview: true,
  });

  const surveyDate =
    project?.reporting.startDate?.trim() || todayIso();
  settings.sampleDate = surveyDate;
  suggestions.push({
    key: 'sampleDate',
    value: surveyDate,
    source: project?.reporting.startDate ? 'Reporting period start' : 'Today (placeholder)',
    needsReview: true,
  });

  if (project?.organization?.trim()) {
    settings.surveyor = project.organization.trim();
    suggestions.push({
      key: 'surveyor',
      value: settings.surveyor as string,
      source: 'Project organization',
      needsReview: false,
    });
  } else {
    missingItems.push('Surveyor / organization');
  }

  settings.plotSizeRadius = '20m radius (0.126 ha) — confirm with field protocol';
  suggestions.push({
    key: 'plotSizeRadius',
    value: String(settings.plotSizeRadius),
    source: 'Forest plot default',
    needsReview: true,
  });

  if (project?.methodology.name?.trim()) {
    const prov = [
      'Draft generated from DPAL project configuration, selected evidence sources, and AOI metadata.',
      `Methodology: ${project.methodology.name}.`,
      evidenceSourceLabels.length
        ? `Evidence sources: ${evidenceSourceLabels.join(', ')}.`
        : 'No evidence sources selected yet.',
      DEV_FALLBACK_LABEL,
    ].join(' ');
    settings.provenanceNotes = prov;
    suggestions.push({ key: 'provenanceNotes', value: prov, source: 'Project + evidence', needsReview: true });
  } else {
    missingItems.push('Methodology in project configuration');
  }

  settings.minimumPlotCount = '3';
  settings.photosRequired = true;
  settings.aiDraftGenerated = true;
  settings.aiDraftReviewed = false;

  if (!evidenceSourceLabels.length) {
    missingItems.push('Evidence source selections — configure sources in the DMRV selector');
  }
  missingItems.push('Biomass / DBH measurements (if claiming stock change)');
  missingItems.push('Photo / attachment file references');

  return {
    settings,
    suggestions,
    missingItems,
    provenanceSummary:
      'These values were generated from your previous project configuration and evidence sources. Please review before saving.',
    generatedAt: new Date().toISOString(),
    label: 'AI suggested draft — review before saving',
  };
}

export function buildFieldPlotValidationRules(
  plot: ReturnType<typeof settingsToFieldPlot>,
  project: DmrvProjectContext | null,
  config: DmrvInputConfig,
): FieldPlotValidationRule[] {
  const reportingStart = project?.reporting.startDate?.trim() ?? '';
  const reportingEnd = project?.reporting.endDate?.trim() ?? '';
  const surveyDate = plotStr(plot, 'sampleDate');
  const surveyInPeriod =
    surveyDate &&
    reportingStart &&
    reportingEnd &&
    surveyDate >= reportingStart &&
    surveyDate <= reportingEnd;

  const coordsOk = Boolean(plotStr(plot, 'latitude') && plotStr(plot, 'longitude'));
  const aoiOk = Boolean(
    project?.location.aoiId?.trim() ||
      project?.location.aoiGeoJson?.trim() ||
      config.projectContext.locationAoiId?.trim(),
  );

  return [
    {
      id: 'gps-required',
      name: 'GPS coordinates required',
      whyItMatters: 'Validators need precise ground-truth coordinates to compare with satellite layers.',
      status: coordsOk ? 'pass' : 'missing',
      fieldKey: 'latitude',
      fixHint: 'Add latitude and longitude or run AI Fill from project data.',
    },
    {
      id: 'aoi-match',
      name: 'AOI / project location should match plot location',
      whyItMatters: 'Plots far outside the project AOI weaken DMRV integrity and reviewer trust.',
      status: coordsOk && aoiOk ? 'pass' : coordsOk ? 'needs_review' : 'missing',
      fieldKey: 'latitude',
      fixHint: aoiOk ? undefined : 'Define an AOI in project configuration, then align plot coordinates.',
    },
    {
      id: 'survey-period',
      name: 'Survey date within reporting period',
      whyItMatters: 'Observations outside the reporting window need explicit justification.',
      status: !surveyDate ? 'missing' : surveyInPeriod ? 'pass' : 'needs_review',
      fieldKey: 'sampleDate',
      fixHint: 'Set survey date inside reporting period or document why it differs.',
    },
    {
      id: 'land-cover',
      name: 'Species / land-cover type required',
      whyItMatters: 'Land-cover class links ground plots to satellite land-cover and biomass models.',
      status: plotStr(plot, 'speciesLandCover') ? 'pass' : 'missing',
      fieldKey: 'speciesLandCover',
    },
    {
      id: 'attachments',
      name: 'At least one evidence attachment recommended',
      whyItMatters: 'Photos and field notes help validators confirm the plot was visited.',
      status: plotStr(plot, 'photoAttachments') ? 'pass' : 'needs_review',
      fieldKey: 'photoAttachments',
    },
    {
      id: 'provenance',
      name: 'Provenance notes required before anchoring',
      whyItMatters: 'Reviewers must trace who collected data and how it was verified.',
      status: plotStr(plot, 'provenanceNotes') ? 'pass' : 'missing',
      fieldKey: 'provenanceNotes',
    },
    {
      id: 'ai-review',
      name: 'AI-filled values must be reviewed by user',
      whyItMatters: 'DPAL never auto-certifies ground truth — human review is required.',
      status: plot.aiDraftGenerated && !plot.aiDraftReviewed ? 'needs_review' : 'pass',
      fixHint: 'Mark draft as reviewed after checking each field.',
    },
    {
      id: 'blockchain-gate',
      name: 'Blockchain anchor disabled until minimum fields are complete',
      whyItMatters: 'Anchoring incomplete field evidence can mislead downstream reviewers.',
      status:
        coordsOk &&
        plotStr(plot, 'speciesLandCover') &&
        plotStr(plot, 'provenanceNotes') &&
        plot.aiDraftReviewed
          ? 'pass'
          : 'missing',
      fixHint: 'Complete coordinates, land cover, provenance, and review AI suggestions first.',
    },
  ];
}

export type FieldPlotIntegrityBreakdown = {
  score: number;
  missing: string[];
  checklist: { label: string; done: boolean }[];
};

export function computeFieldPlotIntegrity(
  plot: ReturnType<typeof settingsToFieldPlot>,
  project: DmrvProjectContext | null,
  config: DmrvInputConfig,
): FieldPlotIntegrityBreakdown {
  const checklist: { label: string; done: boolean }[] = [
    { label: 'Project name configured', done: Boolean(project?.projectName?.trim()) },
    { label: 'Location / AOI', done: Boolean(project?.location.aoiId?.trim() || project?.location.aoiGeoJson?.trim()) },
    { label: 'Methodology', done: Boolean(project?.methodology.name?.trim()) },
    { label: 'Field plot coordinates', done: Boolean(plotStr(plot, 'latitude') && plotStr(plot, 'longitude')) },
    { label: 'Species / land-cover', done: Boolean(plotStr(plot, 'speciesLandCover')) },
    { label: 'Survey date', done: Boolean(plotStr(plot, 'sampleDate')) },
    { label: 'Provenance notes', done: Boolean(plotStr(plot, 'provenanceNotes')) },
    { label: 'Evidence attachments noted', done: Boolean(plotStr(plot, 'photoAttachments')) },
    { label: 'AI draft reviewed', done: Boolean(plot.aiDraftReviewed) },
    { label: 'Evidence packet generated', done: Boolean(config.evidencePacketId) },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const score = Math.round((doneCount / checklist.length) * 100);
  const missing = checklist.filter((c) => !c.done).map((c) => c.label);
  return { score, missing, checklist };
}

export function getFieldPlotConfig(
  projectId: string,
  categorySlug: string,
  inputKey: string,
): DmrvInputConfig | null {
  return getDmrvInputConfig(projectId, categorySlug, inputKey);
}

export function saveFieldPlotConfig(config: DmrvInputConfig): DmrvInputConfig {
  return saveDmrvInputConfig(config);
}

export function gatherEvidenceSourceLabels(projectId: string, typeId: string): string[] {
  const kinds = ['satellite', 'lidar', 'field', 'blockchain'] as const;
  const labels: string[] = [];
  for (const kind of kinds) {
    const ids = getSelectedSourceIds(projectId, typeId, kind);
    labels.push(...ids);
  }
  const siblingConfigs = listDmrvInputConfigsForProject(projectId);
  for (const c of siblingConfigs) {
    if (c.status !== 'not_configured') labels.push(c.inputLabel);
  }
  return [...new Set(labels.filter(Boolean))];
}

export function applyFieldPlotDraft(
  config: DmrvInputConfig,
  draft: FieldPlotDraft,
): DmrvInputConfig {
  return {
    ...config,
    dataSourceSettings: {
      ...config.dataSourceSettings,
      ...fieldPlotToSettings(draft.settings as Partial<Record<FieldPlotSettingKey, string | boolean>>),
      aiDraftGenerated: true,
      aiDraftReviewed: false,
    },
    status: config.status === 'not_configured' ? 'draft' : config.status,
  };
}

export function markFieldPlotDraftReviewed(config: DmrvInputConfig): DmrvInputConfig {
  return {
    ...config,
    dataSourceSettings: {
      ...config.dataSourceSettings,
      aiDraftReviewed: true,
    },
  };
}

export function loadProjectForFieldPlots(projectId: string): DmrvProjectContext | null {
  return getDmrvProjectContext(projectId);
}
