export type SourceStatus =
  | 'live'
  | 'public_record'
  | 'commercial'
  | 'partner_required'
  | 'future'
  | 'historical'
  | 'not_configured'
  | 'unavailable';

export type SourceCategory =
  | 'ocean_water'
  | 'forest_carbon'
  | 'atmosphere_emissions'
  | 'heat_land'
  | 'ground_truth_public_records'
  | 'commercial_partner'
  | 'future_mission';

export type BackendSourceRecord = {
  sourceId: string;
  name: string;
  category: SourceCategory;
  status: SourceStatus;
  signals: string[];
  limitations: string[];
};

export type BackendBusinessUseCase = {
  id: string;
  name: string;
  description: string;
  requiredSources: string[];
  optionalSources: string[];
  validationRequired: boolean;
  safetyLanguage: string;
};
