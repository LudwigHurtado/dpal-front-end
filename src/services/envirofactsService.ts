import type { EnvirofactsFilters, EnvirofactsRecord, EnvirofactsSearchResponse } from '../types/envirofactsTypes';
import { buildEnvirofactsFilterUrl, buildEnvirofactsTableUrl } from '../utils/envirofactsApiBuilder';
import { normalizeEnvirofactsRow } from './envirofactsNormalizer';

const TABLE = 'lookups.mv_new_geo_best_picks';
const LEGAL_NOTICE =
  'Source: U.S. EPA Envirofacts public data. Status: Official EPA Record and Public Data Baseline; verification is still needed.';

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
    sourceDatabase: 'EPA Envirofacts',
    sourceTable: TABLE,
    environmentalCategory: 'Water',
    sourceFlags: ['Air', 'Water', 'Waste', 'Toxics'],
    waterBody: 'Lake Michigan',
    complianceStatus: 'Verification Needed',
    recordId: 'ENV-DEMO-001',
    raw: {},
  },
];

async function fetchRows(url: string): Promise<Record<string, unknown>[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Envirofacts API error (${response.status})`);
  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

function buildSearchUrl(filters: EnvirofactsFilters, start: number, end: number): string {
  if (filters.zipCode) {
    return buildEnvirofactsFilterUrl(TABLE, 'postal_code', 'beginsWith', filters.zipCode, start, end);
  }
  if (filters.city) return buildEnvirofactsFilterUrl(TABLE, 'city_name', 'contains', filters.city, start, end);
  if (filters.county) return buildEnvirofactsFilterUrl(TABLE, 'county_name', 'contains', filters.county, start, end);
  if (filters.state) return buildEnvirofactsFilterUrl(TABLE, 'state_code', 'equals', filters.state, start, end);
  if (filters.facilityName) return buildEnvirofactsFilterUrl(TABLE, 'facility_name', 'contains', filters.facilityName, start, end);
  if (filters.address) return buildEnvirofactsFilterUrl(TABLE, 'street_address', 'contains', filters.address, start, end);
  return buildEnvirofactsTableUrl(TABLE, start, end);
}

function applyClientFilters(rows: EnvirofactsRecord[], filters: EnvirofactsFilters): EnvirofactsRecord[] {
  const qAddress = filters.address.toLowerCase().trim();
  const qWaterBody = filters.waterBody.toLowerCase().trim();
  const qSource = filters.sourceSearch.toLowerCase().trim();
  const qCategory = filters.environmentalCategory.toLowerCase().trim();
  return rows.filter((row) => {
    if (qAddress && !row.address.toLowerCase().includes(qAddress)) return false;
    if (qWaterBody && !row.waterBody.toLowerCase().includes(qWaterBody)) return false;
    if (qSource && !`${row.sourceDatabase} ${row.sourceTable} ${row.sourceFlags.join(' ')}`.toLowerCase().includes(qSource)) return false;
    if (qCategory && !row.environmentalCategory.toLowerCase().includes(qCategory)) return false;
    return true;
  });
}

export async function searchEnvirofacts(filters: EnvirofactsFilters): Promise<EnvirofactsSearchResponse> {
  const page = Math.max(1, filters.page);
  const pageSize = Math.max(1, Math.min(100, filters.pageSize));
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  try {
    const rows = await fetchRows(buildSearchUrl(filters, start, end));
    const normalized = rows.map((row, index) => normalizeEnvirofactsRow(row, start + index));
    const filtered = applyClientFilters(normalized, filters);
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
      rows: applyClientFilters(MOCK_ROWS, filters),
      total: MOCK_ROWS.length,
      page,
      pageSize,
      source: 'mock',
      legalNotice: `${LEGAL_NOTICE} Mock fallback is shown because live API is unavailable.`,
    };
  }
}
