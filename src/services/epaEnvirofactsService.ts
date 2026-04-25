import type { EpaFacilityProfile, EpaFilters, EpaGasRecord, EpaSearchResponse } from '../types/epa';
import { buildEpaFilteredUrl, buildEpaMultiFilterUrl, buildEpaTableUrl } from '../utils/epaApiBuilder';
import { buildFacilityProfiles, normalizeEmissionRow, normalizeFacilityRow, normalizeGasRow } from './epaNormalizer';

/** GHGRP tables must use program-qualified names per EPA Envirofacts Data Service API. */
const FACILITY_TABLE = 'ghg.PUB_DIM_FACILITY';
const EMISSIONS_TABLE = 'ghg.PUB_FACTS_SUBP_GHG_EMISSION';
const GASES_TABLE = 'ghg.PUB_DIM_GHG';
const LEGAL_NOTICE =
  'Source: U.S. EPA Envirofacts / GHGRP public data. Status: Official reported data, not an independent DPAL accusation.';

const MOCK_GASES: EpaGasRecord[] = [
  { gasId: '1', gasName: 'Carbon Dioxide', gasCode: 'CO2', gasLabel: 'CO2' },
  { gasId: '2', gasName: 'Methane', gasCode: 'CH4', gasLabel: 'CH4' },
  { gasId: '3', gasName: 'Nitrous Oxide', gasCode: 'N2O', gasLabel: 'N2O' },
];

const MOCK_FALLBACK_RESPONSE: EpaSearchResponse = {
  rows: [
    {
      facility: {
        facilityId: 'EPA-DEMO-1001',
        facilityName: 'Demo Power Generation Station',
        address1: '1200 Example Energy Blvd',
        address2: '',
        city: 'Houston',
        county: 'Harris',
        state: 'TX',
        stateName: 'Texas',
        zip: '77002',
        latitude: 29.7604,
        longitude: -95.3698,
        parentCompany: 'Demo Utilities Group',
        frsId: 'FRS-DEMO-1001',
        facilityTypes: 'Electricity Generation',
        reportedIndustryTypes: 'Electricity Generation',
        reportedSubparts: 'C',
        year: 2023,
      },
      emissions: {
        totalCo2e: 624500,
        byGas: [{ gasId: '1', gasName: 'Carbon Dioxide', gasCode: 'CO2', gasLabel: 'CO2', co2eEmission: 624500 }],
        reportingYears: [2023],
      },
      statusLabel: 'Official EPA Record',
    },
  ],
  total: 1,
  page: 1,
  pageSize: 25,
  source: 'mock',
  legalNotice:
    `${LEGAL_NOTICE} Mock fallback is shown because the live EPA service could not be reached.`,
};

function cleanField(value: string): string {
  return value.replace(/,+$/g, '').trim();
}

/** 1-based inclusive row range for a page (EPA first index is 1). */
function pageToRange(page: number, pageSize: number): { first: number; last: number } {
  const p = Math.max(1, page);
  const size = Math.max(1, Math.min(100, pageSize));
  const first = (p - 1) * size + 1;
  const last = p * size;
  return { first, last };
}

async function fetchJsonRows(url: string): Promise<Record<string, unknown>[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`EPA request failed (${response.status})`);
  }
  const payload: unknown = await response.json();
  if (payload && typeof payload === 'object' && !Array.isArray(payload) && 'error' in (payload as object)) {
    throw new Error(`EPA API error: ${JSON.stringify((payload as { error?: unknown }).error)}`);
  }
  return Array.isArray(payload) ? (payload as Record<string, unknown>[]) : [];
}

function buildFacilityUrl(filters: EpaFilters, first: number, last: number): string {
  const exactFilters: Array<{ field: string; operator: 'equals'; value: string }> = [];
  if (filters.state) exactFilters.push({ field: 'state', operator: 'equals', value: cleanField(filters.state) });
  if (filters.city) exactFilters.push({ field: 'city', operator: 'equals', value: cleanField(filters.city) });
  if (filters.county) exactFilters.push({ field: 'county', operator: 'equals', value: cleanField(filters.county) });
  if (filters.zip) exactFilters.push({ field: 'zip', operator: 'equals', value: cleanField(filters.zip) });
  if (filters.year) exactFilters.push({ field: 'year', operator: 'equals', value: cleanField(filters.year) });

  if (exactFilters.length > 0) {
    return buildEpaMultiFilterUrl(FACILITY_TABLE, exactFilters, first, last);
  }
  if (filters.facilityName) {
    return buildEpaFilteredUrl(FACILITY_TABLE, 'facility_name', 'contains', filters.facilityName, first, last);
  }
  if (filters.parentCompany) {
    return buildEpaFilteredUrl(FACILITY_TABLE, 'parent_company', 'contains', filters.parentCompany, first, last);
  }
  return buildEpaTableUrl(FACILITY_TABLE, first, last);
}

