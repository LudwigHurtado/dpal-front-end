export type EpaFacilityRecord = {
  facilityId: string;
  facilityName: string;
  address1: string;
  address2: string;
  city: string;
  county: string;
  state: string;
  stateName: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
  parentCompany: string;
  frsId: string;
  facilityTypes: string;
  reportedIndustryTypes: string;
  reportedSubparts: string;
  year: number | null;
};

export type EpaEmissionRecord = {
  facilityId: string;
  co2eEmission: number | null;
  gasId: string;
  subPartId: string;
  year: number | null;
};

export type EpaGasRecord = {
  gasId: string;
  gasName: string;
  gasCode: string;
  gasLabel: string;
};

export type EpaFacilityEmissionsAggregate = {
  totalCo2e: number | null;
  byGas: Array<{
    gasId: string;
    gasName: string;
    gasCode: string;
    gasLabel: string;
    co2eEmission: number | null;
  }>;
  reportingYears: number[];
};

export type EpaFacilityProfile = {
  facility: EpaFacilityRecord;
  emissions: EpaFacilityEmissionsAggregate;
  statusLabel: 'Official EPA Record';
};

export type EpaFilters = {
  state: string;
  city: string;
  county: string;
  zip: string;
  facilityName: string;
  parentCompany: string;
  year: string;
  gas: string;
  industryType: string;
  page: number;
  pageSize: number;
};

export type EpaEvidencePacketRecord = {
  source: 'U.S. EPA Envirofacts / GHGRP';
  importedAtIso: string;
  facilityId: string;
  facilityName: string;
  parentCompany: string;
  address: string;
  city: string;
  county: string;
  state: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
  reportedEmissionsCo2e: number | null;
  gasLabel: string;
  reportingYear: number | null;
  status: 'Official EPA Record Imported';
};

export type EpaSearchResponse = {
  rows: EpaFacilityProfile[];
  total: number;
  page: number;
  pageSize: number;
  source: 'live' | 'mock';
  legalNotice: string;
};
