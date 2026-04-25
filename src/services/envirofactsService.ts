import type {
  EnvirofactsFilters,
  EnvirofactsRecord,
  EnvirofactsSearchMeta,
  EnvirofactsSearchResponse,
} from '../types/envirofactsTypes';
import {
  buildAddressContainsUrl,
  buildCityContainsUrl,
  buildCountyContainsOnlyUrl,
  buildCountyUrl,
  buildFacilityNameUrl,
  buildStateAndCityUrl,
  buildStateEqualsUrl,
  buildTableBrowseUrl,
  buildWaterBodyContainsUrl,
  buildZipBeginsWithUrl,
  ENVIROFACTS_GEO_TABLE,
  sanitizeEnvirofactsSegment,
  sanitizeStateCode,
  sanitizeZip,
} from '../utils/envirofactsApiBuilder';
import { normalizeEnvirofactsRow } from './envirofactsNormalizer';

const LEGAL_NOTICE =
  'Source: U.S. EPA Envirofacts public data. DPAL uses this as an official public-data baseline for review, comparison, and evidence organization. EPA records do not by themselves prove a violation.';

const MOCK_ROWS: EnvirofactsRecord[] = [
  {
    id: 'env-demo-1',
    facilityName: 'Demo Lakeside Water Utility',
    recordName: 'Lakeside Utility Record',
    address: '900 Shoreline Ave',
    city: 'Waukegan',
    county: 'Lake',
    state: 'IL',
    zip: '60085',
    latitude: 42.3636,
    longitude: -87.8448,
    pinnable: true,
    sourceDatabase: 'EPA Envirofacts',
    sourceTable: ENVIROFACTS_GEO_TABLE,
    environmentalCategory: 'Water',
    sourceFlags: ['Air', 'Water', 'Waste', 'Toxics'],
    layerTags: ['air', 'water', 'waste', 'toxics', 'facilities'],
    hasRegistryId: true,
    enforcementCue: false,
    waterBody: 'Lake Michigan',
    complianceStatus: 'Verification Needed',
    recordId: 'ENV-DEMO-001',
    dpalReviewStatus: 'Official EPA Record · Public Data Baseline · Verification Needed',
    raw: {},
  },
];

function pageRange(page: number, pageSize: number): { first: number; last: number } {
  const p = Math.max(1, page);
  const size = Math.max(1, Math.min(100, pageSize));
  const first = (p - 1) * size + 1;
  const last = p * size;
  return { first, last };
}

function normalizeCountyForEquals(county: string): string {
  const c = county.trim();
  return c.replace(/\s+County\s*$/i, '').trim() || c;
}

