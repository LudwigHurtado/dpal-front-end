import type { EnvirofactsLayerTag, EnvirofactsRecord } from '../types/envirofactsTypes';

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

function truthyFlag(row: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    const value = row[key];
    if (value == null || value === '') continue;
    if (typeof value === 'number' && value === 1) return true;
    const s = String(value).trim().toLowerCase();
    if (s === 'y' || s === 'yes' || s === '1' || s === 'true') return true;
    if (s === 'n' || s === 'no' || s === '0' || s === 'false') return false;
    if (Number(value) === 1) return true;
  }
  return false;
}

export function isPinnableCoordinate(lat: number | null, lon: number | null): boolean {
  if (lat == null || lon == null) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lon < -180 || lon > 180) return false;
  return true;
}

function deriveEnforcementCue(row: Record<string, unknown>, complianceStatus: string): boolean {
  const hay = [
    complianceStatus,
    str(row, 'enforcement_action', 'ENFORCEMENT_ACTION', 'formal_action_ind', 'FORMAL_ACTION_IND'),
    str(row, 'compliance_status', 'COMPLIANCE_STATUS'),
  ]
    .join(' ')
    .toLowerCase();
  if (!hay.trim()) return false;
  return /enforcement|formal|violation|penalt|order|consent|significant/i.test(hay);
}

export function normalizeEnvirofactsRow(row: Record<string, unknown>, index: number): EnvirofactsRecord {
  const facilityName = str(row, 'primary_name', 'PRIMARY_NAME', 'facility_name', 'FACILITY_NAME', 'site_name', 'SITE_NAME', 'name', 'NAME');
  const recordName = str(row, 'record_name', 'RECORD_NAME', 'program_name', 'PROGRAM_NAME') || facilityName;
  const city = str(row, 'city_name', 'CITY_NAME', 'CITY', 'city');
  const county = str(row, 'county_name', 'COUNTY_NAME', 'COUNTY', 'county');
  const state = str(row, 'state_code', 'STATE_CODE', 'STATE', 'state');
  const zip = str(row, 'postal_code', 'POSTAL_CODE', 'ZIP', 'zip_code');
  const sourceDatabase = str(row, 'source_database', 'SOURCE_DATABASE', 'program_system', 'PROGRAM_SYSTEM') || 'EPA Envirofacts';
  const sourceTable = str(row, 'source_table', 'SOURCE_TABLE') || 'lookups.mv_new_geo_best_picks';
  const address = str(row, 'location_address', 'LOCATION_ADDRESS', 'street_address', 'ADDRESS', 'address1', 'ADDRESS1');
  const waterBody = str(row, 'water_body', 'WATER_BODY', 'waterbody_name', 'WATERBODY_NAME');
  const complianceStatus = str(row, 'compliance_status', 'COMPLIANCE_STATUS', 'enforcement_status', 'ENFORCEMENT_STATUS');
  const recordId = str(row, 'registry_id', 'REGISTRY_ID', 'record_id', 'RECORD_ID', 'frs_id', 'FRS_ID');
  const hasRegistryId = Boolean(recordId);

  const layerTags: EnvirofactsLayerTag[] = [];
  const sourceFlags: string[] = [];

  if (truthyFlag(row, 'airs_afs', 'AIRS_AFS') || truthyFlag(row, 'icis', 'ICIS')) {
    layerTags.push('air');
    sourceFlags.push('Air');
  }
  if (truthyFlag(row, 'npdes', 'NPDES') || truthyFlag(row, 'pcs', 'PCS')) {
    layerTags.push('water');
    sourceFlags.push('Water');
  }
  if (truthyFlag(row, 'rcrainfo', 'RCRAINFO') || truthyFlag(row, 'brs', 'BRS')) {
    layerTags.push('waste');
    sourceFlags.push('Waste');
  }
  if (truthyFlag(row, 'tris', 'TRIS')) {
    layerTags.push('toxics');
    sourceFlags.push('Toxics');
  }
  if (truthyFlag(row, 'sems', 'SEMS') || truthyFlag(row, 'npl', 'NPL') || truthyFlag(row, 'cerclis', 'CERCLIS')) {
    layerTags.push('landCleanup');
    sourceFlags.push('Land/Cleanup');
  }
  if (truthyFlag(row, 'radinfo', 'RADINFO')) {
    layerTags.push('radiation');
    sourceFlags.push('Radiation');
  }
  if (truthyFlag(row, 'ghg', 'GHG')) {
    layerTags.push('ghg');
    sourceFlags.push('GHG');
  }
  if (hasRegistryId) {
    layerTags.push('facilities');
    sourceFlags.push('Facilities Registry');
  }

  const enforcementCue = deriveEnforcementCue(row, complianceStatus);
  if (enforcementCue) {
    layerTags.push('enforcement');
    if (!sourceFlags.includes('Enforcement signal')) sourceFlags.push('Enforcement signal');
  }

  const category =
    str(row, 'environmental_category', 'ENVIRONMENTAL_CATEGORY', 'media', 'MEDIA') ||
    (sourceFlags.find((f) => f !== 'Facilities Registry' && f !== 'Enforcement signal') ?? 'Facilities');

  const latitude = num(row, 'latitude', 'LATITUDE', 'latitude83', 'LATITUDE83');
  const longitude = num(row, 'longitude', 'LONGITUDE', 'longitude83', 'LONGITUDE83');
  const pinnable = isPinnableCoordinate(latitude, longitude);

  const dpalReviewStatus = pinnable
    ? 'Official EPA Record · Public Data Baseline · Verification Needed'
    : 'Official EPA Record · Coordinates Unavailable · Verification Needed';

  return {
    id: recordId || `${sourceTable}-${index}`,
    facilityName,
    recordName,
    address,
    city,
    county,
    state,
    zip,
    latitude,
    longitude,
    pinnable,
    sourceDatabase,
    sourceTable,
    environmentalCategory: category,
    sourceFlags,
    layerTags,
    hasRegistryId,
    enforcementCue,
    waterBody,
    complianceStatus,
    recordId,
    dpalReviewStatus,
    raw: row,
  };
}
