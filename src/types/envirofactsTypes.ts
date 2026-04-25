/** Internal tags for layer filtering (derived from EPA program flags). */
export type EnvirofactsLayerTag =
  | 'air'
  | 'water'
  | 'waste'
  | 'toxics'
  | 'landCleanup'
  | 'radiation'
  | 'ghg'
  | 'facilities'
  | 'enforcement';

export type EnvirofactsLayer =
  | 'Air'
  | 'Water'
  | 'Waste'
  | 'Toxics'
  | 'Land'
  | 'Radiation'
  | 'Enforcement'
  | 'Facilities'
  | 'GHG';

export type EnvirofactsSearchMode =
  | 'auto'
  | 'zip'
  | 'address'
  | 'city'
  | 'county'
  | 'state'
  | 'waterBody'
  | 'facilityName'
  | 'sourceProgram'
  | 'environmentalCategory';

export type EnvirofactsRecord = {
  id: string;
  facilityName: string;
  recordName: string;
  address: string;
  city: string;
  county: string;
  state: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
  pinnable: boolean;
  sourceDatabase: string;
  sourceTable: string;
  environmentalCategory: string;
  /** Human-readable EPA program flags for UI chips */
  sourceFlags: string[];
  layerTags: EnvirofactsLayerTag[];
  hasRegistryId: boolean;
  enforcementCue: boolean;
  waterBody: string;
  complianceStatus: string;
  recordId: string;
  dpalReviewStatus: string;
  raw: Record<string, unknown>;
};

export type EnvirofactsFilters = {
  searchMode: EnvirofactsSearchMode;
  address: string;
  zipCode: string;
  city: string;
  county: string;
  state: string;
  waterBody: string;
  facilityName: string;
  sourceSearch: string;
  environmentalCategory: string;
  page: number;
  pageSize: number;
};

/** Evidence packet stored locally for review workflows (legal-safe baseline). */
export type EnvirofactsEvidencePacket = {
  source: 'EPA Envirofacts';
  sourceUrl: string;
  apiBase: string;
  epaTable: string;
  recordId: string;
  facilityName: string;
  address: string;
  city: string;
  county: string;
  state: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
  sourceFlags: string[];
  environmentalCategory: string;
  importedAt: string;
  dpalStatus: 'Official Public Record Imported';
  confidence: string;
  legalNote: string;
};

/** @deprecated Use EnvirofactsEvidencePacket; kept for gradual migration in UI */
export type EnvirofactsEvidenceRecord = EnvirofactsEvidencePacket;

export type EnvirofactsSearchMeta = {
  apiSource: 'EPA Envirofacts';
  activeTable: string;
  queryMode: string;
  requestUrl: string;
  recordCount: number;
  pinnableCount: number;
  noCoordinateCount: number;
  lastFetchedAtIso: string;
};

export type EnvirofactsSearchResponse = {
  rows: EnvirofactsRecord[];
  total: number;
  page: number;
  pageSize: number;
  source: 'live' | 'mock';
  legalNotice: string;
  meta: EnvirofactsSearchMeta | null;
};