function pickGasIdFromFilter(filters: EpaFilters, gases: EpaGasRecord[]): string | null {
  if (!filters.gas) return null;
  const normalized = filters.gas.trim().toLowerCase();
  const matched = gases.find(
    (gas) =>
      gas.gasCode.toLowerCase() === normalized ||
      gas.gasName.toLowerCase() === normalized ||
      gas.gasLabel.toLowerCase() === normalized,
  );
  return matched?.gasId ?? null;
}

function applyClientFiltering(rows: EpaFacilityProfile[], filters: EpaFilters): EpaFacilityProfile[] {
  const qFacility = filters.facilityName.trim().toLowerCase();
  const qParent = filters.parentCompany.trim().toLowerCase();
  const qIndustry = filters.industryType.trim().toLowerCase();
  const gasFilter = filters.gas.trim().toLowerCase();
  const yearFilter = Number(filters.year);

  return rows.filter((entry) => {
    const facility = entry.facility;
    if (qFacility && !facility.facilityName.toLowerCase().includes(qFacility)) return false;
    if (qParent && !facility.parentCompany.toLowerCase().includes(qParent)) return false;
    if (qIndustry && !facility.reportedIndustryTypes.toLowerCase().includes(qIndustry)) return false;
    if (Number.isFinite(yearFilter) && yearFilter > 0 && !entry.emissions.reportingYears.includes(yearFilter)) return false;
    if (gasFilter) {
      const hasGas = entry.emissions.byGas.some(
        (gas) =>
          gas.gasCode.toLowerCase() === gasFilter ||
          gas.gasName.toLowerCase() === gasFilter ||
          gas.gasLabel.toLowerCase() === gasFilter,
      );
      if (!hasGas) return false;
    }
    return true;
  });
}

export async function fetchEpaGases(): Promise<EpaGasRecord[]> {
  try {
    const rows = await fetchJsonRows(buildEpaTableUrl(GASES_TABLE, 1, 200));
    return rows.map(normalizeGasRow);
  } catch {
    return MOCK_GASES;
  }
}

export async function fetchEpaFacilityProfiles(filters: EpaFilters): Promise<EpaSearchResponse> {
  const page = Math.max(1, filters.page);
  const pageSize = Math.max(1, Math.min(100, filters.pageSize));
  const { first, last } = pageToRange(page, pageSize);

  try {
    const gases = await fetchEpaGases();
    const facilityRows = await fetchJsonRows(buildFacilityUrl(filters, first, last));
    const facilities = facilityRows.map(normalizeFacilityRow).filter((f) => f.facilityId);

    const gasIdFilter = pickGasIdFromFilter(filters, gases);
    const emissionsUrl = filters.year
      ? buildEpaFilteredUrl(EMISSIONS_TABLE, 'year', 'equals', cleanField(filters.year), 1, 5000)
      : buildEpaTableUrl(EMISSIONS_TABLE, 1, 3000);
    const emissionsRows = await fetchJsonRows(emissionsUrl);
    const facilityIdSet = new Set(facilities.map((f) => f.facilityId));
    const emissions = emissionsRows.map(normalizeEmissionRow).filter((item) => {
      if (!item.facilityId) return false;
      if (!facilityIdSet.has(item.facilityId)) return false;
      if (gasIdFilter && item.gasId !== gasIdFilter) return false;
      return true;
    });

    const joined = buildFacilityProfiles(facilities, emissions, gases);
    const filtered = applyClientFiltering(joined, filters);
    return {
      rows: filtered,
      total: filtered.length,
      page,
      pageSize,
      source: 'live',
      legalNotice: LEGAL_NOTICE,
    };
  } catch {
    return {
      ...MOCK_FALLBACK_RESPONSE,
      page,
      pageSize,
    };
  }
}