async function fetchRows(url: string): Promise<Record<string, unknown>[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Envirofacts API HTTP ${response.status}`);
  }
  const payload: unknown = await response.json();
  if (payload && typeof payload === 'object' && !Array.isArray(payload) && 'error' in (payload as object)) {
    throw new Error(`EPA API error: ${JSON.stringify((payload as { error?: unknown }).error)}`);
  }
  return Array.isArray(payload) ? (payload as Record<string, unknown>[]) : [];
}

type UrlPlan = { url: string; queryMode: string };

function resolveUrlPlan(filters: EnvirofactsFilters, first: number, last: number): UrlPlan {
  const zip = sanitizeZip(filters.zipCode);
  const state = sanitizeStateCode(filters.state);
  const countyRaw = sanitizeEnvirofactsSegment(filters.county);
  const countyEq = normalizeCountyForEquals(countyRaw);
  const city = sanitizeEnvirofactsSegment(filters.city);
  const facility = sanitizeEnvirofactsSegment(filters.facilityName);
  const address = sanitizeEnvirofactsSegment(filters.address);
  const water = sanitizeEnvirofactsSegment(filters.waterBody);
  const mode = filters.searchMode;

  const autoZip = (): UrlPlan | null =>
    zip ? { url: buildZipBeginsWithUrl(zip, first, last), queryMode: `ZIP · postal_code beginsWith ${zip}` } : null;
  const autoStateCounty = () =>
    state && countyEq
      ? {
          url: buildCountyUrl(state, countyEq, first, last),
          queryMode: `County · state_code equals ${state} AND county_name equals ${countyEq}`,
        }
      : null;
  const autoStateCity = () =>
    state && city
      ? {
          url: buildStateAndCityUrl(state, city, first, last),
          queryMode: `City + State · state_code equals ${state} AND city_name contains ${city}`,
        }
      : null;
  const autoFacility = () =>
    facility
      ? { url: buildFacilityNameUrl(facility, first, last), queryMode: `Facility · primary_name contains ${facility}` }
      : null;
  const autoCity = () =>
    city && !state
      ? { url: buildCityContainsUrl(city, first, last), queryMode: `City · city_name contains ${city}` }
      : null;
  const autoCountyOnly = () =>
    countyRaw && !state
      ? {
          url: buildCountyContainsOnlyUrl(countyEq, first, last),
          queryMode: `County · county_name contains ${countyEq}`,
        }
      : null;
  const autoState = () =>
    state && !countyRaw && !city
      ? { url: buildStateEqualsUrl(state, first, last), queryMode: `State · state_code equals ${state}` }
      : null;
  const autoAddress = () =>
    address
      ? {
          url: buildAddressContainsUrl(address, first, last),
          queryMode: `Address · location_address contains (trimmed)`,
        }
      : null;
  const autoWater = () =>
    water
      ? {
          url: buildWaterBodyContainsUrl(water, first, last),
          queryMode: `Water body / name · primary_name contains (proxy)`,
        }
      : null;

  if (mode === 'zip' && zip) return { url: buildZipBeginsWithUrl(zip, first, last), queryMode: `ZIP · beginsWith ${zip}` };
  if (mode === 'state' && state) return { url: buildStateEqualsUrl(state, first, last), queryMode: `State · ${state}` };
  if (mode === 'county' && state && countyEq) {
    return {
      url: buildCountyUrl(state, countyEq, first, last),
      queryMode: `County · ${state} / ${countyEq}`,
    };
  }
  if (mode === 'county' && countyRaw && !state) {
    return {
      url: buildCountyContainsOnlyUrl(countyEq, first, last),
      queryMode: `County · county_name contains ${countyEq}`,
    };
  }
  if (mode === 'city' && city) {
    if (state) return { url: buildStateAndCityUrl(state, city, first, last), queryMode: `City + State (mode city)` };
    return { url: buildCityContainsUrl(city, first, last), queryMode: `City · contains ${city}` };
  }
  if (mode === 'facilityName' && facility) {
    return { url: buildFacilityNameUrl(facility, first, last), queryMode: `Facility · ${facility}` };
  }
  if (mode === 'address' && address) {
    return { url: buildAddressContainsUrl(address, first, last), queryMode: `Address search` };
  }
  if (mode === 'waterBody' && water) {
    return { url: buildWaterBodyContainsUrl(water, first, last), queryMode: `Water / name proxy` };
  }
  if (mode === 'sourceProgram' || mode === 'environmentalCategory') {
    return {
      url: buildTableBrowseUrl(first, last),
      queryMode: 'Table browse (client filter for program/category)',
    };
  }

  if (mode === 'auto') {
    return (
      autoZip() ??
      autoStateCounty() ??
      autoStateCity() ??
      autoFacility() ??
      autoCountyOnly() ??
      autoCity() ??
      autoState() ??
      autoAddress() ??
      autoWater() ?? {
        url: buildTableBrowseUrl(first, last),
        queryMode: 'Browse · first rows (narrow with ZIP, city, county, or state)',
      }
    );
  }

  return {
    url: buildTableBrowseUrl(first, last),
    queryMode: 'Browse · first rows',
  };
}

function applyClientFilters(rows: EnvirofactsRecord[], filters: EnvirofactsFilters): EnvirofactsRecord[] {
  const qAddress = filters.address.toLowerCase().trim();
  const qWaterBody = filters.waterBody.toLowerCase().trim();
  const qSource = filters.sourceSearch.toLowerCase().trim();
  const qCategory = filters.environmentalCategory.toLowerCase().trim();
  return rows.filter((row) => {
    if (qAddress && !row.address.toLowerCase().includes(qAddress)) return false;
    if (qWaterBody && !row.waterBody.toLowerCase().includes(qWaterBody) && !row.facilityName.toLowerCase().includes(qWaterBody)) return false;
    if (qSource && !`${row.sourceDatabase} ${row.sourceTable} ${row.sourceFlags.join(' ')}`.toLowerCase().includes(qSource)) return false;
    if (qCategory && !row.environmentalCategory.toLowerCase().includes(qCategory)) return false;
    return true;
  });
}

function buildMeta(plan: UrlPlan, rows: EnvirofactsRecord[]): EnvirofactsSearchMeta {
  const pinnableCount = rows.filter((r) => r.pinnable).length;
  return {
    apiSource: 'EPA Envirofacts',
    activeTable: ENVIROFACTS_GEO_TABLE,
    queryMode: plan.queryMode,
    requestUrl: plan.url,
    recordCount: rows.length,
    pinnableCount,
    noCoordinateCount: rows.length - pinnableCount,
    lastFetchedAtIso: new Date().toISOString(),
  };
}

export async function searchEnvirofacts(filters: EnvirofactsFilters): Promise<EnvirofactsSearchResponse> {
  const page = Math.max(1, filters.page);
  const pageSize = Math.max(1, Math.min(100, filters.pageSize));
  const { first, last } = pageRange(page, pageSize);
  const plan = resolveUrlPlan(filters, first, last);

  try {
    const rows = await fetchRows(plan.url);
    const normalized = rows.map((row, index) => normalizeEnvirofactsRow(row, first + index - 1));
    const filtered = applyClientFilters(normalized, filters);
    return {
      rows: filtered,
      total: filtered.length,
      page,
      pageSize,
      source: 'live',
      legalNotice: LEGAL_NOTICE,
      meta: buildMeta(plan, filtered),
    };
  } catch {
    const filtered = applyClientFilters(MOCK_ROWS, filters);
    return {
      rows: filtered,
      total: filtered.length,
      page,
      pageSize,
      source: 'mock',
      legalNotice: `${LEGAL_NOTICE} Mock fallback data — not live EPA data.`,
      meta: buildMeta({ ...plan, queryMode: `${plan.queryMode} (mock)` }, filtered),
    };
  }
}
