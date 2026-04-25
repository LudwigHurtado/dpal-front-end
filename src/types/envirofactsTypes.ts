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
  sourceDatabase: string;
  sourceTable: string;
  environmentalCategory: string;
  sourceFlags: string[];
  waterBody: string;
  complianceStatus: string;
  recordId: string;
  raw: Record<string, unknown>;
};

export type EnvirofactsFilters = {
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

export type EnvirofactsLayer = 'Air' | 'Water' | 'Waste' | 'Toxics' | 'Land' | 'Radiation' | 'Enforcement' | 'Facilities';

export type EnvirofactsEvidenceRecord = {
  source: 'EPA Envirofacts';
  epaTableSource: string;
  recordId: string;
  facilityName: string;
  address: string;
  city: string;
  county: string;
  state: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
  environmentalMediaCategory: string;
  sourceFlags: string[];
  importedAtIso: string;
  dpalStatus: 'Official Public Record Imported';
  legalNote: string;
};

export type EnvirofactsSearchResponse = {
  rows: EnvirofactsRecord[];
  total: number;
  page: number;
  pageSize: number;
  source: 'live' | 'mock';
  legalNotice: string;
};
