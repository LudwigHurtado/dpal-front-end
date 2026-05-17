import type { DmrvDataSourceSettings } from './dmrvInputConfigTypes';

/** Keys stored in DmrvInputConfig.dataSourceSettings for field-plots. */
export type FieldPlotSettingKey =
  | 'plotId'
  | 'latitude'
  | 'longitude'
  | 'gpsAccuracySource'
  | 'speciesLandCover'
  | 'sampleDate'
  | 'surveyor'
  | 'plotSizeRadius'
  | 'biomassEvidence'
  | 'photoAttachments'
  | 'provenanceNotes'
  | 'photosRequired'
  | 'minimumPlotCount'
  | 'aiDraftGenerated'
  | 'aiDraftReviewed';

export type FieldPlotConfig = Record<FieldPlotSettingKey, string | boolean>;

export type FieldPlotFieldStatus = 'missing' | 'suggested' | 'filled' | 'needs_review';

export type FieldPlotFieldMeta = {
  key: FieldPlotSettingKey;
  label: string;
  explanation: string;
  example: string;
  inputType?: 'text' | 'date' | 'textarea';
};

export type FieldPlotSuggestion = {
  key: FieldPlotSettingKey;
  value: string;
  source: string;
  needsReview: boolean;
};

export type FieldPlotDraft = {
  settings: Partial<FieldPlotConfig>;
  suggestions: FieldPlotSuggestion[];
  missingItems: string[];
  provenanceSummary: string;
  generatedAt: string;
  label: 'AI suggested draft — review before saving';
};

export type FieldPlotValidationStatus = 'pass' | 'missing' | 'needs_review';

export type FieldPlotValidationRule = {
  id: string;
  name: string;
  whyItMatters: string;
  status: FieldPlotValidationStatus;
  fieldKey?: FieldPlotSettingKey;
  fixHint?: string;
};

export type AiHelperMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
};

export type VoiceInputState = 'idle' | 'listening' | 'processing' | 'ready' | 'unsupported';

export function settingsToFieldPlot(settings: DmrvDataSourceSettings): FieldPlotConfig {
  return {
    plotId: String(settings.plotId ?? ''),
    latitude: String(settings.latitude ?? ''),
    longitude: String(settings.longitude ?? ''),
    gpsAccuracySource: String(settings.gpsAccuracySource ?? ''),
    speciesLandCover: String(settings.speciesLandCover ?? ''),
    sampleDate: String(settings.sampleDate ?? ''),
    surveyor: String(settings.surveyor ?? ''),
    plotSizeRadius: String(settings.plotSizeRadius ?? ''),
    biomassEvidence: String(settings.biomassEvidence ?? ''),
    photoAttachments: String(settings.photoAttachments ?? ''),
    provenanceNotes: String(settings.provenanceNotes ?? ''),
    photosRequired: Boolean(settings.photosRequired ?? true),
    minimumPlotCount: String(settings.minimumPlotCount ?? '3'),
    aiDraftGenerated: Boolean(settings.aiDraftGenerated ?? false),
    aiDraftReviewed: Boolean(settings.aiDraftReviewed ?? false),
  };
}

export function fieldPlotToSettings(plot: Partial<FieldPlotConfig>): DmrvDataSourceSettings {
  return { ...plot };
}
