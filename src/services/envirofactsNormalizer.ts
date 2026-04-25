import type { EnvirofactsRecord } from '../types/envirofactsTypes';

function str(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return '';
}

function num(row: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (value == null || value === '') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function normalizeEnvirofactsRow(row: Record<string, unknown>, index: number): EnvirofactsRecord {
  const facilityName = str(row, 'facility_name', 'FACILITY_NAME', 'site_name', 'SITE_NAME', 'name', 'NAME');
  const recordName = str(row, 'record_name', 'RECORD_NAME', 'program_name', 'PROGRAM_NAME') || facilityName;
  const city = str(row, 'city_name', 'CITY', 'city', 'CITY_NAME');
  const county = str(row, 'county_name', 'COUNTY', 'county');
  const state = str(row, 'state_code', 'STATE', 'state');
  const zip = str(row, 'postal_code', 'ZIP', 'zip_code');
  const sourceDatabase = str(row, 'source_database', 'SOURCE_DATABASE', 'program_system', 'PROGRAM_SYSTEM') || 'EPA Envirofacts';
  const sourceTable = str(row, 'source_table', 'SOURCE_TABLE') || 'lookups.mv_new_geo_best_picks';
  const environmentalCategory = str(row, 'environmental_category', 'ENVIRONMENTAL_CATEGORY', 'media', 'MEDIA') || 'Facilities';
  const address = str(row, 'street_address', 'ADDRESS', 'address1', 'ADDRESS1');
  const waterBody = str(row, 'water_body', 'WATER_BODY', 'waterbody_name', 'WATERBODY_NAME');
  const complianceStatus = str(row, 'compliance_status', 'COMPLIANCE_STATUS', 'enforcement_status', 'ENFORCEMENT_STATUS');
  const recordId = str(row, 'registry_id', 'REGISTRY_ID', 'record_id', 'RECORD_ID', 'frs_id', 'FRS_ID');

  return {
    id: recordId || `${sourceTable}-${index}`,
    facilityName,
    recordName,
    address,
    city,
    county,
    state,
    zip,
    latitude: num(row, 'latitude83', 'LATITUDE83', 'latitude', 'LATITUDE'),
    longitude: num(row, 'longitude83', 'LONGITUDE83', 'longitude', 'LONGITUDE'),
    sourceDatabase,
    sourceTable,
    environmentalCategory,
    waterBody,
    complianceStatus,
    recordId,
    raw: row,
  };
}
